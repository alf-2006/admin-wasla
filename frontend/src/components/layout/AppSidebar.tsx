import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Bot, CheckSquare, LayoutDashboard, LogOut, Megaphone, MessageCircle,
  StickyNote, Trophy, Users,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth';
import { supabase } from '../../lib/supabase/client';
import { Drawer } from '../ui/Drawer';

interface SidebarLink {
  to: string;
  label: string;
  icon: typeof Users;
  end?: boolean;
}

interface SidebarGroup {
  title: string;
  items: SidebarLink[];
}

const GROUPS: SidebarGroup[] = [
  { title: 'نظرة عامة', items: [{ to: '/admin', label: 'الرئيسية', icon: LayoutDashboard, end: true }] },
  {
    title: 'العمليات',
    items: [
      { to: '/admin/tasks', label: 'المهام', icon: CheckSquare },
      { to: '/admin/members', label: 'الأعضاء', icon: Users },
      { to: '/admin/ranking', label: 'ترتيب الفريق', icon: Trophy },
      { to: '/admin/notes', label: 'الملاحظات', icon: StickyNote },
    ],
  },
  {
    title: 'التواصل',
    items: [
      { to: '/admin/announcements', label: 'الإعلانات', icon: Megaphone },
      { to: '/admin/whatsapp', label: 'إرسال المهام عبر واتساب', icon: MessageCircle },
      { to: '/admin/ai-assistant', label: 'المساعد الذكي', icon: Bot },
    ],
  },
  { title: 'الحساب', items: [{ to: '/portal', label: 'بوابة الأعضاء', icon: Users }] },
];

function SidebarLinks({ onNavigate, railTips }: { onNavigate?: () => void; railTips?: boolean }) {
  return (
    <>
      {GROUPS.map((group) => (
        <div key={group.title}>
          <p className="app-sidebar-group-title" aria-hidden="true">{group.title}</p>
          <ul className="app-sidebar-group">
            {group.items.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  onClick={onNavigate}
                  title={label}
                  aria-label={label}
                  data-tip={railTips ? label : undefined}
                  className={({ isActive }) => `app-sidebar-item${isActive ? ' is-active' : ''}${railTips ? ' app-sidebar-tip' : ''}`}
                >
                  <Icon size={20} aria-hidden="true" />
                  <span className="app-sidebar-item-label">{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

export function AppSidebar({
  userName,
  drawerOpen,
  onCloseDrawer,
}: {
  userName: string;
  drawerOpen: boolean;
  onCloseDrawer: () => void;
}) {
  const clear = useAuthStore((state) => state.clear);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const closeRef = useRef(onCloseDrawer);
  closeRef.current = onCloseDrawer;

  // إغلاق الدرج عند التنقل
  useEffect(() => {
    closeRef.current();
  }, [pathname]);

  const logout = async () => {
    await supabase.auth.signOut();
    clear();
    onCloseDrawer();
    navigate('/admin/login');
  };

  return (
    <>
      <aside className="app-sidebar" aria-label="الشريط الجانبي">
        <NavLink to="/admin" className="app-sidebar-brand" aria-label="وصلة تك — الرئيسية">
          <img src="/wasla-logo.png" alt="" />
          <span>وصلة تك</span>
        </NavLink>
        <nav aria-label="التنقل الرئيسي" className="app-sidebar-nav">
          <SidebarLinks railTips />
        </nav>
        <div className="app-sidebar-footer">
          <button
            type="button"
            onClick={() => void logout()}
            title="تسجيل الخروج"
            aria-label="تسجيل الخروج"
            data-tip="تسجيل الخروج"
            className="app-sidebar-item app-sidebar-tip app-sidebar-logout"
          >
            <LogOut size={20} aria-hidden="true" />
            <span className="app-sidebar-item-label">تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      <Drawer isOpen={drawerOpen} onClose={onCloseDrawer} title="القائمة الرئيسية">
        <div className="app-drawer-user" aria-label="المستخدم الحالي">
          <span className="app-drawer-user-avatar" aria-hidden="true">
            {userName.trim().charAt(0) || 'م'}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-[var(--text)]">{userName}</p>
            <p className="text-xs font-bold text-[var(--text-muted)]">مدير النظام</p>
          </div>
        </div>
        <nav aria-label="التنقل الرئيسي" className="app-drawer-nav flex flex-col gap-4 py-4">
          <SidebarLinks onNavigate={onCloseDrawer} />
          <button
            type="button"
            onClick={() => void logout()}
            className="app-sidebar-item app-sidebar-logout app-drawer-nav"
          >
            <LogOut size={20} aria-hidden="true" />
            <span className="app-sidebar-item-label">تسجيل الخروج</span>
          </button>
          <span className="sr-only">{userName}</span>
        </nav>
      </Drawer>
      <span className="sr-only">{userName}</span>
    </>
  );
}

export function useSidebarDrawer() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  return {
    drawerOpen,
    openDrawer: () => setDrawerOpen(true),
    closeDrawer: () => setDrawerOpen(false),
  };
}
