// ============================================================
// SecureStream Signaling Server — Main Entry Point
// Socket.IO server on port 3003
// ============================================================

import { createServer } from 'http';
import { Server } from 'socket.io';

import { PENALTY, HEARTBEAT, RATE_LIMIT } from './types';
import type {
  JoinQueuePayload,
  OfferPayload,
  AnswerPayload,
  IceCandidatePayload,
  SkipPayload,
  ReportPayload,
  HeartbeatPayload,
  ModerationFlagPayload,
  ModerationWarningPayload,
  IceRestartPayload,
  SessionEndedPayload,
} from './types';

// Module imports
import { checkRateLimit, clearRateLimits, cleanupStaleEntries as cleanupRateLimits } from './rate-limiter';
import { addPenalty, isInPenalty, getPenalty, getRemainingCooldownSeconds, cleanupExpiredPenalties } from './penalty-box';
import { isBlacklisted, removeExpiredBlacklists } from './blacklist';
import { getTrustScore, updateTrustScore, logModerationEvent } from './trust-engine';
import {
  createRoom,
  getRoom,
  getRoomBySession,
  removeUserFromRoom,
  getPartnerSessionId,
  updateHeartbeat,
  getMatchTimestamp,
  getRoomCount,
  getStaleSessions,
  getAllRoomIds,
  removeRoom,
} from './room-manager';
import {
  enqueue,
  dequeue,
  removeFromQueue,
  getQueueSize,
  getPosition,
  isInQueue,
  updateQueuePositions,
} from './matchmaking';

// ============================================================
// Configuration
// ============================================================

const PORT = parseInt(process.env.SIGNALING_PORT || '3003', 10);
const startTime = Date.now();
let totalConnections = 0;

// Session ↔ Socket mappings
const socketToSession = new Map<string, string>();
const sessionToSocket = new Map<string, string>();

// ============================================================
// HTTP + Socket.IO Server Setup
// ============================================================

const httpServer = createServer();

// Health + Stats endpoints — registered BEFORE Socket.IO
httpServer.on('request', (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      rooms: getRoomCount(),
      queueSize: getQueueSize(),
      online: io.sockets.sockets.size,
      totalConnections,
    }));
    return;
  }
  if (req.method === 'GET' && req.url === '/api/stats') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      service: 'securestream-signaling',
      version: '1.0.0',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      activeRooms: getRoomCount(),
      queueSize: getQueueSize(),
      onlineUsers: io.sockets.sockets.size,
      totalConnections,
    }));
    return;
  }
});

