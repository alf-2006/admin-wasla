# Dispatch to Worker M1 (Legacy Features Rebuilder)

- Working Directory: c:\Users\aboha\Desktop\adminstrationsystem\.agents\worker_m1
- Target Report: c:\Users\aboha\Desktop\adminstrationsystem\.agents\worker_m1\handoff.md
- Parent: orchestrator_1 (a70f8d5b-220d-49f6-934d-8952dd9521ed)
- Inputs:
  - c:\Users\aboha\Desktop\adminstrationsystem\.agents\ORIGINAL_REQUEST.md
  - c:\Users\aboha\Desktop\adminstrationsystem\GEMINI.md
  - c:\Users\aboha\Desktop\adminstrationsystem\.agents\orchestrator_1\PROJECT.md
  - c:\Users\aboha\Desktop\adminstrationsystem\.agents\explorer_survey_1\handoff.md
  - c:\Users\aboha\Desktop\adminstrationsystem\.agents\explorer_survey_2\handoff.md
- Write Scope: frontend/src/ (excluding features/whatsapp/)

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## 2026-10-02T11:38:32Z
You are Worker M1 (Legacy Features Rebuilder).
Your working directory is: c:\Users\aboha\Desktop\adminstrationsystem\.agents\worker_m1
The authoritative request is: c:\Users\aboha\Desktop\adminstrationsystem\.agents\ORIGINAL_REQUEST.md
Project plan and scope: c:\Users\aboha\Desktop\adminstrationsystem\.agents\orchestrator_1\PROJECT.md
Legacy Explorer report: c:\Users\aboha\Desktop\adminstrationsystem\.agents\explorer_survey_1\handoff.md
Frontend Explorer report: c:\Users\aboha\Desktop\adminstrationsystem\.agents\explorer_survey_2\handoff.md
Project rules: c:\Users\aboha\Desktop\adminstrationsystem\GEMINI.md and c:\Users\aboha\.gemini\config\rules\design-principles.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your exclusive write ownership:
frontend/src/ (excluding frontend/src/features/whatsapp/).

Your Tasks:
1. Fix the 3 TypeScript build errors blocking npm run build:
   - frontend/src/features/dashboard/DashboardWidgets.tsx: Replace recharts PieChart icon import with lucide-react (e.g. PieChart or similar from lucide-react), remove unused entry.
   - frontend/src/features/dashboard/metrics.ts: Fix type narrowing comparison on status !== 'approved'.
2. Implement Milestone M1 Features:
   - Build /admin/ranking (Leaderboard):
     - Create frontend/src/features/ranking/:
       - RankingPage.tsx: Full ranking view with header, quick filter, podium, and table.
       - RankingPodium.tsx: Top 3 members (Gold, Silver, Bronze) styled cleanly with Wasla brand colors (NO gradients, NO emojis).
       - RankingTable.tsx: Full table listing all members sorted by bonus points (derived from [B:+X] tags in notes), completion rank, and finish date.
       - BonusAdjustmentModal.tsx: Admin modal allowing adding/subtracting bonus points (+1 to +5, -1 to -5) which creates a documented note with [B:+X].
     - Register /admin/ranking route in frontend/src/router/index.tsx.
     - Add navigation link for "ترتيب الفريق" in frontend/src/components/layout/AdminNavigation.tsx.
   - Enhance Members Management (frontend/src/features/members/):
     - Add team field handling in MemberEditor.tsx, MemberRows.tsx, MemberFilters.tsx, and memberExcel.ts.
     - Create and connect MemberProfileModal.tsx showing full legacy member details: device, laptop status, Alexandria attendance, residence, work conditions, bio, team notes, and bonus points. Trigger it when clicking on a member row.
     - Ensure touch targets on action buttons in MemberRows.tsx are >= 44px (e.g. min-h-[44px] min-w-[44px] or p-2.5).
   - Clean up Banned Patterns:
     - NO gradients: Remove all bg-gradient-to-br and linearGradient from DashboardPage.tsx and DashboardWidgets.tsx. Use clean solid Wasla tokens (var(--surface), var(--primary)).
     - NO glassmorphism / backdrop-blur: Remove backdrop-blur from DashboardPage.tsx, AdminHeader.tsx, AdminNavigation.tsx, PortalHeader.tsx, MembersPage.tsx.
     - NO emojis anywhere: Remove 🌟 and all other emojis from UI, labels, and text.
3. Verification:
   - Run npm run build in frontend/ and ensure 0 errors.
   - Run npm run lint in frontend/ and ensure clean output.
4. Deliverable:
   - Write comprehensive report to c:\Users\aboha\Desktop\adminstrationsystem\.agents\worker_m1\handoff.md with:
     - Exact changes made
     - Build and lint command execution output
     - Verification proof
   - When finished, send a message to orchestrator_1 (conversation ID: a70f8d5b-220d-49f6-934d-8952dd9521ed).

