# تقرير تسليم استكشاف بنية الواجهة الأمامية والوضع القائم (Explorer 2 Handoff)

- **المسار المستهدف:** `c:\Users\aboha\Desktop\adminstrationsystem\.agents\explorer_survey_2\handoff.md`
- **تاريخ المسح:** 2026-10-02T11:35:00Z
- **المستكشف:** المستكشف 2 (Frontend Architecture & Existing State Explorer)
- **الموجه (Parent):** `orchestrator_1` (`a70f8d5b-220d-49f6-934d-8952dd9521ed`)

---

## 1. Observation (الملاحظات المباشرة والأدلة)

### 1.1 بنية حزمة الواجهة الأمامية (`frontend/package.json`) والتبعيات الأساسية
من فحص `frontend/package.json`:
- **الإطار ونظام الحزم:** React `19.2.8` (`react`, `react-dom`) مع Vite `8.3.0` (`vite`).
- **إدارة المسارات:** React Router DOM `7.18.4` (`react-router-dom`).
- **التصميم والتنسيق:** Tailwind CSS `4.3.3` مع المعالجات الحديثة `@tailwindcss/vite` (`4.3.3`) و`@tailwindcss/postcss` (`4.3.3`).
- **إدارة الحالة ومزامنة الخادم:**
  - حالة العميل: Zustand `5.0.15` (`zustand`).
  - كاش واستعلامات الخادم: TanStack React Query `5.104.0` (`@tanstack/react-query`).
  - عميل قاعدة البيانات: Supabase JS `2.117.2` (`@supabase/supabase-js`).
- **المكتبات المساعدة ومعالجة البيانات:**
  - مكتبة إكسيل: SheetJS `xlsx` (`0.18.5`).
  - الأيقونات: `lucide-react` (`1.48.0`).
  - الرسوم البيانية: Recharts `3.10.1` (`recharts`).
  - رموز الاستجابة السريعة: `qrcode.react` (`4.2.0`).
  - التواريخ: `date-fns` (`4.4.0`) و`date-fns-tz` (`3.2.0`).
  - التحقق والفحص: `oxlint` (`1.81.0`) و`@playwright/test` (`1.63.0`).

### 1.2 بنية الخطوط والاتجاه والثيم العام (`frontend/index.html` و`frontend/src/index.css`)
- **الاتجاه:** مضبوط جذرياً كـ RTL: `<html lang="ar" dir="rtl">` في `frontend/index.html:2`.
- **الخط المعتمد:** `IBM Plex Sans Arabic` مستدعى في الرأس (`frontend/index.html:27`) ومُطبق كأساس في `frontend/src/index.css:21`:
  ```css
  font-family: "IBM Plex Sans Arabic", system-ui, sans-serif;
  ```
- **إدارة الثيم:** سمة `data-theme="light"` أو `data-theme="dark"` على عنصر `<html>` تُدار عبر `frontend/src/store/theme.ts`.
- **رموز التصميم المشتركة (`frontend/src/styles/tokens.css`):**
  - هوية وصلة البنفسجية الملكية: `--primary: #6d28d9` (الوضع الفاتح) و`--primary: #7c3aed` (الوضع الداكن).
  - درجات الخلفيات: `--bg: #f8f9fa` (فاتح) و`--bg: #0b0f19` (داكن)، `--surface: #fff` / `#111827`.
  - أهداف اللمس (Touch Targets): مُعرّفة صراحة كـ `--touch: 44px;`.
  - دعم تقليل الحركة: موجود في `frontend/src/index.css:74-83` عبر `@media (prefers-reduced-motion: reduce)`.

