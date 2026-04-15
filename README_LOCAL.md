# SecureStream — Local Development Guide

> Privacy-first, AI-moderated anonymous video chat platform

---

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Project Architecture](#project-architecture)
- [Quick Start](#quick-start)
- [Step-by-Step Setup](#step-by-step-setup)
  - [1. Clone & Install](#1-clone--install)
  - [2. Configure Environment](#2-configure-environment)
  - [3. Setup Database](#3-setup-database)
  - [4. Start Mini Services](#4-start-mini-services)
  - [5. Start Main Application](#5-start-main-application)
  - [6. Verify Everything Works](#6-verify-everything-works)
- [Development Scripts](#development-scripts)
- [Project Structure](#project-structure)
- [Environment Variables Reference](#environment-variables-reference)
- [Service Endpoints](#service-endpoints)
- [WebSocket Events Reference](#websocket-events-reference)
- [Troubleshooting](#troubleshooting)

---

## Overview

SecureStream is an Omegle-style anonymous video chat platform with:

- **WebRTC** peer-to-peer video connections (no video data passes through servers)
- **Socket.IO** real-time signaling server for matchmaking and WebRTC negotiation
- **VLM-based AI moderation** using z-ai-web-dev-sdk for real-time content analysis
- **Trust score system** (0–100) with automatic blacklisting
- **Fast-skip penalty box** to discourage rapid partner cycling
- **Kill-switch** for immediate session termination on high-risk content

### Tech Stack

| Layer | Technology | Port |
|-------|-----------|------|
| Frontend | Next.js 16 + React 19 + Tailwind CSS 4 + shadcn/ui | 3000 |
| Signaling Server | Socket.IO + Bun runtime | 3003 |
| Moderation Service | Bun.serve + z-ai-web-dev-sdk (VLM) | 3004 |
| Database | SQLite via Prisma ORM | file-based |
| Gateway | Caddy reverse proxy | 81 (external) |

---

## Prerequisites

Make sure you have the following installed on your system:

| Requirement | Minimum Version | Check Command |
|-------------|----------------|---------------|
| **Bun** | 1.0+ | `bun --version` |
| **Node.js** | 18+ (for Next.js) | `node --version` |
| **Git** | Latest | `git --version` |
| **Camera & Microphone** | Any modern browser | Browser permissions |

> **Note:** A modern browser (Chrome 90+, Firefox 90+, Edge 90+, Safari 15+) is required for WebRTC support.

---

## Quick Start

```bash
# 1. Clone the repository
git clone <your-repo-url> securestream
cd securestream

# 2. Install dependencies (all 3 projects)
bun install                                    # Main Next.js app
cd mini-services/signaling-server && bun install && cd ../..
cd mini-services/moderation-service && bun install && cd ../..

# 3. Copy and configure environment
cp .env.example .env

# 4. Initialize database
bun run db:push

# 5. Start all services (3 separate terminals)
# Terminal 1 — Main Next.js app
bun run dev

# Terminal 2 — Signaling Server
cd mini-services/signaling-server && bun run dev

# Terminal 3 — Moderation Service
cd mini-services/moderation-service && bun run dev

# 6. Open in browser
# Visit http://localhost:3000
```

---

## Step-by-Step Setup

### 1. Clone & Install

```bash
# Clone the project
git clone <your-repo-url> securestream
cd securestream
```

Install dependencies for **all three** sub-projects:

```bash
# Main Next.js application
bun install

# Signaling server (Socket.IO)
cd mini-services/signaling-server
bun install
cd ../..

# Moderation service (VLM analysis)
cd mini-services/moderation-service
bun install
cd ../..
```

> **Why 3 installs?** Each mini-service is an independent Bun project with its own `package.json` and `bun.lock`.

### 2. Configure Environment

Copy the example env file and review the values:

```bash
cp .env.example .env
```

For local development, the defaults in `.env` work out of the box:

```env
# Database (default: SQLite in db/ folder)
DATABASE_URL=file:./db/custom.db

# CORS — only localhost for dev
ALLOWED_ORIGINS=http://localhost:3000

# Service ports
SIGNALING_PORT=3003
MODERATION_PORT=3004

# WebRTC STUN servers (Google's free public STUN)
NEXT_PUBLIC_STUN_SERVER_1=stun:stun.l.google.com:19302
NEXT_PUBLIC_STUN_SERVER_2=stun:stun1.l.google.com:19302

# TURN servers (leave empty for local — needed for NAT traversal in production)
NEXT_PUBLIC_TURN_SERVER=
NEXT_PUBLIC_TURN_USERNAME=
NEXT_PUBLIC_TURN_CREDENTIAL=
```

> **Important:** `NEXT_PUBLIC_*` variables are embedded at build time and exposed to the browser. Never put secrets in them.

### 3. Setup Database

SecureStream uses SQLite with Prisma ORM. The database stores trust scores, blacklists, and moderation events.

```bash
# Push the schema to create/update tables
bun run db:push
```

This creates/updates the `db/custom.db` SQLite file with these tables:

| Table | Purpose |
|-------|---------|
| `TrustRecord` | User trust scores (0–100 scale) |
| `Blacklist` | Suspended sessions with expiry times |
| `ModerationEvent` | Audit log of moderation actions |

> **Note:** If you get a "prisma not found" error, run `bun run db:generate` first, then `bun run db:push`.

### 4. Start Mini Services

You need **3 separate terminal sessions** (or use a process manager like `tmux` or `concurrently`).

#### Option A: Separate Terminals

**Terminal 1 — Signaling Server** (must start before main app):
```bash
cd mini-services/signaling-server
bun run dev
```

Expected output:
```
[signaling-server] SecureStream signaling server running on port 3003
[signaling-server] Health check: http://localhost:3003/health
```

**Terminal 2 — Moderation Service**:
```bash
cd mini-services/moderation-service
bun run dev
```

Expected output:
```
[Moderation Service] Running on http://localhost:3004
[Moderation Service] Max frame size: 200KB
[Moderation Service] Endpoints: POST /api/moderate | GET /health | GET /api/stats
```

#### Option B: Background Processes

If you prefer to run services in the background:

```bash
# Start signaling server in background
cd mini-services/signaling-server
nohup bun run dev > ../../logs/signaling.log 2>&1 &
echo $! > ../../logs/signaling.pid
cd ../..

# Start moderation service in background
cd mini-services/moderation-service
nohup bun run dev > ../../logs/moderation.log 2>&1 &
echo $! > ../../logs/moderation.pid
cd ../..

# Create logs directory if needed
mkdir -p logs
```

To stop background services:
```bash
kill $(cat logs/signaling.pid) 2>/dev/null
kill $(cat logs/moderation.pid) 2>/dev/null
```

### 5. Start Main Application

**Terminal 3 — Next.js App**:
```bash
bun run dev
```

Expected output:
```
  ▲ Next.js 16.x
  - Local:   http://localhost:3000
  - Environments: .env
```

> **Note:** The dev server logs output to both the terminal and `dev.log` in the project root.

### 6. Verify Everything Works

Open **http://localhost:3000** in your browser (use two different browser windows or two devices for testing).

**Health checks** — verify all services are running:

```bash
# Main app
curl http://localhost:3000

# Signaling server
curl http://localhost:3003/health

# Moderation service
curl http://localhost:3004/health
```

Expected responses:
```json
// Signaling: {"status":"ok","uptime":0,"rooms":0,"queueSize":0,"online":0,"totalConnections":0}
// Moderation: {"status":"ok","uptime":0,"timestamp":1234567890}
```

**Basic test flow:**
1. Open two browser tabs at `http://localhost:3000`
2. Click "Start" / "Find Partner" on both tabs
3. Both should pair and see each other's video
4. Test text chat, skip, and end buttons
5. Check the browser console (F12) for WebSocket events

---

## Development Scripts

All scripts are run from the project root:

| Command | Description |
|---------|-------------|
| `bun run dev` | Start Next.js dev server (port 3000) |
| `bun run lint` | Run ESLint to check code quality |
| `bun run db:push` | Push Prisma schema changes to SQLite |
| `bun run db:generate` | Generate Prisma Client types |
| `bun run db:reset` | Reset database (drops all data) |

Mini-service scripts (run from their directories):

| Command | Description |
|---------|-------------|
| `cd mini-services/signaling-server && bun run dev` | Start signaling server (port 3003) |
| `cd mini-services/moderation-service && bun run dev` | Start moderation service (port 3004) |

---

## Project Structure

```
securestream/
├── .env.example                    # Environment variable template
├── .env                            # Your local config (git-ignored)
├── Caddyfile                       # Reverse proxy gateway config
├── next.config.ts                  # Next.js config (security headers, standalone output)
├── package.json                    # Main app dependencies
├── prisma/
│   └── schema.prisma               # Database schema (SQLite)
├── db/
│   └── custom.db                   # SQLite database file (auto-created)
├── public/
│   ├── logo.svg                    # App logo
│   ├── og-image.svg                # Open Graph share image
│   ├── manifest.json               # PWA manifest
│   └── robots.txt                  # Search engine directives
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout with SEO metadata
│   │   ├── page.tsx                # Main page → VideoChat component
│   │   ├── globals.css             # Tailwind + global styles
│   │   ├── sitemap.ts              # Dynamic sitemap generation
│   │   └── api/
│   │       └── moderation/
│   │           └── route.ts        # Moderation proxy API route
│   ├── components/
│   │   ├── securestream/           # App-specific components
│   │   │   ├── VideoChat.tsx       # Root component (state machine)
│   │   │   ├── LandingPage.tsx     # Entry page with branding
│   │   │   ├── MatchQueue.tsx      # Animated queue waiting UI
│   │   │   ├── LocalVideo.tsx      # Camera preview (PiP)
│   │   │   ├── RemoteVideo.tsx     # Partner video display
│   │   │   ├── ChatControls.tsx    # Skip/End/Report controls
│   │   │   ├── TextChat.tsx        # Text messaging overlay
│   │   │   ├── ConnectionStatus.tsx # 5-state connection indicator
│   │   │   ├── TrustBadge.tsx      # Color-coded trust score
│   │   │   ├── ModerationOverlay.tsx # Blur + warning overlay
│   │   │   ├── PenaltyOverlay.tsx  # Cooldown countdown screen
│   │   │   ├── BlacklistOverlay.tsx # Suspension screen
│   │   │   ├── DisconnectedScreen.tsx # Post-session summary
│   │   │   ├── SessionTimer.tsx    # Session duration display
│   │   │   ├── ReportDialog.tsx    # User report form
│   │   │   ├── OnlineCount.tsx     # Live online user count
│   │   │   └── SoundEffects.tsx    # Audio feedback
│   │   └── ui/                     # shadcn/ui component library
│   ├── hooks/
│   │   ├── useSignaling.ts         # Socket.IO client + auto-reconnect
│   │   ├── useMediaStream.ts       # Camera/mic permission management
│   │   ├── useWebRTC.ts            # RTCPeerConnection lifecycle
│   │   ├── useModeration.ts        # 2s heartbeat frame capture
│   │   └── useTrustScore.ts        # Trust score display state
│   ├── lib/
│   │   ├── constants.ts            # App-wide constants from env
│   │   ├── db.ts                   # Prisma client singleton
│   │   ├── utils.ts                # Utility functions
│   │   ├── webrtc-config.ts        # ICE/STUN/TURN configuration
│   │   ├── sanitize.ts             # Input sanitization helpers
│   │   └── logger.ts               # Structured logging
│   └── types/
│       └── securestream.ts         # TypeScript type definitions
├── mini-services/
│   ├── signaling-server/           # Socket.IO signaling (port 3003)
│   │   ├── index.ts                # Main entry: 11 event handlers
│   │   ├── matchmaking.ts          # FIFO queue with instant pairing
│   │   ├── room-manager.ts         # Room lifecycle + heartbeat tracking
│   │   ├── trust-engine.ts         # Trust score via Prisma
│   │   ├── penalty-box.ts          # Fast-skip detection & cooldown
│   │   ├── blacklist.ts            # 24h blacklist enforcement
│   │   ├── rate-limiter.ts         # Sliding window rate limiting
│   │   ├── types.ts                # Server-side type definitions
│   │   ├── package.json            # Dependencies (socket.io)
│   │   └── bun.lock
│   └── moderation-service/         # AI moderation (port 3004)
│       ├── index.ts                # REST server (Bun.serve)
│       ├── analyzer.ts             # VLM frame analysis
│       ├── risk-scorer.ts          # Weighted composite scoring
│       ├── action-mapper.ts        # Risk → action mapping
│       ├── types.ts                # Request/response types
│       ├── package.json            # Dependencies (z-ai-web-dev-sdk)
│       └── bun.lock
├── worklog.md                      # Implementation plan & changelog
└── dev.log                         # Next.js dev server log (auto-generated)
```

---

## Environment Variables Reference

All variables are defined in `.env`. Copy from `.env.example` and customize.

### Server-Side Variables (not exposed to browser)

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `file:./db/custom.db` | SQLite database file path |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated CORS origins |
| `SIGNALING_PORT` | `3003` | Signaling server port |
| `MODERATION_PORT` | `3004` | Moderation service port |
| `MODERATION_SERVICE_URL` | `http://localhost:3004` | Internal URL for moderation API |
| `TRUST_BLACKLIST_THRESHOLD` | `30` | Trust score at which users are auto-blacklisted (0–100) |
| `FAST_SKIP_WINDOW_MS` | `10000` | Time (ms) after match before skip counts as "fast" |
| `FAST_SKIP_PENALTY_SECONDS` | `30` | Cooldown time for fast-skip penalty (first offense) |
| `HEARTBEAT_TIMEOUT_MS` | `30000` | Time (ms) without heartbeat before session is considered stale |
| `MAX_QUEUE_SIZE` | `200` | Maximum users allowed in matchmaking queue |
| `FRAME_MAX_SIZE_KB` | `200` | Maximum moderation frame size in KB |

### Client-Side Variables (exposed to browser via `NEXT_PUBLIC_*`)

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_STUN_SERVER_1` | `stun:stun.l.google.com:19302` | Primary STUN server |
| `NEXT_PUBLIC_STUN_SERVER_2` | `stun:stun1.l.google.com:19302` | Secondary STUN server |
| `NEXT_PUBLIC_TURN_SERVER` | *(empty)* | TURN server URL (needed for production NAT) |
| `NEXT_PUBLIC_TURN_USERNAME` | *(empty)* | TURN server username |
| `NEXT_PUBLIC_TURN_CREDENTIAL` | *(empty)* | TURN server credential |
| `NEXT_PUBLIC_APP_NAME` | `SecureStream` | App name displayed in UI |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Public app URL (for SEO metadata) |
| `NEXT_PUBLIC_HEARTBEAT_INTERVAL_MS` | `2000` | How often (ms) to send moderation frames |
| `NEXT_PUBLIC_FRAME_WIDTH` | `128` | Moderation frame capture width (px) |
| `NEXT_PUBLIC_FRAME_HEIGHT` | `96` | Moderation frame capture height (px) |
| `NEXT_PUBLIC_FRAME_QUALITY` | `0.3` | JPEG quality for moderation frames (0–1) |

---

## Service Endpoints

### Next.js App (Port 3000)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Main application page |
| `GET` | `/sitemap.xml` | Dynamic sitemap for SEO |
| `POST` | `/api/moderation` | Proxy endpoint for moderation service |

### Signaling Server (Port 3003)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check + stats |
| `GET` | `/api/stats` | Detailed service statistics |
| `WS` | `/` | Socket.IO WebSocket connection |

### Moderation Service (Port 3004)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/api/stats` | Moderation statistics |
| `POST` | `/api/moderate` | Analyze a video frame |

---

## WebSocket Events Reference

### Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `join_queue` | `{ sessionId }` | Enter matchmaking queue |
| `leave_queue` | `{ sessionId }` | Leave the queue |
| `offer` | `{ roomId, sdp }` | WebRTC offer (initiator) |
| `answer` | `{ roomId, sdp }` | WebRTC answer (responder) |
| `ice_candidate` | `{ roomId, candidate }` | ICE candidate exchange |
| `ice_restart` | `{ roomId }` | Request ICE restart on failure |
| `skip` | `{ roomId, reason, requeue }` | Skip current partner |
| `report` | `{ roomId, targetSessionId, reason }` | Report partner |
| `chat_message` | `{ roomId, sessionId, text }` | Send text message |
| `moderation_flag` | `{ roomId, targetSessionId, analysis }` | Kill-switch trigger |
| `moderation_warning` | `{ roomId, targetSessionId, message }` | Send warning to partner |
| `heartbeat` | `{ sessionId }` | Keep-alive ping |

### Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `matched` | `{ roomId, partnerSessionId, initiator }` | Successfully paired |
| `queue_update` | `{ position, estimatedWait }` | Queue position update |
| `queue_rejected` | `{ reason, cooldownSeconds? }` | Queue entry rejected |
| `session_ended` | `{ roomId, reason, trustChange?, penalty? }` | Session terminated |
| `blacklisted` | `{ reason, expiresAt }` | User is blacklisted |
| `moderation_kill` | `{ roomId, targetSessionId, reason }` | Immediate termination |
| `moderation_warning` | `{ roomId, fromSessionId, message }` | Warning received |
| `report_acknowledged` | `{ roomId, targetSessionId, message }` | Report confirmed |
| `chat_message` | `{ roomId, fromSessionId, text, timestamp }` | Incoming text message |
| `online_count` | `{ count }` | Live online user count |
| `server_shutdown` | `{ message }` | Server is shutting down |

---

## Troubleshooting

### "Cannot connect to signaling server"

- Ensure the signaling server is running: `curl http://localhost:3003/health`
- Check that `SIGNALING_PORT` in `.env` matches the actual port
- Check browser console for WebSocket connection errors
- Verify `ALLOWED_ORIGINS` includes `http://localhost:3000`

### "Camera/Microphone not working"

- Ensure you've granted camera and microphone permissions in your browser
- Use HTTPS in production (browsers block `getUserMedia` on insecure origins)
- In Chrome: check `chrome://settings/content/camera` and `chrome://settings/content/microphone`
- Try a different browser to rule out browser-specific issues

### "Partner's video is black / not showing"

- WebRTC requires at least one STUN server. Verify your STUN configuration
- Both users must be on networks that allow UDP traffic
- Behind corporate NATs/firewalls, you may need a TURN server
- Check browser console for ICE connection state errors

### "Moderation not working"

- Ensure the moderation service is running: `curl http://localhost:3004/health`
- Check that `MODERATION_SERVICE_URL` in `.env` points to the correct service
- Review the moderation service logs for VLM analysis errors
- Verify `z-ai-web-dev-sdk` is properly installed in `mini-services/moderation-service/`

### "Database errors"

- Run `bun run db:push` to sync the schema
- If still failing, try `bun run db:reset` (WARNING: deletes all data)
- Ensure the `db/` directory exists and is writable
- Check `DATABASE_URL` in `.env` — must be a valid SQLite path

### "Port already in use"

```bash
# Find what's using the port
lsof -i :3000   # or :3003 or :3004

# Kill the process
kill -9 <PID>
```

### "Hot reload not working for mini-services"

- The mini-services use `bun --hot` which watches for file changes
- If hot reload stops, restart the service manually
- Check that the correct working directory is set when running `bun run dev`

### "Trust score / Blacklist issues"

- Trust scores are stored in SQLite via Prisma
- A score of ≤30 triggers automatic 24-hour blacklisting
- To manually reset a user's data, use `bun run db:reset`
- Check the signaling server logs for trust score updates

### Clean Slate Reset

If everything is broken and you want to start fresh:

```bash
# Stop all services (Ctrl+C in each terminal)

# Reset database
bun run db:reset

# Reinstall dependencies
rm -rf node_modules bun.lock .next
cd mini-services/signaling-server && rm -rf node_modules bun.lock && cd ../..
cd mini-services/moderation-service && rm -rf node_modules bun.lock && cd ../..
bun install
cd mini-services/signaling-server && bun install && cd ../..
cd mini-services/moderation-service && bun install && cd ../..

# Re-setup database
bun run db:push

# Start fresh
bun run dev
```
