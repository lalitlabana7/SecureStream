import { analyzeFrame } from './analyzer';
import { calculateRisk } from './risk-scorer';
import { mapAction, isHighRisk } from './action-mapper';
import type {
  ModerationRequest,
  ModerationResponse,
  ErrorResponse,
} from './types';

const SERVER_START_TIME = Date.now();
const PORT = parseInt(process.env.MODERATION_PORT || '3004', 10);

// CORS: configurable allowed origins
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : ['http://localhost:3000'];

function getAllowedOrigin(req: Request): string {
  const origin = req.headers.get('origin') || '';
  return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
}

// Configurable max frame size — read from env or default to 200KB
const MAX_FRAME_SIZE_BYTES = (parseInt(process.env.FRAME_MAX_SIZE_KB || '200', 10)) * 1024;
const MAX_REQUEST_BODY_BYTES = MAX_FRAME_SIZE_BYTES + 4096; // frame + JSON overhead

// ─── Stats counters ────────────────────────────────────────────
const stats = {
  totalRequests: 0,
  successfulAnalyses: 0,
  failedAnalyses: 0,
  timeouts: 0,
  rejectedRequests: 0,
};

/**
 * Validate the moderation request body.
 * Returns an error message string if invalid, or null if valid.
 */
function validateRequest(body: unknown): string | null {
  if (!body || typeof body !== 'object') {
    return 'Request body must be a JSON object';
  }

  const req = body as Record<string, unknown>;

  // sessionId — required, non-empty string
  if (typeof req.sessionId !== 'string' || req.sessionId.trim().length === 0) {
    return 'sessionId is required and must be a non-empty string';
  }

  // roomId — required, non-empty string
  if (typeof req.roomId !== 'string' || req.roomId.trim().length === 0) {
    return 'roomId is required and must be a non-empty string';
  }

  // frame — required, string, max size
  if (typeof req.frame !== 'string' || req.frame.length === 0) {
    return 'frame is required and must be a non-empty base64 string';
  }
  if (req.frame.length > MAX_FRAME_SIZE_BYTES) {
    return `frame exceeds maximum size of ${MAX_FRAME_SIZE_BYTES / 1024}KB`;
  }

  // timestamp — required, number
  if (typeof req.timestamp !== 'number' || isNaN(req.timestamp)) {
    return 'timestamp is required and must be a valid number';
  }

  return null;
}

/**
 * JSON response helper with CORS headers.
 */
function jsonResponse(data: unknown, status: number, req?: Request): Response {
  const allowedOrigin = req ? getAllowedOrigin(req) : ALLOWED_ORIGINS[0];
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Expose-Headers': 'X-Request-Id',
    },
  });
}

/**
 * CORS preflight handler.
 */
function handleCorsPreflight(req: Request): Response {
  const allowedOrigin = getAllowedOrigin(req);
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Expose-Headers': 'X-Request-Id',
      'Access-Control-Max-Age': '86400',
    },
  });
}

/**
 * Moderate a single frame.
 * POST /api/moderate
 */
