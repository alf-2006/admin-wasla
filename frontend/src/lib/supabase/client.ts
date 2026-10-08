import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../types/db';

// متغيرات env قد تكون غائبة — نمثلها بأمانة (string | undefined) ثم نفرق
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)
  ?? 'https://placeholder.supabase.co';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)
  ?? 'placeholder-anon-key';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  // تنبيه واضح للمطور بدل فشل صامت
  console.warn(
    '[supabase] مفاتيح Supabase غير مضبوطة.\n' +
    'أنشئ ملف .env.local في frontend/ وأضف:\n' +
    'VITE_SUPABASE_URL=...\nVITE_SUPABASE_ANON_KEY=...'
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // تقليل أثر سرقة الجلسة: نخزن جلسة Supabase في sessionStorage بدل localStorage.
    // supabase-js يتوقع كائن Storage-like.
    storage: {
      getItem: (key: string) => {
        try {
          return sessionStorage.getItem(key);
        } catch {
          return null;
        }
      },
      setItem: (key: string, value: string) => {
        try {
          sessionStorage.setItem(key, value);
        } catch {
          // ignore
        }
      },
      removeItem: (key: string) => {
        try {
          sessionStorage.removeItem(key);
        } catch {
          // ignore
        }
      },
    } as any,
  },
});
