// ============================================================
// SecureStream Signaling Server — Trust Score Engine (In-Memory)
// ============================================================

import { TRUST } from './types';
import { addToBlacklist } from './blacklist';

// In-memory store: sessionId → score (0-100)
const trustStore = new Map<string, number>();

/**
 * Get the current trust score for a session.
 * Returns DEFAULT (100) for new sessions.
 */
export async function getTrustScore(sessionId: string): Promise<number> {
  return trustStore.get(sessionId) ?? TRUST.DEFAULT;
}

/**
 * Update the trust score for a session.
 * Clamps the score between MIN (0) and MAX (100).
 * Creates a new record if one doesn't exist.
 * Returns the new score.
 */
export async function updateTrustScore(
  sessionId: string,
  change: number,
): Promise<number> {
  const current = await getTrustScore(sessionId);
  const newScore = Math.max(TRUST.MIN, Math.min(TRUST.MAX, current + change));
  trustStore.set(sessionId, newScore);

  // Check blacklist threshold
  await checkBlacklistThreshold(sessionId, newScore);

  return newScore;
}

/**
 * Check if a session's trust score has fallen to or below the blacklist threshold.
 * If so, auto-add to blacklist.
 * Returns true if blacklisted.
 */
export async function checkBlacklistThreshold(
  sessionId: string,
  newScore: number,
): Promise<boolean> {
  if (newScore <= TRUST.BLACKLIST_THRESHOLD) {
    await addToBlacklist(
      sessionId,
      `Trust score dropped to ${newScore} (threshold: ${TRUST.BLACKLIST_THRESHOLD})`,
    );
    return true;
  }
  return false;
}

/**
 * Reset a session's trust score (e.g., after blacklist expiry).
 */
export async function resetTrustScore(sessionId: string, score: number = 50): Promise<void> {
  trustStore.set(sessionId, Math.max(TRUST.MIN, Math.min(TRUST.MAX, score)));
}

/**
 * Log a moderation event for audit trail (in-memory, no persistence).
 * Kept for API compatibility but data is not stored to database.
 */
export async function logModerationEvent(
  _sessionId: string,
  _roomId: string,
  _riskLevel: string,
  _action: string,
  _reasons: string[] = [],
): Promise<void> {
  // In-memory mode: just log to console for audit trail
  console.log(`[moderation-log] session=${_sessionId.slice(0, 8)} room=${_roomId} risk=${_riskLevel} action=${_action}`);
}
