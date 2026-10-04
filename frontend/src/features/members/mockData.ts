import type { Member } from '../../types/db';

export const mockMembers: Member[] = Array.from({ length: 24 }).map((_, i) => ({
  id: i + 1,
  created_at: new Date().toISOString(),
  email: `user${i + 1}@wasla.com`,
  full_name: `عضو تجريبي طويل الاسم جدا لاختبار الانقسام والالتفاف رقم ${i + 1}`,
  phone: i % 2 === 0 ? '01001234567' : null,
  residence: i % 3 === 0 ? 'محافظة الإسكندرية - قسم المنتزه - شارع طويل جداً متفرع من شارع آخر' : 'القاهرة',
  work_conditions: i % 2 === 0 ? 'صباحي' : 'مسائي',
  bio: `التخصص: برمجة وتطوير الواجهات - ملاحظات: هذا النص طويل جداً جداً ويهدف إلى اختبار كيف سيتعامل الجدول مع النصوص الطويلة جداً التي لا تنتهي وتأخذ مساحة كبيرة جداً جداً في العرض مما قد يسبب تشوهات في التصميم إذا لم يتم التعامل معها بشكل صحيح ومناسب باستخدام القص وغيرها من الطرق.`,
  device: i % 3 === 0 ? 'لابتوب، موبايل، تابلت' : i % 2 === 0 ? 'لابتوب' : 'بدون جهاز',
  gender: i % 2 === 0 ? 'ذكر' : 'أنثى',
  meeting_attendance: String(Math.floor(Math.random() * 10)),
  completion_rank: Math.floor(Math.random() * 100),
  work_status: i % 4 === 0 ? 'inactive' : 'active',
  can_go_alexandria: i % 3 === 0,
  team_notes: 'ملاحظة إضافية للفريق.',
  role: 'MEMBER'
}));
