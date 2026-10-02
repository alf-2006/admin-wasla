# Handoff Report: Legacy System Comprehensive Mining (legacy/index.html)

- **Author**: Explorer 1 (Legacy System Miner)
- **Target Audience**: Orchestrator, Frontend Implementation Agents, Backend Engineers
- **Source Artifact Analyzed**: `c:\Users\aboha\Desktop\adminstrationsystem\legacy\index.html` (3,877 lines, 194 KB) & `legacy/style.css` (3,837 lines, 108 KB)
- **Date**: 2026-10-02
- **Handoff Type**: Hard (Task Complete)

---

## 1. Observation

Direct code inspections of `legacy/index.html` and `legacy/style.css` revealed the complete operational architecture, user flows, database interfaces, UI state management, and Arabic design copy of the legacy Wasla Tech system.

### 1.1 Architecture & Shell Overview
- **HTML Container Layout** (`lines 26-276`):
  - `#login-screen` (`lines 27-137`): Wasla Tech branded portal with dual-column hero copy, floating ambient dot, theme toggle button, login form with email shorthand expansion, password visibility toggler, and remember-me option.
  - `#app` (`lines 140-810`): Main application container holding:
    - Sidebar (`#sidebar`, `lines 144-203`): Brand mark, dynamic SVG connection path (`.nav-connection-base`, `.nav-connection-active`), 6 navigation items (`dashboard`, `members`, `tasks`, `ranking`, `notes`, `ai-assistant`), and user profile footer with avatar, display name, role label, and logout button.
    - Mobile Bottom Navigation Bar (`#mobile-bottom-nav`, `lines 206-232`): 6 tab buttons matching sidebar pages.
    - Top Navbar (`.top-navbar`, `lines 238-273`): Menu toggle button, dynamic title (`#page-title`) & subtitle (`#page-subtitle`), global live search input (`#global-search`), notification bell with badge dot & dropdown (`#notifications-dropdown`), theme toggle button, and mobile logout button.
    - Content Area (`.content-area`, `lines 275-612`): 6 page containers (`#page-dashboard`, `#page-members`, `#page-tasks`, `#page-ranking`, `#page-notes`, `#page-ai-assistant`).
    - Modals (`lines 616-807`): `#groq-key-modal`, `#member-modal`, `#profile-modal`, `#task-create-modal`, `#task-track-modal`, `#delete-modal`.
    - Toast (`#toast`, `line 809`).

---

### 1.2 Feature 1: Members Management
- **HTML Declarations**:
  - Main View: `#page-members` (`lines 452-512`).
  - Table Header & Controls: Excel export button, Excel import button (hidden file input `#excel-import-file`), Add member button (`#btn-add-member`), Search input (`#search-input`), Filters (`#filter-device`, `#filter-work`, `#filter-alex`), data table (`#members-tbody`), pagination (`#pagination`).
  - Modal Form: `#member-modal` (`lines 640-711`) containing `#member-form` with inputs `#m-fullname`, `#m-phone`, `#m-residence`, `#m-alex`, `#m-device`, `#m-work`, `#m-work-notes`, `#m-notes`.
  - Profile Modal: `#profile-modal` (`lines 714-723`) populated dynamically via `openProfile(id)`.
  - Delete Modal: `#delete-modal` (`lines 792-806`).

