// ============================================================
// SecureStream Signaling Server — FIFO Matchmaking Queue
// ============================================================

import type { Server } from 'socket.io';
import type { JoinRequest } from './types';

// FIFO queue — ordered array for position tracking
const queue: JoinRequest[] = [];

// Index: sessionId → position in queue (for O(1) removal)
const sessionIndex = new Map<string, number>();

// Max queue size (configurable via env, default 200)
let maxQueueSize = parseInt(process.env.MAX_QUEUE_SIZE || '200', 10);

/**
 * Update the max queue size (called on startup from env).
 */
export function setMaxQueueSize(size: number): void {
  maxQueueSize = size;
}

/**
 * Get the current max queue size.
 */
export function getMaxQueueSize(): number {
  return maxQueueSize;
}

/**
 * Add a user to the matchmaking queue.
 * If already in queue, this is a no-op.
 * Returns false if the queue is full.
 */
export function enqueue(sessionId: string, socketId: string): boolean {
  if (sessionIndex.has(sessionId)) return true; // already queued (allow)

  // Check queue capacity
  if (queue.length >= maxQueueSize) {
    return false;
  }

  const request: JoinRequest = {
    sessionId,
    socketId,
    joinedAt: Date.now(),
  };

  sessionIndex.set(sessionId, queue.length);
  queue.push(request);
  return true;
}

/**
 * Dequeue the next two users for matching.
 * Returns null if fewer than 2 users are in the queue.
 */
export function dequeue(): { user1: JoinRequest; user2: JoinRequest } | null {
  if (queue.length < 2) return null;

  // Dequeue in FIFO order (shift from front)
  const user1 = queue.shift()!;
  const user2 = queue.shift()!;

  // Rebuild index after shifting
  rebuildIndex();

  return { user1, user2 };
}

/**
 * Remove a specific session from the queue.
 * Returns true if the session was in the queue.
 */
export function removeFromQueue(sessionId: string): boolean {
  const index = sessionIndex.get(sessionId);
  if (index === undefined) return false;

  queue.splice(index, 1);
  rebuildIndex();
  return true;
}

/**
 * Get the position of a session in the queue (0-indexed).
 * Returns -1 if not in queue.
 */
export function getPosition(sessionId: string): number {
  return sessionIndex.get(sessionId) ?? -1;
}

/**
 * Get the total number of users in the queue.
 */
export function getQueueSize(): number {
  return queue.length;
}

/**
 * Check if a session is in the queue.
 */
export function isInQueue(sessionId: string): boolean {
  return sessionIndex.has(sessionId);
}

/**
 * Broadcast queue positions to all users in the queue.
 */
export function updateQueuePositions(io: Server): void {
  if (queue.length === 0) return;

  const now = Date.now();

  for (let i = 0; i < queue.length; i++) {
    const user = queue[i]!;
    const estimatedWait = Math.max(0, (queue.length - i - 1) * 3); // rough 3s per person ahead

    io.to(user.socketId).emit('queue_update', {
      position: i,
      estimatedWait,
    });
  }
}

/**
 * Rebuild the sessionIndex map from scratch.
 * Called after splice/shift operations that invalidate indices.
 */
function rebuildIndex(): void {
  sessionIndex.clear();
  for (let i = 0; i < queue.length; i++) {
    sessionIndex.set(queue[i]!.sessionId, i);
  }
}
