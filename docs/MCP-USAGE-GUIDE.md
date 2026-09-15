# دليل استخدام MCP لتوفير التوكينات
## Wasla Administration System

**التاريخ:** 2026-09-11  
**الهدف:** تقليل استهلاك التوكينات من 30K+ إلى أقل من 5K للعمليات الشائعة

---

## 📊 التحليل الحالي

### استهلاك التوكينات الحالي:
- **index.html**: ~30,634 توكين (2627 سطر)
- **style.css**: ~8,000 توكين تقريباً
- **الإجمالي**: ~38K+ توكين لقراءة المشروع كاملاً

### المشكلة:
كل عملية تحليل أو تعديل تتطلب قراءة الملف الكامل، مما يستهلك التوكينات بشكل كبير.

---

## 🎯 استراتيجية التحسين باستخدام MCP

### 1. استخدام Supabase MCP بدلاً من قراءة الكود

#### ❌ الطريقة القديمة (تستهلك 30K توكين):
```javascript
// يتطلب قراءة كل index.html لفهم كود Supabase
const SUPABASE_URL = "...";
const SUPABASE_ANON_KEY = "...";
let sbClient = window.supabase.createClient(...);

async function dbFetchMembers() {
  const sb = getSupabase();
  const { data, error } = await sb.from("members").select("*");
  // ... 2000+ سطر من كود Supabase
}
```

#### ✅ الطريقة الجديدة مع MCP (تستهلك ~500 توكين):
```javascript
// استخدام MCP مباشرة بدون قراءة الكود
mcp__supabase__list_projects()
mcp__supabase__execute_sql({
  project_id: "mukqrnmveydxfphftlaq",
  query: "SELECT * FROM members ORDER BY id"
})
mcp__supabase__list_tables({
  project_id: "mukqrnmveydxfphftlaq",
  schemas: ["public"],
  verbose: true
})
```

**الفائدة:** توفير ~29,500 توكين (98% تقليل)

---

### 2. استخدام Context7 للحصول على التوثيق

#### ❌ الطريقة القديمة:
```javascript
// قراءة كل الكود لفهم كيفية استخدام Groq API
// أو البحث في الإنترنت (يستهلك توكينات كثيرة)
```

#### ✅ الطريقة الجديدة مع MCP:
```javascript
// الحصول على توثيق محدث لأي مكتبة
mcp__context7__resolve-library-id({
  libraryName: "Groq",
  query: "كيفية استخدام Groq API في JavaScript"
})

mcp__context7__query-docs({
  libraryId: "/groq/groq-js",
  query: "chat completion with system prompt"
})
```

**الفائدة:** 
- توثيق محدث دائماً
- توفير 5K-10K توكين من البحث والقراءة
- نتائج أدق ومحددة

---

### 3. استخدام GitHub MCP لإدارة الكود

#### ✅ أمثلة عملية:
```javascript
// 1. عرض الملفات المتغيرة بدون قراءة الكود الكامل
mcp__github__get_pull_request_files({
  owner: "waslateam",
  repo: "administration-system",
  pull_number: 1
})

// 2. إنشاء PR تلقائياً
mcp__github__create_pull_request({
  owner: "waslateam",
  repo: "administration-system",
  title: "تحسين: فصل JavaScript إلى ملفات منفصلة",
  head: "feature/refactor-js",
  base: "main",
  body: "## التغييرات\n- فصل app.js\n- إنشاء supabase-client.js\n\n## الفوائد\n- تقليل التوكينات 95%"
})

// 3. البحث في الكود بدون قراءته كاملاً
mcp__github__search_code({
  q: "SUPABASE_URL repo:waslateam/administration-system"
})
```

**الفائدة:** إدارة المشروع بدون قراءة الملفات الضخمة

---

### 4. فصل الملفات الكبيرة إلى Modules

