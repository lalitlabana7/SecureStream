// ============================================================
// SecureStream Signaling Server — Sliding Window Rate Limiter
// ============================================================

// In-memory store: sessionId → number[] of request timestamps
const requestTimestamps = new Map<string, number[]>();

/**
 * Check whether a session has exceeded the rate limit.
 * Returns `true` if the request is ALLOWED, `false` if rate-limited.
 */
export function checkRateLimit(
  sessionId: string,
  maxRequests: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const cutoff = now - windowMs;

  let timestamps = requestTimestamps.get(sessionId);
  if (!timestamps) {
    timestamps = [];
    requestTimestamps.set(sessionId, timestamps);
  }

  // Remove timestamps outside the window
  while (timestamps.length > 0 && timestamps[0]! < cutoff) {
    timestamps.shift();
  }

  if (timestamps.length >= maxRequests) {
    return false; // rate limited
  }

  timestamps.push(now);
  return true; // allowed
}

/**
 * Remove all tracking data for a session (called on disconnect).
 */
export function clearRateLimits(sessionId: string): void {
  requestTimestamps.delete(sessionId);
}

/**
 * Periodic cleanup of stale entries to prevent memory leaks.
 * Call every 60 seconds or so.
 */
export function cleanupStaleEntries(): void {
  const cutoff = Date.now() - 120_000; // 2 minute buffer
  for (const [sessionId, timestamps] of requestTimestamps) {
    if (timestamps.length === 0 || timestamps[timestamps.length - 1]! < cutoff) {
      requestTimestamps.delete(sessionId);
    }
  }
}
