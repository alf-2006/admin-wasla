// =====================================================
// مخزن الجلسة — مصدر واحد للحقيقة: supabase.auth
//
// سابقاً كانت الجلسة تُحفظ في مفتاح localStorage خاص (wasla_admin_session)
// بالتوازي مع تخزين supabase-js نفسه، فكان النسختان تنفصلان بعد أول
// تجديد Token — هنا نعتمد supabase.auth كمصدر وحيد ونرصد أحداثه.
//
// بوابة الأعضاء تبقى جلسة عميل (passwordless) كما في المخطط §8.1 —
// ترقيتها لـ Magic Link مدرجة في المرحلة 3 (Post-MVP).
// =====================================================
import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import type { Member } from '../types/db';
import { supabase } from '../lib/supabase/client';

interface AuthState {
  // Admin State
  user: User | null;
  session: Session | null;
  /** true عند اكتمال فحص الجلسة الأولي — يمنع وميض إعادة التوجيه */
  ready: boolean;
  /** جلسة Dev تجريبية (import.meta.env.DEV فقط) */
  mock: boolean;
  setSession: (session: Session | null) => void;
  setReady: () => void;
  setMockSession: (email: string) => void;
  clear: () => void;

  // Member Portal State
  currentMember: Member | null;
  setMember: (member: Member | null) => void;
  logoutMember: () => void;
}

const SAVED_MEMBER_KEY = 'wasla_member_session';

const getInitialMember = (): Member | null => {
  try {
    const raw = localStorage.getItem(SAVED_MEMBER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  ready: false,
  mock: false,

  setSession: (session) =>
    set({ session, user: session?.user ?? null, mock: false, ready: true }),
  setReady: () => set({ ready: true }),
  setMockSession: (email) =>
    set({
      mock: true,
      ready: true,
      session: {
        access_token: 'mock-token',
        token_type: 'bearer',
        expires_in: 0,
        expires_at: 0,
        refresh_token: '',
        user: {
          id: 'mock-admin-id',
          email,
          app_metadata: {},
          user_metadata: { full_name: 'مدير النظام (معاينة)' },
          aud: 'authenticated',
          created_at: new Date().toISOString(),
        } as unknown as User,
      } as unknown as Session,
      user: {
        id: 'mock-admin-id',
        email,
        app_metadata: {},
        user_metadata: { full_name: 'مدير النظام (معاينة)' },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      } as unknown as User,
    }),
  clear: () => set({ session: null, user: null, mock: false, ready: true }),

  currentMember: getInitialMember(),
  setMember: (member) => {
    if (member) {
      localStorage.setItem(SAVED_MEMBER_KEY, JSON.stringify(member));
    } else {
      localStorage.removeItem(SAVED_MEMBER_KEY);
    }
    set({ currentMember: member });
  },
  logoutMember: () => {
    localStorage.removeItem(SAVED_MEMBER_KEY);
    set({ currentMember: null });
  },
}));

// ---- المزامنة مع supabase.auth (المصدر الوحيد) ----
// الفحص الأولي ثم رصد كل الأحداث (SIGN_IN / TOKEN_REFRESHED / SIGNED_OUT)
supabase.auth.getSession().then(({ data }) => {
  useAuthStore.getState().setSession(data.session);
});

supabase.auth.onAuthStateChange((_event, session) => {
  const state = useAuthStore.getState();
  // جلسة المعاينة التجريبية (DEV) لا تلتهمها أحداث supabase
  if (state.mock) return;
  state.setSession(session);
});
