// ============================================================
// SecureStream Signaling Server — Penalty Box (Fast-Skip Detection)
// ============================================================

import { PENALTY, type PenaltyRecord } from './types';

// In-memory store: sessionId → PenaltyRecord
const penaltyBox = new Map<string, PenaltyRecord>();

/**
 * Add or update a penalty for a session.
 * @param sessionId - The session to penalize.
 * @param isFastSkip - Whether this was a fast skip (< 10s).
 * @returns The resulting PenaltyRecord.
 */
export function addPenalty(sessionId: string, isFastSkip: boolean): PenaltyRecord {
  const now = Date.now();
  let record = penaltyBox.get(sessionId);

  if (!record || now > record.cooldownUntil) {
    // Start fresh if no existing penalty or cooldown has expired
    record = {
      sessionId,
      cooldownUntil: 0,
      fastSkipCount: 0,
      firstSkipTime: now,
    };
    penaltyBox.set(sessionId, record);
  }

  if (isFastSkip) {
    // Check if we're still within the tracking window (5 minutes)
    if (now - record.firstSkipTime > PENALTY.TRACKING_WINDOW_MS) {
      // Reset tracking window
      record.firstSkipTime = now;
      record.fastSkipCount = 0;
    }

    record.fastSkipCount++;

    if (record.fastSkipCount >= PENALTY.FAST_SKIP_LIMIT) {
      // Escalated penalty: 5-minute cooldown
      record.cooldownUntil = now + PENALTY.ESCALATED_COOLDOWN_MS;
      record.fastSkipCount = 0;
      record.firstSkipTime = now; // reset window
    } else {
      // Standard fast-skip penalty: 30s cooldown
      record.cooldownUntil = Math.max(record.cooldownUntil, now + PENALTY.BASE_COOLDOWN_MS);
    }
  }

  return record;
}

/**
 * Check whether a session is currently in the penalty box.
 */
export function isInPenalty(sessionId: string): boolean {
  const record = penaltyBox.get(sessionId);
  if (!record) return false;

  if (Date.now() > record.cooldownUntil) {
    penaltyBox.delete(sessionId);
    return false;
  }

  return true;
}

/**
 * Get the penalty record for a session (or null if none).
 */
export function getPenalty(sessionId: string): PenaltyRecord | null {
  const record = penaltyBox.get(sessionId);
  if (!record) return null;

  if (Date.now() > record.cooldownUntil) {
    penaltyBox.delete(sessionId);
    return null;
  }

  return record;
}

/**
 * Remove a penalty record (e.g., on blacklist or manual override).
 */
export function removePenalty(sessionId: string): void {
  penaltyBox.delete(sessionId);
}

/**
 * Get remaining cooldown in seconds for a session. Returns 0 if not in penalty.
 */
export function getRemainingCooldownSeconds(sessionId: string): number {
  const record = penaltyBox.get(sessionId);
  if (!record) return 0;

  const remaining = Math.ceil((record.cooldownUntil - Date.now()) / 1000);
  return Math.max(0, remaining);
}

/**
 * Cleanup expired penalty records. Call periodically.
 */
export function cleanupExpiredPenalties(): number {
  const now = Date.now();
  let removed = 0;
  for (const [sessionId, record] of penaltyBox) {
    if (now > record.cooldownUntil) {
      penaltyBox.delete(sessionId);
      removed++;
    }
  }
  return removed;
}