### 1.3 مسارات الراوتر وهيكل الصفحات (`frontend/src/router/index.tsx`)
تم رصد المسارات التالية:
1. المسار الجذري `/`: تحويل تلقائي إلى `/login` (`Navigate to="/login" replace`).
2. مسار تسجيل دخول الأعضاء `/login`: صفحة `LoginPage`.
3. مسار مساحة عمل العضو `/portal`: محمي بحارس `ProtectedMemberRoute` (يتحقق من وجود `currentMember` في `useAuthStore`).
4. مسار تسجيل دخول الإدارة `/admin/login`: صفحة `AdminLoginPage`.
5. مسار لوحة الإدارة `/admin`: محمي بحارس `ProtectedAdminRoute` (يتحقق من `supabase.auth.getSession()` ووجود `user`) ومغلف بتخطيط `MainLayout`:
   - `/admin` أو `/admin/dashboard`: صفحة `DashboardPage`.
   - `/admin/members`: صفحة `MembersPage`.
   - `/admin/tasks`: صفحة `TasksPage`.
   - `/admin/notes`: صفحة `NotesPage`.
   - `/admin/ai-assistant`: صفحة `AiAssistantPage`.
   - `/admin/whatsapp`: صفحة `WhatsAppTasksPage` (التي تعيد تصدير `WhatsAppQRPage`).
6. **فجوة رئيسية:** مسار ترتيب الأعضاء `/admin/ranking` غير مسجل إطلاقاً في `router/index.tsx`، على الرغم من تسجيل عنوانه في `frontend/src/components/layout/AdminHeader.tsx:8`:
   ```typescript
   '/admin/ranking': 'ترتيب الفريق',
   ```

### 1.4 تدفق تسجيل الدخول (Admin vs Member) والفصل الصارم
- **بوابة الأعضاء (`/login`):**
  - كود المصدر: `frontend/src/features/auth/LoginPage.tsx`.
  - آلية الدخول: بدون كلمة مرور (Passwordless). يبحث عن البريد الإلكتروني في جدول `members` عبر `fetchMemberByEmail`.
  - الامتثال لقواعد `GEMINI.md`: **لا يوجد أي رابط** ينقل إلى صفحة الإدارة على صفحة دخول الأعضاء.
  - حفظ الجلسة: تُحفظ في `localStorage` بالمفتاح `wasla_member_session` وفي كائن `currentMember` بمخزن `useAuthStore`.
- **بوابة الإدارة (`/admin/login`):**
  - كود المصدر: `frontend/src/features/auth/AdminLoginPage.tsx`.
  - آلية الدخول: بريد وكلمة مرور موثقة رسمياً عبر `supabase.auth.signInWithPassword`.
  - وضع المعاينة: يتضمن زر تجريبي خاص ببيئة التطوير `import.meta.env.DEV` (`setMockSession`).
  - حفظ الجلسة: معتمدة بالكامل على جلسة Supabase الرسمية مع رصد `onAuthStateChange`.

### 1.5 بنية المكونات وحالة الخدمات (`frontend/src/features/`)
1. **دليل الأعضاء (`features/members/`):**
   - يدعم عرض الجدول `MemberRows`، التصفية `MemberFilters`، الإضافة والتعديل `MemberEditor`، واستيراد/تصدير الإكسيل `MemberExcelActions` عبر `SheetJS`.
   - يدعم التحديثات التفاؤلية (Optimistic updates) والتراجع عند الخطأ في `api.ts`.
   - **نقص ملاحظ:** حقل الفريق (`team`) لا يمكن إدخاله أو تعديله في `MemberEditor.tsx` ولا توجد تصفية حسب الفريق في `MemberFilters.tsx`، ولا يُصدر في الإكسيل.
   - **نقص ملاحظ:** عدم وجود نافذة ملف شخصي تفصيلي (`MemberProfileModal`) كما كان متوفراً في النظام القديم (`openProfile(id)`).
2. **إدارة المهام (`features/tasks/`):**
   - بنية مطابقة للمخطط: إنشاء مهمة مع تعيين لعضو أو متعدد أو "كل الفريق" (`assigned_to: 'ALL'`).
   - دورة حياة كاملة: `pending` -> `in_progress` -> `under_review` -> `approved` / `revision_requested`.
   - تتبع JSONB لكل عضو `tracking[memberId]`.
   - اعتماد التسليمات `useApproveTaskSubmission` ومراجعتها `TaskReviewModal`.
3. **الملاحظات والتوجيهات (`features/notes/`):**
   - إنشاء وحذف واسترجاع الملاحظات `useNotes`، `useCreateNote`، `useDeleteNote`.
   - تصنيف عام وتصنيف موجه لعضو محدد.
   - حساب البونص يعتمد على الوسم `[B:+-X]` داخل نص الملاحظة.
