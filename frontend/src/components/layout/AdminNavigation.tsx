import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Bot, CheckSquare, LayoutDashboard, LogOut, MessageCircle, MoreHorizontal,
  StickyNote, Trophy, Users, X,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth';
import { supabase } from '../../lib/supabase/client';

const primaryLinks = [
  { to: '/admin', label: 'الرئيسية', icon: LayoutDashboard, end: true },
  { to: '/admin/tasks', label: 'المهام', icon: CheckSquare },
  { to: '/admin/members', label: 'الأعضاء', icon: Users },
];

const extraLinks = [
  { to: '/admin/ranking', label: 'ترتيب الفريق', icon: Trophy },
  { to: '/admin/notes', label: 'الملاحظات', icon: StickyNote },
  { to: '/admin/ai-assistant', label: 'المساعد الذكي', icon: Bot },
  { to: '/admin/whatsapp', label: 'إرسال المهام عبر واتساب', icon: MessageCircle },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold transition-colors ${
    isActive ? 'bg-[var(--primary-soft)] text-[var(--link)]' : 'text-[var(--text-2)] hover:bg-[var(--surface-2)]'
  }`;

function SideNavigation({ onLogout }: { onLogout: () => void }) {
  return (
    <aside className="sticky top-0 z-[var(--z-sidebar)] hidden h-dvh shrink-0 flex-col border-e border-[var(--border)] bg-[var(--surface)] md:flex md:w-[var(--sidebar-rail-w)] lg:w-[var(--sidebar-w)]">
      <NavLink to="/admin" className="flex h-16 items-center gap-3 border-b border-[var(--border)] px-4" aria-label="وصلة تك">
        <img src="/wasla-logo.png" alt="" className="size-9 shrink-0 object-contain" />
        <span className="hidden text-sm font-black tracking-wide text-[var(--text)] lg:block">وصلة تك</span>
      </NavLink>
      <nav aria-label="التنقل الرئيسي" className="flex flex-1 flex-col gap-2 p-3">
        {primaryLinks.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} title={label} aria-label={label} className={linkClass}>
            <Icon className="size-5 shrink-0" aria-hidden="true" />
            <span className="hidden lg:inline">{label}</span>
          </NavLink>
        ))}
        {extraLinks.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} title={label} aria-label={label} className={linkClass}>
            <Icon className="size-5 shrink-0" aria-hidden="true" />
            <span className="hidden lg:inline">{label}</span>
          </NavLink>
        ))}
        <NavLink to="/portal" title="بوابة الأعضاء" aria-label="بوابة الأعضاء" className={linkClass}>
          <Users className="size-5 shrink-0" aria-hidden="true" />
          <span className="hidden lg:inline">بوابة الأعضاء</span>
        </NavLink>
      </nav>
      <button type="button" onClick={onLogout} title="تسجيل الخروج" aria-label="تسجيل الخروج" className={`${linkClass({ isActive: false })} m-3 text-[var(--danger)]`}>
        <LogOut className="size-5 shrink-0" aria-hidden="true" /><span className="hidden lg:inline">تسجيل الخروج</span>
      </button>
    </aside>
  );
}

function MoreSheet({ onClose, onLogout }: { onClose: () => void; onLogout: () => void }) {
  const sheetRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const controls = () => sheetRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;
      const items = controls();
      if (!items?.length) return;
      if (event.shiftKey && document.activeElement === items.item(0)) { event.preventDefault(); items.item(items.length - 1).focus(); }
      else if (!event.shiftKey && document.activeElement === items.item(items.length - 1)) { event.preventDefault(); items.item(0).focus(); }
    };
    sheetRef.current?.querySelector<HTMLElement>('button')?.focus();
    window.addEventListener('keydown', handleKey);
    return () => { window.removeEventListener('keydown', handleKey); previousFocus?.focus(); };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[var(--z-modal)] md:hidden" role="presentation">
      <button className="absolute inset-0 bg-slate-950/45" onClick={onClose} aria-label="إغلاق القائمة" />
      <section ref={sheetRef} role="dialog" aria-modal="true" aria-labelledby="more-title" className="absolute start-0 end-0 bottom-0 max-h-[90dvh] overflow-y-auto rounded-t-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-[var(--shadow-lg)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="more-title" className="text-lg font-black">المزيد</h2>
          <button type="button" onClick={onClose} className="grid size-11 place-items-center rounded-xl border border-[var(--border)]" aria-label="إغلاق"><X size={20} /></button>
        </div>
        <nav className="grid gap-2" aria-label="روابط إضافية">
          {extraLinks.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={onClose} className={linkClass}>
              <Icon size={19} aria-hidden="true" />{label}
            </NavLink>
          ))}
          <NavLink to="/portal" onClick={onClose} className={linkClass}>بوابة الأعضاء</NavLink>
          <button type="button" onClick={onLogout} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold text-[var(--danger)] hover:bg-red-50 dark:hover:bg-red-950/30">
            <LogOut size={19} aria-hidden="true" />تسجيل الخروج
          </button>
        </nav>
      </section>
    </div>
  );
}

export function AdminNavigation({ userName }: { userName: string }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const clear = useAuthStore((state) => state.clear);
  const navigate = useNavigate();

  const logout = async () => {
    await supabase.auth.signOut();
    clear();
    navigate('/admin/login');
  };

  return (
    <>
      <SideNavigation onLogout={() => void logout()} />
      <nav aria-label="التنقل الرئيسي" className="fixed start-0 end-0 bottom-0 z-[var(--z-bottom-nav)] grid h-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom))] grid-cols-5 border-t border-[var(--border)] bg-[var(--surface)] px-1 pb-[env(safe-area-inset-bottom)] md:hidden">
        {primaryLinks.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex flex-col items-center justify-center gap-1 text-[11px] font-bold ${isActive ? 'text-[var(--link)]' : 'text-[var(--text-muted)]'}`}>
            <Icon size={20} aria-hidden="true" /><span>{label}</span>
          </NavLink>
        ))}
        <button type="button" onClick={() => setMoreOpen(true)} className="flex min-h-11 flex-col items-center justify-center gap-1 text-[11px] font-bold text-[var(--text-muted)]" aria-haspopup="dialog" aria-expanded={moreOpen}>
          <MoreHorizontal size={20} aria-hidden="true" /><span>المزيد</span>
        </button>
      </nav>
      {moreOpen && <MoreSheet onClose={() => setMoreOpen(false)} onLogout={logout} />}
      <span className="sr-only">{userName}</span>
    </>
  );
}
