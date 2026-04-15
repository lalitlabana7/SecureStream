// ============================================================
// SecureStream Signaling Server — Shared Type Definitions
// ============================================================

// ----- Room / Session Types -----

export interface RoomState {
  roomId: string;
  users: Map<string, RoomUser>;
  createdAt: number;
  matchTimestamp: number; // when both users were paired
}

export interface RoomUser {
  sessionId: string;
  socketId: string;
  joinedAt: number;
  lastHeartbeat: number;
  matchTimestamp: number; // when this specific user was matched
}

// ----- Join Queue -----

export interface JoinRequest {
  sessionId: string;
  socketId: string;
  joinedAt: number;
}

// ----- Penalty Box -----

export interface PenaltyRecord {
  sessionId: string;
  cooldownUntil: number;   // Unix ms
  fastSkipCount: number;
  firstSkipTime: number;   // Unix ms — start of the 5-min tracking window
}

// ----- Trust Engine Constants -----

export const TRUST = {
  CLEAN_DISCONNECT: 2,
  FAST_SKIP: -1,
  VIOLATION: -10,
  DEFAULT: 100,
  BLACKLIST_THRESHOLD: 30,
  MIN: 0,
  MAX: 100,
} as const;

// ----- Penalty Box Constants -----

export const PENALTY = {
  FAST_SKIP_WINDOW_MS: 10_000,       // 10s threshold for "fast skip"
  BASE_COOLDOWN_MS: 30_000,          // 30s cooldown per fast skip
  ESCALATED_COOLDOWN_MS: 300_000,    // 5-min cooldown after 3 fast skips
  FAST_SKIP_LIMIT: 3,                // fast skips before escalation
  TRACKING_WINDOW_MS: 300_000,       // 5-min window to count fast skips
} as const;

// ----- Blacklist Constants -----

export const BLACKLIST = {
  DURATION_MS: 24 * 60 * 60 * 1000, // 24 hours
} as const;

// ----- Heartbeat Constants -----

export const HEARTBEAT = {
  TIMEOUT_MS: 30_000,   // 30s no heartbeat → stale
  CLEAN_MIN_MS: 60_000, // session > 60s → "clean disconnect"
} as const;

// ----- Rate Limiter Constants -----

export const RATE_LIMIT = {
  JOIN_QUEUE_MAX: 5,
  JOIN_QUEUE_WINDOW_MS: 60_000,
  SKIP_MAX: 1,
  SKIP_WINDOW_MS: 5_000,
} as const;

// ----- Socket Event Payloads -----

// Client → Server
export interface JoinQueuePayload {
  sessionId: string;
}

export interface OfferPayload {
  roomId: string;
  sdp: string;
}

export interface AnswerPayload {
  roomId: string;
  sdp: string;
}

export interface IceCandidatePayload {
  roomId: string;
  candidate: RTCIceCandidateInit;
}

export interface SkipPayload {
  roomId: string;
  sessionId: string;
  reason?: 'user_skip' | 'violation';
  requeue?: boolean; // whether to re-join the queue after skip
}

export interface ReportPayload {
  roomId: string;
  sessionId: string;
  targetSessionId: string;
  reason: string;
}

export interface HeartbeatPayload {
  roomId: string;
  sessionId: string;
  timestamp: number;
}

// Moderation analysis object (as sent by the frontend moderation hook)
export interface ModerationAnalysis {
  face_count?: number;
  human_present?: boolean;
  nsfw_score?: number;
  bot_score?: number;
  risk_level?: 'none' | 'low' | 'medium' | 'high' | 'critical';
  recommended_action?: 'allow' | 'warn' | 'blur' | 'terminate' | 'blacklist';
  high_risk?: boolean;
}

// BUG 2 FIX: Updated ModerationFlagPayload to match frontend shape
// Frontend sends: { roomId, targetSessionId, analysis: { risk_level, recommended_action, ... } }
export interface ModerationFlagPayload {
  roomId: string;
  targetSessionId: string;
  analysis?: ModerationAnalysis;
  // Legacy fields (kept for backward compat, but optional)
  reason?: string;
  riskLevel?: string;
}

export interface ModerationWarningPayload {
  roomId: string;
  targetSessionId: string;
  message: string;
}

export interface IceRestartPayload {
  roomId: string;
  sessionId: string;
}

// FEATURE: Chat message relay
export interface ChatMessagePayload {
  roomId: string;
  sessionId: string;
  text: string;
}

// Server → Client
export interface QueueUpdatePayload {
  position: number;
  estimatedWait: number;
}

export interface MatchedPayload {
  roomId: string;
  partnerSessionId: string;
  initiator: boolean;
}

export interface SessionEndedPayload {
  roomId: string;
  reason: 'skip' | 'disconnect' | 'violation' | 'timeout' | 'moderation_kill';
  trustChange?: number;
  penalty?: { cooldownSeconds: number };
}

export interface ModerationKillPayload {
  roomId: string;
  targetSessionId: string;
  reason: string;
}

export interface BlacklistedPayload {
  reason: string;
  expiresAt?: string; // ISO date
}

export interface QueueRejectedPayload {
  reason: string;
  cooldownSeconds?: number;
}

export interface RelayedOfferPayload {
  roomId: string;
  sdp: string;
  fromSessionId: string;
}

export interface RelayedAnswerPayload {
  roomId: string;
  sdp: string;
  fromSessionId: string;
}

export interface RelayedIceCandidatePayload {
  roomId: string;
  candidate: RTCIceCandidateInit;
  fromSessionId: string;
}

export interface RelayedIceRestartPayload {
  roomId: string;
  fromSessionId: string;
}

// FEATURE: Chat message relay (Server → Partner)
export interface RelayedChatMessagePayload {
  type: 'chat_message';
  roomId: string;
  fromSessionId: string;
  text: string;
  timestamp: number;
}

// FEATURE: Online count broadcast (Server → All)
export interface OnlineCountPayload {
  type: 'online_count';
  count: number;
}

// FEATURE: Stats response
export interface StatsResponse {
  totalSessions: number;
  activeRooms: number;
  queueSize: number;
  totalUsers: number;
}

// ----- Server Configuration from Environment -----

export interface ServerConfig {
  port: number;
  trustBlacklistThreshold: number;
  fastSkipWindowMs: number;
  heartbeatTimeoutMs: number;
  maxQueueSize: number;
}

export function loadConfig(): ServerConfig {
  return {
    port: parseInt(process.env.PORT || '3003', 10),
    trustBlacklistThreshold: parseInt(process.env.TRUST_BLACKLIST_THRESHOLD || '30', 10),
    fastSkipWindowMs: parseInt(process.env.FAST_SKIP_WINDOW_MS || '10000', 10),
    heartbeatTimeoutMs: parseInt(process.env.HEARTBEAT_TIMEOUT_MS || '30000', 10),
    maxQueueSize: parseInt(process.env.MAX_QUEUE_SIZE || '200', 10),
  };
}