4. **المساعد الذكي (`features/ai-assistant/`):**
   - متصل بـ Edge Function `wasla-ai` عبر `supabase.functions.invoke`.
   - يدعم اقتراح الإجراءات وتنفيذها (`create_task`، `update_member`، `add_note`، `assign_task`، `delete_member`).
   - ينقصه الرقائق السريعة (Quick prompt chips) التي كانت بارزة في النظام القديم.
5. **خدمة الواتساب (`features/whatsapp/`):**
   - يحتوي على كل من: `WhatsAppQRPage.tsx` (عميل الويب عبر QR) و`WhatsAppCloudPage.tsx` (Meta Cloud API الرسمي).
   - `WhatsAppTasksPage.tsx` يقوم بتصدير مسار الـ QR كمسار افتراضي حالياً.
   - واجهة الـ QR تتضمن: حالة الاتصال، عرض رمز QR مع انتهاء الصلاحية، أزرار إيقاف وفصل وإلغاء الجلسة، اختيار المهمة والأعضاء المؤهلين مع فحص أرقام الهواتف، نافذة تأكيد الإرسال `WhatsAppDispatch` مع إقرار موافقة الأعضاء ومعاينة نص الرسالة، وبطاقة تحذير سياسة واتساب ومخاطر حظر الحساب.
6. **بوابة العضو (`features/portal/`):**
   - عرض مهام العضو المخصصة له فقط أو العامة.
   - إمكانية بدء المهمة (`startTask`) وتسليمها مع رابط وملاحظات (`submitTask`).
   - تبديل جاهزية النزول الميداني (`can_go_alexandria`).

### 1.6 فحص البناء والأخطاء البرمجية (`npm run build` و`npm run lint`)
أظهر تنفيذ أمر `npm run build` في مجلد `frontend/` فشلاً بسبب ثلاثة أخطاء TypeScript:
```
src/features/dashboard/DashboardWidgets.tsx(32,72): error TS2322: Type '{ size: number; className: string; }' is not assignable to type 'IntrinsicAttributes & PolarChartProps<any> & { ref?: Ref<SVGSVGElement> | undefined; }'.
  Property 'size' does not exist on type 'IntrinsicAttributes & PolarChartProps<any> & { ref?: Ref<SVGSVGElement> | undefined; }'.
src/features/dashboard/DashboardWidgets.tsx(40,35): error TS6133: 'entry' is declared but its value is never read.
src/features/dashboard/metrics.ts(102,36): error TS2367: This comparison appears to be unintentional because the types '"pending" | "revision_requested"' and '"approved"' have no overlap.
```
- **سبب الخطأ 1:** في `DashboardWidgets.tsx:32`، تم استيراد `PieChart` من `recharts` بدلاً من `lucide-react` كأيقونة.
- **سبب الخطأ 2:** في `DashboardWidgets.tsx:40`، المتغير `entry` غير مستخدم داخل الـ map.
- **سبب الخطأ 3:** في `metrics.ts:102`، تم تضييق (narrowing) نوع `status` مسبقاً، فالمقارنة `status !== 'approved'` غير مقبولة برمجياً في TypeScript.

بينما أظهر `npm run lint` بنجاح عدم وجود أخطاء حرجة مع 3 تنبيهات خفيفة (متغيرات غير مستخدمة وescape زائد في regex).

### 1.7 فحص الالتزام بمبادئ التصميم وقواعد `GEMINI.md`
تم رصد مخالفات صريحة للقواعد والمبادئ المحظورة (Banned Patterns):
1. **التدرجات اللونية (Gradients - محظورة تماماً):**
   - `frontend/src/features/dashboard/DashboardPage.tsx:40`:
     `bg-gradient-to-br from-violet-950 via-purple-900 to-indigo-950`
   - `frontend/src/features/dashboard/DashboardWidgets.tsx:65`:
     `bg-gradient-to-br from-amber-400 to-amber-600`
   - `frontend/src/features/dashboard/DashboardWidgets.tsx:126`:
     `<linearGradient id="colorBonus"...>`
