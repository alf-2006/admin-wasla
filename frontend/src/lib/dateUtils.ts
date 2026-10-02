import { format, formatDistance, isValid, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';

/**
 * تنسيق التاريخ بالعربية
 * @param dateString - تاريخ ISO أو string
 * @param formatStr - صيغة التنسيق (افتراضي: dd MMMM yyyy)
 */
export function formatDate(dateString: string | null | undefined, formatStr = 'dd MMMM yyyy'): string {
  if (!dateString) return '—';
  
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
    if (!isValid(date)) return dateString;
    
    return format(date, formatStr, { locale: ar });
  } catch {
    return dateString;
  }
}

/**
 * تنسيق التاريخ والوقت بالعربية
 */
export function formatDateTime(dateString: string | null | undefined): string {
  return formatDate(dateString, 'dd MMMM yyyy - h:mm a');
}

/**
 * المسافة الزمنية النسبية (منذ 3 أيام، قبل ساعتين...)
 */
export function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
    if (!isValid(date)) return dateString;
    
    return formatDistance(date, new Date(), { 
      locale: ar, 
      addSuffix: true 
    });
  } catch {
    return dateString;
  }
}

/**
 * تحقق من انتهاء الموعد
 */
export function isOverdue(deadlineString: string | null | undefined): boolean {
  if (!deadlineString) return false;
  
  try {
    const deadline = typeof deadlineString === 'string' ? parseISO(deadlineString) : new Date(deadlineString);
    return isValid(deadline) && deadline < new Date();
  } catch {
    return false;
  }
}

/**
 * عدد الأيام المتبقية
 */
export function daysRemaining(deadlineString: string | null | undefined): number | null {
  if (!deadlineString) return null;
  
  try {
    const deadline = typeof deadlineString === 'string' ? parseISO(deadlineString) : new Date(deadlineString);
    if (!isValid(deadline)) return null;
    
    const diff = deadline.getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}