- **Data Model & Schema**:
  ```javascript
  // In-Memory Member Object Structure (lines 841-857, 1126-1137)
  {
    id: number,                     // Unique identifier (integer or timestamp)
    fullName: string,               // Full member name (الاسم الكامل)
    team: "Wasla",                  // Team identifier (always "Wasla")
    phone: string,                  // Phone number (dir="ltr", text-align: right)
    residence: string,              // Governorate/Area (السكن) e.g. "القاهرة - المعادي"
    device: string,                 // Device option (الجهاز المتاح)
    hasLaptop: boolean,             // Derived/explicit boolean (/لاب|الاثنين|الاثنان|laptop/i)
    canGoAlexandria: boolean,       // Alexandria field attendance flag (ينزل إسكندرية للميتنج؟)
    workStatus: string,             // "شغال" | "مش شغال" | "مستمر"
    workConditions: string,         // Notes about study/work situation (ظروف الشغل / الدراسة)
    bio: string,                    // Member biography / description (نبذة / تعريف)
    teamNotes: string,              // Admin notes / personal attributes (ملاحظات شخصية / ملاحظات الفريق)
    completionRank: number,         // Optional rank score (0-100 or position)
    gender: "ذكر" | "أنثى",         // Gender (defaults to "ذكر")
    meetingAttendance: string,      // "Yes" | "No" | "Regular"
    taskStatus?: string,            // "Completed" | "In Progress" | "Late" | "Not Started"
    taskFinishDate?: string,        // Completion ISO date
    totalBonus?: number             // Dynamically computed sum of [B:+X] tags from notes
  }
  ```

- **Supabase Database Row Mapping** (`lines 906-935`):
  - Database Table: `members`
  - Columns: `id`, `full_name`, `team`, `completion_rank`, `team_notes`, `has_laptop`, `can_go_alexandria`, `residence`, `work_conditions`, `bio`, `phone`, `device`, `gender`, `meeting_attendance`, `work_status`.

- **Operations & Logic**:
  - **Filtering** (`lines 2417-2449`):
    - Filter by device: `"لاب توب"`, `"كمبيوتر فقط"`, `"الاثنان معاً"`, `"تابلت"`, `"هاتف فقط"`.
    - Filter by work availability: `"شغال"` (شغال بشكل دائم), `"مش شغال"` (متفرغ / غير شغال).
    - Filter by Alexandria: `"yes"` (`canGoAlexandria === true`), `"no"` (`canGoAlexandria === false`).
    - Low Bonus Radar Filter: `window.__bonusLowFilter === true` filters members with `totalBonus < 0`.
    - Live Search: case-insensitive name substring match.
  - **Sorting** (`lines 2436-2447, 2451-2455`):
    - Sortable fields: `fullName`, `canGoAlexandria`, `workStatus`, `totalBonus`, `deadline`, `taskFinishDate`.
    - Toggles between ascending and descending.
  - **Pagination** (`lines 2459-2508`):
    - Page size: 8 members (`PAGE_SIZE = 8`).
  - **Excel Operations (SheetJS `xlsx`)** (`lines 2325-2415`):
    - **Export**: Generates `.xlsx` workbook `Wasla_Team_Members.xlsx`, sets RTL worksheet (`ws['!dir'] = 'rtl'`), maps Arabic headers: `"الاسم الكامل"`, `"رقم التليفون"`, `"محافظة السكن"`, `"الجهاز المتاح"`, `"النزول لإسكندرية"`, `"حالة التفرغ"`, `"ظروف الشغل"`, `"نبذة / تعريف"`, `"ملاحظات الفريق"`, `"نقاط البونص"`.
    - **Import**: Multi-header fuzzy matching (`row["الاسم الكامل"] || row["الاسم"] || row["FullName"]`, etc.), duplicate prevention by `fullName`, sanitizes inputs via `sanitizeInput()`, generates unique ID, inserts into Supabase (`dbInsertMember`) or LocalStorage.
  - **Role-Based Restrictions** (`lines 1365-1398, 2512, 2603`):
    - Add/Edit/Delete restricted to `isLeaderRole()` (`Admin`, `Wasla Leader`, `Wasla AI Assistant`).
    - Normal users have read-only access.
    - Delete shows safety confirmation modal (`#delete-modal`).

---

### 1.3 Feature 2: Tasks Management
- **HTML Declarations**:
  - Main View: `#page-tasks` (`lines 430-450`): Header with subtitle, "مهمة جديدة" button, empty state `#tasks-empty-state`, responsive grid `#tasks-grid`.
  - Create Modal: `#task-create-modal` (`lines 727-768`): Form `#task-create-form`, inputs `#t-title`, `#t-desc`, checkbox `#t-has-deadline`, `#t-deadline` (`datetime-local`), dropdown `#t-assign-type` (`all` vs `custom`), and container `#t-custom-assignees` rendering checkboxes for all members.
  - Task Tracking Modal: `#task-track-modal` (`lines 771-789`): `#tt-title`, `#tt-desc`, `#tt-deadline`, and scrollable list `#tt-members-list`.

