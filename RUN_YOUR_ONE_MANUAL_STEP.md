# خطوة التشغيل الوحيدة المطلوبة منك

> كل إصلاحات الكود اتنفذت بالكامل واتبنوا بنجاح. الخطوة دي **يدوية بالضرورة** لأن Supabase CLI مش مثبت على الجهاز، وتشغيل SQL على قاعدة بيانات إنتاجية مش حاجة أنفذها عنك بدون ما تعرف.

## الطريقة الأسهل (دقيقة واحدة)

1. افتح المتصفح على: https://supabase.com/dashboard/project/mukqrnmveydxfphftlaq/sql/new
2. افتح الملف: `backend/migrations/0003_atomic_approval_and_member_lookup.sql`
3. انسخ محتواه كله والصقه في SQL Editor واضغط **Run**.
4. هتلاقي رسالة نجاح: `Success. No rows returned`.

## إيه اللي الملف ده هيعمله؟

1. **يغلق تسريب بيانات الأعضاء** — سياسة RLS المفتوحة على `members` لـ anon تتشال، وتتستبدل بدالة `lookup_member_by_email` آمنة.
2. **يعمل اعتماد المهام ذرّياً** — دالة `approve_task_submission` تحدّث المهمة والنقاط في معاملة واحدة (مفيش احتمال اعتماد من غير نقاط).

## التحقق بعد التشغيل (اختياري لكن مستحسن)

شغّل في نفس SQL Editor:

```sql
-- لازم يرجع الدالتين
SELECT proname FROM pg_proc WHERE proname IN ('lookup_member_by_email','approve_task_submission');

-- لازم يرجع صفوف قليلة أو صفر (مفيش سياسة anon للـ SELECT)
SELECT policyname FROM pg_policies WHERE tablename='members' AND roles='{anon}';
```

لو الاستعلام التاني رجع صفوف: شيل السياسات دي يدوياً أو أعِد تشغيل الملف.

## لو مش هتعملها دلوقتي

المشروع هيشتغل عادي — بس الميزتين الأمنيتين مش هيبقوا فعّالين لحد ما تشغّل الـ SQL. الـ Frontend متجهز للاستدعاء الجديد وخلاص، فمفيش حاجة هتتكسر في الانتظار.
