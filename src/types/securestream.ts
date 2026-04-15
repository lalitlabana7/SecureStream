// ─── Socket Message Types ───────────────────────────────────────────────────

export type SocketEventType =
  | 'join_queue'
  | 'leave_queue'
  | 'queue_update'
  | 'queue_rejected'
  | 'matched'
  | 'offer'
  | 'answer'
  | 'ice_candidate'
  | 'skip'
  | 'report'
  | 'session_ended'
  | 'moderation_kill'
  | 'moderation_flag'
  | 'moderation_warning'
  | 'heartbeat'
  | 'pong'
  | 'ice_restart'
  | 'peer_reconnecting'
  | 'blacklisted'
  | 'trust_update'
  | 'chat_message'
  | 'online_count';

export type DisconnectReason =
  | 'skip'
  | 'disconnect'
  | 'violation'
  | 'timeout'
  | 'moderation_kill'
  | 'ice_failure'
  | 'permission_denied';

// ─── Signaling Messages ─────────────────────────────────────────────────────

export interface JoinQueuePayload {
  type: 'join_queue';
  sessionId: string;
}

export interface QueueUpdatePayload {
  type: 'queue_update';
  position: number;
  estimatedWait: number;
}

export interface QueueRejectedPayload {
  type: 'queue_rejected';
  reason: 'blacklisted' | 'penalty' | 'rate_limited';
  cooldownSeconds?: number;
  blacklistExpiry?: string;
}

export interface MatchedPayload {
  type: 'matched';
  roomId: string;
  partnerSessionId: string;
  initiator: boolean;
}

export interface OfferPayload {
  type: 'offer';
  roomId: string;
  sdp: string;
}

export interface AnswerPayload {
  type: 'answer';
  roomId: string;
  sdp: string;
}

export interface IceCandidatePayload {
  type: 'ice_candidate';
  roomId: string;
  candidate: RTCIceCandidateInit;
}

export interface SkipPayload {
  type: 'skip';
  roomId: string;
  sessionId: string;
  reason?: 'user_skip' | 'violation';
}

export interface ReportPayload {
  type: 'report';
  roomId: string;
  sessionId: string;
  reason: string;
}

export interface SessionEndedPayload {
  type: 'session_ended';
  roomId: string;
  reason: DisconnectReason;
  trustChange?: number;
  penalty?: { cooldownSeconds: number };
}

export interface ModerationKillPayload {
  type: 'moderation_kill';
  roomId: string;
  targetSessionId: string;
  reason: string;
}

export interface ModerationFlagPayload {
  type: 'moderation_flag';
  roomId: string;
  targetSessionId: string;
  analysis: ModerationAnalysis;
}

export interface ModerationWarningPayload {
  type: 'moderation_warning';
  roomId: string;
  analysis: ModerationAnalysis;
}

export interface HeartbeatPayload {
  type: 'heartbeat';
  roomId: string;
  sessionId: string;
  timestamp: number;
}

export interface IceRestartPayload {
  type: 'ice_restart';
  roomId: string;
  sessionId: string;
}

export interface BlacklistedPayload {
  type: 'blacklisted';
  reason: string;
  expiresAt?: string;
}

export interface TrustUpdatePayload {
  type: 'trust_update';
  score: number;
  change: number;
}

export interface ChatMessagePayload {
  type: 'chat_message';
  fromSessionId: string;
  text: string;
  time: number;
}

export interface OnlineCountPayload {
  type: 'online_count';
  count: number;
}

export type ServerToClientPayload =
  | QueueUpdatePayload
  | QueueRejectedPayload
  | MatchedPayload
  | OfferPayload
  | AnswerPayload
  | IceCandidatePayload
  | SessionEndedPayload
  | ModerationKillPayload
  | ModerationWarningPayload
  | BlacklistedPayload
  | TrustUpdatePayload
  | ChatMessagePayload
  | OnlineCountPayload;

export type ClientToServerPayload =
  | JoinQueuePayload
  | SkipPayload
  | ReportPayload
  | OfferPayload
  | AnswerPayload
  | IceCandidatePayload
  | HeartbeatPayload
  | IceRestartPayload
  | ModerationFlagPayload
  | ChatMessagePayload;

// ─── Moderation Types ───────────────────────────────────────────────────────

export type RiskLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';
export type ModerationAction = 'allow' | 'warn' | 'blur' | 'terminate' | 'blacklist';

export interface ModerationAnalysis {
  face_count: number;
  human_present: boolean;
  nsfw_score: number;
  bot_score: number;
  risk_level: RiskLevel;
  recommended_action: ModerationAction;
  high_risk: boolean;
}

export interface ModerationRequest {
  sessionId: string;
  roomId: string;
  frame: string;
  timestamp: number;
}

export interface ModerationResponse {
  sessionId: string;
  roomId: string;
  analysis: ModerationAnalysis;
  processing_time_ms: number;
  timestamp: number;
}

// ─── App State ──────────────────────────────────────────────────────────────

export type AppPhase =
  | 'landing'
  | 'permission'
  | 'queueing'
  | 'matched'
  | 'active'
  | 'penalty'
  | 'blacklisted'
  | 'disconnected'
  | 'error';

export interface AppState {
  phase: AppPhase;
  sessionId: string;
  roomId: string | null;
  partnerId: string | null;
  isInitiator: boolean;
  queuePosition: number;
  estimatedWait: number;
  penaltyCooldown: number;
  blacklistReason: string | null;
  blacklistExpiry: string | null;
  disconnectReason: DisconnectReason | null;
  errorMessage: string | null;
  trustScore: number;
  trustChange: number;
  lastModeration: ModerationAnalysis | null;
}

export interface PenaltyInfo {
  cooldownSeconds: number;
  fastSkipCount: number;
  firstSkipTime: number | null;
}