- **Data Model & Schema**:
  ```javascript
  // In-Memory Task Object (lines 859-863, 1009-1031, 3672-3680)
  {
    id: number,                     // Unique task identifier
    title: string,                  // Task title (عنوان المهمة)
    description: string,            // Optional task requirements / notes (وصف المهمة)
    hasDeadline: boolean,           // Deadline active toggle flag
    deadlineDate: string,           // ISO local string (e.g. "2026-10-05T18:00")
    assignedTo: "ALL" | number[],   // Target audience: "ALL" or array of member IDs [1, 3, 7]
    tracking: {                     // Map of memberId -> tracking entry
      [memberId: number]: {
        status: "لم يبدأ" | "قيد التنفيذ" | "مكتمل",
        notes: Array<{ text: string, date: string }>
      }
    }
  }
  ```

- **Supabase Database Row Mapping** (`lines 1009-1031`):
  - Database Table: `tasks`
  - Columns: `id`, `title`, `description`, `has_deadline` (boolean), `deadline_date` (text/timestamp), `assigned_to` (jsonb), `tracking` (jsonb).

- **Operations & Lifecycle**:
  - **Dynamic Status Lifecycle**:
    1. `"لم يبدأ"` (Not Started): Default initial state when unhandled.
    2. `"قيد التنفيذ"` (In Progress): Member working on task.
    3. `"مكتمل"` (Completed): Successfully finished.
    4. `"متأخر 🚨"` (Late): Dynamically derived at runtime if `hasDeadline === true`, current time exceeds `deadlineDate`, and member status is not `"مكتمل"`.
  - **Dashboard Cards & Real-Time Aggregation** (`lines 3565-3617`):
    - Calculates completion percentage `pct = Math.round((completedCount / assignedCount) * 100)`.
    - Border color changes: 100% is emerald (`var(--success)`), normal is Wasla purple (`var(--wasla)`), past deadline with `< 100%` is crimson danger (`var(--danger)`).
    - Status pills display counts: `completedCount` (`badge-done`), `inProgressCount` (`badge-pending`), `lateCount` (`badge-late`), and total `assignedCount`.
  - **Member Tracking & Admin Interaction** (`lines 3721-3811`):
    - Modal displays every assigned member.
    - Status dropdown updates status via `updateMemberTaskStatus(taskId, memberId, newStatus)`.
    - Internal notes thread: Leaders can enter commentary in `#t-note-input-[memberId]` which appends `{ text, date }` with Arabic timestamp.
  - **Radar Widget on Dashboard** (`lines 1971-2025`):
    - `#latest-task-late-widget` finds the latest created task, filters members who have not completed it, and displays them with danger/warning badges.

---

### 1.4 Feature 3: Leaderboard (Ranking & Points System)
- **HTML Declarations**:
  - Main View: `#page-ranking` (`lines 515-523`): Header, explanatory subtitle, and list container `#ranking-content`.
  - Dashboard Widgets: Top 3 Podium Widget (`#top-rankings-widget`, `lines 313-324`) and Lowest Rankings Radar (`#lowest-rankings-widget`, `lines 355-366`).

- **Points System & Bonus Tag Extraction** (`lines 2712-2724`):
  ```javascript
  function getMemberTotalBonus(memberId) {
    let total = 0;
    const allNotes = notes["Wasla"] || [];
    allNotes.forEach(n => {
      if (n.targetMemberId === memberId) {
        const match = (n.text || "").match(/\[B:([+-]?\d+)\]/);
        if (match) {
          total += parseInt(match[1]);
        }
      }
    });
    return total;
  }
  ```
  - Bonus points are embedded within notes using regex tag `[B:+3]`, `[B:-2]`, etc.
  - Values range from `-5` to `+5`.

