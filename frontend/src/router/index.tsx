import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import MainLayout from '../components/layout/MainLayout';

const LoginPage = lazy(() => import('../features/auth/LoginPage'));
const AdminLoginPage = lazy(() => import('../features/auth/AdminLoginPage'));
const MemberPortalPage = lazy(() => import('../features/portal/MemberPortalPage'));
const DashboardPage = lazy(() => import('../features/dashboard/DashboardPage'));
const MembersPage = lazy(() => import('../features/members/MembersPage'));
const TasksPage = lazy(() => import('../features/tasks/TasksPage'));
const NotesPage = lazy(() => import('../features/notes/NotesPage'));
const RankingPage = lazy(() => import('../features/ranking/RankingPage'));
const AiAssistantPage = lazy(() => import('../features/ai-assistant/AiAssistantPage'));
const WhatsAppTasksPage = lazy(() => import('../features/whatsapp/WhatsAppTasksPage'));
const AnnouncementsPage = lazy(() => import('../features/admin/announcements/AnnouncementsPage'));

function PageFallback() {
  return <div className="grid min-h-40 place-items-center text-sm font-bold text-[var(--text-muted)]" role="status">جارٍ تحميل الصفحة...</div>;
}

function Page({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageFallback />}>{children}</Suspense>;
}

/** حارس لوحة الإدارة — ينتظر فحص الجلسة الأولي قبل الحسم */
function ProtectedAdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const ready = useAuthStore((s) => s.ready);
  // لا تحسم قبل اكتمال فحص supabase.auth.getSession — وإلا وَمَضت
  // إعادة التوجيه إلى تسجيل الدخول مع كل تحديث للصفحة
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]" dir="rtl">
        <span className="text-xs font-bold text-[var(--text-muted)] animate-pulse">
          جارٍ التحقق من الجلسة...
        </span>
      </div>
    );
  }
  if (!user) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

/** حارس بوابة الأعضاء */
function ProtectedMemberRoute({ children }: { children: React.ReactNode }) {
  const member = useAuthStore((s) => s.currentMember);
  if (!member) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** الجذر: وجّه الجلسات المحفوظة (تذكرني) مباشرة بدل رمي الجميع على الدخول */
function RootRedirect() {
  const member = useAuthStore((s) => s.currentMember);
  const user = useAuthStore((s) => s.user);
  const ready = useAuthStore((s) => s.ready);
  if (member) return <Navigate to="/portal" replace />;
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]" dir="rtl">
        <span className="text-xs font-bold text-[var(--text-muted)] animate-pulse">
          جارٍ التحقق من الجلسة...
        </span>
      </div>
    );
  }
  if (user) return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/login" replace />;
}

export const router = createBrowserRouter([
  // Member Portal Routes
  {
    path: '/',
    element: <RootRedirect />,
  },
  {
    path: '/login',
    element: <Page><LoginPage /></Page>,
  },
  {
    path: '/portal',
    element: (
      <ProtectedMemberRoute>
      <Page><MemberPortalPage /></Page>
      </ProtectedMemberRoute>
    ),
  },

  // Admin Portal Routes
  {
    path: '/admin/login',
    element: <Page><AdminLoginPage /></Page>,
  },
  {
    path: '/admin',
    element: (
      <ProtectedAdminRoute>
        <MainLayout />
      </ProtectedAdminRoute>
    ),
    children: [
      { index: true, element: <Page><DashboardPage /></Page> },
      { path: 'dashboard', element: <Page><DashboardPage /></Page> },
      { path: 'members', element: <Page><MembersPage /></Page> },
      { path: 'tasks', element: <Page><TasksPage /></Page> },
      { path: 'ranking', element: <Page><RankingPage /></Page> },
      { path: 'notes', element: <Page><NotesPage /></Page> },
      { path: 'announcements', element: <Page><AnnouncementsPage /></Page> },
      { path: 'ai-assistant', element: <Page><AiAssistantPage /></Page> },
      { path: 'whatsapp', element: <Page><WhatsAppTasksPage /></Page> },
    ],
  },

  // Fallback
  { path: '*', element: <Navigate to="/login" replace /> },
]);
