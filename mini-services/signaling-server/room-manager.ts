// ============================================================
// SecureStream Signaling Server — Room Manager (Lifecycle)
// ============================================================

import type { RoomState, RoomUser } from './types';

// In-memory store: roomId → RoomState
const rooms = new Map<string, RoomState>();

// Index: sessionId → roomId (for fast lookups)
const sessionToRoom = new Map<string, string>();

/**
 * Create a new room with two users.
 */
export function createRoom(
  roomId: string,
  user1SessionId: string,
  user1SocketId: string,
  user2SessionId: string,
  user2SocketId: string,
): RoomState {
  const now = Date.now();
  const room: RoomState = {
    roomId,
    users: new Map<string, RoomUser>(),
    createdAt: now,
    matchTimestamp: now,
  };

  const user1: RoomUser = {
    sessionId: user1SessionId,
    socketId: user1SocketId,
    joinedAt: now,
    lastHeartbeat: now,
    matchTimestamp: now,
  };

  const user2: RoomUser = {
    sessionId: user2SessionId,
    socketId: user2SocketId,
    joinedAt: now,
    lastHeartbeat: now,
    matchTimestamp: now,
  };

  room.users.set(user1SessionId, user1);
  room.users.set(user2SessionId, user2);
  rooms.set(roomId, room);

  sessionToRoom.set(user1SessionId, roomId);
  sessionToRoom.set(user2SessionId, roomId);

  return room;
}

/**
 * Get a room by its ID.
 */
export function getRoom(roomId: string): RoomState | undefined {
  return rooms.get(roomId);
}

/**
 * Get a room containing a given session.
 */
export function getRoomBySession(sessionId: string): RoomState | undefined {
  const roomId = sessionToRoom.get(sessionId);
  if (!roomId) return undefined;
  return rooms.get(roomId);
}

/**
 * Remove a room and clean up indices.
 * Returns the removed room (or undefined).
 */
export function removeRoom(roomId: string): RoomState | undefined {
  const room = rooms.get(roomId);
  if (!room) return undefined;

  // Clean up session → room index
  for (const sessionId of room.users.keys()) {
    sessionToRoom.delete(sessionId);
  }

  rooms.delete(roomId);
  return room;
}

/**
 * Get the partner's sessionId in a room.
 */
export function getPartnerSessionId(
  roomId: string,
  sessionId: string,
): string | null {
  const room = rooms.get(roomId);
  if (!room) return null;

  for (const [id] of room.users) {
    if (id !== sessionId) return id;
  }
  return null;
}

/**
 * Update a user's last heartbeat timestamp.
 */
export function updateHeartbeat(sessionId: string): void {
  const roomId = sessionToRoom.get(sessionId);
  if (!roomId) return;

  const room = rooms.get(roomId);
  if (!room) return;

  const user = room.users.get(sessionId);
  if (user) {
    user.lastHeartbeat = Date.now();
  }
}

/**
 * Update a user's socket ID (e.g., on reconnect with same sessionId).
 */
export function updateSocketId(sessionId: string, newSocketId: string): boolean {
  const roomId = sessionToRoom.get(sessionId);
  if (!roomId) return false;

  const room = rooms.get(roomId);
  if (!room) return false;

  const user = room.users.get(sessionId);
  if (user) {
    user.socketId = newSocketId;
    return true;
  }
  return false;
}

/**
 * Remove a specific user from a room.
 * If the room becomes empty or has only one user, it is cleaned up.
 * Returns the partner's sessionId (if any) or null.
 */
export function removeUserFromRoom(sessionId: string): string | null {
  const roomId = sessionToRoom.get(sessionId);
  if (!roomId) return null;

  const room = rooms.get(roomId);
  if (!room) return null;

  room.users.delete(sessionId);
  sessionToRoom.delete(sessionId);

  // If room has ≤ 1 user, remove it entirely
  if (room.users.size <= 1) {
    const remainingSession = room.users.size === 1
      ? [...room.users.keys()][0]!
      : null;

    // Clean up the remaining user's index too
    if (remainingSession) {
      sessionToRoom.delete(remainingSession);
    }

    rooms.delete(roomId);
    return remainingSession;
  }

  // Return the partner's sessionId
  for (const [id] of room.users) {
    if (id !== sessionId) return id;
  }
  return null;
}

/**
 * Get the match timestamp for a specific user in a room (for fast-skip detection).
 */
export function getMatchTimestamp(sessionId: string): number | null {
  const room = getRoomBySession(sessionId);
  if (!room) return null;

  const user = room.users.get(sessionId);
  return user ? user.matchTimestamp : null;
}

/**
 * Get total room count.
 */
export function getRoomCount(): number {
  return rooms.size;
}

/**
 * Get all room IDs (for shutdown/cleanup iteration).
 */
export function getAllRoomIds(): string[] {
  return [...rooms.keys()];
}

/**
 * Cleanup stale rooms where users haven't sent heartbeats.
 * Returns an array of room IDs that were cleaned up.
 */
export function cleanupStaleRooms(maxAgeMs: number): string[] {
  const now = Date.now();
  const staleRoomIds: string[] = [];

  for (const [roomId, room] of rooms) {
    let allStale = true;
    for (const [, user] of room.users) {
      if (now - user.lastHeartbeat < maxAgeMs) {
        allStale = false;
        break;
      }
    }
    if (allStale && room.users.size > 0) {
      // Clean up all session indices
      for (const sessionId of room.users.keys()) {
        sessionToRoom.delete(sessionId);
      }
      rooms.delete(roomId);
      staleRoomIds.push(roomId);
    }
  }

  return staleRoomIds;
}

/**
 * Get all active sessions and their room info (for stale heartbeat detection).
 * Returns array of { roomId, sessionId, socketId, lastHeartbeat } for rooms with stale users.
 */
export function getStaleSessions(maxAgeMs: number): Array<{
  roomId: string;
  sessionId: string;
  socketId: string;
  lastHeartbeat: number;
}> {
  const now = Date.now();
  const stale: Array<{
    roomId: string;
    sessionId: string;
    socketId: string;
    lastHeartbeat: number;
  }> = [];

  for (const [roomId, room] of rooms) {
    for (const [sessionId, user] of room.users) {
      if (now - user.lastHeartbeat >= maxAgeMs) {
        stale.push({
          roomId,
          sessionId,
          socketId: user.socketId,
          lastHeartbeat: user.lastHeartbeat,
        });
      }
    }
  }

  return stale;
}
