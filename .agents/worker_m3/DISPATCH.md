## 2026-10-02T12:15:00Z
You are Worker M3 (WhatsApp Admin UX Builder).
Your working directory is: c:\Users\aboha\Desktop\adminstrationsystem\.agents\worker_m3
The authoritative request is: c:\Users\aboha\Desktop\adminstrationsystem\.agents\ORIGINAL_REQUEST.md
Project plan and scope: c:\Users\aboha\Desktop\adminstrationsystem\.agents\orchestrator_1\PROJECT.md
WhatsApp Architecture Explorer report: c:\Users\aboha\Desktop\adminstrationsystem\.agents\explorer_survey_3\handoff.md
WhatsApp Backend Worker report: c:\Users\aboha\Desktop\adminstrationsystem\.agents\worker_m2\handoff.md
Project rules: c:\Users\aboha\Desktop\adminstrationsystem\GEMINI.md and c:\Users\aboha\.gemini\config\rules\design-principles.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your exclusive write ownership:
frontend/src/features/whatsapp/

Your Tasks:
1. Re-architect frontend/src/features/whatsapp/WhatsAppTasksPage.tsx:
   - Transform it from a simple re-export into an administrative tabbed container:
     - Tab 1: "الربط التجريبي عبر QR (Baileys Mock)" -> renders WhatsAppQRPage.tsx.
     - Tab 2: "الربط السحابي المعتمد (Meta Cloud API)" -> renders WhatsAppCloudPage.tsx.
     - Prominent policy and ban warning banner at the top of the container explaining unofficial library risks, that QR is for isolated testing, and official Cloud API is available.
2. Upgrade frontend/src/features/whatsapp/WhatsAppQRPage.tsx:
   - Connection state indicator (disconnected, qr_ready, connecting, connected).
   - Display mock QR code with dynamic countdown timer (60 seconds).
   - Expired QR state: when secondsRemaining reaches 0, show overlay "انتهت صلاحية الرمز" with manual refresh button (calls connect/fetch QR).
   - Disconnect and revoke session controls.
3. Enhance frontend/src/features/whatsapp/WhatsAppDispatch.tsx:
   - Implement recipient consent check: mandatory explicit checkbox that must be checked before proceeding to send:
     "أؤكد أن الأعضاء المحددين وافقوا مسبقاً وبشكل صريح على استلام إشعارات المهام عبر واتساب، وأن المحتوى يخص مهام مسندة إليهم حصراً."
   - Per-recipient message preview:
     STRICTLY ZERO EMOJIS! Remove emojis (👋, 📌, 📅, 🔗) from template strings in WhatsAppDispatch.tsx. Replace with clean, formatted Arabic text with task title, deadline (if set), portal login link, and Wasla management closing.
   - Pre-send explicit confirmation modal:
     Before mock send, show accessible confirmation dialog with recipient count, task title, message preview, consent confirmation, and explicit "تأكيد وبدء الإرسال التجريبي" button.
4. Align with design principles:
   - Arabic RTL (dir="rtl"), IBM Plex Sans Arabic font, Wasla purple identity tokens.
   - Strictly NO purple gradients, NO glassmorphism / backdrop-blur, NO emojis anywhere.
   - Touch targets >= 44px (min-h-[44px]).
   - Keep all files <= 200 lines.
5. Verification:
   - Run npm run build in frontend/ and ensure 0 errors.
   - Run npm run lint in frontend/ and ensure 0 errors and 0 warnings.
6. Deliverable:
   - Write comprehensive report to c:\Users\aboha\Desktop\adminstrationsystem\.agents\worker_m3\handoff.md.
   - When finished, send a message to orchestrator_1 (conversation ID: a70f8d5b-220d-49f6-934d-8952dd9521ed).