2. **الزجاجيات والضبابية (Glassmorphism / backdrop-blur - محظورة):**
   - `frontend/src/features/dashboard/DashboardPage.tsx:48`: `backdrop-blur-sm`
   - `frontend/src/components/layout/AdminHeader.tsx:23`: `backdrop-blur`
   - `frontend/src/components/layout/AdminNavigation.tsx:114`: `backdrop-blur`
   - `frontend/src/features/portal/PortalHeader.tsx:7`: `backdrop-blur`
   - `frontend/src/features/members/MembersPage.tsx:150`: `backdrop-blur-sm`
3. **الرموز التعبيرية (Emojis - محظورة تماماً "Strictly zero emojis anywhere"):**
   - `frontend/src/features/dashboard/DashboardWidgets.tsx:157`: الرمز `🌟`
   - `frontend/src/features/whatsapp/WhatsAppDispatch.tsx:27`: الرمز `📅`
   - `frontend/src/features/whatsapp/WhatsAppDispatch.tsx:28`: الرموز `👋` و`📌` و`🔗`
4. **أهداف اللمس (Touch Targets < 44px):**
   - `frontend/src/features/members/MemberRows.tsx:56-57`: أزرار تعديل وحذف العضو محددة بـ `w-8 h-8` (32px × 32px)، وهو أقل من الحد الأدنى 44px.

---

## 2. Logic Chain (سلسلة الاستنتاج المنطقي)

1. **الاستناد إلى الملاحظة 1.3 والملاحظة 1.5:**
   - مخطط المشروع (`PROJECT_BLUEPRINT.md §8.6`)، والطلب الأصلي (`ORIGINAL_REQUEST.md R1`)، والنظام القديم (`legacy/index.html:515`) جميعها تنص صراحة على وجود صفحة مستقلة لترتيب الفريق وتوزيع أوسمة المراكز الثلاثة الأولى (Podium) وجدول الترتيب وتعديل نقاط البونص.
   - حالياً، الكود يحسب البونص ويرتب الأعضاء داخل `features/dashboard/metrics.ts`، ويحتوي `AdminHeader.tsx` على العنوان `/admin/ranking: 'ترتيب الفريق'`، ولكن لا توجد صفحة `RankingPage.tsx` ولا مسار في الراوتر ولا رابط في القائمة الجانبية.
   - *الاستنتاج:* إضافة ميزة الترتيب تتطلب إنشاء مجلد `frontend/src/features/ranking/` يحتوي على `RankingPage.tsx` ومكونات منصة التتويج والجدول ونافذة تعديل النقاط، ثم تسجيل المسار `/admin/ranking` في `router/index.tsx` وربطه في `AdminNavigation.tsx` دون المساس بالمسارات الحالية.

2. **الاستناد إلى الملاحظة 1.4:**
   - نظام المصادقة مقسم بعناية ودقة: الإدارة على `/admin/login` باستخدام Supabase Auth، والأعضاء على `/login` بدون كلمة مرور، مع إخفاء رابط الإدارة تماماً عن الأعضاء.
   - *الاستنتاج:* دمج أي ميزة قديمة (مثل الترتيب أو المهام أو الملاحظات) يجب أن يلتزم بنفس هذا التقسيم، مع توفير عرض مدمج للقائمة في بوابة العضو كمكون استعراضي فقط (Read-only ranking snippet) كما ينص البلوبرنت §8.8.

3. **الاستناد إلى الملاحظة 1.6:**
   - خطأ البناء في `DashboardWidgets.tsx` ناتج عن تضارب في استيراد `PieChart` من `recharts` بدلاً من استيراد أيقونة مناسبة من `lucide-react`، وخطأ `metrics.ts` ناتج عن مقارنة منطقية زائدة بعد تضييق الأنواع في TypeScript.
   - *الاستنتاج:* يجب تصحيح هذه الأخطاء بدقة لجعل `tsc -b && vite build` يمر بنجاح تام بنسبة 0 أخطاء قبل تقديم التعديلات النهائية.

