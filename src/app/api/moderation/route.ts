import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiter for the moderation proxy
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10; // requests per window
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  entry.count++;
  return entry.count <= RATE_LIMIT_MAX;
}

// Cleanup stale entries every 5 minutes
if (typeof globalThis !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap) {
      if (now > entry.resetAt) rateLimitMap.delete(key);
    }
  }, 300_000);
}

/** Read the moderation service URL from env, with a safe default */
function getModerationServiceUrl(): string {
  return process.env.MODERATION_SERVICE_URL || 'http://localhost:3004';
}

/** Timeout for the upstream moderation service (10 seconds) */
const UPSTREAM_TIMEOUT_MS = 10_000;

export async function POST(request: NextRequest) {
  // Rate limiting by IP
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';

  if (!checkRateLimit(clientIp)) {
    return NextResponse.json(
      { error: 'rate_limited', message: 'Too many requests. Please try again later.' },
      { status: 429 },
    );
  }

  const moderationBaseUrl = getModerationServiceUrl();
  const moderationUrl = `${moderationBaseUrl}/api/moderate`;

  try {
    const body = await request.json();
    const { sessionId, roomId, frame, timestamp } = body;

    // Validate required fields
    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json(
        { error: 'invalid_request', message: 'sessionId is required' },
        { status: 400 },
      );
    }
    if (!roomId || typeof roomId !== 'string') {
      return NextResponse.json(
        { error: 'invalid_request', message: 'roomId is required' },
        { status: 400 },
      );
    }
    if (!frame || typeof frame !== 'string') {
      return NextResponse.json(
        { error: 'invalid_request', message: 'frame is required' },
        { status: 400 },
      );
    }
    if (frame.length > 200_000) {
      return NextResponse.json(
        { error: 'invalid_request', message: 'frame too large (max 200KB)' },
        { status: 400 },
      );
    }

    // Forward to moderation service with an AbortController timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(moderationUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, roomId, frame, timestamp }),
        signal: controller.signal,
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
        console.error('[moderation-proxy] Upstream timeout after', UPSTREAM_TIMEOUT_MS, 'ms');
        return NextResponse.json(
          { error: 'analysis_failed', message: 'Moderation service timed out' },
          { status: 504 },
        );
      }

      // Connection refused / service unreachable
      console.error('[moderation-proxy] Cannot reach moderation service:', moderationBaseUrl);
      return NextResponse.json(
        { error: 'analysis_failed', message: 'Moderation service is unavailable' },
        { status: 503 },
      );
    }

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const status = response.status >= 500 ? 502 : response.status;
      return NextResponse.json(
        { error: errorData.error || 'analysis_failed', message: errorData.message || 'Moderation service error' },
        { status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[moderation-proxy] Error:', error);
    return NextResponse.json(
      { error: 'analysis_failed', message: 'Internal proxy error' },
      { status: 500 },
    );
  }
}
