import { LogOut, Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../../store/theme';

export function PortalHeader({ onLogout }: { onLogout: () => void }) {
  const { theme, toggle } = useThemeStore();
  return (
    <header className="sticky top-0 z-[var(--z-sticky)] flex min-h-[calc(var(--header-h)+env(safe-area-inset-top))] items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 pt-[env(safe-area-inset-top)] sm:px-6">
      <div className="flex items-center gap-3"><img src="/wasla-logo.png" alt="" className="size-9 object-contain" /><div><strong className="block font-black">وصلة تك</strong><span className="text-xs text-[var(--text-muted)]">بوابة أعضاء الفريق</span></div></div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={toggle} className="grid size-11 place-items-center rounded-xl border border-[var(--border)] text-[var(--link)]" aria-label={theme === 'dark' ? 'تفعيل المظهر الفاتح' : 'تفعيل المظهر الداكن'}>{theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}</button>
        <button type="button" onClick={onLogout} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] px-3 text-sm font-bold text-[var(--text-2)] hover:bg-[var(--surface-2)]"><LogOut size={17} aria-hidden="true" /><span>خروج</span></button>
      </div>
    </header>
  );
}
