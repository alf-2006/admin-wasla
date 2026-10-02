# Wasla project rules for Antigravity

## Start here

- Read `PROJECT_BLUEPRINT.md`, then inspect the existing implementation before changing it.
- The app is already built in `frontend/` with React 19, TypeScript, Vite 8, Tailwind v4, Supabase, Arabic RTL, and the Wasla purple identity. Rebuild existing pages in place; do not add duplicate routes or parallel login flows.
- WhatsApp's current implementation is in `frontend/src/features/whatsapp/`, `backend/supabase/functions/whatsapp-tasks/`, and `backend/WHATSAPP_SETUP.md`. It currently uses the official Meta Cloud API. The user now wants a QR-connected, unofficial WhatsApp Web client instead; treat this as an explicit change of direction, but keep the existing Cloud API path intact until the QR path is proven and the user chooses a cutover.
- The requested QR library candidate is Baileys (`@whiskeysockets/baileys`). Verify its current official repository, supported Node version, API, release stability, and license before pinning a version. Do not copy examples blindly.

## User's product and design decisions

- The WhatsApp sender is the user's second number and is controlled by an authenticated administrator.
- Keep member login at `/login`; keep admin login at `/admin/login` without exposing its link on the member login page.
- Preserve existing routes, database tables, permissions, auth mechanisms, and data behavior unless the user explicitly approves a change.
- Arabic-first RTL, mobile-first, IBM Plex Sans Arabic, lucide-react, light/dark themes, and Wasla's purple visual identity. Do not replace the UI with a generic template.
- Use CSS logical properties, visible keyboard focus, reduced-motion support, safe-area insets, and touch targets of at least 44px. Do not add `!important`, static inline styles, or physical left/right CSS without a documented reason.
- Keep TypeScript strict, avoid `any`, keep files at or below 200 lines, and separate fetching/hooks from feature rendering.

## WhatsApp QR integration guardrails

- Be transparent in the UI and setup docs: QR-based WhatsApp Web libraries are unofficial, can stop working, may expose the linked account to suspension, and are not endorsed by WhatsApp. WhatsApp's published Messaging Guidelines prohibit unofficial clients and certain automation; do not describe this route as compliant or reliable for production.
- Never implement anti-detection, rate-limit evasion, account rotation, scraping, unsolicited messaging, or mass/bulk sends. Restrict any prototype to individually selected task assignees who explicitly opted in, with an administrator reviewing and confirming each recipient/message before sending.
- Keep the sender disconnected and sending disabled by default. Show the QR only to an authenticated administrator over a protected connection, make it short-lived, and never log, persist in the browser, or commit QR values, pairing codes, or session credentials.
- A WhatsApp Web socket requires a persistent Node.js process; Supabase Edge Functions are not the place to hold that connection. If implementing QR, isolate it as a separate backend service, protect its endpoints with verified Supabase JWT plus server-side admin authorization, encrypt session credentials at rest, and document hosting, backup, logout/revocation, reconnect, and incident recovery. Never put service-role keys or session secrets in `frontend/`.
- Do not install a package, scan a real QR, connect the user's account, send a real message, deploy, or change production Supabase state without explicit confirmation. First implement and test with mocks/local fixtures; do not claim real account connectivity until the user completes setup.
- Preserve the official Cloud API implementation as a rollback option unless the user later explicitly asks to remove it.

## Work safely

- Preserve existing user changes, including unrelated modified, deleted, or untracked files. Inspect `git status` before edits and never clean/reset the tree to make tests pass.
- Do not push or deploy. Do not commit unless the user requests it.
- Before changing auth, permissions, schema, or external-service behavior, explain the impact and stop if the request does not clearly authorize it.
- Verify each change with the relevant `npm run build`, `npm run lint`, and focused browser or unit tests. Report warnings and skipped checks plainly.
- Keep progress and final responses concise, in Egyptian Arabic when speaking to the user.

## Current continuation task

Inspect the QR-based WhatsApp request and design/implement a safe, isolated admin-controlled prototype without disturbing the existing Cloud API path. Start by mapping the present UI/API/Edge Function and database security. Give the user the account-ban and policy warning before any live pairing or sends. The admin UX should show connection state, QR/pairing expiry, disconnect/revoke controls, recipient consent, per-recipient message preview, and an explicit send confirmation. Test without connecting a real WhatsApp account.
