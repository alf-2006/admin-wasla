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

    const codeMessages: Record<string, string> = {
      ADMIN_APPROVAL_FORBIDDEN: 'الاعتماد للإدارة بس.',
      ADMIN_ONLY: 'الإجراء ده متاح للإدارة بس.',
      ALREADY_APPROVED: 'التسليم ده اتعتمد قبل كده، والنقاط مش هتتحسب تاني.',
      DEVICE_CONFLICT: 'الحساب ده مفتوح على جهاز تاني. اخرج منه هناك وجرّب تاني.',
      DEVICE_REQUIRED: 'رمز الجهاز مش صحيح. سجّل دخولك تاني.',
      INVALID_BONUS: 'البونص لازم يكون من 0 لـ 50.',
      INVALID_ID: 'المعرّف مش صحيح.',
      INVALID_MEMBER_ID: 'معرّف العضو مش صحيح.',
      INVALID_NOTE: 'الملاحظة طويلة أوي — أقصى حاجة 2000 حرف.',
      INVALID_STATUS: 'مينفعش تغيّر حالة المهمة للحالة دي من البوابة.',
      INVALID_SUBSCRIPTION: 'بيانات الاشتراك مش صحيحة.',
      INVALID_TASK_ID: 'معرّف المهمة مش صحيح.',
      INVALID_URL: 'رابط التسليم لازم يبدأ بـ http:// أو https://.',
      INVALID_VALUE: 'قيمة الجاهزية مش صحيحة.',
      MEMBER_NOT_FOUND: 'العضو ده مش موجود.',
      NOT_ASSIGNED: 'العضو ده مش متكلّف بالمهمة دي.',
      TASK_NOT_FOUND: 'المهمة دي مش موجودة.',
      UNAUTHORIZED: 'بيانات الدخول مش مطابقة. راجعها وجرّب تاني.',
    };
    const code = msg.match(/\b([A-Z_]{4,}):/)?.[1];
    if (code && codeMessages[code]) {
      return new Error(codeMessages[code]);
    }

    if (PERMISSION_RE.test(msg)) {
      return new Error('معندكش صلاحية تعمل الإجراء ده. اتأكد إنك داخل بحساب إداري.');
    }
    if (AUTH_RE.test(msg)) {
      return new Error('الجلسة انتهت أو بيانات الدخول مش صحيحة. سجل دخولك تاني.');
    }
    if (NETWORK_RE.test(msg)) {
      return new Error('معرفناش نتصل بالخادم. اتأكد من اتصالك بالإنترنت وجرّب تاني.');
    }
    if (DUPLICATE_RE.test(msg)) {
      return new Error('البيانات دي موجودة قبل كده. حدّث الصفحة وجرّب تاني.');
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