- **Ranking Algorithm** (`lines 2726-2750`):
  1. Members are included if `totalBonus !== 0 || taskFinishDate || completionRank > 0`.
  2. **Primary Sort**: `totalBonus` descending (`b.totalBonus - a.totalBonus`).
  3. **Secondary Sort**: `completionRank` ascending (`1, 2, 3...`).
  4. **Tertiary Sort**: `taskFinishDate` ascending (earlier finish dates rank higher).

- **Badges, Visual Tiers & Achievements**:
  - **Rank #1 (Gold)**: `linear-gradient(135deg, #f59e0b, #fbbf24)` with white typography.
  - **Rank #2 (Silver)**: `linear-gradient(135deg, #94a3b8, #cbd5e1)` with white typography.
  - **Rank #3 (Bronze)**: `linear-gradient(135deg, #b45309, #d97706)` with white typography.
  - **Rank #4+ (Normal)**: `var(--border)` background with `var(--text-muted)`.
  - **Score Pill**: Dashed border pill colored in `--wasla-energy` (`#8B5CF6`) for positive scores (`+X نقطة`), crimson (`#E11D48`) for negative scores (`-X نقطة`), or muted gray for zero.
  - **Trend Analysis**: Daily bonus trend line chart (`#trendsChart`, `lines 2152-2207`) plotting aggregate daily bonus sums over the last 7 days using Chart.js.

---

### 1.5 Feature 4: AI Assistant (Wasla AI)
- **HTML Declarations**:
  - Main View: `#page-ai-assistant` (`lines 537-610`): Header card with Wasla badge icon, status pill (`متصل ببيانات الفريق`), Gemini API settings modal trigger button, 5 quick suggestion chips, scrollable chat message stream (`#ai-messages`), input form with textarea (`#ai-prompt-input`) and send button (`#ai-send-btn`).
  - Key Settings Modal: `#groq-key-modal` (`lines 616-637`) allowing direct storage of Gemini API key (`AIzaSy...`) into Supabase Vault or LocalStorage (`tms_gemini_key`).

- **Context Injection Architecture (`getSystemDataContext()`, lines 3114-3171)**:
  - Injects complete snapshot of active system state:
    1. Member list with laptop status, Alexandria attendance, residence, and team notes.
    2. Active tasks with assignment counts, deadlines, completed/in-progress counts, and names of members who have not completed yet.
    3. Chronological team notes with authors, roles, and content.
    4. Live aggregate percentages: Total members, Laptop count (%), Alexandria count (%), Full Readiness count (%).
    5. Agent permissions declaration.

- **Dual Execution Engine (`handleAiSubmit()`, lines 3173-3276)**:
  - **Primary Route**: Calls Supabase Edge Function `wasla-ai` passing `{ question, context }`.
  - **Fallback Route**: Directly queries Google Gemini API endpoint:
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${fallbackKey}`
    with system instruction enforcing Arabic output, analytical responses, and JSON action blocks.

- **Agentic Actions Engine (`executeAiAction()`, lines 3278-3394)**:
  - The AI outputs JSON action blocks inside markdown fences:
    - `update_member`: Updates `taskStatus`, `deadline`, `hasLaptop`, `canGoAlexandria`, `completionRank`, `teamNotes`. Syncs to Supabase `dbUpdateMember`.
    - `add_member`: Normalizes new member, inserts into state and Supabase `dbInsertMember`.
    - `add_note`: Adds note targeted to member, updates notes list and Supabase `dbInsertNote`.
    - `delete_member`: Matches member by name, removes from state and Supabase `dbDeleteMember`.
  - Strict permission guards: Verifies `canManageMembers()`, `canWriteNotes()`, and `canDeleteMembers()` before executing mutations.

- **Preset Quick Prompts**:
  1. `"غير الجاهزين"` -> `"من هم الأعضاء الذين لا يملكون لابتوب ويحتاجون متابعة؟"`
  2. `"إحصائيات المتابعة"` -> `"من هم الأعضاء الذين يحتاجون لمتابعة حالياً؟"`
  3. `"توفر اللابتوب وسفر الإسكندرية"` -> `"من من الأعضاء يمتلك لابتوب ويمكنه السفر للإسكندرية؟"`
  4. `"متصدرو الترتيب"` -> `"من هم أصحاب المراكز الأولى في الترتيب؟"`
  5. `"ملخص الملاحظات"` -> `"لخص لي أهم الملاحظات المسجلة للفريق حالياً"`

---

### 1.6 Feature 5: Notes System
- **HTML Declarations**:
  - Main View: `#page-notes` (`lines 526-535`): Section card `#notes-section`, team tabs container `#notes-tabs`, content container `#notes-content`.
  - Form UI: `#note-target` (member selector), `#note-bonus` (bonus adjuster dropdown), `#new-note-text` (textarea), send button.

