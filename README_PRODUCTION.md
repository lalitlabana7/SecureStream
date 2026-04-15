# SecureStream — Production Deployment Guide

> Privacy-first, AI-moderated anonymous video chat platform

---

## Table of Contents

- [Production Architecture](#production-architecture)
- [Prerequisites](#prerequisites)
- [Before You Deploy](#before-you-deploy)
- [Deployment Options](#deployment-options)
  - [Option A: Single Server (VPS)](#option-a-single-server-vps)
  - [Option B: Docker Compose](#option-b-docker-compose)
  - [Option C: Kubernetes (Advanced)](#option-c-kubernetes-advanced)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [SSL / HTTPS Setup](#ssl--https-setup)
- [TURN Server Setup (Critical)](#turn-server-setup-critical)
- [Building for Production](#building-for-production)
- [Running in Production](#running-in-production)
- [Process Management (PM2)](#process-management-pm2)
- [Reverse Proxy (Nginx)](#reverse-proxy-nginx)
- [Scaling Strategy](#scaling-strategy)
- [Monitoring & Health Checks](#monitoring--health-checks)
- [Security Checklist](#security-checklist)
- [Performance Optimization](#performance-optimization)
- [Backup & Recovery](#backup--recovery)
- [Disaster Recovery](#disaster-recovery)
- [Troubleshooting Production Issues](#troubleshooting-production-issues)

---

## Production Architecture

```
                    ┌─────────────────────┐
                    │   DNS / CDN         │
                    │   (CloudFlare, etc) │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Nginx / Caddy     │
                    │   (SSL Termination) │
                    │   Port 443          │
                    └──┬────────┬─────────┘
                       │        │
          ┌────────────▼──┐  ┌──▼────────────┐
          │  Next.js App  │  │  Socket.IO    │
          │  (Port 3000)  │  │  Signaling    │
          │  Static + SSR │  │  (Port 3003)  │
          └───────┬───────┘  └──────┬────────┘
                  │                 │
          ┌───────▼───────┐  ┌─────▼──────────┐
          │  Moderation   │  │  SQLite / DB   │
          │  Service      │  │  (Trust, Logs) │
          │  (Port 3004)  │  └────────────────┘
          └───────────────┘
```

**Key production differences from local:**

| Aspect | Local | Production |
|--------|-------|------------|
| HTTPS | Not required | **Mandatory** (WebRTC requires secure context) |
| TURN Server | Not needed | **Required** for NAT traversal |
| Database | SQLite file | PostgreSQL recommended (or SQLite with backups) |
| Process Manager | Manual terminals | PM2 / systemd / Docker |
| Logs | Console output | File-based with rotation |
| CORS | `localhost` only | Your production domain(s) |
| CSP Headers | Development mode | Strict production policies |
| Frame Size | 200KB default | Tuned based on VLM capacity |

---

## Prerequisites

### Infrastructure

| Requirement | Specification |
|-------------|--------------|
| **Server** | 2+ vCPU, 4GB+ RAM, 20GB+ SSD |
| **OS** | Ubuntu 22.04+ / Debian 12+ / Amazon Linux 2023 |
| **Bun** | v1.0+ (`curl -fsSL https://bun.sh/install \| bash`) |
| **Node.js** | v18+ (for Next.js build) |
| **Domain** | A registered domain name with DNS A record pointing to your server IP |
| **SSL Certificate** | Let's Encrypt (free) or your own certificate |
| **TURN Server** | coturn installed (see [TURN Server Setup](#turn-server-setup-critical)) |

### Network Requirements

| Port | Service | Protocol | Purpose |
|------|---------|----------|---------|
| 80 | HTTP → HTTPS redirect | TCP | Web traffic |
| 443 | HTTPS (main traffic) | TCP | Web traffic + WSS (WebSocket Secure) |
| 3000 | Next.js app | TCP (internal) | Application server |
| 3003 | Signaling server | TCP (internal) | Socket.IO WebSocket |
| 3004 | Moderation service | TCP (internal) | AI moderation API |
| 3478 | TURN server | TCP + UDP | STUN/TURN for WebRTC |
| 49152–65535 | TURN relay | UDP | Media relay (configurable range) |

> **Important:** Ports 3000, 3003, 3004 should NOT be exposed publicly. Only ports 80, 443, and TURN ports should be open in your firewall.

---

## Before You Deploy

### 1. Configure Production Environment

```bash
cp .env.example .env.production
```

Edit `.env.production` with your production values (see [Environment Configuration](#environment-configuration) below).

### 2. Review Security Headers

The security headers are configured in `next.config.ts`. Review and adjust:

- `Content-Security-Policy` — Ensure it matches your domain
- `Strict-Transport-Security` — HSTS with preload
- `X-Frame-Options` — Set to `DENY`
- `Permissions-Policy` — Restrict camera/mic to your domain only

### 3. Test Locally First

Before deploying, test with production-like settings locally:

```bash
# Use production env file locally
export NODE_ENV=production
# ... start services with production .env
```

---

## Deployment Options

### Option A: Single Server (VPS)

Best for: Small to medium scale (up to ~500 concurrent users)

#### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y nginx certbot python3-certbot-nginx curl git build-essential

# Install Bun
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# Install Node.js (for Next.js build)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2
```

#### Step 2: Deploy Code

```bash
# Create app directory
sudo mkdir -p /var/www/securestream
sudo chown $USER:$USER /var/www/securestream

# Clone your repository
cd /var/www/securestream
git clone <your-repo-url> .

# Install all dependencies
bun install
cd mini-services/signaling-server && bun install && cd ../..
cd mini-services/moderation-service && bun install && cd ../..
```

#### Step 3: Configure Environment

```bash
cp .env.example .env
nano .env
```

Set these production values:

```env
# ─── Database ─────────────────────────────────────────────────
DATABASE_URL=file:/var/www/securestream/db/custom.db

# ─── CORS — YOUR PRODUCTION DOMAIN(S) ─────────────────────────
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# ─── Service Ports (keep defaults unless you have conflicts) ───
SIGNALING_PORT=3003
MODERATION_PORT=3004
MODERATION_SERVICE_URL=http://localhost:3004

# ─── WebRTC — CRITICAL FOR PRODUCTION ────────────────────────
NEXT_PUBLIC_STUN_SERVER_1=stun:yourdomain.com:3478
NEXT_PUBLIC_STUN_SERVER_2=stun:stun.l.google.com:19302
NEXT_PUBLIC_TURN_SERVER=turn:yourdomain.com:3478
NEXT_PUBLIC_TURN_USERNAME=securestream
NEXT_PUBLIC_TURN_CREDENTIAL=<your-strong-random-password>

# ─── Frontend ─────────────────────────────────────────────────
NEXT_PUBLIC_APP_NAME=SecureStream
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_HEARTBEAT_INTERVAL_MS=2000
NEXT_PUBLIC_FRAME_WIDTH=128
NEXT_PUBLIC_FRAME_HEIGHT=96
NEXT_PUBLIC_FRAME_QUALITY=0.3

# ─── Trust & Moderation ──────────────────────────────────────
TRUST_BLACKLIST_THRESHOLD=30
FAST_SKIP_WINDOW_MS=10000
FAST_SKIP_PENALTY_SECONDS=30
HEARTBEAT_TIMEOUT_MS=30000
MAX_QUEUE_SIZE=500
FRAME_MAX_SIZE_KB=200
```

#### Step 4: Build & Setup Database

```bash
# Setup database
bun run db:push

# Build Next.js for production
bun run build
```

#### Step 5: Start Services with PM2

```bash
cd /var/www/securestream

# Start signaling server
pm2 start mini-services/signaling-server/index.ts \
  --name securestream-signaling \
  --interpreter bun \
  --env production

# Start moderation service
pm2 start mini-services/moderation-service/index.ts \
  --name securestream-moderation \
  --interpreter bun \
  --env production

# Start Next.js app
pm2 start .next/standalone/server.js \
  --name securestream-app \
  --interpreter node \
  --env production

# Save PM2 config for auto-restart on reboot
pm2 save
pm2 startup
# Run the command output by pm2 startup with sudo
```

#### Step 6: Verify Services

```bash
pm2 status          # All 3 services should be "online"
pm2 logs            # Check logs for errors

curl http://localhost:3000          # Next.js → should return HTML
curl http://localhost:3003/health   # Signaling → should return JSON
curl http://localhost:3004/health   # Moderation → should return JSON
```

#### Step 7: Configure Nginx & SSL

```bash
sudo nano /etc/nginx/sites-available/securestream
```

```nginx
# ─── HTTP → HTTPS Redirect ─────────────────────────────────
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}

# ─── Main HTTPS Server ─────────────────────────────────────
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL Hardening
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_stapling on;
    ssl_stapling_verify on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(self), microphone=(self), geolocation=()" always;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 256;

    # Client body size (for moderation frames)
    client_max_body_size 512K;

    # ─── Next.js App ────────────────────────────────────────
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # ─── API Routes (moderation proxy) ──────────────────────
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # ─── Socket.IO Signaling (WebSocket) ────────────────────
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # ─── Static Files (cached) ──────────────────────────────
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location /favicon.svg {
        proxy_pass http://127.0.0.1:3000;
        add_header Cache-Control "public, max-age=86400";
    }
}
```

Enable the site and get SSL:

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/securestream /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx config
sudo nginx -t

# Get SSL certificate (before enabling the HTTPS server block)
# Temporarily comment out the HTTPS server block, run certbot, then uncomment
sudo certbot certonly --webroot -w /var/www/certbot -d yourdomain.com -d www.yourdomain.com

# Reload Nginx
sudo systemctl reload nginx

# Set up auto-renewal
sudo crontab -e
# Add: 0 3 * * * certbot renew --quiet && systemctl reload nginx
```

#### Step 8: Update Socket.IO Path

For production Nginx proxy, update the Socket.IO path. Edit the signaling server's `index.ts`:

```typescript
// Change from:
const io = new Server(httpServer, {
  path: '/',

// To:
const io = new Server(httpServer, {
  path: '/socket.io/',
```

And update the frontend hook `src/hooks/useSignaling.ts` to connect to the same path:

```typescript
// The client should connect to:
socket('/socket.io/', { transports: ['websocket'] })
```

Then rebuild: `bun run build`

---

### Option B: Docker Compose

Best for: Consistent deployments, easy scaling, CI/CD integration

#### 1. Create Dockerfile (Root)

```dockerfile
# ─── Build Stage ──────────────────────────────────────────
FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
COPY mini-services/signaling-server/package.json ./mini-services/signaling-server/
COPY mini-services/moderation-service/package.json ./mini-services/moderation-service/
RUN bun install && \
    cd mini-services/signaling-server && bun install && cd ../.. && \
    cd mini-services/moderation-service && bun install && cd ../..

# ─── Production Stage ────────────────────────────────────
FROM oven/bun:1 AS production
WORKDIR /app

# Copy installed dependencies
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/mini-services/signaling-server/node_modules ./mini-services/signaling-server/node_modules
COPY --from=base /app/mini-services/moderation-service/node_modules ./mini-services/moderation-service/node_modules

# Copy source code
COPY . .

# Generate Prisma client
RUN bun run db:generate

# Build Next.js
RUN bun run build

# Create db directory
RUN mkdir -p /app/db

EXPOSE 3000 3003 3004
```

#### 2. Create docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    container_name: securestream-app
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=file:/app/db/custom.db
      - SIGNALING_PORT=3003
      - MODERATION_PORT=3004
      - ALLOWED_ORIGINS=${ALLOWED_ORIGINS}
      - MODERATION_SERVICE_URL=http://moderation:3004
      # Add all NEXT_PUBLIC_* vars here
    env_file:
      - .env.production
    volumes:
      - securestream-db:/app/db
    depends_on:
      - signaling
      - moderation
    command: ["node", ".next/standalone/server.js"]

  signaling:
    build: .
    container_name: securestream-signaling
    restart: unless-stopped
    ports:
      - "3003:3003"
    environment:
      - NODE_ENV=production
      - SIGNALING_PORT=3003
      - ALLOWED_ORIGINS=${ALLOWED_ORIGINS}
    env_file:
      - .env.production
    volumes:
      - securestream-db:/app/db
    command: ["bun", "mini-services/signaling-server/index.ts"]
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3003/health"]
      interval: 30s
      timeout: 5s
      retries: 3

  moderation:
    build: .
    container_name: securestream-moderation
    restart: unless-stopped
    ports:
      - "3004:3004"
    environment:
      - NODE_ENV=production
      - MODERATION_PORT=3004
      - ALLOWED_ORIGINS=${ALLOWED_ORIGINS}
    env_file:
      - .env.production
    command: ["bun", "mini-services/moderation-service/index.ts"]
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3004/health"]
      interval: 30s
      timeout: 5s
      retries: 3

volumes:
  securestream-db:
```

#### 3. Deploy

```bash
# Build and start
docker-compose up -d --build

# Check status
docker-compose ps
docker-compose logs -f

# Stop
docker-compose down

# Rebuild after code changes
docker-compose up -d --build
```

---

### Option C: Kubernetes (Advanced)

Best for: Large scale, high availability, multi-region

For Kubernetes deployment, you would need:

- **3 Deployments**: app, signaling, moderation (each with HPA)
- **1 StatefulSet**: For SQLite (or use managed PostgreSQL)
- **1 Service**: ClusterIP for each service
- **1 Ingress**: With TLS termination and WebSocket support
- **ConfigMaps/Secrets**: For environment variables
- **HPA**: Auto-scaling based on CPU/memory/custom metrics

> This is beyond the scope of this guide. Consider using a managed platform like Vercel (frontend) + Railway/Render (backend services) for simpler scaling.

---

## Environment Configuration

### Critical Production Settings

```env
# ─── MUST CHANGE FOR PRODUCTION ──────────────────────────────

# 1. Your production domain(s)
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# 2. Public app URL (used for SEO metadata, OG tags)
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# 3. TURN server (REQUIRED for users behind NAT/firewalls)
NEXT_PUBLIC_TURN_SERVER=turn:yourdomain.com:3478
NEXT_PUBLIC_TURN_USERNAME=securestream
NEXT_PUBLIC_TURN_CREDENTIAL=<strong-random-password-min-32-chars>

# 4. Database (use persistent volume path in production)
DATABASE_URL=file:/var/www/securestream/db/custom.db

# ─── OPTIONAL TUNING ─────────────────────────────────────────

# Increase queue capacity for higher traffic
MAX_QUEUE_SIZE=500

# Tighten heartbeat timeout for faster stale detection
HEARTBEAT_TIMEOUT_MS=20000

# Adjust trust threshold based on moderation strictness
TRUST_BLACKLIST_THRESHOLD=30
```

### Next.js Build-Time Variables

> **WARNING:** `NEXT_PUBLIC_*` variables are baked into the JS bundle at build time. You MUST rebuild (`bun run build`) after changing them.

```bash
# Set build-time vars and build
NEXT_PUBLIC_APP_URL=https://yourdomain.com \
NEXT_PUBLIC_TURN_SERVER=turn:yourdomain.com:3478 \
NEXT_PUBLIC_TURN_USERNAME=securestream \
NEXT_PUBLIC_TURN_CREDENTIAL=<password> \
bun run build
```

---

## Database Setup

### SQLite (Default — Small Scale)

```bash
# Push schema to SQLite
bun run db:push

# Verify
bun run db:generate
```

### Migrating to PostgreSQL (Recommended for Scale)

1. Install PostgreSQL adapter:
   ```bash
   bun add @prisma/adapter-pg pg
   ```

2. Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

3. Update `.env`:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/securestream
   ```

4. Push schema:
   ```bash
   bun run db:push
   ```

5. Update the signaling server's `trust-engine.ts`:
   ```typescript
   // Remove the hardcoded SQLite path:
   // db: { url: 'file:/home/z/my-project/db/custom.db' }
   // Prisma will use DATABASE_URL from environment
   ```

---

## SSL / HTTPS Setup

> **HTTPS is MANDATORY for production.** WebRTC's `getUserMedia()` API only works on secure origins (HTTPS or localhost).

### Using Let's Encrypt (Free)

```bash
# Install certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal (add to crontab)
echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'" | sudo crontab -
```

### Using Cloudflare (Recommended)

1. Point your domain's DNS to Cloudflare
2. Enable "Full (Strict)" SSL mode
3. Cloudflare provides automatic SSL, DDoS protection, and CDN
4. Update your Nginx config to trust Cloudflare's proxy headers

---

## TURN Server Setup (Critical)

> **A TURN server is REQUIRED in production.** Without it, ~10-20% of users behind symmetric NATs or corporate firewalls will not be able to connect to video calls.

### Install coturn

```bash
sudo apt install -y coturn
```

### Configure coturn

Edit `/etc/turnserver.conf`:

```ini
# ─── Listener ────────────────────────────────────────────────
listening-port=3478
tls-listening-port=5349
external-ip=YOUR_SERVER_PUBLIC_IP
relay-ip=YOUR_SERVER_PRIVATE_IP

# ─── Authentication ─────────────────────────────────────────
use-auth-secret
static-auth-secret=<your-strong-random-secret>
realm=yourdomain.com

# ─── TLS ────────────────────────────────────────────────────
cert=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
pkey=/etc/letsencrypt/live/yourdomain.com/privkey.pem
no-tlsv1
no-tlsv1_1

# ─── Ports ──────────────────────────────────────────────────
min-port=49152
max-port=65535

# ─── Security ───────────────────────────────────────────────
fingerprint
lt-cred-mech
no-multicast-peers
no-cli
stale-nonce=600
```

### Enable and Start

```bash
# Enable coturn (uncomment in /etc/default/coturn)
sudo sed -i 's/#TURNSERVER_ENABLED=1/TURNSERVER_ENABLED=1/' /etc/default/coturn

# Start the service
sudo systemctl enable coturn
sudo systemctl start coturn

# Verify
sudo systemctl status coturn
```

### Test TURN Server

Use [Trickle ICE](https://webrtc.github.io/samples/pages/content/peerconnection/trickle-ice/) to verify:
- STUN: `stun:yourdomain.com:3478`
- TURN: `turn:yourdomain.com:3478` with your username and password

---

## Building for Production

```bash
# From project root

# 1. Ensure all dependencies are installed
bun install
cd mini-services/signaling-server && bun install && cd ../..
cd mini-services/moderation-service && bun install && cd ../..

# 2. Generate Prisma client
bun run db:generate

# 3. Build Next.js (outputs to .next/standalone/)
bun run build

# The build script automatically:
# - Creates .next/standalone/ with minimal server
# - Copies .next/static/ into standalone
# - Copies public/ into standalone
```

### Build Output

```
.next/standalone/
├── server.js              # Production Node.js server
├── .next/
│   └── server/            # Server-side bundles
├── public/                # Static assets
│   ├── logo.svg
│   ├── og-image.svg
│   ├── manifest.json
│   └── robots.txt
└── node_modules/          # Minimal production deps
```

---

## Running in Production

### Direct Execution

```bash
# From project root
NODE_ENV=production node .next/standalone/server.js
```

### With PM2 (Recommended)

```bash
# Start all services
pm2 start ecosystem.config.js

# Or start individually:
pm2 start mini-services/signaling-server/index.ts \
  --name securestream-signaling \
  --interpreter bun

pm2 start mini-services/moderation-service/index.ts \
  --name securestream-moderation \
  --interpreter bun

pm2 start .next/standalone/server.js \
  --name securestream-app \
  --interpreter node

# Management commands
pm2 list                    # View all services
pm2 logs securestream-app   # View app logs
pm2 logs securestream-signaling --lines 100  # View signaling logs
pm2 restart all             # Restart all
pm2 stop all                # Stop all
pm2 delete all              # Remove all
pm2 monit                   # Real-time monitoring dashboard

# Auto-restart on server reboot
pm2 save
pm2 startup
# Run the command output by pm2 startup with sudo
```

### PM2 Ecosystem Config

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'securestream-signaling',
      script: 'mini-services/signaling-server/index.ts',
      interpreter: 'bun',
      env_production: {
        NODE_ENV: 'production',
        SIGNALING_PORT: 3003,
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/securestream/signaling-error.log',
      out_file: '/var/log/securestream/signaling-out.log',
    },
    {
      name: 'securestream-moderation',
      script: 'mini-services/moderation-service/index.ts',
      interpreter: 'bun',
      env_production: {
        NODE_ENV: 'production',
        MODERATION_PORT: 3004,
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: '1G',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/securestream/moderation-error.log',
      out_file: '/var/log/securestream/moderation-out.log',
    },
    {
      name: 'securestream-app',
      script: '.next/standalone/server.js',
      interpreter: 'node',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: '1G',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/securestream/app-error.log',
      out_file: '/var/log/securestream/app-out.log',
    },
  ],
};
```

```bash
# Create log directory
sudo mkdir -p /var/log/securestream
sudo chown $USER:$USER /var/log/securestream

# Start with ecosystem config
pm2 start ecosystem.config.js --env production
```

---

## Reverse Proxy (Nginx)

See the full Nginx configuration in [Option A: Single Server](#option-a-single-server-vps) → Step 7.

Key points:
- WebSocket upgrade headers for Socket.IO signaling
- Long timeouts for persistent connections (`proxy_read_timeout 86400s`)
- Static file caching for `/_next/static/`
- Gzip compression enabled
- Security headers set

---

## Scaling Strategy

### Horizontal Scaling

| Component | Scaling Strategy | Notes |
|-----------|-----------------|-------|
| **Next.js App** | Scale horizontally behind load balancer | Stateless, easy to scale |
| **Signaling Server** | Use Redis adapter for Socket.IO multi-node | Required for >1 instance |
| **Moderation Service** | Scale horizontally behind load balancer | Stateless REST API |
| **Database** | Migrate to PostgreSQL | Use connection pooling (PgBouncer) |

### Scaling Signaling with Redis

To run multiple signaling server instances:

1. Install Redis adapter:
   ```bash
   cd mini-services/signaling-server
   bun add @socket.io/redis-adapter redis
   ```

2. Add Redis configuration to `index.ts`:
   ```typescript
   import { createAdapter } from '@socket.io/redis-adapter';
   import { createClient } from 'redis';

   const redisClient = createClient({ url: process.env.REDIS_URL });
   await redisClient.connect();
   io.adapter(createAdapter(redisClient));
   ```

3. Add to `.env`:
   ```env
   REDIS_URL=redis://localhost:6379
   ```

### Estimated Capacity

| Setup | Concurrent Users | Video Sessions | Server Requirements |
|-------|-----------------|----------------|-------------------|
| Single VPS | 200-500 | 100-250 | 2 vCPU, 4GB RAM |
| 3-node cluster | 1,000-3,000 | 500-1,500 | 3× (2 vCPU, 4GB RAM) + Redis |
| Kubernetes | 10,000+ | 5,000+ | Auto-scaling + PostgreSQL |

> **Note:** Video data flows P2P (WebRTC), so server load is primarily from signaling and moderation, not media.

---

## Monitoring & Health Checks

### Health Check Endpoints

| Service | Endpoint | Check Interval |
|---------|----------|---------------|
| Next.js | `GET http://localhost:3000` | 30s |
| Signaling | `GET http://localhost:3003/health` | 15s |
| Moderation | `GET http://localhost:3004/health` | 15s |

### Service Statistics

```bash
# Signaling stats (rooms, queue, online users)
curl http://localhost:3003/api/stats

# Moderation stats (analysis counts, success rate)
curl http://localhost:3004/api/stats
```

### PM2 Monitoring

```bash
pm2 monit          # Real-time CPU/memory dashboard
pm2 prettylist     # Formatted status output
```

### Log Management

```bash
# View logs
pm2 logs --lines 200

# Set up log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

### Recommended Monitoring Stack

- **Uptime monitoring**: UptimeRobot, BetterUptime (free tier)
- **Error tracking**: Sentry (free tier for small teams)
- **Metrics**: Prometheus + Grafana (for larger setups)
- **Logs**: ELK Stack or Loki (for centralized logging)

---

## Security Checklist

- [ ] **HTTPS enabled** — SSL certificate installed and auto-renewing
- [ ] **TURN server secured** — Using auth secrets, TLS enabled
- [ ] **CORS configured** — Only your production domain(s) allowed
- [ ] **Environment variables secured** — No secrets in `NEXT_PUBLIC_*` vars
- [ ] **Firewall configured** — Only ports 80, 443, 3478, 49152-65535 exposed
- [ ] **Security headers set** — CSP, HSTS, X-Frame-Options, etc.
- [ ] **Rate limiting enabled** — Both services have built-in rate limiters
- [ ] **Database backups** — Automated backup schedule configured
- [ ] **Log rotation** — PM2 logrotate or logrotate configured
- [ ] **Dependencies updated** — Run `bun update` periodically
- [ ] **Input validation** — All WebSocket events validated server-side
- [ ] **Content sanitization** — Chat messages sanitized (HTML stripped)
- [ ] **Frame data privacy** — Video frames never logged or stored
- [ ] **SSH hardened** — Key-based auth, no password login, fail2ban installed

---

## Performance Optimization

### Next.js

- **Static generation**: Use `generateStaticParams` for any static pages
- **Image optimization**: Use `next/image` with proper sizing
- **Bundle analysis**: `ANALYZE=true bun run build` to check bundle size
- **Edge caching**: Set proper `Cache-Control` headers via Nginx

### Signaling Server

- **Heartbeat tuning**: Reduce `HEARTBEAT_TIMEOUT_MS` to clean stale connections faster
- **Queue limits**: Set `MAX_QUEUE_SIZE` based on expected concurrent users
- **Connection limits**: Set per-IP connection limits in Nginx

### Moderation Service

- **Frame size**: Reduce `NEXT_PUBLIC_FRAME_WIDTH/HEIGHT` for lower bandwidth
- **Frame quality**: Lower `NEXT_PUBLIC_FRAME_QUALITY` (0.2–0.3) for faster analysis
- **Interval**: Increase `NEXT_PUBLIC_HEARTBEAT_INTERVAL_MS` (3000–5000) to reduce load

### System Level

```bash
# Increase file descriptor limit
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf

# Optimize kernel for WebSocket connections
echo "net.ipv4.tcp_tw_reuse = 1" | sudo tee -a /etc/sysctl.conf
echo "net.core.somaxconn = 65535" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

---

## Backup & Recovery

### Database Backups

```bash
# Create backup script
cat > /var/www/securestream/scripts/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/securestream"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_PATH="/var/www/securestream/db/custom.db"

mkdir -p "$BACKUP_DIR"
sqlite3 "$DB_PATH" ".backup '$BACKUP_DIR/custom_${TIMESTAMP}.db'"

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "custom_*.db" -mtime +7 -delete

echo "[$(date)] Backup completed: custom_${TIMESTAMP}.db"
EOF

chmod +x /var/www/securestream/scripts/backup-db.sh

# Schedule daily backups at 2 AM
echo "0 2 * * * /var/www/securestream/scripts/backup-db.sh >> /var/log/securestream/backup.log 2>&1" | crontab -
```

### Configuration Backups

```bash
# Back up environment and configs
cp /var/www/securestream/.env /var/backups/securestream/env_$(date +%Y%m%d).bak
cp /etc/nginx/sites-available/securestream /var/backups/securestream/nginx_$(date +%Y%m%d).bak
```

---

## Disaster Recovery

### Restore from Backup

```bash
# Stop services
pm2 stop all

# Restore database
cp /var/backups/securestream/custom_YYYYMMDD_HHMMSS.db /var/www/securestream/db/custom.db

# Verify database integrity
sqlite3 /var/www/securestream/db/custom.db "PRAGMA integrity_check;"

# Restart services
pm2 start all
```

### Full Server Recovery

1. Provision a new server with the same OS
2. Follow the deployment steps from the beginning
3. Restore `.env` from backup
4. Restore database from backup
5. Update DNS to point to new server IP
6. Verify SSL certificate (may need to reissue)

---

## Troubleshooting Production Issues

### "WebSocket connection failed"

```bash
# Check if signaling server is running
curl http://localhost:3003/health

# Check Nginx WebSocket proxy
sudo nginx -t
sudo systemctl reload nginx

# Check for firewall blocking WebSocket upgrade
sudo ufw status
```

### "Users can't connect to each other (black video)"

- **Most likely**: TURN server not working
  ```bash
  sudo systemctl status coturn
  sudo journalctl -u coturn -f
  ```
- Test with: https://webrtc.github.io/samples/pages/content/peerconnection/trickle-ice/
- Verify `NEXT_PUBLIC_TURN_SERVER` is set correctly and was included in the build

### "High CPU/memory usage"

```bash
# Check which process is consuming resources
pm2 monit
htop

# Restart a specific service
pm2 restart securestream-signaling

# Check for memory leaks
pm2 logs securestream-app --err --lines 50
```

### "Database locked" errors (SQLite)

- SQLite has limited concurrent write support
- Reduce stale cleanup interval or queue processing frequency
- Consider migrating to PostgreSQL for high-traffic deployments

### "502 Bad Gateway"

```bash
# Check if all services are running
pm2 status

# Check Nginx configuration
sudo nginx -t

# Check if ports are listening
sudo ss -tlnp | grep -E '3000|3003|3004'
```

### "SSL certificate expired"

```bash
# Check certificate expiry
sudo certbot certificates

# Force renewal
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

### "Services keep crashing"

```bash
# Check error logs
pm2 logs --err --lines 100

# Check system resources
free -h
df -h

# Check if port is already in use
sudo lsof -i :3000
sudo lsof -i :3003
sudo lsof -i :3004
```

---

## Quick Reference Commands

```bash
# ─── Deployment ──────────────────────────────────────────────
git pull origin main                        # Pull latest code
bun install                                  # Install dependencies
bun run db:push                             # Update database schema
bun run build                               # Build for production
pm2 restart all                             # Restart all services

# ─── Monitoring ──────────────────────────────────────────────
pm2 status                                  # Service status
pm2 monit                                   # Real-time monitoring
pm2 logs                                    # View all logs
curl http://localhost:3003/api/stats        # Signaling stats
curl http://localhost:3004/api/stats        # Moderation stats

# ─── Maintenance ─────────────────────────────────────────────
sudo certbot renew && sudo systemctl reload nginx   # Renew SSL
/var/www/securestream/scripts/backup-db.sh          # Manual backup
pm2 flush                                      # Flush all logs
```

---

*For local development instructions, see [README_LOCAL.md](./README_LOCAL.md).*
