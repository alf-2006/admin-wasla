# Project: Wasla Tech Comprehensive Rebuild & WhatsApp Prototype

## Architecture
- **Frontend (`frontend/`)**: React 19, TypeScript, Vite 8, Tailwind v4, React Router v7, Zustand, TanStack Query, Supabase client.
  - Strict separation of member portal (`/login`, passwordless, `/portal`) and admin panel (`/admin/login`, Supabase auth, `/admin/*`).
  - Arabic RTL layout, IBM Plex Sans Arabic, Wasla purple visual identity, zero emojis, zero gradients, zero glassmorphism, touch targets >= 44px.
- **Backend Service (`backend/whatsapp-service/`)**: Standalone Express.js + TypeScript service.
  - In-memory mock Baileys WebSocket connection manager (states: `disconnected`, `qr_ready`, `connecting`, `connected`).
  - Synthetic QR generator with 60s expiration window.
  - REST API: `GET /status`, `GET /qr`, `POST /disconnect`, `POST /mock-send` (with backward compatibility aliases).
  - Supabase JWT authentication middleware with admin email verification.
  - Strictly mock only: zero live WhatsApp connections, zero real message dispatches.
- **Official Cloud API Fallback**: Preserved intact in `backend/supabase/functions/whatsapp-tasks/` and accessible via tabbed navigation in frontend.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Members Management | CRUD, team field, device/Alexandria/work filters, sorting, pagination, Excel SheetJS import/export with RTL headers | M1 | Survey (Explorer 1 & 2) |
| 2 | Member Profile Modal | Detailed member logistics view (laptop, Alexandria, residence, work conditions, bio, notes, bonus) | M1 | Survey (Explorer 1 & 2) |
| 3 | Tasks Management | Custom and ALL assignees, deadline handling, dynamic late status calculation, per-member tracking notes thread | M1 | Survey (Explorer 1 & 2) |
| 4 | Leaderboard & Ranking View | `/admin/ranking` page, podium cards (Gold/Silver/Bronze), ranking table, bonus adjustment modal parsing `[B:+X]` | M1 | Survey (Explorer 1 & 2) |
| 5 | Wasla AI Assistant | Live context serialization, quick prompt chips, Gemini Edge Function / fallback invocation, agentic action executions | M1 | Survey (Explorer 1 & 2) |
| 6 | Notes System | Member targeting, team broadcasts, bonus adjuster (-5 to +5), in-place editing, deletion | M1 | Survey (Explorer 1 & 2) |
| 7 | Frontend Design Compliance | Elimination of gradients, backdrop-blur, emojis; fix touch targets >= 44px; fix TS build errors | M1 | Survey (Explorer 2) |
| 8 | WhatsApp Express Server | Standalone server setup in `backend/whatsapp-service/` with Express, CORS, dotenv, and TypeScript | M2 | Survey (Explorer 3) |
| 9 | Mock Baileys Connection Manager | State machine (`disconnected` -> `qr_ready` -> `connecting` -> `connected`), 60s QR expiry timer | M2 | Survey (Explorer 3) |
| 10 | WhatsApp REST API | Endpoints `GET /status`, `GET /qr`, `POST /disconnect`, `POST /mock-send` and legacy aliases | M2 | Survey (Explorer 3) |
| 11 | WhatsApp Auth Middleware | Supabase JWT token verification and admin email whitelist validation | M2 | Survey (Explorer 3) |
| 12 | Dual-Tab WhatsApp Admin Container | `WhatsAppTasksPage.tsx` container featuring Tab 1 (QR Mock) and Tab 2 (Meta Cloud API fallback) | M3 | Survey (Explorer 3) |
| 13 | WhatsApp QR Display & Expiry UX | Live countdown (60s), expired overlay, instant refresh button, connection status indicators | M3 | Survey (Explorer 3) |
| 14 | WhatsApp Recipient Consent Check | Mandatory explicit consent checkbox confirming member agreement before sending | M3 | Survey (Explorer 3) |
| 15 | WhatsApp Message Preview & Modal | Pre-send verification modal with rendered message preview (zero emojis) and explicit confirm button | M3 | Survey (Explorer 3) |
| 16 | Policy & Ban Risk Disclaimer | Prominent warning banner explaining unofficial client risks and account suspension safeguards | M3 | Survey (Explorer 3) |
| 17 | E2E Verification & Build Integrity | `npm run build` and `npm run lint` across frontend and backend; test suites; forensic integrity audit | M4 | ORIGINAL_REQUEST.md |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Rebuild Legacy Features & Clean Frontend | Rebuild Leaderboard (`/admin/ranking`), Member Profile Modal, team fields, AI quick chips, fix TS build errors, eliminate banned patterns (gradients, emojis, blur) | none | PLANNED |
| M2 | Isolated WhatsApp Backend Service | Scaffold `backend/whatsapp-service/`, implement mock Baileys manager, REST endpoints, auth middleware, test scripts | none | PLANNED |
| M3 | WhatsApp Admin UX | Refactor `WhatsAppTasksPage.tsx` with dual tabs, live QR countdown/refresh, consent checkbox, preview without emojis, confirmation modal | M2 | PLANNED |
| M4 | Comprehensive Verification & Audit | Run builds/lints in frontend & backend, execute test suites, Challenger verification, Forensic Integrity Audit, Sentinel report | M1, M2, M3 | PLANNED |