- **Data Model & Schema**:
  ```javascript
  // In-Memory Note Object (lines 865-873, 937-956, 2918-2928)
  {
    id: number,                     // Unique note identifier
    text: string,                   // Content including optional [B:+X] tag
    author: string,                 // Author display name (e.g. "أحمد عيد")
    authorRole: string,             // Author role (e.g. "Wasla Leader", "Admin")
    date: string,                   // ISO date string "YYYY-MM-DD"
    team: "Wasla",                  // Team origin
    targetTeam: "Wasla",            // Target team
    targetMemberId: number | null,  // Member foreign key or null for team-wide note
    targetName: string | null       // Cached member full name
  }
  ```

- **Supabase Database Row Mapping** (`lines 937-956`):
  - Database Table: `notes`
  - Columns: `id`, `text`, `author`, `author_role`, `date`, `team`, `target_team`, `target_member_id`, `target_name`, `created_by`.

- **Operations & UI Interaction** (`lines 2781-3020`):
  - Target selection from sorted list of members.
  - Bonus selector dropdown:
    - Neutral: `"بدون تقييم (0)"`
    - Positive: `+1 نقطة` to `+5 نقاط`
    - Negative: `-1 نقطة` to `-5 نقاط`
  - Tag formatting: Appends `[B:+3]` or `[B:-1]` to the text payload.
  - Display rendering: Strips the `[B:...]` tag from rendered body and displays a pill badge:
    - Positive: Green/purple pill with `<i class="fas fa-arrow-up"></i> بونص: +X`
    - Negative: Red pill with `<i class="fas fa-arrow-down"></i> خصم: -X`
  - In-place editing: `editNote()` converts note text into textarea with "حفظ التغييرات" and "إلغاء".
  - Deletion: `deleteNote()` prompts for confirmation before removing locally and from Supabase (`dbDeleteNote`).

---

### 1.7 Complete Arabic Copy & Label Catalog