async function handleModerate(req: Request): Promise<Response> {
  stats.totalRequests++;

  // ── Body size guard: check Content-Length before parsing ──
  const contentLength = req.headers.get('content-length');
  if (contentLength) {
    const bytes = parseInt(contentLength, 10);
    if (!isNaN(bytes) && bytes > MAX_REQUEST_BODY_BYTES) {
      stats.rejectedRequests++;
      return jsonResponse(
        { error: 'request_too_large', message: `Request body exceeds maximum size of ${MAX_REQUEST_BODY_BYTES / 1024}KB` } satisfies ErrorResponse,
        413,
        req,
      );
    }
  }

  // Parse JSON body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    stats.rejectedRequests++;
    return jsonResponse(
      { error: 'invalid_request', message: 'Failed to parse request body as JSON' } satisfies ErrorResponse,
      400,
      req,
    );
  }

  // Validate
  const validationError = validateRequest(body);
  if (validationError) {
    stats.rejectedRequests++;
    return jsonResponse(
      { error: 'invalid_request', message: validationError } satisfies ErrorResponse,
      400,
      req,
    );
  }

  const { sessionId, roomId, frame, timestamp } = body as ModerationRequest;
  const startTime = Date.now();

  try {
    // Analyze frame using VLM
    // NOTE: Frame data is NEVER logged or stored — privacy-first
    const analysis = await analyzeFrame(frame);

    // Calculate risk score
    const { riskLevel, compositeScore } = calculateRisk(analysis);

    // Map to recommended action (MVP: no consecutive violation tracking)
    const recommendedAction = mapAction(riskLevel, 0);
    const highRisk = isHighRisk(riskLevel);

    const processingTimeMs = Date.now() - startTime;

    stats.successfulAnalyses++;

    // Log risk level only — never frame data (privacy-first)
    console.log(
      `[Moderation] Session: ${sessionId.substring(0, 8)}... | ` +
      `Room: ${roomId.substring(0, 8)}... | ` +
      `Risk: ${riskLevel} (${compositeScore.toFixed(3)}) | Action: ${recommendedAction} | ` +
      `Time: ${processingTimeMs}ms`,
    );

    const response: ModerationResponse = {
      sessionId,
      roomId,
      analysis: {
        face_count: analysis.face_count,
        human_present: analysis.human_present,
        nsfw_score: analysis.nsfw_score,
        bot_score: analysis.bot_score,
        risk_level: riskLevel,
        recommended_action: recommendedAction,
        high_risk: highRisk,
      },
      processing_time_ms: processingTimeMs,
      timestamp: Date.now(),
    };

    return jsonResponse(response, 200, req);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown analysis error';
    const isTimeout = message.toLowerCase().includes('timeout');

    if (isTimeout) stats.timeouts++;
    else stats.failedAnalyses++;

    console.error(`[Moderation] Analysis failed for session ${sessionId.substring(0, 8)}...:`, message);
    return jsonResponse(
      { error: 'analysis_failed', message } satisfies ErrorResponse,
      500,
      req,
    );
  }
}

/**
 * Health check endpoint.
 * GET /health
 */
function handleHealth(req: Request): Response {
  return jsonResponse(
    {
      status: 'ok',
      uptime: Math.floor((Date.now() - SERVER_START_TIME) / 1000),
      timestamp: Date.now(),
    },
    200,
    req,
  );
}

/**
 * Service statistics endpoint.
 * GET /api/stats
 */
function handleStats(req: Request): Response {
  const uptimeSeconds = Math.floor((Date.now() - SERVER_START_TIME) / 1000);
  const successRate = stats.totalRequests > 0
    ? ((stats.successfulAnalyses / (stats.successfulAnalyses + stats.failedAnalyses + stats.timeouts)) * 100).toFixed(1)
    : '100.0';

  return jsonResponse(
    {
      service: 'securestream-moderation',
      version: '1.0.0',
      uptime_seconds: uptimeSeconds,
      timestamp: Date.now(),
      config: {
        max_frame_size_kb: MAX_FRAME_SIZE_BYTES / 1024,
        port: PORT,
      },
      counters: {
        total_requests: stats.totalRequests,
        successful_analyses: stats.successfulAnalyses,
        failed_analyses: stats.failedAnalyses,
        timeouts: stats.timeouts,
        rejected_requests: stats.rejectedRequests,
        success_rate_percent: parseFloat(successRate),
      },
    },
    200,
    req,
  );
}

/**
 * Start the moderation REST server.
 */
Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // CORS preflight — handle early for all routes
    if (req.method === 'OPTIONS') {
      return handleCorsPreflight(req);
    }

    // Health check
    if (url.pathname === '/health' && req.method === 'GET') {
      return handleHealth(req);
    }

    // Stats endpoint
    if (url.pathname === '/api/stats' && req.method === 'GET') {
      return handleStats(req);
    }

    // Moderation endpoint
    if (url.pathname === '/api/moderate' && req.method === 'POST') {
      return handleModerate(req);
    }

    // 404 for everything else
    return jsonResponse({ error: 'not_found', message: 'The requested endpoint does not exist' } satisfies ErrorResponse, 404, req);
  },
});

console.log(`[Moderation Service] Running on http://localhost:${PORT}`);
console.log(`[Moderation Service] Max frame size: ${MAX_FRAME_SIZE_BYTES / 1024}KB`);
console.log(`[Moderation Service] Endpoints: POST /api/moderate | GET /health | GET /api/stats`);
