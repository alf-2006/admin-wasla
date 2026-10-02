# Execution Plan: Wasla Tech Comprehensive Rebuild & WhatsApp Prototype

## Overview
This plan orchestrates the full implementation of requirements R1, R2, and R3 per ORIGINAL_REQUEST.md and GEMINI.md.

## Phase 0: Discovery & Survey (Explorers)
- Dispatch 3 parallel Explorers:
  1. Explorer 1: Deep dive into `legacy/index.html` to extract all features, data structures, UI views (Members, Tasks, Leaderboard, AI Assistant, Notes), Arabic strings, and interactions.
  2. Explorer 2: Deep dive into `frontend/` (Vite, React 19, Tailwind v4, router, state, theme, current features, existing WhatsApp structure, components) to establish integration points without breaking existing routes.
  3. Explorer 3: Investigate WhatsApp architecture: existing backend/supabase Edge Functions, requirement for `backend/whatsapp-service/` (Express + `@whiskeysockets/baileys` mock), and Admin UX requirements (connection state, mock QR, consent, send modal).
- Synthesize findings into `PROJECT.md` (Feature Inventory, Architecture, Interface Contracts, Milestones).

## Phase 1: R1 Rebuild Legacy Features (Frontend)
- Milestone R1 Scope:
  - Members Management: list, add/edit, roles, status, search, filters.
  - Tasks Management: create, assign, status progression, due dates, priority.
  - Leaderboard: points, rankings, achievements/metrics.
  - AI Assistant: assistant interface matching legacy capabilities.
  - Notes: personal/team notes management.
  - Design & UX: Wasla purple identity, Arabic RTL, strict adherence to design principles (no banned gradients/emojis/glassmorphism, CSS logical properties, accessible touch targets).
- Workers implement; Reviewers, Challengers, and Forensic Auditor verify; Gate evaluation.

## Phase 2: R2 WhatsApp Backend Service (Isolated Mock)
- Milestone R2 Scope:
  - Setup `backend/whatsapp-service/` with Express.js and TypeScript/Node.js.
  - Implement mock Baileys WebSocket connection manager (mock pairing, mock QR string generation, simulated connection states: disconnected, connecting, qr_ready, connected).
  - Secure endpoints: GET /status, GET /qr, POST /disconnect, POST /mock-send.
  - Robust mock handling: strictly mock only, no real WhatsApp connection/traffic, clear security warnings.
- Workers implement; Reviewers, Challengers, and Forensic Auditor verify; Gate evaluation.

## Phase 3: R3 WhatsApp Admin UX (Frontend)
- Milestone R3 Scope:
  - Admin UI for WhatsApp management in `frontend/src/features/whatsapp/` (or dedicated admin view).
  - Prominent account-ban and unofficial library disclaimer / warning.
  - Connection status indicator (disconnected, scanning QR, connected).
  - Mock QR display with countdown/expiry and refresh controls.
  - Disconnect / revoke session controls.
  - Recipient consent checklist and verification.
  - Per-recipient message preview and explicit confirmation modal before mock send.
- Workers implement; Reviewers, Challengers, and Forensic Auditor verify; Gate evaluation.

## Phase 4: Integration, Hardening & Final Gate
- End-to-end verification:
  - Build checks: `npm run build` and `npm run lint` in both `frontend` and `backend/whatsapp-service`.
  - Independent acceptance verification against all acceptance criteria in ORIGINAL_REQUEST.md.
  - Forensic integrity audit ensuring authentic implementation.
- Reporting to Sentinel.