4. **الاستناد إلى الملاحظة 1.7 ومقارنتها بقواعد `design-principles.md` و`GEMINI.md`:**
   - القواعد تنص بوضوح لا يقبل التأويل:
     - منع التدرجات اللونية (Gradients).
     - منع تأثيرات الزجاج والضبابية (`backdrop-blur`).
     - منع الإيموجي نهائياً في الكود ونصوص الواجهة والرسائل.
     - ضمان حجم أهداف اللمس ألا يقل عن 44px.
   - *الاستنتاج:* يجب تنظيف الواجهات من التدرجات واستبدالها بألوان مسطحة واضحة من هوية وصلة، وحذف جميع الإيموجي من نصوص الواتساب ولوحة المعلومات، وتعديل أبعاد أزرار التفاعل لتكون 44px كحد أدنى.

5. **الاستناد إلى الملاحظة 1.5 بخصوص دليل الأعضاء والملاحظات:**
   - النظام القديم كان يعتمد بشدة على إظهار الفريق (`team`) وتصنيف الملاحظات ومنح البونص، وعرض نافذة منبثقة تفصيلية للملف الشخصي (`profile-modal`).
   - *الاستنتاج:* تعزيز `features/members/` بإضافة اختيار الفريق في نموذج الإضافة/التعديل والتصفية، وبناء مكون `MemberProfileModal`، ودعم زر إضافة بونص سريع في نموذج الملاحظات سيعيد التكافؤ الكامل بنسبة 100% مع النظام القديم.

---

## 3. Caveats (الافتراضات والمحددات)

1. **خدمة الواتساب عبر QR (`backend/whatsapp-bridge`):**
   - تم فحص الواجهة الأمامية للواتساب `WhatsAppQRPage.tsx` وتبين أنها مكتملة التصميم وتستعلم من `http://localhost:3030` عبر التوكن الإداري.
   - الافتراض: خادم الباك إند للـ QR سيوفر نفس نقاط النهاية `/v1/status`، `/v1/connect`، `/v1/disconnect`، `/v1/revoke`، `/v1/send-task` التي تتوقعها واجهة العميل.
2. **صلاحيات حسابات الأعضاء في قاعدة البيانات:**
   - بوابة الأعضاء تعتمد على القراءة والكتابة المقيدة (Anon RLS) لتحديث حقول التسليم وتعديل حالة الاستعداد. لم يتم فحص سياسات قاعدة بيانات Supabase الحية من هذا المنظور حيث تقع ضمن نطاق المستكشف 1 أو مرحلة الباك إند.
3. **تطبيق هوية وصلة مقابل لوحة ألوان `design-principles.md`:**
   - ملف `design-principles.md` يذكر لوحة افتراضية مقترحة (`#F4F1EA` و`#C8412B`)، بينما قاعدة مشروع وصلة في `GEMINI.md` تنص صراحة على:
     `Arabic-first RTL, mobile-first, IBM Plex Sans Arabic, lucide-react, light/dark themes, and Wasla's purple visual identity.`
   - التفسير المعتمد: الحفاظ على هوية وصلة البنفسجية الملكية المعتمدة في `tokens.css` مع تطبيق جميع المحظورات الصارمة من `design-principles.md` (منع التدرجات، منع الزجاجيات، منع الإيموجي، الالتزام بالشبكة اللامتناظرة والمسافات الهادئة).

---

## 4. Conclusion (التقييم النهائي وخطة التنفيذ)

الواجهة الأمامية في `frontend/` مبنية على أسس تقنية حديثة وممتازة (React 19 + Vite 8 + Tailwind v4 + React Router v7 + Zustand + React Query)، وهيكل الملفات منظم ومفصول بعناية.

لإتمام التكافؤ الكامل مع النظام القديم وتحقيق جميع شروط الاعتماد دون كسر أي مسارات أو إضافة تدفقات تسجيل دخول موازية، يجب على مرحلة التنفيذ اتخاذ الإجراءات التالية:

1. **إعادة بناء صفحة الترتيب والمتصدرين المفقودة (`/admin/ranking`):**
   - إنشاء المكونات في `frontend/src/features/ranking/`:
     - `RankingPage.tsx`: الصفحة الرئيسية للترتيب.
     - `RankingPodium.tsx`: بطاقات المراكز الثلاثة الأولى (ذهب، فضة، برونز) بأسلوب هادئ وخطوط مميزة بدون تدرجات أو إيموجي.
     - `RankingTable.tsx`: جدول ترتيب جميع الأعضاء مع إظهار الفريق، عدد المهام المكتملة، ونقاط البونص.
     - `BonusAdjustmentModal.tsx`: نافذة إدارية سريعة لمنح أو خصم نقاط تقييم لعضو مع كتابة ملاحظة توثيقية تلقائية بنمط `[B:+X]`.
   - تسجيل المسار `/admin/ranking` في `frontend/src/router/index.tsx`.
   - إضافة رابط "ترتيب الفريق" في `AdminNavigation.tsx`.

