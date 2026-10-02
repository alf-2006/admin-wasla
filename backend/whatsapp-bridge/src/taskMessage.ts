import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';
import type { AdminRequest } from './adminAuth.js';

type TaskRecord = { id: number; title: string; has_deadline: boolean; deadline_date: string | null; assigned_to: string[] | string | null };
type MemberRecord = { id: number; full_name: string; phone: string | null; work_status: string | null };

export function normalizePhone(raw: string) {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('01') && digits.length === 11) digits = `20${digits.slice(1)}`;
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
}

export async function resolveTaskMessage(admin: AdminRequest, taskId: number, memberId: number, baseUrl: string) {
  const client = createClient(config.supabaseUrl, config.supabaseAnonKey, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${admin.token}` } } });
  const [{ data: taskData, error: taskError }, { data: memberData, error: memberError }] = await Promise.all([
    client.from('tasks').select('id,title,has_deadline,deadline_date,assigned_to').eq('id', taskId).single(),
    client.from('members').select('id,full_name,phone,work_status').eq('id', memberId).single(),
  ]);
  const task = taskData as TaskRecord | null;
  const member = memberData as MemberRecord | null;
  if (taskError || !task) throw new Error('المهمة غير موجودة أو لا يمكن الوصول إليها.');
  if (memberError || !member) throw new Error('العضو غير موجود أو لا يمكن الوصول إليه.');
  const assigned = task.assigned_to === 'ALL' ? null : new Set((Array.isArray(task.assigned_to) ? task.assigned_to : []).map(String));
  if (member.work_status === 'inactive' || (assigned && !assigned.has(String(member.id)))) throw new Error('يجب اختيار عضو نشط ومكلف بهذه المهمة.');
  if (!member.phone || !normalizePhone(member.phone)) throw new Error('رقم العضو غير صالح. أضف رقمًا دوليًا من صفحة الأعضاء.');
  const formatArabicDate = (iso: string) => {
    try {
      return new Intl.DateTimeFormat('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(iso));
    } catch {
      return iso;
    }
  };
  const due = task.has_deadline && task.deadline_date ? `\n\n📅 *الموعد النهائي المخطط للإنجاز:* ${formatArabicDate(task.deadline_date)}` : '';
  const text = `مرحباً بك ${member.full_name} 👋،\n\nنود إعلامك بأنه قد تم إسناد تكليف جديد إليك في منظومة وصلة بعنوان:\n📌 *«${task.title}»*${due}\n\nيرجى التكرم بالدخول إلى بوابة وصلة لمراجعة تفاصيل المهمة والبدء في التنفيذ:\n🔗 ${baseUrl}/login\n\nتمنياتنا لك بالتوفيق،\nفريق إدارة وصلة.`;
  return { phone: normalizePhone(member.phone)!, memberName: member.full_name, taskTitle: task.title, text };
}