const io = new Server(httpServer, {
  path: '/socket.io/',
  cors: {
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
      : ['http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ============================================================
// Helper Functions
// ============================================================

/**
 * Server-side string sanitization for chat messages.
 * Strips HTML tags, normalizes whitespace, and limits length.
 */
function sanitizeString(str: string, maxLen: number = 500): string {
  return str.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, maxLen);
}

function getSocketId(sessionId: string): string | undefined {
  return sessionToSocket.get(sessionId);
}

function getSessionId(socketId: string): string | undefined {
  return socketToSession.get(socketId);
}

function broadcastToSession(sessionId: string, event: string, data: any): boolean {
  const socketId = getSocketId(sessionId);
  if (!socketId) return false;
  io.to(socketId).emit(event, data);
  return true;
}

function endSessionForBoth(roomId: string, reason: SessionEndedPayload['reason'], trustChanges?: Map<string, number>, penaltySession?: string) {
  const room = getRoom(roomId);
  if (!room) return;

  for (const [sessionId] of room.users) {
    const trustChange = trustChanges?.get(sessionId);
    const penalty = penaltySession === sessionId
      ? { cooldownSeconds: getRemainingCooldownSeconds(sessionId) }
      : undefined;

    const partnerId = getPartnerSessionId(roomId, sessionId);

    broadcastToSession(sessionId, 'session_ended', {
      roomId,
      reason,
      trustChange,
      penalty,
    } as SessionEndedPayload);
  }

  removeRoom(roomId);
}

// ============================================================
// Connection Lifecycle
// ============================================================

io.on('connection', (socket) => {
  totalConnections++;
  console.log(`[connect] socket=${socket.id} total=${totalConnections}`);

  // -------------------------------------------------------
  // join_queue
  // -------------------------------------------------------
  socket.on('join_queue', async (payload: JoinQueuePayload) => {
    const { sessionId } = payload;

    if (!sessionId) {
      socket.emit('queue_rejected', { reason: 'Missing sessionId' });
      return;
    }

    // Store mappings
    socketToSession.set(socket.id, sessionId);
    sessionToSocket.set(sessionId, socket.id);

    // Check blacklist
    try {
      const bl = await isBlacklisted(sessionId);
      if (bl.blacklisted) {
        socket.emit('blacklisted', {
          reason: bl.reason,
          expiresAt: bl.expiresAt?.toISOString(),
        });
        return;
      }
    } catch (err) {
      console.error(`[blacklist-check] error for ${sessionId}:`, err);
    }

    // Check penalty box
    if (isInPenalty(sessionId)) {
      const remaining = getRemainingCooldownSeconds(sessionId);
      socket.emit('queue_rejected', {
        reason: 'penalty_box',
        cooldownSeconds: remaining,
      });
      return;
    }

    // Rate limit check
    if (!checkRateLimit(sessionId, RATE_LIMIT.JOIN_QUEUE_MAX, RATE_LIMIT.JOIN_QUEUE_WINDOW_MS)) {
      socket.emit('queue_rejected', { reason: 'rate_limited' });
      return;
    }

    // Check if user is already in a room
    if (getRoomBySession(sessionId)) {
      socket.emit('queue_rejected', { reason: 'already_in_room' });
      return;
    }

    // Enqueue
    enqueue(sessionId, socket.id);

    // Try to match
    const match = dequeue();
    if (match) {
      // We have a pair! Create room
      const roomId = `room-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const room = createRoom(
        roomId,
        match.user1.sessionId, match.user1.socketId,
        match.user2.sessionId, match.user2.socketId,
      );

      // Notify both users — first in queue is the initiator
      const user1SocketId = getSocketId(match.user1.sessionId);
      const user2SocketId = getSocketId(match.user2.sessionId);

      if (user1SocketId) {
        io.to(user1SocketId).emit('matched', {
          roomId,
          partnerSessionId: match.user2.sessionId,
          initiator: true,
        });
      }

      if (user2SocketId) {
        io.to(user2SocketId).emit('matched', {
          roomId,
          partnerSessionId: match.user1.sessionId,
          initiator: false,
        });
      }

      console.log(`[matched] roomId=${roomId} user1=${match.user1.sessionId.slice(0, 8)} user2=${match.user2.sessionId.slice(0, 8)}`);

      // Update positions for remaining queue members
      updateQueuePositions(io);
    } else {
      // Just the one user — send position
      const pos = getPosition(sessionId);
      if (pos >= 0) {
        socket.emit('queue_update', {
          position: pos,
          estimatedWait: Math.max(0, (getQueueSize() - 1) * 3),
        });
      }
    }
  });

  // -------------------------------------------------------
  // leave_queue
  // -------------------------------------------------------
  socket.on('leave_queue', (payload: { sessionId: string }) => {
    const { sessionId } = payload;
    if (!sessionId) return;

    if (removeFromQueue(sessionId)) {
      socket.emit('queue_update', { position: -1, estimatedWait: 0 });
      updateQueuePositions(io);
      console.log(`[leave_queue] sessionId=${sessionId.slice(0, 8)}`);
    }
  });

  // -------------------------------------------------------
  // offer — relay to partner
  // -------------------------------------------------------
  socket.on('offer', (payload: OfferPayload) => {
    const senderSession = getSessionId(socket.id);
    if (!senderSession) return;

    const { roomId, sdp } = payload;
    const partnerSessionId = getPartnerSessionId(roomId, senderSession);
    if (!partnerSessionId) return;

    broadcastToSession(partnerSessionId, 'offer', {
      roomId,
      sdp,
      fromSessionId: senderSession,
    });
  });

  // -------------------------------------------------------
  // answer — relay to partner
  // -------------------------------------------------------
  socket.on('answer', (payload: AnswerPayload) => {
    const senderSession = getSessionId(socket.id);
    if (!senderSession) return;

    const { roomId, sdp } = payload;
    const partnerSessionId = getPartnerSessionId(roomId, senderSession);
    if (!partnerSessionId) return;

    broadcastToSession(partnerSessionId, 'answer', {
      roomId,
      sdp,
      fromSessionId: senderSession,
    });
  });

  // -------------------------------------------------------
  // ice_candidate — relay to partner
  // -------------------------------------------------------
  socket.on('ice_candidate', (payload: IceCandidatePayload) => {
    const senderSession = getSessionId(socket.id);
    if (!senderSession) return;

    const { roomId, candidate } = payload;
    const partnerSessionId = getPartnerSessionId(roomId, senderSession);
    if (!partnerSessionId) return;

    broadcastToSession(partnerSessionId, 'ice_candidate', {
      roomId,
      candidate,
      fromSessionId: senderSession,
    });
  });

  // -------------------------------------------------------
  // ice_restart — relay to partner
  // -------------------------------------------------------
  socket.on('ice_restart', (payload: IceRestartPayload) => {
    const senderSession = getSessionId(socket.id);
    if (!senderSession) return;

    const { roomId } = payload;
    const partnerSessionId = getPartnerSessionId(roomId, senderSession);
    if (!partnerSessionId) return;

    broadcastToSession(partnerSessionId, 'ice_restart', {
      roomId,
      fromSessionId: senderSession,
    });

    console.log(`[ice_restart] roomId=${roomId} from=${senderSession.slice(0, 8)}`);
  });

  // -------------------------------------------------------
  // skip
  // -------------------------------------------------------
  socket.on('skip', async (payload: SkipPayload) => {
    const senderSession = getSessionId(socket.id);
    if (!senderSession) return;

    const { roomId, reason, requeue } = payload;

    // Validate sender is in the room
    const room = getRoom(roomId);
    if (!room || !room.users.has(senderSession)) return;

    const partnerSessionId = getPartnerSessionId(roomId, senderSession);

    // Rate limit skips
    if (!checkRateLimit(senderSession, RATE_LIMIT.SKIP_MAX, RATE_LIMIT.SKIP_WINDOW_MS)) {
      socket.emit('queue_rejected', { reason: 'skip_rate_limited' });
      return;
    }

    // Fast-skip detection
    const matchTime = getMatchTimestamp(senderSession);
    const isFastSkip = matchTime !== null && (Date.now() - matchTime < PENALTY.FAST_SKIP_WINDOW_MS);

    const trustChanges = new Map<string, number>();
    let penaltySessionId: string | undefined;

    if (isFastSkip) {
      // Apply penalty
      const record = addPenalty(senderSession, true);
      trustChanges.set(senderSession, PENALTY.FAST_SKIP);

      try {
        await updateTrustScore(senderSession, PENALTY.FAST_SKIP);
      } catch (err) {
        console.error(`[trust-update] skip penalty for ${senderSession}:`, err);
      }

      penaltySessionId = senderSession;
      console.log(`[fast-skip] sessionId=${senderSession.slice(0, 8)} cooldownUntil=${new Date(record.cooldownUntil).toISOString()}`);
    }

    // Determine end reason
    const endReason: SessionEndedPayload['reason'] = reason === 'violation' ? 'violation' : 'skip';

    // Notify partner and clean up
    if (partnerSessionId) {
      broadcastToSession(partnerSessionId, 'session_ended', {
        roomId,
        reason: endReason,
      } as SessionEndedPayload);
    }

    broadcastToSession(senderSession, 'session_ended', {
      roomId,
      reason: endReason,
      trustChange: trustChanges.get(senderSession),
      penalty: penaltySessionId === senderSession
        ? { cooldownSeconds: getRemainingCooldownSeconds(senderSession) }
        : undefined,
    } as SessionEndedPayload);

    removeRoom(roomId);

    console.log(`[skip] roomId=${roomId} by=${senderSession.slice(0, 8)} fast=${isFastSkip} requeue=${!!requeue}`);

    // Re-queue if requested and not penalized
    if (requeue && !isInPenalty(senderSession)) {
      // Use setTimeout to avoid re-queueing in the same tick
      setTimeout(() => {
        const currentSocketId = getSocketId(senderSession);
        if (currentSocketId && !getRoomBySession(senderSession)) {
          enqueue(senderSession, currentSocketId);
          updateQueuePositions(io);

          const pos = getPosition(senderSession);
          if (pos >= 0) {
            broadcastToSession(senderSession, 'queue_update', {
              position: pos,
              estimatedWait: Math.max(0, (getQueueSize() - 1) * 3),
            });
          }
        }
      }, 100);
    }
  });

  // -------------------------------------------------------
  // report
  // -------------------------------------------------------
  socket.on('report', async (payload: ReportPayload) => {
    const senderSession = getSessionId(socket.id);
    if (!senderSession) return;

    const { roomId, targetSessionId, reason } = payload;

    // Validate sender and target are in the same room
    const room = getRoom(roomId);
    if (!room) return;
    if (!room.users.has(senderSession) || !room.users.has(targetSessionId)) return;

    console.log(`[report] roomId=${roomId} reporter=${senderSession.slice(0, 8)} target=${targetSessionId.slice(0, 8)} reason=${reason}`);

    // Log the report (the report itself doesn't directly penalize the target;
    // the moderation system would need to confirm. For now we just log.)
    // Trust penalty for the target would come from moderation_flag.

    // Acknowledge the report to the reporter
    broadcastToSession(senderSession, 'report_acknowledged', {
      roomId,
      targetSessionId,
      message: 'Report received. Thank you for helping keep the community safe.',
    });
  });

  // -------------------------------------------------------
  // chat_message — relay text between room partners
  // -------------------------------------------------------
  socket.on('chat_message', (payload: { roomId: string; sessionId: string; text: string }) => {
    const senderSession = getSessionId(socket.id);
    if (!senderSession) return;

    const { roomId, text } = payload;
    if (!text || typeof text !== 'string' || text.length > 500) return;

    const safeText = sanitizeString(text);
    if (!safeText) return;

    const partnerSessionId = getPartnerSessionId(roomId, senderSession);
    if (!partnerSessionId) return;

    broadcastToSession(partnerSessionId, 'chat_message', {
      roomId,
      fromSessionId: senderSession,
      text: safeText,
      timestamp: Date.now(),
    });
  });

  // -------------------------------------------------------
  // moderation_flag — kill-switch triggered by frontend
  // -------------------------------------------------------
  socket.on('moderation_flag', async (payload: any) => {
    const senderSession = getSessionId(socket.id);
    if (!senderSession) return;

    // Frontend sends { roomId, targetSessionId, analysis: { risk_level, ... } }
    const { roomId, targetSessionId } = payload;
    const analysis = payload.analysis || {};
    const riskLevel = analysis.risk_level || analysis.recommended_action || 'high';
    const reason = analysis.recommended_action === 'terminate' ? 'Content violation' : 'Policy violation';

    // Validate sender and target are in the same room
    const room = getRoom(roomId);
    if (!room) return;
    if (!room.users.has(senderSession) || !room.users.has(targetSessionId)) return;

    console.log(`[moderation_flag] roomId=${roomId} target=${targetSessionId?.slice(0, 8)} risk=${riskLevel}`);

    // Log the moderation event
    try {
      await logModerationEvent(targetSessionId, roomId, riskLevel, 'kill', [reason]);
      await updateTrustScore(targetSessionId, -10);
    } catch (err) {
      console.error(`[moderation_flag] trust/log error:`, err);
    }

    // Send moderation_kill to the target
    broadcastToSession(targetSessionId, 'moderation_kill', {
      roomId,
      targetSessionId,
      reason,
    });

    // End session for both
    endSessionForBoth(roomId, 'moderation_kill', undefined);
  });

  // -------------------------------------------------------
  // moderation_warning — relay warning to partner
  // -------------------------------------------------------
  socket.on('moderation_warning', (payload: ModerationWarningPayload) => {
    const senderSession = getSessionId(socket.id);
    if (!senderSession) return;

    const { roomId, targetSessionId, message } = payload;

    // Validate both in room
    const room = getRoom(roomId);
    if (!room) return;
    if (!room.users.has(senderSession) || !room.users.has(targetSessionId)) return;

    broadcastToSession(targetSessionId, 'moderation_warning', {
      roomId,
      fromSessionId: senderSession,
      message,
    });
  });

  // -------------------------------------------------------
  // heartbeat — update last heartbeat timestamp
  // -------------------------------------------------------
  socket.on('heartbeat', (payload: HeartbeatPayload) => {
    const { sessionId } = payload;
    if (!sessionId) return;

    // Ensure mapping is up to date
    socketToSession.set(socket.id, sessionId);
    sessionToSocket.set(sessionId, socket.id);

    updateHeartbeat(sessionId);
  });

  // -------------------------------------------------------
  // disconnect — clean up
  // -------------------------------------------------------
  socket.on('disconnect', async (reason) => {
    const sessionId = getSessionId(socket.id);
    if (!sessionId) {
      console.log(`[disconnect] socket=${socket.id} (no session)`);
      return;
    }

    console.log(`[disconnect] sessionId=${sessionId.slice(0, 8)} reason=${reason}`);

    // Clean up mappings
    socketToSession.delete(socket.id);
    sessionToSocket.delete(sessionId);
    clearRateLimits(sessionId);

    // Check if in queue
    if (isInQueue(sessionId)) {
      removeFromQueue(sessionId);
      updateQueuePositions(io);
    }

    // Check if in a room
    const room = getRoomBySession(sessionId);
    if (room) {
      const roomId = room.roomId;
      const partnerSessionId = getPartnerSessionId(roomId, sessionId);
      const matchTime = getMatchTimestamp(sessionId);
      const isCleanDisconnect = matchTime !== null && (Date.now() - matchTime >= HEARTBEAT.CLEAN_MIN_MS);

      // Remove the user from the room
      const remainingSession = removeUserFromRoom(sessionId);

      // Award trust for clean disconnect
      if (isCleanDisconnect) {
        try {
          await updateTrustScore(sessionId, 2); // CLEAN_DISCONNECT +2
        } catch (err) {
          console.error(`[disconnect] trust update error:`, err);
        }
      }

      // Notify partner
      if (partnerSessionId && remainingSession === partnerSessionId) {
        broadcastToSession(partnerSessionId, 'session_ended', {
          roomId,
          reason: 'disconnect',
        } as SessionEndedPayload);
      }

      console.log(`[disconnect] roomId=${roomId} session=${sessionId.slice(0, 8)} clean=${isCleanDisconnect}`);
    }
  });
});

// ============================================================
// Online Count Broadcast (every 10 seconds)
// ============================================================

setInterval(() => {
  const count = io.sockets.sockets.size;
  io.emit('online_count', { count });
}, 10_000);

// ============================================================
// Stale Cleanup Interval (every 30 seconds)
// ============================================================

setInterval(async () => {
  try {
    // 1. Check for stale heartbeats in rooms
    const staleSessions = getStaleSessions(HEARTBEAT.TIMEOUT_MS);

    if (staleSessions.length > 0) {
      console.log(`[cleanup] Found ${staleSessions.length} stale sessions`);

      // Group stale sessions by roomId to avoid duplicate room cleanup
      const processedRooms = new Set<string>();

      for (const stale of staleSessions) {
        if (processedRooms.has(stale.roomId)) continue;
        processedRooms.add(stale.roomId);

        // Get all stale users in this room
        const room = getRoom(stale.roomId);
        if (!room) continue;

        let allStale = true;
        for (const [, user] of room.users) {
          if (Date.now() - user.lastHeartbeat < HEARTBEAT.TIMEOUT_MS) {
            allStale = false;
            break;
          }
        }

        if (allStale) {
          // End session for all users in the room
          for (const [sessionId] of room.users) {
            broadcastToSession(sessionId, 'session_ended', {
              roomId: stale.roomId,
              reason: 'timeout',
            });
          }
          removeRoom(stale.roomId);
          console.log(`[cleanup] Removed stale room ${stale.roomId}`);
        } else {
          // Only the stale user is gone — notify partner
          for (const [sessionId, user] of room.users) {
            if (Date.now() - user.lastHeartbeat >= HEARTBEAT.TIMEOUT_MS) {
              // This is the stale user — remove them
              const partnerId = getPartnerSessionId(stale.roomId, sessionId);
              if (partnerId) {
                broadcastToSession(partnerId, 'session_ended', {
                  roomId: stale.roomId,
                  reason: 'timeout',
                });
              }
              removeUserFromRoom(sessionId);
              // Clean up mappings
              sessionToSocket.delete(sessionId);
              socketToSession.delete(user.socketId);
              console.log(`[cleanup] Removed stale user ${sessionId.slice(0, 8)} from room ${stale.roomId}`);
              break;
            }
          }
        }
      }
    }

    // 2. Clean up expired penalties
    const expiredPenalties = cleanupExpiredPenalties();
    if (expiredPenalties > 0) {
      console.log(`[cleanup] Removed ${expiredPenalties} expired penalties`);
    }

    // 3. Clean up expired blacklists
    const expiredBlacklists = await removeExpiredBlacklists();
    if (expiredBlacklists > 0) {
      console.log(`[cleanup] Removed ${expiredBlacklists} expired blacklists`);
    }

    // 4. Clean up stale rate limit entries
    cleanupRateLimits();

  } catch (err) {
    console.error(`[cleanup] Error:`, err);
  }
}, 30_000);

// ============================================================
// Start Server
// ============================================================

httpServer.listen(PORT, () => {
  console.log(`[signaling-server] SecureStream signaling server running on port ${PORT}`);
  console.log(`[signaling-server] Health check: http://localhost:${PORT}/health`);
});

// ============================================================
// Graceful Shutdown
// ============================================================

async function gracefulShutdown(signal: string) {
  console.log(`\n[shutdown] Received ${signal}. Shutting down gracefully...`);

  // Notify all connected sockets
  for (const [socketId] of io.sockets.sockets) {
    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
      socket.emit('server_shutdown', {
        message: 'Server is shutting down. Please reconnect.',
      });
    }
  }

  // Clean up all rooms
  const roomIds = getAllRoomIds();
  for (const roomId of roomIds) {
    const room = getRoom(roomId);
    if (room) {
      for (const [sessionId] of room.users) {
        broadcastToSession(sessionId, 'session_ended', {
          roomId,
          reason: 'disconnect',
        });
      }
    }
    removeRoom(roomId);
  }

  // Close server
  io.close();
  httpServer.close();

  console.log('[shutdown] Server closed.');
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  console.error('[fatal] Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[fatal] Unhandled rejection:', reason);
});