| Category | UI Element | Exact Arabic Copy |
|---|---|---|
| **Login** | Eyebrow | `في عالم تتسارع فيه التكنولوجيا، كان لا بد من وجود وصلة.` |
| | Hero Title | `أهلاً بك مجدداً` |
| | Hero Subtitle | `في وصلة، نحول الأفكار إلى واقع` |
| | Benefit 1 | `أفكار بلا حدود` — `من الجامعة إلى التأثير` |
| | Benefit 2 | `فرص أكبر` — `نحو مستقبل أفضل` |
| | Benefit 3 | `مجتمع أقوى` — `طلاب ومطورين ومبدعين` |
| | Form Title | `تسجيل الدخول` — `أهلاً بك في نظام إدارة وصلة` |
| | Inputs | `البريد الإلكتروني` (placeholder: `admin@wasla.com`), `كلمة المرور` (placeholder: `••••••••`), `تذكرني`, `دخول` |
| | Network Warning | `مشكلة شبكة` — `تأكد من Project URL` |
| | Footer Tagline | `Code. Build. Innovate. Impact.` — `© 2026 Wasla Tech. جميع الحقوق محفوظة.` |
| **Navigation** | Brand Text | `wasla tech` — `نظام إدارة الفريق` |
| | Nav Tabs | `لوحة التحكم`, `الأعضاء`, `المهام`, `نظام الترتيب`, `الملاحظات`, `المساعد الذكي` |
| | Mobile Nav Tabs | `الرئيسية`, `الأعضاء`, `المهام`, `الترتيب`, `الملاحظات`, `المساعد` |
| | User Roles | `قائد الفريق` (Wasla Leader), `مدير النظام` (Admin), `مساعد وصلة الذكي` (Wasla AI Assistant), `مستخدم` (Normal User) |
| | Header Actions | `ابحث في الأعضاء...`, `تنبيهات المتابعة` (`X متأخرون`), `تسجيل الخروج` |
| **Dashboard** | Subtitle | `مرحباً [الاسم] ، هنا نظرة سريعة على فريقك و تقدم العمل اليوم` |
| | Quick Actions | `إضافة عضو جديد`, `تكليف مهمة جديدة`, `كتابة ملاحظة` |
| | Readiness Hero | `جاهزية الفريق` — `نسبة الجاهزين (لابتوب + نزول للاجتماع)` |
| | Signal 1 | `جاهزون باللاب` — `X من Y عضو` |
| | Signal 2 | `مؤكدون للنزول` — `X من Y عضو` |
| | Command Cards | `حالة المهام (Tasks)`, `أعلى 3 أعضاء (نظام الترتيب)`, `جاهزية الأجهزة`, `أحدث النشاطات`, `مؤشر الخطر (أقل بونص)`, `متأخرون عن آخر مهمة`, `أداء الفريق بمرور الوقت (نقاط بونص)`, `نظرة سريعة: أعضاء وصلة` |
| **Members** | Page Title | `جدول الأعضاء` |
| | Action Buttons | `تصدير إكسيل`, `استيراد إكسيل`, `إضافة عضو` |
| | Filter Placeholders | `بحث بالاسم...`, `خيار الجهاز`, `طبيعة العمل/التفرغ`, `إسكندرية؟` |
| | Table Headers | `الاسم`, `رقم التليفون`, `الجهاز المتوفر`, `إسكندرية`, `السكن`, `حالة العمل`, `الترتيب/البونص`, `إجراءات` |
| | Badges & Values | `يقدر ينزل` / `مش هينزل`, `شغال بشكل دائم` / `متفرغ / غير شغال`, `+X نقطة` / `-X نقطة` |
| | Member Form | `الاسم الكامل`, `رقم التليفون`, `السكن`, `ينزل إسكندرية للميتنج؟`, `الجهاز المتوفر`, `حالة العمل / التفرغ`, `ملاحظات عن الشغل`, `ملاحظات شخصية` |
| | Profile Modal | `الملف الشخصي`, `رقم التليفون`, `التفرغ`, `حالة الكورس`, `حالة المهام`, `معاه لاب توب؟`, `إسكندرية للميتنج`, `السكن`, `ظروف الشغل / الدراسة`, `تعريف / نبذة`, `ملاحظات الفريق`, `نقطة تقييم` |
| | Delete Modal | `تأكيد الحذف` — `هل أنت متأكد من حذف هذا العضو؟ لا يمكن التراجع عن هذا الإجراء.` |
| **Tasks** | Page Header | `مهام الفريق` — `متابعة دقيقة بالإسناد والأوقات`, `مهمة جديدة` |
| | Empty State | `لا توجد مهام حالياً` — `قم بإضافة مهمة جديدة وتكليف الأعضاء بها للمتابعة.` |
| | Task Modal | `عنوان المهمة`, `وصف المهام التوضيحي (اختياري)`, `تفعيل موعد نهائي للمهمة؟ (Deadline)`, `آخر موعد للتسليم (التاريخ والوقت)`, `إسناد إلى الأعضاء` (`الجميع` / `تخصيص`) |
| | Track Modal | `عنوان المهمة`, `وصف المهمة`, `آخر موعد: [تاريخ]` / `مهمة ممتدة بمرونة`, `المكلفين: X`, `تحديث الحالة` (`لم يبدأ`, `قيد التنفيذ`, `مكتمل`, `متأخر 🚨`), `اكتب ملاحظة متابعة هنا ثم اضغط إرسال...` |
| **Leaderboard** | Page Header | `نظام الترتيب` — `ترتيب أعضاء وصلة حسب نقاط التقييم (البونص) — اضغط على أي شخص لعرض ملفه الشخصي` |
| | Empty State | `لا يوجد ترتيب بعد` |
| | Item Labels | `أنهى في [تاريخ]`, `+X نقطة`, `الترتيب: #[رقم]` |
| **Notes** | Page Header | `نظام الملاحظات` |
| | Add Form | `إلى العضو`, `التقييم (بونص / خصم)` (`بدون تقييم (0)`, `بونص إيجابي: +1 إلى +5`, `خصم سلبي: -1 إلى -5`), `اكتب الملاحظة هنا...`, `إرسال الملاحظة` |
| | Note Card | `من: [اسم الكاتب]`, `إلى: [اسم العضو]`, `بونص: +X` / `خصم: -X`, `تعديل`, `حذف` |
| **AI Assistant** | Page Header | `مساعد وصلة الذكي (Wasla AI)` — `تحليل فوري واستعلام ذكي محصور حصرياً في بيانات وأداء فريق وصلة (مدعوم بواسطة Google Gemini)` |
| | Status Pill | `متصل ببيانات الفريق` |
| | Quick Chips | `غير الجاهزين`, `إحصائيات المتابعة`, `توفر اللابتوب وسفر الإسكندرية`, `متصدرو الترتيب`, `ملخص الملاحظات` |
| | Default Welcome | `أهلاً بك! أنا مساعد وصلة الذكي. مهمتي الإجابة حصرياً عن بيانات المنظومة الحالية (حالة الأعضاء، درجة الاستعداد، الملاحظات، وجاهزية الفريق). كيف يمكنني مساعدتك اليوم؟` |
| | Input & Actions | `اسأل عن أي معلومة تخص الفريق أو اللوجستيات...`, `إرسال`, `نسخ` |
| | Vault Modal | `إعداد مفتاح Gemini API في Supabase`, `مفتاح Gemini API (يبدأ بـ AIzaSy...)`, `حفظ في Supabase Vault` |

