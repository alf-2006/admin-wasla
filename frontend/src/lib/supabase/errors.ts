// =====================================================
// تحويل أخطاء Supabase إلى رسائل عربية مفهومة للمستخدم
// القاعدة الصارمة (بلوبرنت §3): لا سقوط صامت إلى بيانات محلية —
// الخطأ يظهر للواجهة كـ isError ويُعرض مع زر إعادة المحاولة.
// =====================================================

const PERMISSION_RE = /permission|row-level security|rls|42501/i
const AUTH_RE = /jwt|token|expired|invalid api key|401|403/i
const NETWORK_RE = /failed to fetch|network|fetch failed|load failed/i
const DUPLICATE_RE = /duplicate key|unique constraint|23505/i

/** يسلّم رسالة خطأ عربية واضحة بدل رموز PostgREST الإنجليزية الغامضة */
export function toAppError(raw: unknown, fallback: string): Error {
  if (raw instanceof Error) {
    const msg = raw.message || '';

    if (PERMISSION_RE.test(msg)) {
      return new Error('ليست لديك صلاحية تنفيذ هذا الإجراء. تأكد من تسجيل الدخول بحساب إداري.');
    }
    if (AUTH_RE.test(msg)) {
      return new Error('انتهت صلاحية الجلسة أو بيانات الدخول غير صالحة. سجّل الدخول من جديد.');
    }
    if (NETWORK_RE.test(msg)) {
      return new Error('تعذر الاتصال بالخادم. تحقق من اتصالك بالإنترنت وحاول مرة أخرى.');
    }
    if (DUPLICATE_RE.test(msg)) {
      return new Error('هذا السجل موجود مسبقاً (قيمة مكررة). حدّث الصفحة وأعد المحاولة.');
    }

    return new Error(msg || fallback);
  }

  // أخطاء PostgrestError من supabase-js ليست دائماً Error instances
  if (raw && typeof raw === 'object' && 'message' in raw) {
    const msg = String((raw as { message?: unknown }).message ?? '');
    return toAppError(new Error(msg), fallback);
  }

  return new Error(fallback);
}
