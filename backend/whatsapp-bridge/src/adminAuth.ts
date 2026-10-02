import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';

export type AdminRequest = { token: string; email: string };

export async function requireAdmin(authorization: string | undefined): Promise<AdminRequest> {
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new Error('يلزم تسجيل دخول الإدارة.');
  const client = createClient(config.supabaseUrl, config.supabaseAnonKey, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data, error } = await client.auth.getUser(token);
  const email = data.user?.email?.toLowerCase();
  if (error || !email) throw new Error('جلسة الإدارة غير صالحة.');
  if (!config.adminEmails.includes(email)) throw new Error('هذا الحساب غير مخوّل لإدارة ربط واتساب.');
  return { token, email };
}