---

## 2. Logic Chain

1. **Premise**: The legacy system contained in `legacy/index.html` represents the baseline reference for features, business logic, workflows, and Arabic terminology for the v2 system rewrite (`R1. Rebuild Legacy Features`).
2. **Step 1 — Member & Logistics Tracking**:
   - `legacy/index.html` tracks logistics attributes (`hasLaptop`, `canGoAlexandria`, `device`, `residence`, `workStatus`, `workConditions`) which directly match the database migration schema in `PROJECT_BLUEPRINT.md` (`section 6.1`).
   - Excel export and import rely on SheetJS (`xlsx`) with RTL sheets and specific Arabic column headers. In v2, this logic will be ported into `frontend/src/features/members/` with React Query hooks.
3. **Step 2 — Task Lifecycle & Verification**:
   - In `legacy/index.html`, tasks support both `"ALL"` and custom multi-member assignment (`assignedTo`), deadlines, and a per-member `tracking` dictionary storing status and timestamped notes.
   - Status flows through `لم يبدأ` -> `قيد التنفيذ` -> `مكتمل`, with runtime deadline calculation computing `متأخر 🚨`.
   - In `PROJECT_BLUEPRINT.md`, this maps directly to `pending` -> `in_progress` -> `under_review` -> `approved` / `revision_requested`.
4. **Step 3 — Scoreboard & Leaderboard**:
   - The bonus points mechanism in `legacy/index.html` is dynamically derived by parsing `[B:([+-]?\d+)]` in note strings targeted to specific members.
   - Ranking sort hierarchy: Total Bonus points (descending) -> completionRank (ascending) -> finish date (ascending).
   - In v2, this informs both the Admin ranking scoreboard (`/admin/ranking`) and the embedded member portal leaderboard.
5. **Step 4 — Notes & Operational Logs**:
   - Notes support targeting individual members (`targetMemberId`, `targetName`) or team-wide broadcasts, plus embedding bonus points.
   - Author attribution records the current user's displayName and role.
