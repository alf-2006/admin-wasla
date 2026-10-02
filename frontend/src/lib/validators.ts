/**
 * مكتبة التحقق من صحة البيانات
 * Validation utilities for Wasla Tech System
 */

/**
 * التحقق من صحة البريد الإلكتروني
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const trimmed = email.trim();
  
  // فحص إضافي للأمان
  if (trimmed.length > 254) return false; // RFC 5321
  if (trimmed.includes('..')) return false; // نقطتين متتاليتين غير مسموح
  
  return emailRegex.test(trimmed);
}

/**
 * التحقق من رقم الهاتف المصري
 */
export function isValidEgyptianPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  
  const cleaned = phone.replace(/[\s\-()]/g, '');
  
  // أرقام مصرية: تبدأ بـ 01 وطولها 11 رقم
  const egyptianMobileRegex = /^(010|011|012|015)\d{8}$/;
  // أو رقم دولي +20
  const internationalRegex = /^\+20(10|11|12|15)\d{8}$/;
  
  return egyptianMobileRegex.test(cleaned) || internationalRegex.test(cleaned);
}

/**
 * تنظيف النصوص من المحارف الخطرة (XSS prevention)
 */
export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .replace(/[<>]/g, '') // إزالة علامات HTML
    .replace(/javascript:/gi, '') // إزالة JavaScript protocols
    .replace(/on\w+=/gi, '') // إزالة event handlers
    .trim();
}

/**
 * التحقق من قوة كلمة المرور
 */
export function checkPasswordStrength(password: string): {
  score: number;
  feedback: string;
  isStrong: boolean;
} {
  if (!password) return { score: 0, feedback: 'كلمة المرور فارغة', isStrong: false };
  
  let score = 0;
  const feedback: string[] = [];
  
  // الطول
  if (password.length >= 8) score += 1;
  else feedback.push('يجب أن تكون 8 أحرف على الأقل');
  
  if (password.length >= 12) score += 1;
  
  // أحرف كبيرة وصغيرة
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  else feedback.push('استخدم أحرف كبيرة وصغيرة');
  
  // أرقام
  if (/\d/.test(password)) score += 1;
  else feedback.push('أضف أرقام');
  
  // رموز خاصة
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
  else feedback.push('أضف رموز خاصة');
  
  const isStrong = score >= 4;
  const feedbackText = isStrong ? 'كلمة مرور قوية' : feedback.join('، ');
  
  return { score, feedback: feedbackText, isStrong };
}

/**
 * التحقق من صحة URL
 */
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * تحديد حد نصي (للعرض في الواجهة)
 */
export function truncate(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}
