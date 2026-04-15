# SecureStream — Local Development Setup

## Prerequisites
- **Bun** (latest) — https://bun.sh
- A modern browser with camera/mic (Chrome recommended)

## Quick Start (3 terminals)

```bash
# Terminal 1 — Signaling Server (port 3003)
cd mini-services/signaling-server
bun install
bun index.ts

# Terminal 2 — Moderation Service (port 3004)
cd mini-services/moderation-service
bun install
bun index.ts

# Terminal 3 — Next.js Frontend (port 3000)
cd /home/z/my-project
bun install
bun run dev
```

Then open **http://localhost:3000** in your browser.

## Environment Variables

Copy `.env.example` to `.env` (already configured):

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `file:./db/custom.db` | SQLite database path |
| `NEXT_PUBLIC_TURN_SERVER` | _(empty)_ | Optional TURN server URL |
| `NEXT_PUBLIC_TURN_USERNAME` | _(empty)_ | TURN credentials |
| `NEXT_PUBLIC_TURN_CREDENTIAL` | _(empty)_ | TURN credentials |

## Architecture

```
Browser (localhost:3000)
    │
    ├── Socket.IO ──→ Signaling Server (:3003)
    │                  ├── Matchmaking queue
    │                  ├── WebRTC signaling relay
    │                  └── Trust / penalty / blacklist
    │
    ├── HTTP POST ──→ Moderation Service (:3004)
    │                  └── VLM frame analysis (every 2s)
    │
    └── WebRTC P2P ──→ Direct video/audio with partner
```

## Ports

| Port | Service |
|------|---------|
| 3000 | Next.js frontend |
| 3003 | Socket.IO signaling server |
| 3004 | REST moderation service |

## Testing with Two Tabs

1. Open `http://localhost:3000` in **Tab A**
2. Open `http://localhost:3000` in **Tab B**
3. Both tabs: click **"Start Chat"** → allow camera
4. Both enter the queue → should auto-match within seconds
5. WebRTC connection establishes → video streams in both tabs

## Troubleshooting

- **"Camera permission denied"** → Check browser URL bar for camera icon, allow access
- **No match found** → Need 2 tabs/users in queue simultaneously
- **Connection failed** → STUN servers may be blocked; configure TURN in `.env`
- **Port already in use** → `lsof -i :3000` to find and kill the process
