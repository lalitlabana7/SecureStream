// SecureStream application constants
// Values read from environment variables with sensible defaults.

// ─── Server-side configuration ────────────────────────────────
// These are used by API routes and server components.

export const SIGNALING_PORT = parseInt(process.env.SIGNALING_PORT || '3003', 10);
export const MODERATION_PORT = parseInt(process.env.MODERATION_PORT || '3004', 10);

export const TRUST_DEFAULT_SCORE = 100;
export const TRUST_BLACKLIST_THRESHOLD = parseInt(process.env.TRUST_BLACKLIST_THRESHOLD || '30', 10);
export const TRUST_MAX_SCORE = 100;
export const TRUST_MIN_SCORE = 0;

export const TRUST_CHANGE = {
  CLEAN_DISCONNECT: 2,
  FAST_SKIP: -1,
  CONFIRMED_VIOLATION: -10,
  PARTNER_REPORT: -5,
  BLACKLIST_RESET_SCORE: 50,
} as const;

export const FAST_SKIP_WINDOW_MS = parseInt(process.env.FAST_SKIP_WINDOW_MS || '10000', 10);
export const FAST_SKIP_PENALTY_SECONDS = parseInt(process.env.FAST_SKIP_PENALTY_SECONDS || '30', 10);
export const FAST_SKIP_RATE_LIMIT = 3; // within window → longer penalty

export const HEARTBEAT_TIMEOUT_SECONDS = Math.max(5, Math.floor(
  parseInt(process.env.HEARTBEAT_TIMEOUT_MS || '30000', 10) / 1000,
));

export const QUEUE_MAX_USERS = parseInt(process.env.MAX_QUEUE_SIZE || '200', 10);
export const QUEUE_RATE_LIMIT_MAX = 5; // joins per minute
export const QUEUE_RATE_LIMIT_WINDOW_MS = 60_000;
export const SKIP_RATE_LIMIT_MS = 5_000;

export const BLACKLIST_DURATION_HOURS = 24;

// ─── Client-side configuration ────────────────────────────────
// These are exposed to the browser via NEXT_PUBLIC_* env vars.

export const HEARTBEAT_INTERVAL_MS = parseInt(
  process.env.NEXT_PUBLIC_HEARTBEAT_INTERVAL_MS || '2000', 10,
);

export const FRAME_WIDTH = parseInt(process.env.NEXT_PUBLIC_FRAME_WIDTH || '128', 10);
export const FRAME_HEIGHT = parseInt(process.env.NEXT_PUBLIC_FRAME_HEIGHT || '96', 10);
export const FRAME_QUALITY = parseFloat(process.env.NEXT_PUBLIC_FRAME_QUALITY || '0.3');
export const FRAME_MAX_SIZE_KB = parseInt(process.env.FRAME_MAX_SIZE_KB || '100', 10);

export const ICE_RESTART_MAX_ATTEMPTS = 2;
export const FROZEN_STREAM_TIMEOUT_MS = 10_000;

// STUN servers — configurable via individual env vars with sensible defaults
const stun1 = process.env.NEXT_PUBLIC_STUN_SERVER_1 || 'stun:stun.l.google.com:19302';
const stun2 = process.env.NEXT_PUBLIC_STUN_SERVER_2 || 'stun:stun1.l.google.com:19302';
export const STUN_SERVERS = [
  stun1,
  ...(stun2 !== stun1 ? [stun2] : []),
] as const;

// TURN server — optional, configured via env
export const TURN_CONFIG = {
  urls: process.env.NEXT_PUBLIC_TURN_SERVER || '',
  username: process.env.NEXT_PUBLIC_TURN_USERNAME || '',
  credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL || '',
};

// App metadata — configurable via env
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'SecureStream';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