#### الهيكلة المقترحة:
```
adminstrationsystem/
├── index.html (500 سطر فقط - HTML نظيف)
├── style.css (موجود)
├── js/
│   ├── app.js (المنطق الرئيسي)
│   ├── supabase-client.js (عمليات قاعدة البيانات)
│   ├── auth.js (نظام المصادقة)
│   ├── dashboard.js (لوحة التحكم)
│   ├── members.js (إدارة الأعضاء)
│   ├── ai-assistant.js (المساعد الذكي)
│   └── utils.js (وظائف مساعدة)
├── docs/
│   └── MCP-USAGE-GUIDE.md (هذا الملف)
└── .claude/
    └── mcp-config.json (إعدادات MCP)
```

#### الفوائد:
- **قراءة ملف واحد**: 200-500 توكين بدلاً من 30K
- **تعديلات أسرع**: تعديل ملف محدد فقط
- **صيانة أفضل**: كود منظم وسهل الفهم

---

## 🚀 أمثلة عملية للاستخدام

### مثال 1: إضافة عضو جديد

#### ❌ بدون MCP (30K توكين):
1. قراءة index.html كاملاً
2. البحث عن دالة `saveMember()`
3. فهم كود Supabase
4. إجراء التعديل

#### ✅ مع MCP (300 توكين):
```javascript
// فهم البنية مباشرة
mcp__supabase__list_tables({
  project_id: "mukqrnmveydxfphftlaq",
  schemas: ["public"],
  verbose: true
})

// إضافة عضو
mcp__supabase__execute_sql({
  project_id: "mukqrnmveydxfphftlaq",
  query: `
    INSERT INTO members (full_name, team, phone, device, can_go_alexandria, residence, work_status)
    VALUES ('اسم العضو', 'Wasla', '0100000000', 'لابتوب', true, 'الإسكندرية', 'شغال')
    RETURNING *
  `
})
```

**التوفير:** 29,700 توكين (99%)

---

### مثال 2: تحديث UI المساعد الذكي

#### ❌ بدون MCP:
```javascript
// قراءة 2627 سطر للعثور على كود AI Assistant
// البحث اليدوي في الكود
```

#### ✅ مع MCP:
```javascript
// 1. الحصول على توثيق Groq
mcp__context7__query-docs({
  libraryId: "/groq/groq-js",
  query: "streaming chat completion example"
})

// 2. قراءة القسم المحدد فقط
// باستخدام Grep بدلاً من Read الكامل
Grep({
  pattern: "ai-assistant|handleAiSubmit|groq",
  output_mode: "content",
  path: "index.html"
})
```

**التوفير:** 28K توكين (93%)

---

### مثال 3: إصلاح مشكلة في Supabase

#### ✅ باستخدام Sentry MCP + Supabase MCP:
```javascript
// 1. عرض الأخطاء الأخيرة
mcp__sentry__search_issues({
  organizationSlug: "wasla-team",
  query: "supabase connection error",
  limit: 5
})

// 2. تحليل السبب الجذري
mcp__sentry__analyze_issue_with_seer({
  issueUrl: "https://sentry.io/issues/..."
})

// 3. فحص إعدادات Supabase
mcp__supabase__get_project({
  id: "mukqrnmveydxfphftlaq"
})

// 4. اختبار الاتصال
mcp__supabase__execute_sql({
  project_id: "mukqrnmveydxfphftlaq",
  query: "SELECT 1 as test"
})
```

**الفائدة:** 
- تشخيص سريع بدون قراءة الكود
- إصلاح دقيق ومباشر
- توفير 25K+ توكين

---

## 📝 خطة التطبيق العملية

### المرحلة 1: الفصل الأساسي (يوم واحد)
- [ ] فصل كود Supabase إلى `js/supabase-client.js`
- [ ] فصل كود Auth إلى `js/auth.js`
- [ ] فصل كود AI Assistant إلى `js/ai-assistant.js`
- [ ] تحديث index.html ليكون HTML نظيف فقط

**التوفير المتوقع:** 70% من التوكينات

### المرحلة 2: دمج MCP (3 أيام)
- [ ] إعداد Supabase MCP في `.claude/settings.json`
- [ ] إعداد Context7 MCP للمكتبات
- [ ] إعداد GitHub MCP لإدارة الكود
- [ ] كتابة سكريبتات مساعدة

**التوفير المتوقع:** 90% من التوكينات

