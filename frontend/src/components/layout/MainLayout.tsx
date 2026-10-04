import { Outlet, useLocation } from 'react-router-dom';
import { AdminHeader } from './AdminHeader';
import { AppSidebar, useSidebarDrawer } from './AppSidebar';
import { useAuthStore } from '../../store/auth';
import { useThemeStore } from '../../store/theme';

export default function MainLayout() {
  const user = useAuthStore((state) => state.user);
  const { theme, toggle } = useThemeStore();
  const { pathname } = useLocation();
  const { drawerOpen, openDrawer, closeDrawer } = useSidebarDrawer();
  const userName = (user?.user_metadata?.full_name as string | undefined)
    || user?.email?.split('@')[0]
    || 'المسؤول الإداري';

  return (
    <div className="flex min-h-[100dvh] bg-[var(--bg)] text-[var(--text)]" dir="rtl">
      <AppSidebar userName={userName} drawerOpen={drawerOpen} onCloseDrawer={closeDrawer} />
      <div className="flex min-w-0 flex-1 flex-col min-h-[100dvh]">
        <AdminHeader path={pathname} userName={userName} isDark={theme === 'dark'} drawerOpen={drawerOpen} onToggleTheme={toggle} onOpenMenu={openDrawer} />
        <main className="mx-auto w-full max-w-[var(--content-max)] flex-1 px-4 py-4 md:px-6 md:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
