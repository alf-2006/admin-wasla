/**
 * معالج الأخطاء المركزي
 * Centralized error handling for better user experience
 */

import type { PostgrestError } from '@supabase/supabase-js';

export type AppError = {
  message: string;
};

/**
 * تحويل أخطاء Supabase إلى رسائل عربية واضحة.
 * لا تُرجع details/hint/code للواجهة — تسريب مخطط قاعدة البيانات
 * ورسائل PostgreSQL الخام للعميل مرفوض في الإنتاج.
 */
export function handleSupabaseError(error: PostgrestError | Error | unknown): AppError {
  // خطأ من PostgreSQL
  if (error && typeof error === 'object' && 'code' in error) {
    const pgError = error as PostgrestError;

    // أخطاء شائعة
    const errorMessages: Record<string, string> = {
      '23505': 'البريد الإلكتروني مُستخدم بالفعل',
      '23503': 'لا يمكن حذف هذا السجل لوجود بيانات مرتبطة به',
      '42501': 'لا تملك الصلاحية لتنفيذ هذا الإجراء',
      'PGRST116': 'لا يوجد صف يطابق هذا المعرّف',
      'PGRST301': 'انتهت صلاحية الجلسة - يرجى تسجيل الدخول مجدداً',
    };

    return {
      message: errorMessages[pgError.code] || 'حدث خطأ في قاعدة البيانات',
    };
  }
  
  // خطأ عادي من JavaScript
  if (error instanceof Error) {
    return {
      message: error.message || 'حدث خطأ غير متوقع',
    };
  }
  
  // خطأ غير معروف
  return {
    message: 'حدث خطأ غير متوقع',
  };
}

/**
 * تسجيل الأخطاء (يمكن ربطه بخدمة مثل Sentry)
 */
export function logError(error: unknown, context?: string): void {
  if (import.meta.env.DEV) {
    console.error(`[Error${context ? ` in ${context}` : ''}]:`, error);
  }
  
  // في Production: أرسل إلى خدمة تتبع الأخطاء
  // مثل Sentry أو LogRocket
  // Sentry.captureException(error, { tags: { context } });
}

/**
 * معالج عام للأخطاء مع toast notification
 */
export function showErrorToast(error: unknown, context?: string): void {
  logError(error, context);
  const appError = handleSupabaseError(error);
  // Toast مركزي بدل alert — يعمل حتى خارج React عبر zustand store
  import('../store/toast').then(({ toast }) => toast.error(appError.message)).catch(() => {
    // fallback نادر لو فشل تحميل المتجر
    console.error(appError.message);
  });
}