### المرحلة 3: التحسين المستمر (أسبوع)
- [ ] إضافة Sequential Thinking MCP للمشاكل المعقدة
- [ ] إضافة Playwright MCP لاختبار الواجهة
- [ ] توثيق جميع العمليات الشائعة
- [ ] إنشاء Templates للعمليات المتكررة

**التوفير النهائي:** 95%+ من التوكينات

---

## 🎓 أفضل الممارسات

### 1. استخدم MCP Tools المتخصصة أولاً
```javascript
// ✅ جيد
mcp__supabase__list_tables()

// ❌ تجنب
Read("index.html") // ثم البحث عن كود Supabase
```

### 2. اقرأ الأجزاء المحددة فقط
```javascript
// ✅ جيد - قراءة محددة
Read({
  file_path: "index.html",
  offset: 1800,
  limit: 100
})

// ❌ تجنب - قراءة كاملة
Read("index.html")
```

### 3. استخدم Grep بدلاً من Read للبحث
```javascript
// ✅ جيد - بحث سريع
Grep({
  pattern: "handleAiSubmit",
  output_mode: "content",
  context: 5
})

// ❌ تجنب
Read("index.html") // ثم البحث يدوياً
```

### 4. استخدم Context7 للتوثيق
```javascript
// ✅ جيد - توثيق محدث
mcp__context7__query-docs({
  libraryId: "/supabase/supabase",
  query: "authentication with magic link"
})

// ❌ تجنب
WebSearch("supabase auth tutorial") // نتائج غير محددة
```

---

## 📊 مقارنة الأداء

| العملية | بدون MCP | مع MCP | التوفير |
|---------|----------|--------|---------|
| قراءة المشروع | 38K توكين | 2K توكين | 95% |
| إضافة عضو | 30K توكين | 300 توكين | 99% |
| تحديث UI | 30K توكين | 1K توكين | 97% |
| إصلاح Bug | 35K توكين | 2K توكين | 94% |
| استعلام DB | 30K توكين | 200 توكين | 99.3% |

**متوسط التوفير: 96.8%**

---

## 🔧 إعداد MCP في المشروع

### ملف `.claude/mcp-config.json`:
```json
{
  "mcpServers": {
    "supabase": {
      "project_id": "mukqrnmveydxfphftlaq",
      "default_schemas": ["public"],
      "auto_complete": true
    },
    "context7": {
      "enabled": true,
      "libraries": [
        "supabase/supabase-js",
        "groq/groq-js",
        "anthropic/anthropic-sdk-typescript"
      ]
    },
    "sequential-thinking": {
      "enabled": true,
      "max_thoughts": 20
    }
  }
}
```

---

## 💡 نصائح إضافية

### للمطورين:
1. **دائماً جرب MCP أولاً** قبل قراءة الملفات الكبيرة
2. **استخدم التوكينات المحفوظة** في التفكير والتحليل
3. **وثق استخدامات MCP الشائعة** في مشروعك

### للمديرين:
1. **قياس التوفير**: راقب استهلاك التوكينات قبل وبعد
2. **تدريب الفريق**: على استخدام MCP بكفاءة
3. **تحديث مستمر**: للاستفادة من MCP Tools الجديدة

---

## 📚 موارد إضافية

- [Supabase MCP Documentation](https://supabase.com/docs/guides/ai)
- [Context7 API Guide](https://context7.dev/docs)
- [Claude MCP Guide](https://docs.anthropic.com/en/docs/mcp)
- [Sequential Thinking Patterns](https://github.com/anthropics/mcp-examples)

---

## ✅ الخلاصة

**استخدام MCP يوفر:**
- ✅ 95%+ من التوكينات
- ✅ سرعة تطوير أعلى
- ✅ كود أنظف ومنظم
- ✅ صيانة أسهل
- ✅ توثيق محدث دائماً

**الخطوة التالية:** ابدأ بفصل الملفات الكبيرة، ثم دمج MCP تدريجياً.

---

**تم إنشاء هذا الدليل في:** 2026-09-11  
**آخر تحديث:** 2026-09-11  
**الإصدار:** 1.0
