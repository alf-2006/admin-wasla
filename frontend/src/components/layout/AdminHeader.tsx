import { Moon, Sun } from 'lucide-react';

const pageTitles: Record<string, string> = {
  '/admin': 'لوحة التحكم',
  '/admin/dashboard': 'لوحة التحكم',
  '/admin/members': 'دليل الأعضاء',
  '/admin/tasks': 'المهام والتكليفات',
  '/admin/ranking': 'ترتيب الفريق',
  '/admin/notes': 'الملاحظات والتوجيهات',
  '/admin/ai-assistant': 'مساعد وصلة الذكي',
  '/admin/whatsapp': 'إرسال المهام عبر واتساب',
};

interface AdminHeaderProps {
  path: string;
  userName: string;
  isDark: boolean;
  onToggleTheme: () => void;
}

export function AdminHeader({ path, userName, isDark, onToggleTheme }: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-[var(--z-sticky)] flex h-[calc(var(--header-h)+env(safe-area-inset-top))] items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 pt-[env(safe-area-inset-top)] sm:px-6">
      <div className="min-w-0 text-start">
        <p className="truncate text-xs font-semibold text-[var(--text-muted)] sm:text-sm">
          مرحبًا، <span dir="ltr" className="inline-block">{userName}</span>
        </p>
        <h1 className="truncate text-base font-black sm:text-lg">{pageTitles[path] ?? pageTitles['/admin']}</h1>
      </div>
      <button type="button" onClick={onToggleTheme} className="grid size-11 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--link)] transition-colors hover:bg-[var(--surface-2)]" aria-label={isDark ? 'تفعيل المظهر الفاتح' : 'تفعيل المظهر الداكن'}>
        {isDark ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}
      </button>
    </header>
  );
}
