export type RiskLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';
export type ModerationAction = 'allow' | 'warn' | 'blur' | 'terminate' | 'blacklist';

export interface ModerationRequest {
  sessionId: string;
  roomId: string;
  frame: string;  // base64-encoded JPEG (may include data URI prefix)
  timestamp: number;
}

export interface FrameAnalysis {
  face_count: number;
  human_present: boolean;
  nsfw_score: number;
  bot_score: number;
}

export interface ModerationAnalysis {
  face_count: number;
  human_present: boolean;
  nsfw_score: number;
  bot_score: number;
  risk_level: RiskLevel;
  recommended_action: ModerationAction;
  high_risk: boolean;
}

export interface ModerationResponse {
  sessionId: string;
  roomId: string;
  analysis: ModerationAnalysis;
  processing_time_ms: number;
  timestamp: number;
}

export interface ErrorResponse {
  error: string;
  message: string;
}