---

## Interface Contracts
### Frontend ↔ WhatsApp Service (`backend/whatsapp-service/`)
- Base URL: `VITE_WHATSAPP_BRIDGE_URL` (default: `http://localhost:3030`)
- Headers: `Authorization: Bearer <supabase_access_token>`, `Content-Type: application/json`
- `GET /status` -> `{ state: 'disconnected' | 'qr_ready' | 'connecting' | 'connected', connected: boolean, phone: string | null, qrExpiresAt: string | null, isMock: true, disclaimer: string }`
- `GET /qr` -> `{ qr: string, expiresAt: string, secondsRemaining: number, state: 'qr_ready' }`
- `POST /disconnect` -> `{ success: true, state: 'disconnected' }`
- `POST /mock-send` -> Body: `{ taskId: number, memberIds: number[], consentConfirmed: boolean }`
  -> Response: `{ success: true, simulated: true, sentCount: number, failedCount: number, details: Array<{ memberId: number, status: 'simulated', deliveredAt: string }> }`

### Frontend Internal Contracts
- `features/ranking/`:
  - `useRankingMetrics()` derives rankings from `members` and `notes` matching legacy algorithm.
  - `RankingPage` renders `RankingPodium` and `RankingTable`.
  - Registered under `/admin/ranking` in `router/index.tsx`.
- `features/members/`:
  - `Member` interface updated with `team?: string`.
  - `MemberProfileModal` receives `member: Member` and displays full logistical attributes and bonus stats.

---

## Code Layout
### `frontend/src/`
- `router/index.tsx` — route definitions
- `components/layout/` — `AdminNavigation.tsx`, `AdminHeader.tsx`, `MainLayout.tsx`
- `features/ranking/` — `RankingPage.tsx`, `RankingPodium.tsx`, `RankingTable.tsx`, `BonusAdjustmentModal.tsx`
- `features/members/` — `MembersPage.tsx`, `MemberRows.tsx`, `MemberEditor.tsx`, `MemberProfileModal.tsx`, `MemberFilters.tsx`, `memberExcel.ts`
- `features/tasks/` — `TasksPage.tsx`, `TaskEditorModal.tsx`, `TaskTrackingModal.tsx`
- `features/dashboard/` — `DashboardPage.tsx`, `DashboardWidgets.tsx`, `metrics.ts`
- `features/whatsapp/` — `WhatsAppTasksPage.tsx`, `WhatsAppQRPage.tsx`, `WhatsAppCloudPage.tsx`, `WhatsAppDispatch.tsx`, `api.ts`

### `backend/whatsapp-service/`
- `package.json`, `tsconfig.json`, `.env.example`
- `src/index.ts` — server entry point
- `src/config.ts` — environment configuration
- `src/middleware/auth.ts` — Supabase JWT auth middleware
- `src/services/mockBaileysManager.ts` — mock connection state machine & QR generator
- `src/routes/whatsapp.ts` — Express router
