# Software Requirements Specification (SRS)

**SecureStream — Privacy-First, AI-Moderated Anonymous Video Chat Platform**

| Field | Value |
|-------|-------|
| **Document Version** | 1.0 |
| **Date** | 2025-01-01 |
| **Standard** | IEEE 830-1998 |
| **Project** | SecureStream MVP |
| **Status** | Approved |

---

## Revision History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0 | 2025-01-01 | SecureStream Team | Initial release — full SRS |

---

## Table of Contents

1. [Introduction](#1-introduction)
   - 1.1 [Purpose](#11-purpose)
   - 1.2 [Scope](#12-scope)
   - 1.3 [Definitions, Acronyms, and Abbreviations](#13-definitions-acronyms-and-abbreviations)
   - 1.4 [References](#14-references)
   - 1.5 [Overview](#15-overview)
2. [Overall Description](#2-overall-description)
   - 2.1 [Product Perspective](#21-product-perspective)
   - 2.2 [Product Functions](#22-product-functions)
   - 2.3 [User Characteristics](#23-user-characteristics)
   - 2.4 [Constraints](#24-constraints)
   - 2.5 [Assumptions and Dependencies](#25-assumptions-and-dependencies)
   - 2.6 [Apportioning of Requirements](#26-apportioning-of-requirements)
3. [Specific Requirements](#3-specific-requirements)
   - 3.1 [External Interface Requirements](#31-external-interface-requirements)
   - 3.2 [Functional Requirements](#32-functional-requirements)
   - 3.3 [Performance Requirements](#33-performance-requirements)
   - 3.4 [Design Constraints](#34-design-constraints)
   - 3.5 [Security Requirements](#35-security-requirements)
   - 3.6 [Software Quality Attributes](#36-software-quality-attributes)
   - 3.7 [Data Requirements](#37-data-requirements)
4. [Verification & Validation](#4-verification--validation)
5. [Traceability Matrix](#5-traceability-matrix)
6. [Appendices](#6-appendices)

---

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification (SRS) defines the complete functional and non-functional requirements for **SecureStream**, a privacy-first, AI-moderated anonymous video chat platform. The document is intended for:

- **Software engineers** implementing the platform, providing a definitive reference for all system behaviors, thresholds, and interfaces.
- **QA engineers** designing test plans, acceptance criteria, and automated test suites against measurable requirements.
- **Product stakeholders** reviewing scope boundaries and prioritized requirements for release planning.
- **Security reviewers** auditing privacy guarantees and data-handling policies.

The SRS covers the minimum viable product (MVP) scope, including the Next.js frontend, Socket.IO signaling server, AI moderation service, and all trust/safety enforcement mechanisms. Requirements are specified with sufficient detail to be unambiguously testable.

### 1.2 Scope

#### 1.2.1 Product Description

SecureStream is a web-based platform that enables two anonymous users to be paired via a real-time matchmaking queue and connected through peer-to-peer (P2P) WebRTC video sessions. The platform distinguishes itself through three core pillars:

1. **Privacy-First Architecture**: No user registration, no personally identifiable information (PII) collected, no video or audio data stored at any point in the system. Users are identified solely by auto-generated UUID session IDs.

2. **AI-Moderated Content Safety**: Every active video session is continuously monitored by a Vision Language Model (VLM) that analyzes low-resolution frame captures every 2 seconds, producing risk scores that drive automated enforcement actions ranging from warnings to session termination and blacklisting.

3. **Trust & Karma System**: A persistent trust score (0–100) tracks user behavior across sessions. Clean sessions earn points; fast-skipping and confirmed violations deduct points. Users whose score drops to or below 30 are automatically blacklisted for 24 hours.

The system comprises four primary components running on a single host:

| Component | Technology | Port | Role |
|-----------|-----------|------|------|
| **Frontend** | Next.js 16 + React 19 + TypeScript | 3000 | UI, WebRTC peer, moderation heartbeat sender |
| **Signaling Server** | Socket.IO mini-service (Bun runtime) | 3003 | Matchmaking, signaling, room state, penalty enforcement |
| **Moderation Service** | REST mini-service (Bun runtime) | 3004 | Frame analysis, risk scoring, kill-switch |
| **Database** | Prisma ORM + SQLite | — | Persistent trust scores, blacklist, moderation event log |
| **ICE Servers** | Google public STUN + configurable TURN | — | NAT traversal for WebRTC |

#### 1.2.2 In Scope (MVP)

- Anonymous one-on-one video chat via WebRTC
- Real-time FIFO matchmaking queue with position updates
- Peer-to-peer video and audio streams (no server-side media relay)
- AI-powered content moderation via VLM frame analysis
- Trust score system with persistence across sessions
- Fast-skip detection with escalating penalties
- Blacklist system with 24-hour expiry
- Text chat alongside video (message relay, sanitization, rate limiting)
- ICE restart for connection recovery
- Heartbeat-based session liveness detection
- Real-time online user count display
- Mobile-responsive dark-themed UI

#### 1.2.3 Out of Scope (Future Phases)

- User registration and persistent profiles
- Group video chat (more than two participants)
- Geographic or interest-based matching
- Audio-only fallback sessions
- User appeal process for blacklisting
- Horizontal scaling / multi-instance deployment
- TURN server hosting (users configure their own)
- Server-side media recording or storage
- Push notifications
- Monetization or payment features

### 1.3 Definitions, Acronyms, and Abbreviations

| Term / Acronym | Definition |
|----------------|------------|
| **API** | Application Programming Interface — a set of protocols and tools for building software integrations. |
| **CSP** | Content Security Policy — an HTTP header that restricts which resources a browser may load, mitigating XSS attacks. |
| **CUID** | Collision-resistant Unique Identifier — a unique ID generation algorithm used by Prisma for primary keys. |
| **CORS** | Cross-Origin Resource Sharing — a mechanism that allows or restricts cross-origin HTTP requests. |
| **DTO** | Data Transfer Object — a structured payload used to convey data between system components. |
| **FIFO** | First In, First Out — a queue ordering strategy where the earliest enqueued user is matched first. |
| **heartbeat** | A periodic signal (every 2,000 ms) sent from the frontend to the signaling server to confirm session liveness. |
| **ICE** | Interactive Connectivity Establishment — the WebRTC framework for discovering and negotiating network paths between peers. |
| **ICE Candidate** | A network address and protocol pair discovered during the ICE process, including host, srflx, and relay types. |
| **ICE Restart** | The process of restarting ICE candidate gathering to recover from a failed connection. |
| **kill-switch** | An automated enforcement mechanism that terminates an active video session when high-risk content is detected. |
| **MVP** | Minimum Viable Product — the smallest set of features that delivers core user value. |
| **NAT** | Network Address Traversal / Network Address Translation — a method by which routers map private IP addresses to public ones. |
| **N/SFW** | Not Safe For Work — a classification for content inappropriate for general audiences. |
| **P2P** | Peer-to-Peer — direct communication between two client browsers without media passing through a server. |
| **PiP** | Picture-in-Picture — a smaller inset display of the user's own camera feed alongside the partner's larger feed. |
| **Prisma** | An open-source ORM for Node.js and TypeScript that provides type-safe database access. |
| **REST** | Representational State Transfer — an architectural style for stateless HTTP APIs. |
| **Risk Level** | A categorical classification (`none`, `low`, `medium`, `high`, `critical`) assigned by the moderation engine to each analyzed frame. |
| **Risk Score** | A composite numeric value (0.0–1.0) calculated from weighted moderation signals indicating the probability of policy-violating content. |
| **RTCPeerConnection** | The Web API interface that manages a WebRTC connection between the local computer and a remote peer. |
| **SDP** | Session Description Protocol — a format for describing multimedia session parameters used in WebRTC offer/answer exchange. |
| **Session ID** | An auto-generated UUID (v4) that uniquely identifies an anonymous user for the duration of their visit. |
| **Socket.IO** | A library that provides real-time, bidirectional, event-based communication between clients and servers over WebSocket. |
| **SQLite** | A lightweight, serverless, file-based relational database engine. |
| **STUN** | Session Traversal Utilities for NAT — a protocol that helps clients discover their public IP address and the type of NAT they are behind. |
| **TLS/HTTPS** | Transport Layer Security / Hypertext Transfer Protocol Secure — encrypted communication between browser and server. |
| **TURN** | Traversal Using Relays around NAT — a protocol that provides relay servers to route media when direct P2P connection fails. |
| **VLM** | Vision Language Model — an AI model capable of analyzing images and producing structured text-based assessments (via z-ai-web-dev-sdk). |
| **WebSocket** | A persistent, full-duplex communication channel between a browser and server over a single TCP connection. |
| **Zod** | A TypeScript-first schema validation library used to validate payloads at system boundaries. |

### 1.4 References

| Reference | Description |
|-----------|-------------|
| IEEE Std 830-1998 | IEEE Recommended Practice for Software Requirements Specifications |
| W3C WebRTC 1.0 | Real-Time Communication Between Browsers — W3C Recommendation |
| Socket.IO v4 Documentation | Socket.IO — event-driven real-time communication library |
| Next.js 16 Documentation | The React Framework for the Web |
| Prisma Documentation | Next-generation Node.js and TypeScript ORM |
| z-ai-web-dev-sdk | AI model SDK providing VLM capabilities for frame analysis |
| WebRTC ICE RFC 8445 | Interactive Connectivity Establishment: A Protocol for Network Address Translator (NAT) Traversal |
| RFC 6455 | The WebSocket Protocol |
| `worklog.md` | SecureStream Implementation Plan — full architecture and design document |
| `src/types/securestream.ts` | Frontend TypeScript type definitions for all payloads, states, and enums |
| `mini-services/signaling-server/types.ts` | Signaling server shared type definitions, constants, and configuration |
| `prisma/schema.prisma` | Database schema defining TrustRecord, Blacklist, ModerationEvent models |
| `src/lib/constants.ts` | Application-wide constants for thresholds, timeouts, and configuration |
| `.env.example` | Environment variable reference for all configurable values |

### 1.5 Overview

This document is organized as follows:

- **Section 2 — Overall Description** provides a high-level view of the product context, its eight major functional areas, user characteristics, constraints, assumptions, and future-phase requirements.
- **Section 3 — Specific Requirements** is the core of this document. It contains individually numbered, testable requirements organized into external interfaces, functional requirements (13 categories, FR-100 through FR-1350+), performance requirements, design constraints, security requirements, software quality attributes, and data requirements. Each functional requirement includes priority, description, rationale, and measurable acceptance criteria.
- **Section 4 — Verification & Validation** outlines the testing strategy across unit, integration, system, and acceptance testing levels.
- **Section 5 — Traceability Matrix** maps each functional requirement back to its originating source (user story or technical design decision).
- **Section 6 — Appendices** provides detailed reference tables for WebSocket events, REST endpoints, trust score formulas, risk scoring formulas, and environment variables.

---

## 2. Overall Description

### 2.1 Product Perspective

#### 2.1.1 System Context

SecureStream operates within the following context:

```
                         ┌─────────────────────────────────────┐
                         │          Internet (HTTPS/WSS)         │
                         └───────────┬─────────────┬───────────┘
                                     │             │
                          ┌──────────▼──────┐ ┌────▼──────────────┐
                          │                  │ │                    │
                          │   Web Browser A   │ │   Web Browser B    │
                          │   (Anonymous)     │ │   (Anonymous)      │
                          │   - Camera        │ │   - Camera         │
                          │   - Microphone    │ │   - Microphone     │
                          │   - WebRTC Peer   │ │   - WebRTC Peer    │
                          │                  │ │                    │
                          └────────┬─────────┘ └─────────┬──────────┘
                                   │                       │
                            WebRTC P2P (Media)        WebRTC P2P (Media)
                            ◄──────────────────────────────────────────►
                                   │                       │
                          Socket.IO (WSS)          Socket.IO (WSS)
                                   │                       │
                          ┌────────▼─────────────────────────▼──────────┐
                          │                                             │
                          │              Next.js Frontend                │
                          │              (Port 3000)                     │
                          │   - UI Rendering (React 19)                 │
                          │   - API Proxy (/api/moderation)             │
                          │   - Frame Capture & Forwarding              │
                          │                                             │
                          └──────┬───────────────────────┬──────────────┘
                                 │                       │
                          Socket.IO              HTTP/REST POST
                          (WSS :3003)             (:3004 via proxy)
                                 │                       │
                    ┌────────────▼──────────┐  ┌─────────▼────────────┐
                    │                       │  │                      │
                    │   Signaling Server    │  │  Moderation Service   │
                    │   (Bun, Port 3003)    │  │  (Bun, Port 3004)    │
                    │   - Matchmaking       │  │  - VLM Analysis      │
                    │   - Room Management   │  │  - Risk Scoring      │
                    │   - Penalty Box       │  │  - Action Mapping    │
                    │   - Trust Engine      │  │  - Stateless         │
                    │   - Blacklist         │  │  - No Frame Storage  │
                    │   - Rate Limiter      │  │                      │
                    │                       │  └──────────────────────┘
                    └────────────┬──────────┘
                                 │
                          Prisma ORM
                                 │
                    ┌────────────▼──────────┐
                    │                       │
                    │   SQLite Database     │
                    │   - TrustRecord       │
                    │   - Blacklist         │
                    │   - ModerationEvent   │
                    │                       │
                    └───────────────────────┘
```

#### 2.1.2 System Interfaces

| Interface | Protocol | Direction | Description |
|-----------|----------|-----------|-------------|
| Browser ↔ Frontend | HTTPS/WSS | Bi-directional | Secure transport for all web assets and real-time communication |
| Frontend ↔ Signaling Server | Socket.IO over WSS | Bi-directional | Matchmaking, signaling, room events, heartbeats, chat messages |
| Frontend ↔ Moderation Service | HTTPS POST | Request-Response | Frame submission for AI analysis, routed through Next.js API proxy |
| Signaling Server ↔ Database | Prisma/SQLite | Request-Response | Trust score reads/writes, blacklist checks, moderation event logging |
| Frontend ↔ STUN/TURN Servers | UDP/TCP | Request-Response | ICE candidate gathering for NAT traversal |
| Peer ↔ Peer | WebRTC (SRTP/DTLS) | Bi-directional | Encrypted peer-to-peer video and audio streams |

### 2.2 Product Functions

The platform implements eight major functional areas:

| # | Functional Area | Description |
|---|----------------|-------------|
| 1 | **Anonymous Entry & Session Management** | Users enter without registration. A UUID session ID is auto-generated on the client. Camera/mic permissions are requested. Sessions persist for the browser tab lifetime. |
| 2 | **Camera & Media Management** | `getUserMedia` API captures the user's camera and microphone. The local feed is displayed as a picture-in-picture overlay. Users can toggle mute/camera on/off during active sessions. |
| 3 | **Matchmaking & Queue System** | A FIFO queue on the signaling server pairs waiting users. Queue position updates are pushed in real time. Rate limiting prevents queue abuse (5 joins per minute). Maximum queue capacity is 200 users. |
| 4 | **WebRTC Video Communication** | Once matched, the initiator creates an RTCPeerConnection, generates an SDP offer, and exchanges ICE candidates with the partner through the signaling server. Video and audio flow P2P via SRTP. ICE restart recovers from connection failures (up to 2 attempts). |
| 5 | **Text Chat** | A text messaging channel is relayed through the signaling server alongside video. Messages are sanitized (max 200 characters, no HTML/script injection). Message history is limited to the current session only. |
| 6 | **Session Lifecycle Management** | Sessions progress through defined states (landing → permission → queueing → matched → active → disconnected). Sessions can end via skip, disconnect, timeout (30s no heartbeat), moderation kill, or ICE failure. |
| 7 | **Trust Score System** | Every session outcome affects the user's persistent trust score. Starting score is 100. Clean disconnects earn +2; fast-skips cost -1; confirmed violations cost -10; partner reports cost -5. Score is capped at 0–100. |
| 8 | **AI Content Moderation** | A VLM analyzes 128×96 JPEG frames every 2 seconds. A composite risk score (0.0–1.0) determines the action: allow, warn, blur, terminate, or blacklist. The kill-switch terminates sessions for high/critical risk. |

### 2.3 User Characteristics

| Characteristic | Description |
|----------------|-------------|
| **Identity** | Fully anonymous. No registration, login, or personal information is required or collected. Users are identified only by auto-generated UUID session IDs. |
| **Device** | Any device with a modern web browser, a camera, and a microphone (desktop or mobile). |
| **Technical Literacy** | Minimal. The user interface is designed for non-technical users with a single "Start Anonymous Chat" entry point. |
| **Browser Requirements** | A modern browser supporting WebRTC (`RTCPeerConnection`, `getUserMedia`), WebSocket, and ES2020+. This includes Chrome 80+, Firefox 80+, Safari 14+, and Edge 80+. |
| **Network Requirements** | Internet connectivity with sufficient bandwidth for video streaming. STUN servers provide NAT traversal for most network configurations; a configurable TURN server is available for restrictive NATs. |
| **Session Duration** | Users may participate in multiple sequential sessions within a single browser tab visit. Each session is independent. |
| **Accessibility** | The UI provides visual status indicators, clear button labels, and keyboard-accessible controls. |

### 2.4 Constraints

| ID | Constraint | Description |
|----|-----------|-------------|
| C-01 | **HTTPS Mandatory** | All client-server communication must occur over HTTPS. WebRTC media is encrypted via DTLS/SRTP. Unsecured HTTP connections are not supported. |
| C-02 | **Browser API Dependencies** | The system depends on the `getUserMedia`, `RTCPeerConnection`, `MediaStream`, and WebSocket browser APIs. Behavior on unsupported browsers is undefined. |
| C-03 | **Single-Instance MVP** | The system is designed for a single server instance. No horizontal scaling, load balancing, or distributed state management is included. In-memory state (queue, rooms, penalties) is lost on signaling server restart. |
| C-04 | **No Server-Side Video/Audio Storage** | Video frames, audio streams, and media content are never stored on the server. The moderation service processes frames in-memory and discards them immediately after analysis. |
| C-05 | **STUN-Only Default** | NAT traversal defaults to STUN (Google's free public servers). TURN server support is available but must be configured via environment variables. |
| C-06 | **Maximum Concurrent Rooms** | The system targets approximately 50 concurrent active rooms, limited by single-instance memory constraints. |
| C-07 | **SQLite Database** | The database layer uses SQLite for persistence. This is suitable for single-instance deployment but does not support concurrent multi-writer scenarios. |
| C-08 | **Frame Resolution Limit** | Moderation frames are captured at 128×96 pixels to balance privacy, bandwidth, and analysis quality. This resolution may not detect all content types with equal accuracy. |

### 2.5 Assumptions and Dependencies

| # | Assumption | Justification |
|---|-----------|---------------|
| A1 | No user registration or login — fully anonymous via auto-generated session ID. | Matches the core "anonymous entry" product requirement. |
| A2 | One-on-one matching only (not group chat). | Provides an Omegle-like experience; group chat is out of scope for MVP. |
| A3 | Text chat alongside video is available in MVP but video remains the primary communication medium. | Text chat adds value with minimal complexity; video is the core feature. |
| A4 | Trust score is persisted via Prisma/SQLite, not Redis (no Redis in environment). | Environment constraint — SQLite provides sufficient persistence for single-instance. |
| A5 | In-memory state for queue, rooms, and penalties on signaling server (lost on restart is acceptable for MVP). | No Redis available; in-memory is sufficient for single-instance deployment. |
| A6 | Moderation uses VLM (Vision Language Model) via z-ai-web-dev-sdk instead of Python MediaPipe. | Environment constraint — no Python runtime available in deployment. |
| A7 | TURN server is optional; STUN-only works for most NAT types. | Free STUN servers are available from Google; TURN requires a paid service. |
| A8 | Single-instance deployment (no horizontal scaling). | Environment constraint — single machine deployment. |
| A9 | Maximum concurrent rooms target: approximately 50 (memory-limited). | Reasonable for single-instance MVP; enforceable via `MAX_QUEUE_SIZE=200`. |
| A10 | Frame resolution for moderation: 128×96 pixels. | Balances privacy (low-res), bandwidth efficiency, and sufficient analysis quality for VLM. |
| A11 | Moderation heartbeat interval: 2,000 ms (2 seconds). | Provides timely content moderation while limiting VLM API call frequency. |
| A12 | Session timeout: 30 seconds of no heartbeat from either peer triggers cleanup. | Reasonable for detecting dead/unresponsive sessions without premature termination. |

### 2.6 Apportioning of Requirements

Requirements deferred to future development phases:

| Phase | Features | Notes |
|-------|----------|-------|
| **Phase 7** | User registration and persistent profiles | Enables cross-session identity for trust recovery features |
| **Phase 8** | Geographic or interest-based matching | Requires user preferences, moves beyond FIFO |
| **Phase 9** | Group video chat (3+ participants) | Requires SFU (Selective Forwarding Unit) architecture |
| **Phase 10** | Audio-only fallback sessions | Improves reliability when video fails |
| **Phase 11** | User appeal process for blacklisting | Requires persistent profiles for appeal tracking |
| **Phase 12** | Horizontal scaling with Redis | Requires distributed state management, sticky sessions |
| **Phase 13** | TURN server hosting service | Requires infrastructure and cost planning |
| **Phase 14** | Push notifications (match found, partner waiting) | Requires service worker registration |
| **Phase 15** | Monetization and premium features | Out of scope for core platform |

---

## 3. Specific Requirements

### 3.1 External Interface Requirements

#### 3.1.1 User Interfaces

The application implements a single-page architecture with nine distinct UI states. Only one state is active at any time, managed by a central state machine.

**REQ-UI-01: Landing State**
- Priority: Must
- Description: The landing state is the initial screen presented to all users. It displays a dark-themed hero section with the SecureStream shield icon, the application name, a brief tagline ("Privacy-first anonymous video chat"), and a prominent "Start Anonymous Chat" button. No camera or network access is requested at this stage.
- Rationale: The landing state establishes brand identity, communicates the privacy-first value proposition, and provides a single, unambiguous entry point.
- Acceptance Criteria:
  - The landing page renders within 1,000 ms of initial page load on a 4G connection.
  - The "Start Anonymous Chat" button is visible without scrolling on viewports ≥ 768px wide.
  - Clicking the button transitions the application to the `permission` state.

**REQ-UI-02: Permission State**
- Priority: Must
- Description: After the user clicks "Start," the application requests camera and microphone permissions via `navigator.mediaDevices.getUserMedia()`. The UI displays a visual prompt explaining why camera access is needed, along with a loading indicator. If the user grants permission, the app transitions to `queueing`. If denied, it transitions to `error`.
- Rationale: Camera/mic access is a prerequisite for video chat. Users must explicitly grant permission per browser security policies.
- Acceptance Criteria:
  - A `getUserMedia({ video: true, audio: true })` call is issued within 500 ms of entering this state.
  - If permission is granted, the local video preview becomes visible and the app enters `queueing` state.
  - If permission is denied, the app enters `error` state with the message "Camera access is required to use SecureStream."
  - If permission takes longer than 10 seconds, a timeout error is displayed.

**REQ-UI-03: Queueing State**
- Priority: Must
- Description: While waiting for a match, the user sees an animated pulsing indicator, the text "Searching for partner...", their current queue position (number), and estimated wait time in seconds. A "Cancel" button allows the user to leave the queue and return to `landing`.
- Rationale: Users need feedback that the system is actively searching and an indication of how long they may wait.
- Acceptance Criteria:
  - Queue position updates are received via Socket.IO `queue_update` events and rendered within 100 ms.
  - If no match is found within 120 seconds, a supplementary message "It's quiet right now..." is displayed.
  - Clicking "Cancel" emits a `leave_queue` event and transitions to `landing`.

**REQ-UI-04: Matched State**
- Priority: Must
- Description: When two users are paired, both enter a brief `matched` transition state displaying "Connecting..." with a spinner. WebRTC signaling (offer/answer/ICE exchange) occurs automatically. If connection is established, the state transitions to `active`. If connection fails after ICE restart attempts, it transitions to `error`.
- Rationale: The matched state provides visual feedback while the WebRTC connection is being negotiated.
- Acceptance Criteria:
  - The `matched` state is entered within 100 ms of receiving the `matched` Socket.IO event.
  - If the initiator, an SDP offer is created and sent within 500 ms.
  - If not the initiator, an SDP answer is created and sent within 500 ms of receiving the offer.
  - Connection establishment (ICE connected) completes within 10 seconds under normal network conditions.

**REQ-UI-05: Active State**
- Priority: Must
- Description: The active state is the primary video chat interface. It displays the remote partner's video in a large viewport, the user's own camera as a small picture-in-picture overlay (bottom-right corner), a connection status indicator (green/yellow/red), a trust score badge, and a control bar with Skip, Report, End, Mute, and Camera Toggle buttons. A text chat input field is available for sending text messages. A session timer shows elapsed time.
- Rationale: This state provides all controls and information needed during a live video session.
- Acceptance Criteria:
  - Remote video stream is rendered at the maximum available resolution up to 720p.
  - Local PiP video is rendered at approximately 160×120 pixels.
  - Skip button transitions the user back to `queueing` (or `penalty` if fast-skip detected).
  - Report button opens a report dialog with category selection (NSFW, harassment, bot, other).
  - End button closes the session and transitions to `disconnected`.
  - Mute button toggles audio track enabled/disabled state.
  - Camera toggle button toggles video track enabled/disabled state.
  - Connection status indicator updates within 500 ms of ICE state changes.

**REQ-UI-06: Penalty State**
- Priority: Must
- Description: When a user triggers a fast-skip (skipping within 10 seconds of match), the penalty state is displayed. A red overlay shows "Slow down! Wait Xs" with a live countdown timer. The user cannot join the queue during the cooldown period. When the countdown reaches zero, the user is automatically returned to `landing`.
- Rationale: The penalty box discourages instant-skip abuse while providing clear feedback about the restriction.
- Acceptance Criteria:
  - The penalty overlay is displayed within 200 ms of receiving a `session_ended` event with `penalty.cooldownSeconds`.
  - The countdown timer decreases in 1-second increments.
  - Queue join attempts during cooldown are rejected by the signaling server.
  - After cooldown expires, the user sees a "Try Again" button leading back to `landing`.

**REQ-UI-07: Blacklisted State**
- Priority: Must
- Description: When a user's trust score drops to ≤ 30, they are blacklisted for 24 hours. The blacklisted state displays a dark overlay with "Account suspended," the reason for blacklisting, and the expiry time as a countdown timer or ISO date string. The user cannot interact with any platform features during this period.
- Rationale: Blacklisting prevents repeat violators from accessing the platform while providing transparency about the restriction.
- Acceptance Criteria:
  - The blacklisted state is entered within 200 ms of receiving a `blacklisted` Socket.IO event.
  - The reason string and expiry date (ISO 8601 format) are displayed.
  - All interactive buttons are disabled or hidden.
  - After the blacklist expires (24 hours), the user's trust score is reset to 50 and they can rejoin.

**REQ-UI-08: Disconnected State**
- Priority: Must
- Description: The disconnected state is shown after a session ends for any reason. It displays a summary message ("Partner disconnected," "You skipped," "Session ended by moderation," etc.), the trust score change (if any), and two buttons: "Find Next" (re-enters the queue) and "Quit" (returns to landing).
- Rationale: Provides closure on the ended session and clear next-action options.
- Acceptance Criteria:
  - The disconnect reason is mapped from the `session_ended.reason` field to a human-readable message.
  - Trust score change (e.g., "+2" in green, "-1" in red) is displayed if `trustChange` is present.
  - "Find Next" re-requests camera permission if the media stream was released, then enters `queueing`.
  - "Quit" transitions to `landing`.

**REQ-UI-09: Error State**
- Priority: Must
- Description: The error state handles all unrecoverable errors. It displays a red alert card with a user-friendly error message and two buttons: "Retry" (re-attempts the last action) and "Quit" (returns to landing).
- Rationale: Users need clear, actionable feedback when something goes wrong, without exposing technical details.
- Acceptance Criteria:
  - The error state is entered for: camera permission denied, ICE connection failure (after 2 restart attempts), signaling server unreachable (after 3 retries), moderation service unavailable.
  - Error messages are user-friendly (no stack traces or technical jargon).
  - "Retry" re-attempts the failed operation (e.g., re-request camera, re-join queue).
  - "Quit" resets the state machine and returns to `landing`.

#### 3.1.2 Hardware Interfaces

**REQ-HW-01: Camera Access**
- Priority: Must
- Description: The system requires access to the user's front-facing (or default) camera via the `getUserMedia({ video: true })` API. The camera must support at least 640×480 resolution at 15 fps. Higher resolutions (up to 720p) are used when available.
- Rationale: Video chat is the core feature; camera access is non-negotiable.
- Acceptance Criteria:
  - Camera stream is acquired with a minimum resolution of 640×480.
  - The camera feed is displayed in both the local PiP and sent via WebRTC to the partner.

**REQ-HW-02: Microphone Access**
- Priority: Must
- Description: The system requires access to the user's microphone via the `getUserMedia({ audio: true })` API. Audio is encoded using the browser's default codec (typically Opus) and sent via WebRTC.
- Rationale: Two-way audio communication is a core feature.
- Acceptance Criteria:
  - Audio stream is acquired and sent via WebRTC.
  - The user can mute/unmute their microphone during an active session.

**REQ-HW-03: No External Hardware Dependencies**
- Priority: Must
- Description: Beyond camera and microphone, the system has no external hardware dependencies. All processing (frame capture, resizing, encoding) occurs on the client device.
- Rationale: Minimizes deployment complexity and maximizes accessibility.
- Acceptance Criteria:
  - The system functions with only a standard webcam and microphone.

#### 3.1.3 Software Interfaces

**REQ-SW-01: Socket.IO Client Library**
- Priority: Must
- Description: The frontend uses the Socket.IO client library (v4.x) to establish a persistent WebSocket connection to the signaling server. The connection is managed through a React context provider (`SocketProvider`).
- Rationale: Socket.IO provides automatic reconnection, event-based messaging, and room/namespace support.
- Acceptance Criteria:
  - The Socket.IO client connects to the signaling server URL configured via environment variable.
  - Automatic reconnection is enabled with at least 3 retry attempts.
  - Connection state (`isConnected`) is exposed via React context for UI status display.

**REQ-SW-02: WebRTC API (RTCPeerConnection)**
- Priority: Must
- Description: The frontend uses the browser's native `RTCPeerConnection` API for peer-to-peer media streaming. The `useWebRTC` hook manages the full connection lifecycle including offer/answer exchange, ICE candidate handling, and connection state monitoring.
- Rationale: WebRTC is the W3C standard for browser-based real-time communication.
- Acceptance Criteria:
  - `RTCPeerConnection` is instantiated with the configured ICE servers (STUN + optional TURN).
  - Local media tracks are added to the connection before creating the offer.
  - ICE candidates are exchanged via Socket.IO signaling.
  - Connection state changes are monitored via `onconnectionstatechange` and `oniceconnectionstatechange`.

**REQ-SW-03: z-ai-web-dev-sdk (VLM)**
- Priority: Must
- Description: The moderation service uses the z-ai-web-dev-sdk to invoke a Vision Language Model for frame analysis. The SDK provides the `ZAI.create()` and `createVision()` APIs for sending images and receiving structured text responses.
- Rationale: The VLM provides AI-powered content moderation without requiring a Python runtime.
- Acceptance Criteria:
  - The moderation service initializes the VLM client using the API key from environment variables.
  - Each frame analysis request includes a structured moderation prompt.
  - VLM responses are parsed into a structured `ModerationAnalysis` object.
  - Analysis failures are caught and returned as `risk_level: "none"` (fail-open for availability).

**REQ-SW-04: Prisma ORM**
- Priority: Must
- Description: Both the signaling server and the Next.js API layer use Prisma as the ORM for database access. Prisma provides type-safe queries, migrations, and schema management for the SQLite database.
- Rationale: Prisma provides type-safe database access and migration management.
- Acceptance Criteria:
  - Prisma client is initialized with the `DATABASE_URL` environment variable.
  - All database operations use generated Prisma methods (e.g., `prisma.trustRecord.upsert()`).
  - Schema changes are managed through Prisma migrations.

**REQ-SW-05: Next.js API Route Proxy**
- Priority: Must
- Description: The Next.js API route at `/api/moderation` acts as a proxy between the frontend browser and the moderation service. This proxy hides the moderation service's internal port and URL from the client, providing an additional security layer.
- Rationale: Prevents direct browser-to-moderation-service communication, enabling CORS control and payload validation.
- Acceptance Criteria:
  - The proxy forwards POST requests with the JSON body to `http://localhost:3004/api/moderate`.
  - Request payloads are validated (session ID format, frame size ≤ 200 KB) before forwarding.
  - Response bodies are passed through to the client.

#### 3.1.4 Communications Interfaces

**REQ-COMM-01: WebSocket (Socket.IO)**
- Priority: Must
- Description: All real-time communication between the frontend and signaling server uses Socket.IO over WebSocket Secure (WSS). This includes matchmaking, signaling, session events, heartbeats, chat messages, and trust updates.
- Rationale: WebSocket provides low-latency, persistent, bidirectional communication ideal for real-time signaling.
- Acceptance Criteria:
  - Connection is established over WSS (port 3003).
  - Message delivery is event-based with typed payloads.
  - Socket.IO built-in ping/pong operates at 25-second intervals with 60-second timeout.

**REQ-COMM-02: HTTP/REST**
- Priority: Must
- Description: The frontend communicates with the moderation service via HTTP POST requests, proxied through the Next.js API route at `/api/moderation`. The moderation service exposes a single REST endpoint.
- Rationale: REST provides a simple, stateless interface for frame analysis requests.
- Acceptance Criteria:
  - POST requests to `/api/moderation` include JSON body with `sessionId`, `roomId`, `frame` (base64 JPEG), and `timestamp`.
  - Response includes structured JSON with `analysis`, `processing_time_ms`, and `timestamp`.
  - Requests time out after 5 seconds; failures default to `risk_level: "none"`.

**REQ-COMM-03: WebRTC P2P Media**
- Priority: Must
- Description: Video and audio streams between paired users flow directly peer-to-peer via WebRTC (SRTP/DTLS encryption). Media does not pass through any server.
- Rationale: P2P media streaming ensures privacy (no server-side media storage) and reduces server bandwidth costs.
- Acceptance Criteria:
  - Media flows directly between browsers after ICE negotiation completes.
  - SRTP/DTLS encryption is enforced for all media traffic.
  - No media data is relayed through the signaling server.

---

### 3.2 Functional Requirements

---

#### FR-1xx: User Registration & Authentication

**REQ-101: Anonymous Session Generation**
- Priority: Must
- Description: Each new user session begins with the automatic generation of a UUID v4 session identifier on the client side. This session ID uniquely identifies the user for the duration of their browser tab session. No registration, login, or personal information is collected.
- Rationale: Anonymity is a core product requirement. Session IDs enable the server to track user state without PII.
- Acceptance Criteria:
  - A UUID v4 string is generated using `crypto.randomUUID()` or equivalent.
  - The session ID is stored in React state (not localStorage or cookies) for the tab lifetime.
  - The session ID is included in all Socket.IO payloads and moderation requests.

**REQ-102: Session Persistence (Within Tab)**
- Priority: Must
- Description: The session ID remains constant throughout the user's tab session, across multiple video chat sessions. If the browser tab is closed, the session ID is discarded.
- Rationale: Consistent session IDs enable the trust score system to track behavior across multiple matches.
- Acceptance Criteria:
  - The same session ID is used for all Socket.IO connections within a single tab.
  - Closing and reopening the tab generates a new session ID.
  - The signaling server associates the session ID with the socket ID for routing.

**REQ-103: No PII Collection**
- Priority: Must
- Description: The system shall not collect, store, or log any personally identifiable information, including but not limited to: names, email addresses, phone numbers, IP addresses, user agent strings, or geolocation data.
- Rationale: Privacy-first architecture requires zero PII collection.
- Acceptance Criteria:
  - No PII fields exist in any database model.
  - Server logs do not contain IP addresses or user agents.
  - Browser cookies are not used for tracking or identification.

---

#### FR-2xx: Camera & Media Management

**REQ-201: Camera and Microphone Access**
- Priority: Must
- Description: The system requests camera and microphone access via `navigator.mediaDevices.getUserMedia({ video: true, audio: true })`. The request is made only after the user explicitly clicks "Start Anonymous Chat."
- Rationale: Media access is a prerequisite for video chat; explicit user consent is required by browser security policies.
- Acceptance Criteria:
  - `getUserMedia()` is called with both `video: true` and `audio: true` constraints.
  - If successful, a `MediaStream` object is obtained containing at least one video track and one audio track.
  - If failed, the user is transitioned to the `error` state with a descriptive message.

**REQ-202: Picture-in-Picture Local Video**
- Priority: Must
- Description: The user's own camera feed is displayed as a small picture-in-picture overlay in the bottom-right corner of the active session view. The PiP video is smaller than the remote partner's video.
- Rationale: Users need to see how they appear to their partner.
- Acceptance Criteria:
  - The local video element displays the camera feed at approximately 160×120 pixels.
  - The PiP overlay is positioned in the bottom-right corner with a 16px margin.
  - The PiP video is always rendered on top of the remote video (higher z-index).

**REQ-203: Camera Toggle**
- Priority: Should
- Description: During an active session, the user can toggle their camera on or off by clicking the camera toggle button. When toggled off, the partner receives a "video muted" indication (black frame or track-ended event). When toggled back on, the video stream resumes.
- Rationale: Users may want to temporarily disable their camera without ending the session.
- Acceptance Criteria:
  - Clicking the camera toggle button calls `videoTrack.enabled = !videoTrack.enabled`.
  - The local PiP video reflects the muted/unmuted state.
  - The partner's remote video shows a muted indicator when the camera is off.

**REQ-204: Microphone Mute Toggle**
- Priority: Must
- Description: During an active session, the user can mute/unmute their microphone by clicking the mute button. When muted, no audio is sent to the partner. The button's visual state reflects the current mute status.
- Rationale: Users need to control their audio output for privacy and convenience.
- Acceptance Criteria:
  - Clicking the mute button calls `audioTrack.enabled = !audioTrack.enabled`.
  - The mute button shows a microphone-off icon when muted.
  - The partner sees a muted indicator in their UI.

**REQ-205: Media Stream Cleanup**
- Priority: Must
- Description: When a session ends (skip, disconnect, timeout, etc.), all media tracks on the local `MediaStream` are stopped, and the `RTCPeerConnection` is closed to release camera and microphone hardware resources.
- Rationale: Failing to release media resources keeps the camera/microphone active (indicated by a browser light), which is a privacy concern.
- Acceptance Criteria:
  - `mediaStream.getTracks().forEach(t => t.stop())` is called on session end.
  - `peerConnection.close()` is called on session end.
  - The camera indicator light on the device turns off after cleanup.

---

#### FR-3xx: Matchmaking & Queue System

**REQ-301: Join Matchmaking Queue**
- Priority: Must
- Description: After camera permission is granted, the user is automatically placed in the matchmaking queue by emitting a `join_queue` Socket.IO event with their session ID. The signaling server maintains a FIFO queue of waiting users.
- Rationale: The matchmaking queue is the mechanism by which users find chat partners.
- Acceptance Criteria:
  - The `join_queue` event includes `{ sessionId: string }`.
  - The signaling server adds the user to an in-memory FIFO queue (`Map<sessionId, JoinRequest>`).
  - The user receives a `queue_update` event with their initial position.

**REQ-302: Instant Pairing**
- Priority: Must
- Description: When a second user joins the queue, the two are immediately paired. If more than two users are in the queue, the two longest-waiting users are paired. A `matched` event is sent to both users with a shared room ID, the partner's anonymous session ID, and a boolean `initiator` flag (true for the user who joined the queue first).
- Rationale: Instant pairing when two users are available minimizes wait time.
- Acceptance Criteria:
  - When queue size ≥ 2, the two users at the front of the queue are paired.
  - Both users receive a `matched` event within 200 ms of the second user joining.
  - The `matched` event includes `roomId`, `partnerSessionId`, and `initiator` fields.
  - The `initiator` flag is `true` for the user who joined the queue first.

**REQ-303: Queue Position Updates**
- Priority: Must
- Description: While in the queue, users receive `queue_update` events whenever the queue changes (users join, pair, or leave). Each update includes the user's current position (1-based) and estimated wait time in seconds.
- Rationale: Real-time queue position feedback reduces perceived wait time.
- Acceptance Criteria:
  - `queue_update` events are sent whenever the queue size changes.
  - Position values are 1-based (position 1 = next to be matched).
  - Estimated wait time is calculated as `position * 30` seconds (30-second average pairing estimate).

**REQ-304: Leave Queue**
- Priority: Must
- Description: Users can leave the queue at any time by clicking "Cancel" or navigating away. This emits a `leave_queue` event to the signaling server, which removes the user from the queue and updates remaining positions.
- Rationale: Users must be able to opt out of waiting.
- Acceptance Criteria:
  - The `leave_queue` event removes the user from the in-memory queue.
  - Remaining users receive updated `queue_update` events.
  - The user's UI transitions to the `landing` state.

**REQ-305: Maximum Queue Size**
- Priority: Must
- Description: The matchmaking queue has a maximum capacity of 200 users (configurable via `MAX_QUEUE_SIZE` environment variable). Users attempting to join when the queue is full receive a `queue_rejected` event with reason `"rate_limited"`.
- Rationale: Prevents unbounded memory growth on the signaling server.
- Acceptance Criteria:
  - When `queue.size >= MAX_QUEUE_SIZE`, new `join_queue` requests are rejected.
  - A `queue_rejected` event is emitted with `{ reason: "rate_limited" }`.
  - The user's UI transitions to the `error` state with an "At capacity" message.

**REQ-306: Long Wait Notification**
- Priority: Should
- Description: If a user has been in the queue for more than 120 seconds without being matched, a supplementary message "It's quiet right now..." is displayed. The user remains in the queue; no auto-cancel occurs.
- Rationale: Provides feedback during low-traffic periods without prematurely terminating the wait.
- Acceptance Criteria:
  - After 120 seconds in the queue, the additional message is displayed.
  - The user remains in the queue and can still be matched.
  - No automatic queue removal occurs.

---

#### FR-4xx: WebRTC Video Communication

**REQ-401: SDP Offer/Answer Exchange**
- Priority: Must
- Description: After a `matched` event, the designated initiator creates an `RTCPeerConnection`, adds local media tracks, creates an SDP offer, sets it as the local description, and sends it via Socket.IO. The non-initiator receives the offer, sets it as the remote description, creates an answer, sets it as the local description, and sends it back.
- Rationale: The offer/answer exchange is the WebRTC protocol for negotiating media capabilities between peers.
- Acceptance Criteria:
  - The initiator creates an `RTCPeerConnection` within 200 ms of the `matched` event.
  - The SDP offer is sent via the `offer` Socket.IO event within 500 ms.
  - The non-initiator creates an SDP answer within 500 ms of receiving the offer.
  - The SDP answer is sent via the `answer` Socket.IO event within 500 ms.

**REQ-402: ICE Candidate Exchange**
- Priority: Must
- Description: Both peers gather ICE candidates (host, srflx, relay) and send them to each other via the signaling server. Candidates are exchanged in real time as they are gathered.
- Rationale: ICE candidates are necessary for establishing the network path between peers.
- Acceptance Criteria:
  - ICE candidates are gathered using the configured STUN (and optional TURN) servers.
  - Each candidate is sent via the `ice_candidate` Socket.IO event as it becomes available.
  - The signaling server relays candidates to the correct room partner.
  - Both peers add received candidates via `peerConnection.addIceCandidate()`.

**REQ-403: P2P Media Streaming**
- Priority: Must
- Description: Once ICE negotiation completes (`iceConnectionState === "connected"` or `"completed"`), media streams flow directly between the two browsers. Video and audio are encrypted via SRTP/DTLS. No media passes through the signaling server.
- Rationale: P2P media ensures privacy and reduces server costs.
- Acceptance Criteria:
  - The remote video stream is received via the `ontrack` event and displayed in the `RemoteVideo` component.
  - Both video and audio tracks are present in the remote stream.
  - Media latency (end-to-end) is ≤ 500 ms under normal network conditions.

**REQ-404: ICE Restart**
- Priority: Must
- Description: When `iceConnectionState` transitions to `"failed"` or `"disconnected"`, the client initiates an ICE restart by calling `peerConnection.restartIce()`, creating a new offer, and re-exchanging via signaling. Up to 2 ICE restart attempts are made before terminating the session.
- Rationale: ICE failures due to network changes can often be recovered without fully ending the session.
- Acceptance Criteria:
  - ICE restart is triggered within 1 second of detecting `iceConnectionState === "failed"`.
  - The `ice_restart` Socket.IO event is sent to the partner.
  - A new offer/answer exchange completes within 10 seconds.
  - If the 2nd restart attempt also fails, the session is terminated with reason `"ice_failure"`.

**REQ-405: Frozen Stream Detection**
- Priority: Should
- Description: The system detects frozen remote streams by monitoring the video track's `onmute` event or checking for no frame updates for 10 seconds (`FROZEN_STREAM_TIMEOUT_MS`). A "connection unstable" warning is displayed. If the condition persists for 10 seconds, the session is terminated.
- Rationale: Frozen streams indicate a network issue that cannot be resolved by ICE restart alone.
- Acceptance Criteria:
  - The `onmute` event on the remote video track triggers a "connection unstable" warning within 500 ms.
  - If the track does not unmute within 10 seconds, the session is terminated.

---

#### FR-5xx: Text Chat

**REQ-501: Message Relay**
- Priority: Must
- Description: During an active session, users can send text messages that are relayed through the signaling server to their partner. Messages are sent via the `chat_message` Socket.IO event and received via the same event from the partner.
- Rationale: Text chat provides an alternative communication channel alongside video.
- Acceptance Criteria:
  - The client emits a `chat_message` event with `{ roomId, sessionId, text }`.
  - The signaling server relays the message to the partner's socket in the same room.
  - The partner receives the message within 200 ms of the original send.
  - Messages include `fromSessionId` and `timestamp` fields.

**REQ-502: Message Sanitization**
- Priority: Must
- Description: All text messages are sanitized before relay and rendering. HTML and script tags are stripped to prevent XSS attacks. Messages are limited to 200 characters maximum.
- Rationale: Prevents cross-site scripting and abuse via text chat.
- Acceptance Criteria:
  - Messages exceeding 200 characters are truncated before relay.
  - HTML tags (`<script>`, `<img>`, `<iframe>`, etc.) are stripped using a sanitization function.
  - Only plain text is rendered in the chat UI.

**REQ-503: Message Rate Limiting**
- Priority: Should
- Description: Users are limited to sending a maximum of 5 messages per 10-second window to prevent chat spam.
- Rationale: Rate limiting prevents abuse of the text chat feature.
- Acceptance Criteria:
  - The 6th message within a 10-second window is silently dropped.
  - A visual indicator informs the user they are sending messages too quickly.
  - The rate limit resets after 10 seconds of no messages.

---

#### FR-6xx: Session Lifecycle

**REQ-601: Session Start**
- Priority: Must
- Description: A session starts when the signaling server pairs two users and sends `matched` events to both. The session is assigned a unique room ID (UUID). Both users' session metadata (socket ID, join time, match timestamp) is stored in the room's state.
- Rationale: The room abstraction manages the lifecycle of a paired connection.
- Acceptance Criteria:
  - A room is created with a UUID `roomId`.
  - Both users are stored in the room's user map.
  - The `matchTimestamp` is recorded for fast-skip detection.
  - The signaling server emits `matched` to both users.

**REQ-602: Session Skip**
- Priority: Must
- Description: Either user can skip their current partner by emitting a `skip` event. The signaling server notifies the partner via `session_ended` with reason `"skip"`, removes the room, performs fast-skip detection, and optionally adds the skipping user back to the queue.
- Rationale: Users should be able to leave an uninteresting or uncomfortable session.
- Acceptance Criteria:
  - The skipper receives no penalty if the session lasted ≥ 10 seconds.
  - The partner receives a `session_ended` event with reason `"skip"` within 200 ms.
  - The room is removed from memory within 100 ms.
  - If `requeue: true`, the skipper is added back to the queue.

**REQ-603: Session End (Disconnect)**
- Priority: Must
- Description: When a user's Socket.IO connection drops (browser tab close, network failure), the signaling server detects the `disconnect` event, notifies the partner via `session_ended` with reason `"disconnect"`, and cleans up the room.
- Rationale: Partners must be notified when the other user leaves unexpectedly.
- Acceptance Criteria:
  - The `disconnect` event handler fires within Socket.IO's built-in timeout (60 seconds for WebSocket).
  - The partner receives `session_ended` with reason `"disconnect"`.
  - If the disconnected user was in the queue, they are removed and positions are updated.

**REQ-604: Session Timeout**
- Priority: Must
- Description: If no heartbeat is received from either peer in an active room for 30 seconds (`HEARTBEAT_TIMEOUT_MS = 30000`), the signaling server terminates the session by sending `session_ended` with reason `"timeout"` to both users and cleaning up the room.
- Rationale: Heartbeat timeout detects ghost users (connected but unresponsive).
- Acceptance Criteria:
  - The signaling server checks heartbeat timestamps every 5 seconds.
  - If `Date.now() - lastHeartbeat > 30000` for either user, the session is terminated.
  - Both users receive `session_ended` with reason `"timeout"`.

**REQ-605: Session End (Moderation Kill)**
- Priority: Must
- Description: When the frontend detects `high_risk: true` from the moderation service, it sends a `moderation_flag` event to the signaling server. The server sends `moderation_kill` to the target user and `session_ended` with reason `"moderation_kill"` to both users.
- Rationale: The kill-switch immediately terminates sessions containing policy-violating content.
- Acceptance Criteria:
  - The `moderation_kill` event is sent to the target user within 500 ms of the server receiving the `moderation_flag`.
  - The `session_ended` event with reason `"moderation_kill"` is sent to both users.
  - The target user's trust score is decreased by 10 points.

**REQ-606: Simultaneous Skip Handling**
- Priority: Must
- Description: If both users in a room emit a `skip` event within 1 second of each other, both return to the queue without any fast-skip penalty. This is treated as a mutual skip rather than fast-skipping behavior.
- Rationale: Simultaneous skipping is not abuse; penalizing both users would be unfair.
- Acceptance Criteria:
  - The signaling server detects two `skip` events within 1 second for the same room.
  - Neither user receives a fast-skip penalty.
  - Both users can rejoin the queue immediately.

**REQ-607: Reconnection Handling**
- Priority: Should
- Description: If a user reconnects with the same session ID (e.g., after a brief network interruption), the signaling server force-disconnects any stale socket with the same session ID and accepts the new connection. If the user was in an active room, the partner is notified of the reconnection attempt.
- Rationale: Users should not be permanently disconnected due to brief network issues.
- Acceptance Criteria:
  - The signaling server detects duplicate session IDs on `connect`.
  - The old socket is force-disconnected.
  - The partner receives a `peer_reconnecting` notification.
  - If the room still exists, the reconnected user re-enters the active session.

---

#### FR-7xx: Trust Score System

**REQ-701: Initial Trust Score**
- Priority: Must
- Description: Every new user starts with a trust score of 100. The score is persisted to the `TrustRecord` database model keyed by session ID. If a returning session ID is found in the database, the persisted score is used.
- Rationale: A high starting score gives new users the benefit of the doubt while enabling long-term behavior tracking.
- Acceptance Criteria:
  - New session IDs create a `TrustRecord` with `score: 100`.
  - Returning session IDs load their existing score from the database.
  - Trust score values are integers in the range [0, 100].

**REQ-702: Trust Score Bounds**
- Priority: Must
- Description: Trust scores are bounded between 0 (minimum) and 100 (maximum). Any adjustment that would push the score below 0 is clamped to 0; any adjustment above 100 is clamped to 100.
- Rationale: Prevents score underflow or unbounded growth.
- Acceptance Criteria:
  - After applying any score change, `score = Math.max(0, Math.min(100, score + change))`.
  - The score is persisted to the database after each change.

**REQ-703: Clean Disconnect Bonus (+2)**
- Priority: Must
- Description: When a session ends with a clean disconnect (session duration ≥ 60 seconds), the user earns +2 trust points. This applies to normal session endings (skip after 60s, voluntary end, partner disconnect after 60s).
- Rationale: Rewarding clean behavior encourages positive participation.
- Acceptance Criteria:
  - `CLEAN_DISCONNECT: +2` is applied when `Date.now() - matchTimestamp ≥ 60000`.
  - The trust change is included in the `session_ended` payload as `trustChange: 2`.
  - The score is persisted to the database.

**REQ-704: Fast-Skip Penalty (-1)**
- Priority: Must
- Description: When a user skips a partner within 10 seconds of being matched (`Date.now() - matchTimestamp < 10000`), they incur a -1 trust penalty. The fast-skip detection uses `FAST_SKIP_WINDOW_MS = 10000`.
- Rationale: Discourages instant-skip abuse (rapidly skipping through partners).
- Acceptance Criteria:
  - The `skip` event handler checks `Date.now() - matchTimestamp < 10000`.
  - If true, the user's trust score is decreased by 1.
  - The trust change is included in the `session_ended` payload as `trustChange: -1`.

**REQ-705: Confirmed Violation Penalty (-10)**
- Priority: Must
- Description: When the moderation system confirms a high-risk or critical violation (via `moderation_flag` event), the offending user's trust score is decreased by 10 points. The `VIOLATION` penalty constant is -10.
- Rationale: Significant penalty for confirmed policy violations to protect the community.
- Acceptance Criteria:
  - On `moderation_flag` event, the target user's trust score is decreased by 10.
  - The score change triggers a blacklist check (REQ-710).
  - The trust change is included in the `session_ended` payload as `trustChange: -10`.

**REQ-706: Partner Report Penalty (-5)**
- Priority: Should
- Description: When a user reports their partner, the reported user's trust score is decreased by 5 points. The `PARTNER_REPORT` penalty constant is -5. Reports are logged but not automatically escalated unless confirmed by moderation.
- Rationale: Community-driven enforcement provides an additional safety layer.
- Acceptance Criteria:
  - On `report` event, the reported user's trust score is decreased by 5.
  - The report is logged as a `ModerationEvent` in the database.
  - The reporter receives acknowledgment that their report was submitted.

**REQ-707: Trust Score Notification**
- Priority: Must
- Description: After every trust score change, the affected user receives a `trust_update` Socket.IO event containing their new score and the change amount. The UI displays the trust change as a brief animation (+2 in green, -1 in red, etc.).
- Rationale: Transparency about trust score changes reinforces positive behavior.
- Acceptance Criteria:
  - `trust_update` event is emitted with `{ score: number, change: number }`.
  - The `TrustBadge` component displays the current score.
  - Score changes are animated in the UI for 2 seconds.

**REQ-708: Trust Score Persistence**
- Priority: Must
- Description: Trust scores are persisted to the `TrustRecord` table in the SQLite database via Prisma. The score is updated after every change. The `updatedAt` timestamp is automatically maintained by Prisma.
- Rationale: Persistence across sessions enables long-term behavior tracking even after browser tab closure.
- Acceptance Criteria:
  - Trust score is written to the database within 500 ms of any change.
  - The `TrustRecord` uses `upsert` to handle both new and existing session IDs.
  - `updatedAt` is automatically refreshed on each write.

**REQ-709: Blacklist Reset Score**
- Priority: Must
- Description: When a blacklisted user's 24-hour suspension expires, their trust score is reset to 50 (the `BLACKLIST_RESET_SCORE`). This gives the user a second chance while not returning them to the maximum score.
- Rationale: A fresh start after suspension encourages improved behavior.
- Acceptance Criteria:
  - On blacklist expiry, the `TrustRecord.score` is set to 50.
  - The blacklist record is removed from the database.
  - The user can rejoin the queue with score 50.

**REQ-710: Blacklist Threshold Check**
- Priority: Must
- Description: After every trust score decrease, the system checks if the score has dropped to or below 30 (the `TRUST_BLACKLIST_THRESHOLD`). If so, the user is automatically added to the blacklist for 24 hours.
- Rationale: Automatic blacklisting prevents chronically abusive users from continuing to use the platform.
- Acceptance Criteria:
  - After any score decrease, if `score ≤ 30`, the user is added to the blacklist.
  - A `blacklisted` event is sent to the user with reason and expiry time.
  - A `Blacklist` record is created in the database with `expiresAt = now + 24h`.

---

#### FR-8xx: Penalty Box

**REQ-801: Fast-Skip Detection**
- Priority: Must
- Description: The signaling server tracks the `matchTimestamp` for each user when they are paired. On a `skip` event, the server checks if `Date.now() - matchTimestamp < 10000` (10 seconds). If true, the skip is classified as a fast-skip.
- Rationale: Fast-skipping is an abuse pattern that degrades the experience for other users.
- Acceptance Criteria:
  - `matchTimestamp` is recorded in the `RoomUser` object when pairing occurs.
  - The fast-skip check is performed synchronously in the `skip` event handler.
  - The `FAST_SKIP_WINDOW_MS` constant (default: 10,000) is configurable via environment variable.

**REQ-802: Base Cooldown Penalty (30 seconds)**
- Priority: Must
- Description: A fast-skip triggers a base cooldown of 30 seconds (`BASE_COOLDOWN_MS = 30000`). During the cooldown, the user cannot rejoin the matchmaking queue. The cooldown duration is included in the `session_ended` payload.
- Rationale: A 30-second cooldown is a meaningful deterrent without being overly punitive.
- Acceptance Criteria:
  - On fast-skip, the user is added to the penalty box with `cooldownUntil = Date.now() + 30000`.
  - The `session_ended` payload includes `penalty: { cooldownSeconds: 30 }`.
  - Any `join_queue` attempt during cooldown is rejected with `queue_rejected` and `reason: "penalty"`.

**REQ-803: Escalated Cooldown (5 minutes)**
- Priority: Must
- Description: If a user accumulates 3 or more fast-skips within a 5-minute tracking window (`TRACKING_WINDOW_MS = 300000`), the cooldown is escalated to 5 minutes (`ESCALATED_COOLDOWN_MS = 300000`). The fast-skip count and window start time are tracked per user.
- Rationale: Escalation addresses persistent fast-skippers who ignore the base penalty.
- Acceptance Criteria:
  - Fast-skip count is incremented on each fast-skip occurrence.
  - When `fastSkipCount >= 3` within the 5-minute window, cooldown is set to 300 seconds.
  - The fast-skip counter resets after the 5-minute window expires.
  - The `session_ended` payload includes `penalty: { cooldownSeconds: 300 }`.

**REQ-804: Penalty Expiry and Cleanup**
- Priority: Must
- Description: Penalty records are stored in-memory on the signaling server. A cleanup routine runs every 60 seconds to remove expired penalty records. Expired penalties are silently removed.
- Rationale: Periodic cleanup prevents unbounded memory growth.
- Acceptance Criteria:
  - The cleanup routine runs every 60 seconds.
  - Records where `cooldownUntil < Date.now()` are removed.
  - Removed records free the user to rejoin the queue.

---

#### FR-9xx: Blacklist System

**REQ-901: Blacklist Duration (24 hours)**
- Priority: Must
- Description: Blacklisted users are suspended for 24 hours (`BLACKLIST_DURATION_MS = 86400000`). The blacklist expiry time is stored as an `expiresAt` DateTime in the `Blacklist` database model.
- Rationale: 24 hours provides a meaningful suspension period for serious violations.
- Acceptance Criteria:
  - The `Blacklist` record is created with `expiresAt = now + 24 hours`.
  - The blacklist check compares current time against `expiresAt`.

**REQ-902: Automatic Blacklist Threshold**
- Priority: Must
- Description: Users are automatically blacklisted when their trust score drops to or below 30 (`TRUST_BLACKLIST_THRESHOLD`). This check occurs after every trust score decrease (violation, fast-skip, report).
- Rationale: Automation ensures consistent enforcement without manual intervention.
- Acceptance Criteria:
  - After each score decrease, `if (newScore <= TRUST_BLACKLIST_THRESHOLD)` triggers blacklisting.
  - A `Blacklist` record is created and a `blacklisted` Socket.IO event is sent.
  - The threshold is configurable via the `TRUST_BLACKLIST_THRESHOLD` environment variable (default: 30).

**REQ-903: Blacklist Check on Queue Join**
- Priority: Must
- Description: When a user attempts to join the matchmaking queue, the signaling server checks the `Blacklist` table in the database. If the user is blacklisted and the record has not expired, the join is rejected with a `blacklisted` event. If the record has expired, it is removed and the user's trust score is reset to 50.
- Rationale: Prevents blacklisted users from circumventing their suspension.
- Acceptance Criteria:
  - On `join_queue`, a database query checks for active blacklist records: `WHERE sessionId = ? AND expiresAt > NOW()`.
  - If blacklisted: `blacklisted` event emitted with reason and `expiresAt`.
  - If expired: blacklist record deleted, trust score reset to 50, queue join proceeds normally.

**REQ-904: Blacklist Removal on Expiry**
- Priority: Must
- Description: When a blacklisted user's suspension period expires, the blacklist record is automatically removed. The user's trust score is reset to 50. This happens lazily on the next queue join attempt.
- Rationale: Lazy expiry is simpler than active polling and works correctly for the MVP scope.
- Acceptance Criteria:
  - On next `join_queue` after expiry, the blacklist record is deleted.
  - Trust score is set to 50 via `prisma.trustRecord.update()`.
  - The user can proceed to join the queue normally.

**REQ-905: Blacklist Notification**
- Priority: Must
- Description: When a user is blacklisted (either by automatic threshold or manual addition), the signaling server sends a `blacklisted` Socket.IO event containing the reason string and optional expiry ISO date.
- Rationale: Transparency about the suspension reason and duration.
- Acceptance Criteria:
  - `blacklisted` event payload: `{ reason: string, expiresAt?: string (ISO 8601) }`.
  - The frontend transitions to the `blacklisted` state and displays the information.

---

#### FR-10xx: AI Content Moderation

**REQ-1001: Heartbeat Frame Capture**
- Priority: Must
- Description: Every 2 seconds (`HEARTBEAT_INTERVAL_MS = 2000`), the frontend captures a frame from the user's local video element. The frame is captured by drawing the video to a hidden `<canvas>` element at 128×96 pixels, then exported as a JPEG at 30% quality (`canvas.toDataURL('image/jpeg', 0.3)`).
- Rationale: Regular frame analysis enables continuous content moderation during active sessions.
- Acceptance Criteria:
  - Frame capture occurs every 2,000 ms (±100 ms jitter tolerance).
  - Frame resolution is 128×96 pixels.
  - JPEG quality is 0.3 (30%).
  - Frame size does not exceed 50 KB (100 KB maximum allowed by the moderation service).

**REQ-1002: VLM Frame Analysis**
- Priority: Must
- Description: The captured base64 JPEG frame is sent to the moderation service via the Next.js API proxy. The moderation service sends the frame to the VLM (z-ai-web-dev-sdk) with a structured system prompt instructing it to analyze for: presence of human faces, NSFW content, bot/static indicators, multiple faces, and objectionable objects.
- Rationale: VLM-based analysis provides flexible, AI-powered content moderation.
- Acceptance Criteria:
  - The frame is sent as a base64-encoded string in the POST request body.
  - The VLM returns a structured JSON response with analysis fields.
  - The response is parsed into a `ModerationAnalysis` object.
  - If VLM analysis fails (API error, timeout), the response defaults to `risk_level: "none"` (fail-open).

**REQ-1003: Risk Scoring**
- Priority: Must
- Description: The moderation service calculates a composite risk score (0.0–1.0) using weighted signals from the VLM analysis. The weights are: NSFW content (0.5), no human face present (0.2), bot/static indicators (0.15), multiple faces (0.1), objectionable objects (0.05). The formula is: `riskScore = Σ(weight × signal_score)`.
- Rationale: A weighted composite score provides nuanced risk assessment.
- Acceptance Criteria:
  - Each signal score is in the range [0.0, 1.0].
  - The composite risk score is in the range [0.0, 1.0].
  - The risk score is mapped to a risk level per the threshold rules (REQ-1004).

**REQ-1004: Risk Level Thresholds**
- Priority: Must
- Description: The composite risk score is mapped to one of five risk levels with corresponding recommended actions:

| Risk Level | Score Range | Action |
|-----------|-------------|--------|
| `none` | 0.0 – 0.15 | `allow` — continue session |
| `low` | 0.15 – 0.35 | `allow` — log event only |
| `medium` | 0.35 – 0.6 | `warn` — send warning, briefly blur remote video |
| `high` | 0.6 – 0.8 | `blur` — blur remote video, log event |
| `critical` | 0.8 – 1.0 | `terminate` — kill session, apply penalty |

- Rationale: Graduated thresholds enable proportional responses to varying risk levels.
- Acceptance Criteria:
  - Risk scores ≤ 0.15 → `risk_level: "none"`, `recommended_action: "allow"`.
  - Risk scores 0.15–0.35 → `risk_level: "low"`, `recommended_action: "allow"`.
  - Risk scores 0.35–0.6 → `risk_level: "medium"`, `recommended_action: "warn"`.
  - Risk scores 0.6–0.8 → `risk_level: "high"`, `recommended_action: "blur"`.
  - Risk scores ≥ 0.8 → `risk_level: "critical"`, `recommended_action: "terminate"`.

**REQ-1005: Consecutive Violation Escalation**
- Priority: Must
- Description: The action mapping considers consecutive violations within the same session. If a user accumulates 3 or more consecutive violations at any risk level, the action is escalated to `blacklist` regardless of the current risk level. If a user accumulates 2 or more consecutive `medium` violations, the action is escalated to `terminate`.
- Rationale: Repeated violations indicate persistent abusive behavior warranting stronger action.
- Acceptance Criteria:
  - `consecutiveViolations >= 3` → `action: "blacklist"` (regardless of risk level).
  - `risk_level === "medium" && consecutiveViolations >= 2` → `action: "terminate"`.
  - `risk_level === "critical"` → `action: "blacklist"` (immediate, regardless of count).
  - Consecutive violation count resets when a `none` or `low` risk result is received.

**REQ-1006: Kill-Switch Trigger**
- Priority: Must
- Description: When the moderation analysis returns `high_risk: true` (risk level ≥ `"high"`), the frontend immediately sends a `moderation_flag` Socket.IO event to the signaling server. The signaling server then sends `moderation_kill` to the target user and `session_ended (moderation_kill)` to both users.
- Rationale: The kill-switch provides immediate automated response to severe policy violations.
- Acceptance Criteria:
  - `high_risk === true` triggers `moderation_flag` emission within 500 ms.
  - The signaling server validates the flag (ensures sender is in the room).
  - `moderation_kill` is sent to the target within 500 ms of receiving the flag.
  - `session_ended (moderation_kill)` is sent to both users.
  - The target's trust score is decreased by 10.

**REQ-1007: Warning Overlay (Medium Risk)**
- Priority: Must
- Description: When the moderation analysis returns `risk_level: "medium"`, the `ModerationOverlay` component briefly blurs the remote video and displays a warning message. The blur effect lasts for 3 seconds, then fades out.
- Rationale: Visual feedback alerts both users to borderline content without terminating the session.
- Acceptance Criteria:
  - A CSS blur filter (value ≥ 10px) is applied to the remote video element.
  - A warning message ("Content warning") is displayed.
  - The blur and message fade out after 3 seconds.
  - The session continues normally after the warning.

**REQ-1008: No Frame Persistence**
- Priority: Must
- Description: The moderation service processes each frame in-memory and does not persist, log, or cache any frame data. Frame data exists only for the duration of the analysis request (typically < 500 ms).
- Rationale: Privacy-first architecture prohibits storage of user video data.
- Acceptance Criteria:
  - No frame data is written to disk at any point.
  - Server logs contain only `risk_level` and `action`, never frame content.
  - Frame buffers are eligible for garbage collection immediately after analysis.

---

#### FR-11xx: Reporting System

**REQ-1101: Report Categories**
- Priority: Must
- Description: Users can report their partner by selecting from predefined categories: "NSFW content," "Harassment," "Suspected bot," and "Other." The report dialog is accessible via the Report button in the active session controls.
- Rationale: Categorized reports enable better analysis of platform abuse patterns.
- Acceptance Criteria:
  - The report dialog presents exactly 4 predefined categories.
  - The user must select a category before submitting.
  - An optional free-text field (max 200 characters) is available for the "Other" category.

**REQ-1102: Report Relay and Processing**
- Priority: Must
- Description: When a report is submitted, the client emits a `report` Socket.IO event with `{ roomId, sessionId, targetSessionId, reason }`. The signaling server logs the report as a `ModerationEvent`, applies a -5 trust penalty to the reported user, and sends acknowledgment to the reporter.
- Rationale: Reports are the community-driven safety mechanism that complements AI moderation.
- Acceptance Criteria:
  - The `report` event includes `roomId`, `sessionId` (reporter), `targetSessionId`, and `reason`.
  - A `ModerationEvent` record is created in the database with `riskLevel: "reported"`, `action: "trust_penalty"`.
  - The reported user's trust score is decreased by 5.
  - The reporter receives acknowledgment that the report was submitted.

**REQ-1103: Report Acknowledgment**
- Priority: Should
- Description: After submitting a report, the reporter receives visual confirmation that their report was received. The confirmation is displayed as a toast notification.
- Rationale: Feedback confirms the report was processed and encourages future reporting.
- Acceptance Criteria:
  - A toast notification "Report submitted. Thank you for helping keep SecureStream safe." is displayed.
  - The notification auto-dismisses after 3 seconds.

---

#### FR-12xx: Rate Limiting

**REQ-1201: Queue Join Rate Limit**
- Priority: Must
- Description: Users are limited to a maximum of 5 queue join attempts per 60-second sliding window (`JOIN_QUEUE_MAX: 5`, `JOIN_QUEUE_WINDOW_MS: 60000`). This prevents rapid rejoining abuse.
- Rationale: Rate limiting prevents spamming the matchmaking queue.
- Acceptance Criteria:
  - The signaling server tracks join timestamps in a sliding window per session ID.
  - The 6th join attempt within 60 seconds is rejected with `queue_rejected` and `reason: "rate_limited"`.
  - The sliding window resets as old timestamps fall outside the 60-second window.

**REQ-1202: Skip Rate Limit**
- Priority: Must
- Description: Users are limited to a maximum of 1 skip per 5-second window (`SKIP_MAX: 1`, `SKIP_WINDOW_MS: 5000`). This prevents rapid skip spam.
- Rationale: Skip rate limiting complements the fast-skip penalty box to prevent abuse.
- Acceptance Criteria:
  - The signaling server tracks skip timestamps in a sliding window per session ID.
  - A skip attempt within 5 seconds of the previous skip is silently ignored.
  - The user is not notified of the rate limit (to avoid revealing the anti-abuse mechanism).

**REQ-1203: Chat Message Rate Limit**
- Priority: Should
- Description: Users are limited to 5 chat messages per 10-second sliding window. Excess messages are silently dropped, and the user sees a visual rate-limit indicator.
- Rationale: Prevents text chat spam.
- Acceptance Criteria:
  - Messages beyond the 5-per-10s limit are not relayed.
  - The sender sees a "Sending too quickly" indicator.
  - The limit resets after 10 seconds of no messages.

---

#### FR-13xx: Real-time Notifications

**REQ-1301: Online User Count**
- Priority: Should
- Description: The signaling server periodically broadcasts the total number of connected users via the `online_count` Socket.IO event. The count includes all users with an active Socket.IO connection, regardless of their current state (landing, queueing, or in-session).
- Rationale: Displaying the online count gives users confidence that the platform is active.
- Acceptance Criteria:
  - The `online_count` event is broadcast to all connected sockets every 30 seconds.
  - The count includes all currently connected sockets.
  - The frontend displays the count in the UI (e.g., "42 users online").

**REQ-1302: Trust Score Update Notifications**
- Priority: Must
- Description: After every trust score change, the affected user receives a `trust_update` Socket.IO event with their new score and the change delta. The UI displays an animated score change.
- Rationale: Immediate feedback reinforces the trust system's effectiveness.
- Acceptance Criteria:
  - `trust_update` event: `{ score: number, change: number }`.
  - The `TrustBadge` component animates the score change (green for positive, red for negative).
  - Animation duration is 2 seconds.

**REQ-1303: Sound Effects**
- Priority: Could
- Description: The application plays short audio cues for key events: match found (positive chime), skip (neutral click), disconnect (notification tone), and report submitted (confirmation sound). Sound effects are disabled by default and can be enabled by the user.
- Rationale: Audio feedback enhances the user experience without being intrusive.
- Acceptance Criteria:
  - Sound effects are implemented as short (< 1 second) audio files.
  - A toggle in the UI controls sound on/off.
  - Sound preference is stored in React state (not persisted).
  - Sounds do not autoplay without user interaction (browser autoplay policy compliance).

---

### 3.3 Performance Requirements

**REQ-PERF-01: Connection Establishment Time**
- Priority: Must
- Description: The time from receiving the `matched` event to establishing an active WebRTC connection (ICE `connected` state) must not exceed 10 seconds under normal network conditions (latency < 100 ms, no restrictive NAT).
- Rationale: Users expect near-instant connection after being matched.
- Acceptance Criteria:
  - Under normal conditions, connection establishment completes within 10 seconds.
  - SDP offer/answer exchange completes within 2 seconds.
  - ICE candidate gathering completes within 5 seconds.

**REQ-PERF-02: Frame Capture and Moderation Latency**
- Priority: Must
- Description: The end-to-end latency from frame capture to receiving the moderation analysis result must not exceed 5 seconds. This includes frame capture (≤ 50 ms), network transmission (≤ 200 ms), VLM analysis (≤ 3 seconds), and response delivery (≤ 200 ms).
- Rationale: Moderation must be timely to be effective; stale analysis is less useful.
- Acceptance Criteria:
  - Frame capture (canvas draw + toDataURL) completes within 50 ms.
  - Moderation service processing time (`processing_time_ms`) is logged and typically ≤ 3,000 ms.
  - Total round-trip from capture to UI response ≤ 5,000 ms.
  - If moderation service is unavailable, the request times out after 5 seconds and defaults to `risk_level: "none"`.

**REQ-PERF-03: Maximum Concurrent Users**
- Priority: Must
- Description: The system must support a minimum of 50 concurrent active rooms (100 concurrent users in sessions) on a single instance with 512 MB of available memory for the signaling server process.
- Rationale: The MVP targets a single-instance deployment with practical memory constraints.
- Acceptance Criteria:
  - 50 concurrent rooms operate without degradation in signaling latency (< 200 ms event delivery).
  - Memory usage of the signaling server does not exceed 512 MB.
  - Queue operations (join, leave, match) complete within 100 ms at 50% capacity.

**REQ-PERF-04: Queue Wait Time**
- Priority: Should
- Description: When at least 2 users are in the queue, pairing must occur within 500 ms. When 1 user is in the queue, the user should not wait more than 60 seconds for a match under normal traffic conditions (≥ 2 concurrent users).
- Rationale: Minimizing wait time is critical for user engagement.
- Acceptance Criteria:
  - Instant pairing occurs within 500 ms when 2+ users are queued.
  - Estimated wait time displayed to the user is updated within 2 seconds of queue changes.

**REQ-PERF-05: Frontend Rendering Performance**
- Priority: Should
- Description: The initial page load must complete within 2 seconds on a 4G connection. State transitions between UI phases must render within 100 ms.
- Rationale: Responsive UI maintains user engagement.
- Acceptance Criteria:
  - First Contentful Paint (FCP) ≤ 2 seconds on 4G.
  - State transition animations complete within 100 ms.
  - Video elements render without visible frame drops (≥ 24 fps displayed).

**REQ-PERF-06: Heartbeat Processing**
- Priority: Must
- Description: The signaling server must process heartbeat events within 10 ms of receipt. Heartbeat timeout checks must run every 5 seconds.
- Rationale: Efficient heartbeat processing ensures timely ghost user detection.
- Acceptance Criteria:
  - Each `heartbeat` event is processed in < 10 ms.
  - Heartbeat timestamp is updated in the room user record.
  - Timeout check runs every 5 seconds.

---

### 3.4 Design Constraints

**REQ-DC-01: Technology Stack**
- Priority: Must
- Description: The system is built with the following technology stack:
  - **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui
  - **Backend (Signaling)**: Socket.IO 4.x on Bun runtime
  - **Backend (Moderation)**: REST API on Bun runtime, z-ai-web-dev-sdk for VLM
  - **Database**: Prisma ORM with SQLite
  - **Real-time**: Socket.IO for signaling, WebRTC for media
  - **State Management**: React context and hooks (no Redux/Zustand)
- Rationale: These technologies are selected based on the development environment constraints and team expertise.
- Acceptance Criteria:
  - All source code is written in TypeScript.
  - The frontend is deployed as a Next.js application.
  - Mini-services run on the Bun runtime.
  - Database access is exclusively through Prisma.

**REQ-DC-02: Browser Compatibility**
- Priority: Must
- Description: The system supports the following minimum browser versions:
  - Google Chrome 80+
  - Mozilla Firefox 80+
  - Apple Safari 14+
  - Microsoft Edge 80+
  All must support WebRTC (RTCPeerConnection, getUserMedia), WebSocket, and ES2020+.
- Rationale: Ensures broad compatibility while leveraging modern browser APIs.
- Acceptance Criteria:
  - The application renders and functions correctly on all listed browsers.
  - Feature detection is used to gracefully handle unsupported APIs.

**REQ-DC-03: No Server-Side Video Storage**
- Priority: Must
- Description: Video frames, audio streams, and media content are never stored, recorded, or cached on any server component. The moderation service processes frames entirely in-memory and discards them immediately after analysis.
- Rationale: Privacy-first architecture prohibits media storage.
- Acceptance Criteria:
  - No media data is written to disk on any server component.
  - No media data is stored in the database.
  - Frame data is never included in server logs.

**REQ-DC-04: Single-Page Application**
- Priority: Must
- Description: The frontend is a single-page application (SPA) with client-side state management. All UI states are managed through a central state machine in the `VideoChat` component. No full-page navigation occurs during the user's session.
- Rationale: SPA architecture provides smooth state transitions and avoids page reload interruptions.
- Acceptance Criteria:
  - The application consists of a single HTML page (`/`).
  - All state transitions are handled client-side without full-page reloads.
  - The browser's back/forward buttons do not disrupt the application state.

---

### 3.5 Security Requirements

**REQ-SEC-01: HTTPS Mandatory**
- Priority: Must
- Description: All client-server communication must occur over HTTPS. The frontend, API proxy, and Socket.IO connection must use TLS encryption. HTTP connections must be redirected to HTTPS or refused.
- Rationale: HTTPS protects against man-in-the-middle attacks and ensures data confidentiality.
- Acceptance Criteria:
  - The Next.js server is configured to use HTTPS in production.
  - Socket.IO connects over WSS (WebSocket Secure).
  - HTTP requests are either redirected to HTTPS or rejected.

**REQ-SEC-02: Content Security Policy**
- Priority: Must
- Description: The application must set a restrictive Content Security Policy (CSP) HTTP header that limits which resources the browser may load. The CSP must restrict script sources, style sources, image sources, and connect sources to trusted origins only.
- Rationale: CSP mitigates cross-site scripting (XSS) and data injection attacks.
- Acceptance Criteria:
  - CSP header is set on all HTTP responses.
  - Script sources are limited to `'self'` and specific trusted domains.
  - `connect-src` is limited to the signaling server and moderation proxy origins.
  - `img-src` is limited to `'self'` and data URIs (for base64 frames).

**REQ-SEC-03: CORS Restrictions**
- Priority: Must
- Description: Cross-Origin Resource Sharing (CORS) is enforced on all server endpoints. The signaling server allows connections only from the Next.js origin. The moderation service accepts requests only from the Next.js API proxy.
- Rationale: CORS prevents unauthorized third-party domains from accessing the platform's services.
- Acceptance Criteria:
  - Signaling server Socket.IO CORS is configured with `origin: [NEXT_PUBLIC_APP_URL]`.
  - Moderation service HTTP CORS allows only the Next.js origin.
  - `ALLOWED_ORIGINS` environment variable configures allowed origins.
  - Preflight OPTIONS requests are handled correctly.

**REQ-SEC-04: Input Validation and Sanitization**
- Priority: Must
- Description: All user-supplied data is validated and sanitized at system boundaries. Socket.IO payloads are validated with Zod schemas. Text chat messages are sanitized to strip HTML/script content. REST request bodies are validated before processing.
- Rationale: Input validation prevents injection attacks and ensures data integrity.
- Acceptance Criteria:
  - All Socket.IO event payloads are validated with Zod schemas on the signaling server.
  - Text chat messages are sanitized (HTML stripped, max 200 chars).
  - REST API request bodies are validated (session ID format, frame size ≤ 200 KB).
  - Invalid payloads are rejected with an error response; no processing occurs.

**REQ-SEC-05: No Video/Audio Storage**
- Priority: Must
- Description: The system shall not store, record, or cache any video frames, audio data, or media content at any point in the processing pipeline. This includes the moderation service, signaling server, API proxy, and database.
- Rationale: Privacy is a core product requirement. Media storage would create significant privacy and legal risks.
- Acceptance Criteria:
  - No media data is written to any persistent storage.
  - No media data is included in any log output.
  - Frame buffers are dereferenced and eligible for garbage collection immediately after analysis.

**REQ-SEC-06: Session ID Anonymity**
- Priority: Must
- Description: Session IDs are randomly generated UUID v4 values with no correlation to any personal identifier. Session IDs cannot be used to identify individual users across different browser sessions or devices.
- Rationale: Session ID anonymity ensures that no PII can be derived from the identifier.
- Acceptance Criteria:
  - Session IDs are generated using `crypto.randomUUID()`.
  - Session IDs are not stored in cookies or localStorage.
  - No mapping between session IDs and external identifiers exists.

**REQ-SEC-07: Frame Data Never Logged**
- Priority: Must
- Description: The moderation service and all other server components shall never include frame data (base64 strings, binary data) in log output. Only metadata (risk level, action taken, processing time) is logged.
- Rationale: Logging frame data would create a persistent privacy violation.
- Acceptance Criteria:
  - Server log entries contain only `risk_level`, `recommended_action`, and `processing_time_ms`.
  - No base64-encoded image data appears in any log file.
  - Error logs include generic messages only (no frame data in error details).

**REQ-SEC-08: Socket.IO Payload Validation**
- Priority: Must
- Description: Every incoming Socket.IO event payload on the signaling server must be validated against a Zod schema before processing. Malformed or unexpected payloads are discarded without processing, and an error is logged server-side only.
- Rationale: Prevents malformed data from causing unexpected behavior or security vulnerabilities.
- Acceptance Criteria:
  - Zod schemas are defined for all 10 client-to-server event types.
  - Validation occurs synchronously in the event handler.
  - Invalid payloads result in a server-side log entry and no further action.

---

### 3.6 Software Quality Attributes

**REQ-SQA-01: Reliability — Graceful Degradation**
- Priority: Must
- Description: The system must degrade gracefully when individual components fail. If the moderation service is unavailable, video chat continues without moderation (fail-open). If the signaling server restarts, users can reconnect and rejoin the queue. If WebRTC connection fails, users are notified and can retry.
- Rationale: Component failures should not cause unrecoverable application errors.
- Acceptance Criteria:
  - Moderation service timeout (5s) → session continues without moderation.
  - Signaling server disconnect → automatic reconnection with 3 retries.
  - WebRTC ICE failure → ICE restart (2 attempts), then graceful session termination.

**REQ-SQA-02: Reliability — Reconnection**
- Priority: Must
- Description: The Socket.IO client must automatically attempt to reconnect when the connection to the signaling server is lost. Reconnection attempts use exponential backoff. After successful reconnection, the server reconciles the session state.
- Rationale: Network interruptions are common; automatic reconnection prevents unnecessary session termination.
- Acceptance Criteria:
  - Socket.IO is configured with `reconnection: true`.
  - Exponential backoff delays are applied between reconnection attempts.
  - After reconnection, the signaling server checks for stale sockets and reconciles state.

**REQ-SQA-03: Availability**
- Priority: Should
- Description: The system targets 99% availability during operational hours for the MVP. Downtime is expected during deployments and signaling server restarts (in-memory state loss).
- Rationale: High availability is important for a real-time communication platform, though the MVP single-instance architecture has inherent limitations.
- Acceptance Criteria:
  - The signaling server recovers from crashes within 30 seconds (via process manager).
  - The frontend handles server downtime gracefully (shows "reconnecting..." state).
  - Database operations do not block the main thread (async Prisma queries).

**REQ-SQA-04: Maintainability**
- Priority: Should
- Description: The codebase is organized into clearly separated modules with defined responsibilities. TypeScript type definitions are centralized. Environment variables externalize all configuration. Code is documented with comments.
- Rationale: A well-organized codebase is easier to debug, extend, and maintain.
- Acceptance Criteria:
  - Each module has a single, well-defined responsibility (SRP).
  - TypeScript strict mode is enabled; no `any` types in production code.
  - All configurable values are externalized via environment variables.
  - Module boundaries match the folder structure.

**REQ-SQA-05: Portability**
- Priority: Could
- Description: The system is designed to run on any platform that supports Node.js/Bun and SQLite. The frontend uses standard web APIs (WebRTC, WebSocket) that are supported across all major browsers.
- Rationale: Platform independence broadens the potential deployment environments.
- Acceptance Criteria:
  - No platform-specific APIs are used in the frontend (only standard web APIs).
  - Backend services run on the Bun runtime (compatible with most Linux/macOS/Windows hosts).
  - SQLite database file is portable across operating systems.

**REQ-SQA-06: Privacy**
- Priority: Must
- Description: Privacy is a first-class quality attribute. The system is designed with a privacy-by-default approach: no PII collection, no media storage, no IP logging, anonymous session IDs, and ephemeral in-memory state for sensitive data.
- Rationale: Privacy is the core differentiator of the SecureStream platform.
- Acceptance Criteria:
  - All requirements in Section 3.5 (Security) that relate to privacy are satisfied.
  - No user can be identified from system data.
  - The moderation system does not create a lasting record of user appearance.

---

### 3.7 Data Requirements

**REQ-DATA-01: TrustRecord Model**
- Priority: Must
- Description: The `TrustRecord` model stores the persistent trust score for each anonymous session. Each record is keyed by `sessionId` (unique). The model tracks the current score (integer, 0–100), creation timestamp, and last update timestamp.

Schema:
```
TrustRecord {
  id        String   @id @default(cuid())   // Primary key
  sessionId String   @unique                 // Anonymous UUID session ID
  score     Int      @default(100)           // Trust score (0-100)
  createdAt DateTime @default(now())          // First seen
  updatedAt DateTime @updatedAt              // Last score change

  blacklists  Blacklist[]                     // Related blacklist records
  modEvents   ModerationEvent[]               // Related moderation events
}
```

- Rationale: Persistent trust scores enable behavior tracking across sessions.
- Acceptance Criteria:
  - `TrustRecord` is created via `upsert` when a session ID first interacts with the trust system.
  - `score` is updated atomically after each trust change.
  - `sessionId` is indexed and unique.
  - Related `Blacklist` and `ModerationEvent` records are linked via foreign key.

**REQ-DATA-02: Blacklist Model**
- Priority: Must
- Description: The `Blacklist` model records active suspensions. Each record includes the session ID, reason string, expiry timestamp, and creation timestamp. Expired records are removed on the next queue join check.

Schema:
```
Blacklist {
  id        String   @id @default(cuid())   // Primary key
  sessionId String                           // Foreign key to TrustRecord
  reason    String                           // Human-readable suspension reason
  expiresAt DateTime                         // Expiry timestamp (now + 24h)
  createdAt DateTime @default(now())          // Record creation

  trustRecord TrustRecord @relation(fields: [sessionId], references: [sessionId])
}
```

- Rationale: Blacklist records enforce suspensions and provide transparency about reasons and duration.
- Acceptance Criteria:
  - `Blacklist` is created when trust score drops to ≤ 30.
  - `expiresAt` is set to `Date.now() + 24 hours`.
  - Expired records are deleted on the next `join_queue` check (lazy expiry).
  - `reason` is a human-readable string (e.g., "Trust score dropped below threshold").

**REQ-DATA-03: ModerationEvent Model**
- Priority: Must
- Description: The `ModerationEvent` model logs all moderation-related events for audit purposes. Each record includes the session ID, room ID, risk level, action taken, structured reasons (JSON array), and creation timestamp. No frame data is stored.

Schema:
```
ModerationEvent {
  id         String   @id @default(cuid())   // Primary key
  sessionId  String                           // Foreign key to TrustRecord
  roomId     String                           // Room where event occurred
  riskLevel  String                           // "none" | "low" | "medium" | "high" | "critical"
  action     String                           // "allow" | "warn" | "blur" | "terminate" | "blacklist" | "trust_penalty"
  reasons    String   @default("[]")          // JSON array of reason strings
  createdAt  DateTime @default(now())          // Event timestamp

  trustRecord TrustRecord @relation(fields: [sessionId], references: [sessionId])
}
```

- Rationale: Moderation events provide an audit trail for platform safety without storing any media data.
- Acceptance Criteria:
  - Every moderation analysis result is logged as a `ModerationEvent`.
  - Every partner report is logged as a `ModerationEvent`.
  - `reasons` is a JSON-encoded array of descriptive strings.
  - No frame data, image content, or binary data is stored in any field.

**REQ-DATA-04: Data Retention Policies**
- Priority: Must
- Description: The following data retention policies apply:

| Data Type | Retention | Cleanup Method |
|-----------|-----------|----------------|
| TrustRecord scores | Permanent | Never deleted |
| Blacklist records | 24 hours | Lazy deletion on next queue join |
| ModerationEvent records | 30 days | Manual pruning (script or cron) |
| In-memory queue/room/penalty state | Session lifetime | Lost on server restart |
| Session ID mapping (socket ↔ session) | Session lifetime | Lost on server restart |

- Rationale: Retention policies balance audit needs with privacy and storage constraints.
- Acceptance Criteria:
  - `TrustRecord` entries are never automatically deleted.
  - `Blacklist` records with `expiresAt < NOW()` are deleted on the next queue join attempt.
  - `ModerationEvent` records older than 30 days can be pruned without affecting platform functionality.
  - No video, audio, or frame data exists in any persistent store at any time.

---

## 4. Verification & Validation

### 4.1 Unit Testing Strategy

Unit tests verify individual functions and modules in isolation. Tests use Vitest as the test runner.

| Component | Test Scope | Coverage Target |
|-----------|-----------|-----------------|
| **Trust Engine** (`trust-engine.ts`) | Score calculation, bounds enforcement, blacklist threshold check | 95% |
| **Penalty Box** (`penalty-box.ts`) | Fast-skip detection, cooldown calculation, escalation logic | 95% |
| **Risk Scorer** (`risk-scorer.ts`) | Composite score calculation, weight application, threshold mapping | 95% |
| **Action Mapper** (`action-mapper.ts`) | Risk level → action mapping, consecutive violation escalation | 95% |
| **Rate Limiter** (`rate-limiter.ts`) | Sliding window enforcement, window reset, per-user isolation | 90% |
| **Input Sanitization** (`sanitize.ts`) | HTML stripping, length truncation, edge cases | 95% |
| **Frame Capture** (frontend hook) | Canvas capture, resize, JPEG encoding | 80% |
| **Constants** (`constants.ts`) | Environment variable parsing, default fallbacks | 100% |

**Key Test Cases:**
- Trust score starts at 100 for new users
- Trust score decreases by 1 on fast-skip, 10 on violation, 5 on report
- Trust score increases by 2 on clean disconnect (≥ 60s session)
- Trust score is clamped to [0, 100]
- Blacklist triggered when score ≤ 30
- Penalty box 30s cooldown for first fast-skip, 5min for 3rd fast-skip
- Risk score 0.0–0.15 maps to `none`, 0.8–1.0 maps to `critical`
- Consecutive violations (≥ 3) escalate to `blacklist`

### 4.2 Integration Testing Strategy

Integration tests verify that multiple components interact correctly.

| Test Scenario | Components Tested | Verification |
|---------------|-------------------|--------------|
| **Queue → Match → Signal** | Matchmaking + Room Manager + Socket.IO | Two mock clients join queue, get matched, exchange offer/answer |
| **Trust → Blacklist Pipeline** | Trust Engine + Blacklist + Prisma | Fast-skip/violation reduces score; score ≤ 30 triggers blacklist |
| **Moderation → Kill-Switch** | Moderation Service + Signaling + Frontend | High-risk frame triggers kill-switch, session terminated, trust penalized |
| **Penalty → Queue Rejection** | Penalty Box + Matchmaking + Rate Limiter | Fast-skip triggers penalty; subsequent queue join rejected |
| **Report → Trust Penalty** | Report handler + Trust Engine + ModerationEvent | Report creates event, reduces target score by 5 |
| **Database Read/Write** | Prisma + SQLite | TrustRecord upsert, Blacklist create/query/delete, ModerationEvent create |
| **API Proxy Forwarding** | Next.js `/api/moderation` + Moderation Service | Frame forwarded, response passed through, validation applied |

### 4.3 System Testing (End-to-End)

End-to-end tests verify complete user workflows using Playwright (browser automation).

| Test ID | Test Scenario | Steps | Expected Result |
|---------|--------------|-------|-----------------|
| E2E-01 | **Full Video Chat Session** | 1. Open two browser tabs. 2. Both click "Start." 3. Both grant camera. 4. Both enter queue. 5. Wait for match. 6. Verify video + audio in both tabs. 7. One user clicks "End." 8. Verify session ended. | Video + audio established within 15 seconds. Session ends cleanly. |
| E2E-02 | **Skip and Re-match** | 1. Two matched users. 2. User A clicks "Skip." 3. Both return to queue. 4. Both re-match (possibly with new partner). | Skip processed within 500 ms. Re-match occurs. |
| E2E-03 | **Fast-Skip Penalty** | 1. Two matched users. 2. User A skips within 5 seconds. 3. User A sees penalty overlay. 4. User A cannot rejoin for 30 seconds. | Penalty overlay displayed. Queue join rejected during cooldown. |
| E2E-04 | **Moderation Kill-Switch** | 1. Two matched users. 2. User A sends a frame that triggers high risk. 3. Verify session is terminated. 4. Verify User A's trust decreases by 10. | Session terminated. Trust penalty applied. |
| E2E-05 | **Disconnect Handling** | 1. Two matched users. 2. Close User B's browser tab. 3. Verify User A sees "Partner disconnected." | User A notified within 60 seconds. Session cleaned up. |
| E2E-06 | **Blacklist Flow** | 1. User with trust score 35 receives violation (-10). 2. Score drops to 25 (≤ 30). 3. User is blacklisted. 4. User cannot join queue. 5. After 24h simulation, user can rejoin with score 50. | Blacklisted state shown. Queue join rejected. Score reset after expiry. |
| E2E-07 | **Text Chat** | 1. Two matched users. 2. User A sends "Hello." 3. User B receives "Hello." | Message received within 500 ms. |
| E2E-08 | **Camera Denial** | 1. User clicks "Start." 2. User denies camera permission. 3. Error state displayed. | Error state with "Camera required" message. |

### 4.4 Acceptance Testing

Acceptance testing validates that the system meets all business requirements and is ready for release. Each acceptance criterion from Sections 3.1 through 3.7 is verified.

| Category | Test Approach | Pass Criteria |
|----------|--------------|---------------|
| **Core Functionality** | Manual + automated E2E | All 10 core acceptance checklist items pass (Section 11 of worklog) |
| **Moderation** | Automated (mock VLM responses) | All 5 moderation acceptance items pass |
| **Trust & Safety** | Automated (trust score manipulation) | All 8 trust & safety acceptance items pass |
| **Reliability** | Automated (simulated failures) | All 7 reliability acceptance items pass |
| **Privacy** | Audit (code review + log inspection) | All 5 privacy acceptance items pass |
| **UI/UX** | Manual (visual inspection) | All 6 UI/UX acceptance items pass |

---

## 5. Traceability Matrix

Each functional requirement is mapped to its originating source.

| Requirement ID | Requirement Title | Source |
|----------------|------------------|--------|
| REQ-101 | Anonymous Session Generation | Worklog §2.1, Assumption A1 |
| REQ-102 | Session Persistence (Within Tab) | Technical design decision |
| REQ-103 | No PII Collection | Worklog §9.1, Security Plan |
| REQ-201 | Camera and Microphone Access | Worklog §6.4, WebRTC Lifecycle |
| REQ-202 | Picture-in-Picture Local Video | Worklog §2.2, Ambiguity Decision |
| REQ-203 | Camera Toggle | User story: "I want to turn off my camera" |
| REQ-204 | Microphone Mute Toggle | User story: "I want to mute my microphone" |
| REQ-205 | Media Stream Cleanup | Worklog §6.4, Step 10 |
| REQ-301 | Join Matchmaking Queue | Worklog §4.3, Join Queue Request |
| REQ-302 | Instant Pairing | Worklog §4.1, Matchmaking module |
| REQ-303 | Queue Position Updates | Worklog §4.3, Queue Position Update |
| REQ-304 | Leave Queue | Worklog §4.3, signaling events |
| REQ-305 | Maximum Queue Size | Worklog §4.7, Rate Limiting |
| REQ-306 | Long Wait Notification | Worklog §8.1, Edge Cases |
| REQ-401 | SDP Offer/Answer Exchange | Worklog §6.4, Steps 4–5 |
| REQ-402 | ICE Candidate Exchange | Worklog §6.4, Step 6 |
| REQ-403 | P2P Media Streaming | Worklog §1.2, Communication Flow |
| REQ-404 | ICE Restart | Worklog §8.2, ICE Restart Sequence |
| REQ-405 | Frozen Stream Detection | Worklog §8.1, Edge Cases |
| REQ-501 | Message Relay | Signaling server types: ChatMessagePayload |
| REQ-502 | Message Sanitization | Worklog §9.5, Input Sanitization |
| REQ-503 | Message Rate Limiting | Worklog §4.7, Rate Limiting |
| REQ-601 | Session Start | Worklog §4.1, Room Manager |
| REQ-602 | Session Skip | Worklog §4.6, Room/Session Cleanup |
| REQ-603 | Session End (Disconnect) | Worklog §4.6, User disconnects |
| REQ-604 | Session Timeout | Worklog §4.6, Timeout (no heartbeat 30s) |
| REQ-605 | Session End (Moderation Kill) | Worklog §4.6, Moderation kill |
| REQ-606 | Simultaneous Skip Handling | Worklog §2.2, Ambiguity Decision |
| REQ-607 | Reconnection Handling | Worklog §8.1, Edge Cases |
| REQ-701 | Initial Trust Score | Worklog §4.4, Trust Score Logic |
| REQ-702 | Trust Score Bounds | Worklog §4.4, Min 0, Max 100 |
| REQ-703 | Clean Disconnect Bonus (+2) | Worklog §4.4, Clean disconnect > 60s |
| REQ-704 | Fast-Skip Penalty (-1) | Worklog §4.4, Fast-skip < 10s |
| REQ-705 | Confirmed Violation Penalty (-10) | Worklog §4.4, Confirmed high-risk |
| REQ-706 | Partner Report Penalty (-5) | Worklog §4.4, Partner reports violation |
| REQ-707 | Trust Score Notification | Frontend types: TrustUpdatePayload |
| REQ-708 | Trust Score Persistence | Worklog §2.1, Assumption A4 |
| REQ-709 | Blacklist Reset Score | Worklog §4.5, Blacklist Flow |
| REQ-710 | Blacklist Threshold Check | Worklog §4.4, Blacklist threshold ≤ 30 |
| REQ-801 | Fast-Skip Detection | Worklog §4.7, Fast-Skip Logic |
| REQ-802 | Base Cooldown Penalty (30s) | Worklog §4.7, 30-second cooldown |
| REQ-803 | Escalated Cooldown (5 min) | Worklog §4.7, 5-min after 3 fast-skips |
| REQ-804 | Penalty Expiry and Cleanup | Worklog §9.2, TTL cleanup |
| REQ-901 | Blacklist Duration (24h) | Worklog §4.5, 24-hour TTL |
| REQ-902 | Automatic Blacklist Threshold | Worklog §4.5, Score ≤ 30 |
| REQ-903 | Blacklist Check on Queue Join | Worklog §4.5, Blacklist Flow steps 1–4 |
| REQ-904 | Blacklist Removal on Expiry | Worklog §4.5, Expired removal |
| REQ-905 | Blacklist Notification | Frontend types: BlacklistedPayload |
| REQ-1001 | Heartbeat Frame Capture | Worklog §6.5, Moderation Heartbeat Flow |
| REQ-1002 | VLM Frame Analysis | Worklog §5.3, Analysis Flow |
| REQ-1003 | Risk Scoring | Worklog §5.4, Risk Scoring Logic |
| REQ-1004 | Risk Level Thresholds | Worklog §5.5, Threshold Rules |
| REQ-1005 | Consecutive Violation Escalation | Worklog §5.6, Action Mapping Logic |
| REQ-1006 | Kill-Switch Trigger | Worklog §5.5, Kill-Switch rule |
| REQ-1007 | Warning Overlay (Medium Risk) | Worklog §5.5, medium → warn action |
| REQ-1008 | No Frame Persistence | Worklog §9.1, Data Storage Policy |
| REQ-1101 | Report Categories | Worklog §9.1, Unresolved Question 3 |
| REQ-1102 | Report Relay and Processing | Worklog §7.3, Moderation Flag |
| REQ-1103 | Report Acknowledgment | User story: "I want to report abuse" |
| REQ-1201 | Queue Join Rate Limit | Worklog §4.7, 5 joins per minute |
| REQ-1202 | Skip Rate Limit | Worklog §4.7, 1 skip per 5 seconds |
| REQ-1203 | Chat Message Rate Limit | Extension of rate limiting design |
| REQ-1301 | Online User Count | Signaling server types: OnlineCountPayload |
| REQ-1302 | Trust Score Update Notifications | Frontend types: TrustUpdatePayload |
| REQ-1303 | Sound Effects | Worklog §10, Phase 6 Polish |

---

## 6. Appendices

### Appendix A: WebSocket Event Reference Table

All 25 Socket.IO events exchanged between the frontend and signaling server.

| # | Event Name | Direction | Payload Schema | Description |
|---|-----------|-----------|---------------|-------------|
| 1 | `join_queue` | Client → Server | `{ sessionId: string }` | Enter the matchmaking queue |
| 2 | `leave_queue` | Client → Server | `{ sessionId: string }` | Leave the matchmaking queue |
| 3 | `queue_update` | Server → Client | `{ position: number, estimatedWait: number }` | Current queue position and estimated wait |
| 4 | `queue_rejected` | Server → Client | `{ reason: "blacklisted" \| "penalty" \| "rate_limited", cooldownSeconds?: number, blacklistExpiry?: string }` | Queue join rejected |
| 5 | `matched` | Server → Client | `{ roomId: string, partnerSessionId: string, initiator: boolean }` | Match found with partner |
| 6 | `offer` | Client → Server | `{ roomId: string, sdp: string }` | WebRTC SDP offer |
| 7 | `offer` (relayed) | Server → Client | `{ roomId: string, sdp: string, fromSessionId: string }` | Relayed offer from partner |
| 8 | `answer` | Client → Server | `{ roomId: string, sdp: string }` | WebRTC SDP answer |
| 9 | `answer` (relayed) | Server → Client | `{ roomId: string, sdp: string, fromSessionId: string }` | Relayed answer from partner |
| 10 | `ice_candidate` | Client → Server | `{ roomId: string, candidate: RTCIceCandidateInit }` | ICE candidate |
| 11 | `ice_candidate` (relayed) | Server → Client | `{ roomId: string, candidate: RTCIceCandidateInit, fromSessionId: string }` | Relayed ICE candidate from partner |
| 12 | `skip` | Client → Server | `{ roomId: string, sessionId: string, reason?: "user_skip" \| "violation", requeue?: boolean }` | Skip current partner |
| 13 | `report` | Client → Server | `{ roomId: string, sessionId: string, targetSessionId: string, reason: string }` | Report partner for violation |
| 14 | `session_ended` | Server → Client | `{ roomId: string, reason: DisconnectReason, trustChange?: number, penalty?: { cooldownSeconds: number } }` | Session terminated |
| 15 | `moderation_kill` | Server → Client | `{ roomId: string, targetSessionId: string, reason: string }` | Kill-switch activated |
| 16 | `moderation_flag` | Client → Server | `{ roomId: string, targetSessionId: string, analysis?: ModerationAnalysis, reason?: string, riskLevel?: string }` | Frontend reports high-risk detection |
| 17 | `moderation_warning` | Server → Client | `{ roomId: string, targetSessionId: string, message: string }` | Medium-risk warning |
| 18 | `heartbeat` | Client → Server | `{ roomId: string, sessionId: string, timestamp: number }` | Session keep-alive ping |
| 19 | `pong` | Server → Client | — | Heartbeat acknowledgment |
| 20 | `ice_restart` | Client → Server | `{ roomId: string, sessionId: string }` | Request ICE restart |
| 21 | `ice_restart` (relayed) | Server → Client | `{ roomId: string, fromSessionId: string }` | Partner requests ICE restart |
| 22 | `peer_reconnecting` | Server → Client | `{ sessionId: string }` | Partner is reconnecting |
| 23 | `blacklisted` | Server → Client | `{ reason: string, expiresAt?: string }` | User is blacklisted |
| 24 | `chat_message` | Client → Server | `{ roomId: string, sessionId: string, text: string }` | Send text message |
| 25 | `chat_message` (relayed) | Server → Client | `{ type: "chat_message", roomId: string, fromSessionId: string, text: string, timestamp: number }` | Received text message from partner |
| 26 | `trust_update` | Server → Client | `{ score: number, change: number }` | Trust score changed |
| 27 | `online_count` | Server → All | `{ count: number }` | Total connected users |

---

### Appendix B: REST API Reference

#### B.1 POST /api/moderation (Frontend Proxy)

**Description:** Proxies frame analysis requests from the frontend to the moderation service. Validates payload before forwarding.

**Request:**
```json
POST /api/moderation?XTransformPort=3004
Content-Type: application/json

{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "roomId": "660e8400-e29b-41d4-a716-446655440000",
  "frame": "data:image/jpeg;base64,/9j/4AAQ...",
  "timestamp": 1700000000
}
```

**Response (200 OK):**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "roomId": "660e8400-e29b-41d4-a716-446655440000",
  "analysis": {
    "face_count": 1,
    "human_present": true,
    "nsfw_score": 0.02,
    "bot_score": 0.05,
    "risk_level": "low",
    "recommended_action": "allow",
    "high_risk": false
  },
  "processing_time_ms": 245,
  "timestamp": 1700000000
}
```

**Response (500 Internal Server Error):**
```json
{
  "error": "analysis_failed",
  "message": "VLM service unavailable"
}
```

**Validation Rules:**
| Field | Validation |
|-------|-----------|
| `sessionId` | Must be a valid UUID v4 string |
| `roomId` | Must be a valid UUID v4 string |
| `frame` | Must be a base64-encoded JPEG; decoded size ≤ 200 KB (`FRAME_MAX_SIZE_KB`) |
| `timestamp` | Must be a positive integer (Unix timestamp) |

---

#### B.2 POST /api/moderate (Moderation Service — Internal)

**Description:** The direct endpoint on the moderation service (port 3004) that performs VLM frame analysis. Not directly accessible from the browser; accessed via the Next.js proxy.

**Request Schema:** Identical to B.1.

**Response Schema:** Identical to B.1.

**Analysis Object Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `face_count` | number | Number of human faces detected (0, 1, 2+) |
| `human_present` | boolean | Whether at least one real human face is detected |
| `nsfw_score` | number | NSFW content probability (0.0 – 1.0) |
| `bot_score` | number | Bot/static content probability (0.0 – 1.0) |
| `risk_level` | string | `"none"` \| `"low"` \| `"medium"` \| `"high"` \| `"critical"` |
| `recommended_action` | string | `"allow"` \| `"warn"` \| `"blur"` \| `"terminate"` \| `"blacklist"` |
| `high_risk` | boolean | Convenience boolean; `true` when `risk_level >= "high"` |

---

### Appendix C: Trust Score Calculation Formula

```
INITIAL_SCORE = 100
MIN_SCORE     = 0
MAX_SCORE     = 100
BLACKLIST_THRESHOLD = 30

score(new_user)     = 100
score(update)       = clamp(score + change, 0, 100)

change(clean_disconnect)   = +2     // session_duration >= 60,000 ms
change(fast_skip)           = -1     // skip within 10,000 ms of match
change(confirmed_violation) = -10    // moderation kill-switch triggered
change(partner_report)      = -5     // partner submits report

blacklist(score)    = score <= 30  →  add to blacklist for 24 hours
blacklist_expiry()  = trust score reset to 50

Formula:
  newScore = Math.max(MIN_SCORE, Math.min(MAX_SCORE, currentScore + delta))
  if (newScore <= BLACKLIST_THRESHOLD) → triggerBlacklist()
```

---

### Appendix D: Risk Score Weighting Formula

```
COMPOSITE_RISK_SCORE = Σ(weight_i × signal_score_i)

Where:
  weight_nsfw           = 0.50   // NSFW content detected (0.0 – 1.0)
  weight_no_human       = 0.20   // No human face present (0 or 1.0)
  weight_bot            = 0.15   // Bot/static indicators (0.0 – 1.0)
  weight_multiple_faces = 0.10   // Multiple unexpected faces (0 or 1.0)
  weight_objects        = 0.05   // Objectionable objects (0.0 – 1.0)

Example calculation:
  nsfw_score    = 0.3  →  0.50 × 0.3  = 0.150
  no_human      = 0    →  0.20 × 0    = 0.000
  bot_score     = 0.1  →  0.15 × 0.1  = 0.015
  multi_faces   = 0    →  0.10 × 0    = 0.000
  objects       = 0.2  →  0.05 × 0.2  = 0.010
  ─────────────────────────────────────────────
  COMPOSITE              = 0.175  →  risk_level: "low", action: "allow"

Threshold mapping:
  [0.00 – 0.15) → "none"     → action: "allow"
  [0.15 – 0.35) → "low"      → action: "allow"
  [0.35 – 0.60) → "medium"   → action: "warn"
  [0.60 – 0.80) → "high"     → action: "blur"
  [0.80 – 1.00] → "critical" → action: "terminate"

Escalation rules:
  if (consecutiveViolations >= 3)           → action: "blacklist"
  if (risk_level === "critical")            → action: "blacklist"
  if (risk_level === "medium" && cons >= 2) → action: "terminate"
  if (risk_level === "high")                → action: "terminate"

Kill-switch trigger:
  high_risk = (risk_level === "high" || risk_level === "critical")
```

---

### Appendix E: Environment Variables Reference

All configurable environment variables with their default values, descriptions, and applicable components.

| Variable | Default | Component | Description |
|----------|---------|-----------|-------------|
| `DATABASE_URL` | `file:./db/custom.db` | Prisma | SQLite database file path |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | Signaling, Moderation | Comma-separated CORS allowed origins |
| **Signaling Server** | | | |
| `SIGNALING_PORT` | `3003` | Signaling | Socket.IO server port |
| `PORT` | `3003` | Signaling | Alternative port variable |
| `TRUST_BLACKLIST_THRESHOLD` | `30` | Signaling | Trust score threshold for auto-blacklist |
| `FAST_SKIP_WINDOW_MS` | `10000` | Signaling | Fast-skip detection window (ms) |
| `FAST_SKIP_PENALTY_SECONDS` | `30` | Signaling | Base cooldown duration (seconds) |
| `HEARTBEAT_TIMEOUT_MS` | `30000` | Signaling | Heartbeat timeout before session cleanup (ms) |
| `MAX_QUEUE_SIZE` | `200` | Signaling | Maximum users allowed in the matchmaking queue |
| **Moderation Service** | | | |
| `MODERATION_PORT` | `3004` | Moderation | REST API server port |
| `MODERATION_SERVICE_URL` | `http://localhost:3004` | Frontend | URL for the moderation service (used by proxy) |
| `FRAME_MAX_SIZE_KB` | `200` | Moderation | Maximum accepted frame size (KB) |
| **WebRTC / ICE** | | | |
| `NEXT_PUBLIC_STUN_SERVER_1` | `stun:stun.l.google.com:19302` | Frontend | Primary STUN server URL |
| `NEXT_PUBLIC_STUN_SERVER_2` | `stun:stun1.l.google.com:19302` | Frontend | Secondary STUN server URL |
| `NEXT_PUBLIC_TURN_SERVER` | _(empty)_ | Frontend | Optional TURN server URL |
| `NEXT_PUBLIC_TURN_USERNAME` | _(empty)_ | Frontend | TURN server username |
| `NEXT_PUBLIC_TURN_CREDENTIAL` | _(empty)_ | Frontend | TURN server credential |
| **Frontend** | | | |
| `NEXT_PUBLIC_APP_NAME` | `SecureStream` | Frontend | Application display name |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Frontend | Application base URL |
| `NEXT_PUBLIC_HEARTBEAT_INTERVAL_MS` | `2000` | Frontend | Moderation frame capture interval (ms) |
| `NEXT_PUBLIC_FRAME_WIDTH` | `128` | Frontend | Moderation frame capture width (px) |
| `NEXT_PUBLIC_FRAME_HEIGHT` | `96` | Frontend | Moderation frame capture height (px) |
| `NEXT_PUBLIC_FRAME_QUALITY` | `0.3` | Frontend | JPEG quality for frame capture (0.0–1.0) |

---

*End of Software Requirements Specification*
