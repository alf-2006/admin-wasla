# Original User Request

## 2026-10-02T11:18:09Z

# Teamwork Project Prompt

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: [none — teamwork routes from the description]

تحديث شامل لنظام إدارة "وصلة" (Wasla Tech) بإعادة بناء مميزات النظام القديم بالكامل، بالإضافة لبرمجة نموذج تجريبي لخدمة الواتساب (QR Code) معزولة وآمنة للإدارة.

Working directory: c:\Users\aboha\Desktop\adminstrationsystem
Integrity mode: development

## Verification Resources
- The legacy system reference: `legacy/index.html`
- The project rules: `GEMINI.md`

## Requirements

### R1. Rebuild Legacy Features (Frontend)
- Port the legacy "Wasla Tech" features (Members Management, Tasks, Leaderboard, AI Assistant, Notes) into the existing `frontend/` directory using React 19, TypeScript, Vite 8, and Tailwind v4.
- Apply the Wasla purple identity, Arabic RTL layout, and strict adherence to the design principles.
- Maintain parity with the legacy system's capabilities without disrupting existing routes.

### R2. WhatsApp Service (Backend)
- Create a standalone Express.js server in `backend/whatsapp-service/` to manage the `@whiskeysockets/baileys` WebSocket connection.
- Expose secure endpoints for the frontend to fetch connection status and the QR code.
- Test with mocks only; do not connect a real WhatsApp account or send live messages.

### R3. WhatsApp Admin UX (Frontend)
- Build an Admin UI to display connection state, QR code with pairing expiry, and disconnect/revoke controls.
- Implement recipient consent checking, per-recipient message previews, and an explicit send confirmation step.

## Acceptance Criteria

### Legacy Features Parity
- [ ] An independent agent-as-judge verifies that the Members, Tasks, and Leaderboard views are present in the frontend and functional.
- [ ] An independent agent-as-judge verifies that the UI adheres strictly to Arabic RTL and the provided design principles (no generic templates).

### WhatsApp Prototype
- [ ] Running `npm run start` (or equivalent) in `backend/whatsapp-service` successfully starts the Express server without crashing.
- [ ] The backend API successfully returns a mock QR code string when queried.
- [ ] The Admin UX successfully fetches and displays the mock QR code, and shows a confirmation modal when a mock send is triggered.
