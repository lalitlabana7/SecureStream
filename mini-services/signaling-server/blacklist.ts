// ============================================================
// SecureStream Signaling Server — Blacklist Enforcement (In-Memory)
// ============================================================

import { BLACKLIST } from './types';

// In-memory store: sessionId → { reason, expiresAt }
const blacklistStore = new Map<string, { reason: string; expiresAt: number }>();

export interface BlacklistCheckResult {
  blacklisted: boolean;
  reason?: string;
  expiresAt?: Date;
}

/**
 * Check whether a session is currently blacklisted.
 * Returns { blacklisted: false } if clean or expired.
 * If expired, removes the record and returns { blacklisted: false }.
 */
export async function isBlacklisted(sessionId: string): Promise<BlacklistCheckResult> {
  const record = blacklistStore.get(sessionId);
  if (!record) return { blacklisted: false };

  // Check expiry
  if (Date.now() > record.expiresAt) {
    blacklistStore.delete(sessionId);
    return { blacklisted: false };
  }

  return {
    blacklisted: true,
    reason: record.reason,
    expiresAt: new Date(record.expiresAt),
  };
}

/**
 * Add a session to the blacklist with a given reason.
 * Duration: 24 hours from now.
 */
export async function addToBlacklist(sessionId: string, reason: string): Promise<void> {
  const expiresAt = Date.now() + BLACKLIST.DURATION_MS;
  blacklistStore.set(sessionId, { reason, expiresAt });
}

/**
 * Remove all expired blacklist records.
 * Call periodically (every 60s).
 */
export async function removeExpiredBlacklists(): Promise<number> {
  const now = Date.now();
  let removed = 0;
  for (const [sessionId, record] of blacklistStore) {
    if (now > record.expiresAt) {
      blacklistStore.delete(sessionId);
      removed++;
    }
  }
  return removed;
}

/**
 * Remove a specific session's blacklist record (e.g., on appeal/reset).
 */
export async function removeFromBlacklist(sessionId: string): Promise<number> {
  const existed = blacklistStore.has(sessionId);
  blacklistStore.delete(sessionId);
  return existed ? 1 : 0;
}