6. **Step 5 — Wasla AI Assistant**:
   - The assistant injects a formatted textual context snapshot including members, tasks, notes, and aggregate KPIs (`getSystemDataContext`).
   - It supports tool-calling mutations (`executeAiAction`) for updating members, adding members, creating notes, and deleting members.
   - In v2, this maps to the Supabase Edge Function `wasla-ai` and Admin Assistant screen (`/admin/assistant`).
7. **Synthesis**:
   - All legacy views have 1:1 mapping with the planned React 19 architecture outlined in `PROJECT_BLUEPRINT.md`. No legacy capabilities will be dropped during implementation.

---

## 3. Caveats

- **External Libraries**: `legacy/index.html` utilized CDN scripts (`@supabase/supabase-js@2`, `xlsx.full.min.js`, `chart.umd.min.js`, and FontAwesome 6). In the React 19 frontend, these must be standard npm dependencies (`@supabase/supabase-js`, `xlsx`, `lucide-react` instead of FontAwesome, and Tailwind v4 / Recharts or Chart.js).
- **Design Principle Adherence**: `legacy/index.html` used purple/violet gradients (e.g. `linear-gradient(135deg, var(--wasla), var(--wasla-light))`) and some emojis (🚨). **User rules in `GEMINI.md` and `design-principles.md` strictly prohibit violet/purple gradients, emojis, and glassmorphism.** When rebuilding legacy features in `frontend/`, the visual tokens must adhere strictly to the Wasla purple identity with flat editorial styling, zero emojis, and Lucide icons.
- **WhatsApp Integration Isolation**: WhatsApp features were not part of `legacy/index.html`; as specified in `GEMINI.md`, WhatsApp QR prototype will be an isolated backend service in `backend/whatsapp-service/` and must not contaminate legacy feature parity.

---

## 4. Conclusion

`legacy/index.html` contains 5 core operational domains fully mapped and ready for implementation:
1. **Members Management**: Full logistical profile schema (devices, Alexandria availability, residence, work status), multi-faceted filtering, sorting, pagination, profile view drawer, and SheetJS Excel import/export.
2. **Tasks Management**: Dual assignment model ("ALL" vs custom), deadline tracking with past-due detection, per-member tracking records with communication threads.
3. **Leaderboard / Ranking**: Bonus calculation via tag regex `[B:+X]`, multi-tier sorting, gold/silver/bronze podium badges, and 7-day trend history.
4. **AI Assistant**: Live context synthesis, Gemini 2.5 Flash invocation via Edge Function / client fallback, and agentic mutation execution (`executeAiAction`).
5. **Notes System**: Targeted and broadcast notes, bonus adjusters, in-place editing, and permission gates.

This complete inventory provides the exact specifications, Arabic copy, and state logic required for frontend implementation.

---

## 5. Verification Method

To independently verify the observations and code extractions in this report:

1. **Verify File Existence & Structure**:
   ```powershell
   Get-Item "c:\Users\aboha\Desktop\adminstrationsystem\legacy\index.html" | Select-Object Length, FullName
   ```
2. **Verify Page Containers**:
   ```powershell
   Select-String -Path "c:\Users\aboha\Desktop\adminstrationsystem\legacy\index.html" -Pattern 'id="page-'
   ```
3. **Verify Modal Declarations**:
   ```powershell
   Select-String -Path "c:\Users\aboha\Desktop\adminstrationsystem\legacy\index.html" -Pattern '<div class="modal'
   ```
4. **Verify Bonus Calculation Function**:
   ```powershell
   Select-String -Path "c:\Users\aboha\Desktop\adminstrationsystem\legacy\index.html" -Pattern 'getMemberTotalBonus' -Context 0, 10
   ```
5. **Verify AI Action Execution Logic**:
   ```powershell
   Select-String -Path "c:\Users\aboha\Desktop\adminstrationsystem\legacy\index.html" -Pattern 'function executeAiAction' -Context 0, 25
   ```
6. **Verify Excel Export/Import Routines**:
   ```powershell
   Select-String -Path "c:\Users\aboha\Desktop\adminstrationsystem\legacy\index.html" -Pattern 'function exportToExcel|function importFromExcel'
   ```
