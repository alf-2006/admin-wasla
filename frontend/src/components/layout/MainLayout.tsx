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
    <div className="flex min-h-dvh flex-col bg-[var(--bg)] text-[var(--text)] lg:flex-row" dir="rtl">
      <AppSidebar userName={userName} drawerOpen={drawerOpen} onCloseDrawer={closeDrawer} />
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <AdminHeader path={pathname} userName={userName} isDark={theme === 'dark'} onToggleTheme={toggle} onOpenMenu={openDrawer} />
        <main className="mx-auto w-full max-w-[var(--content-max)] flex-1 px-4 pt-5 sm:px-6 sm:pt-6 lg:px-8 pb-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