2. **استكمال عناصر دليل وجاهزية الأعضاء (`/admin/members`):**
   - إضافة حقل الفريق (`team`) إلى نموذج `MemberEditor.tsx`، وتضمينه في أعمدة `MemberRows.tsx`، وفلاتر `MemberFilters.tsx`، وتصدير الإكسيل `memberExcel.ts`.
   - إضافة نافذة عرض الملف الشخصي الكامل (`MemberProfileModal.tsx`) عند النقر على سطر العضو لعرض كافة مواصفات العتاد والجاهزية والملاحظات والبونص.

3. **إصلاح أخطاء البناء البرمجي (TypeScript Build Fixes):**
   - في `DashboardWidgets.tsx`: تصحيح استيراد أيقونة الرسم البياني، وحذف المعامل غير المستخدم `entry`.
   - في `metrics.ts`: ضبط منطق فحص انتهاء الموعد النهائي دون المقارنة غير المتطابقة للنوع لتمرير `tsc -b`.

4. **تطهير الواجهات من الأنماط المحظورة (Design Principles Compliance):**
   - استبدال التدرجات اللونية `bg-gradient-to-br` في `DashboardPage.tsx` و`DashboardWidgets.tsx` بألوان خلفيات مسطحة متسقة مع هوية وصلة (`var(--surface)` و`var(--primary)`).
   - إزالة جميع تأثيرات `backdrop-blur` واستبدالها بخلفيات صلبة أو ذات عتامة محددة دون تشويش.
   - حذف جميع الإيموجي (`🌟`, `👋`, `📌`, `📅`, `🔗`) من ملفات الواجهة والرسائل الجاهزة.
   - توسيع أبعاد أزرار الإجراءات في جداول الأعضاء إلى 44px كحد أدنى للامتثال لسهولة اللمس.

---

## 5. Verification Method (طرق التحقق المستقل)

يمكن لأي مستكشف أو مراجع أو وكيل مستقل التحقق من النتائج وتنفيذ الفحص عبر الخطوات التالية:

### 1. فحص البناء والأنواع البرمجية
تشغيل أمر البناء في مسار الواجهة الأمامية:
```powershell
cd c:\Users\aboha\Desktop\adminstrationsystem\frontend
npm run build
```
- **حالة التحقق الحالية:** يفشل حالياً بثلاثة أخطاء TS موضحة بالسطر ورقم الخطأ في القسم 1.6 أعلاه.
- **شرط النجاح بعد الإصلاح:** خروج الأمر بالكود `0` بدون أي أخطاء نوعية في `src/`.

### 2. فحص الفحص الإملائي والكود النظيف
تشغيل أداة oxlint:
```powershell
cd c:\Users\aboha\Desktop\adminstrationsystem\frontend
npm run lint
```
- **حالة التحقق:** يمر بالكود `0` مع 3 تحذيرات خفيفة.

### 3. فحص غياب المسار `/admin/ranking`
معاينة الملف:
`c:\Users\aboha\Desktop\adminstrationsystem\frontend\src\router\index.tsx`
- **الملاحظة المؤكدة:** لا يوجد أي تعريف للمسار `ranking` داخل مصفوفة المسارات للأدمن.

### 4. فحص الأنماط المحظورة
البحث بالكلمات المفتاحية عبر ripgrep:
- البحث عن التدرجات:
  `rg "bg-gradient|linearGradient" frontend/src`
- البحث عن الإيموجي:
  `rg "[\x{1F300}-\x{1F6FF}\x{1F900}-\x{1F9FF}\x{2600}-\x{26FF}\x{2700}-\x{27BF}]" frontend/src`
- البحث عن الضبابية:
  `rg "backdrop-blur" frontend/src`
- **شرط النجاح بعد التعديلات:** صفر نتائج لكافة الاستعلامات أعلاه.
