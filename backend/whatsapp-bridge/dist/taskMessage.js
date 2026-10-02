import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';
export function normalizePhone(raw) {
    let digits = raw.replace(/\D/g, '');
    if (digits.startsWith('00'))
        digits = digits.slice(2);
    if (digits.startsWith('01') && digits.length === 11)
        digits = `20${digits.slice(1)}`;
    return /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
}
export async function resolveTaskMessage(admin, taskId, memberId) {
    const client = createClient(config.supabaseUrl, config.supabaseAnonKey, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${admin.token}` } } });
    const [{ data: taskData, error: taskError }, { data: memberData, error: memberError }] = await Promise.all([
        client.from('tasks').select('id,title,has_deadline,deadline_date,assigned_to').eq('id', taskId).single(),
        client.from('members').select('id,full_name,phone,work_status').eq('id', memberId).single(),
    ]);
    const task = taskData;
    const member = memberData;
    if (taskError || !task)
        throw new Error('المهمة غير موجودة أو لا يمكن الوصول إليها.');
    if (memberError || !member)
        throw new Error('العضو غير موجود أو لا يمكن الوصول إليه.');
    const assigned = task.assigned_to === 'ALL' ? null : new Set((Array.isArray(task.assigned_to) ? task.assigned_to : []).map(String));
    if (member.work_status === 'inactive' || (assigned && !assigned.has(String(member.id))))
        throw new Error('يجب اختيار عضو نشط ومكلف بهذه المهمة.');
    if (!member.phone || !normalizePhone(member.phone))
        throw new Error('رقم العضو غير صالح. أضف رقمًا دوليًا من صفحة الأعضاء.');
    const due = task.has_deadline && task.deadline_date ? ` الموعد النهائي: ${task.deadline_date}.` : '';
    return { phone: normalizePhone(member.phone), memberName: member.full_name, taskTitle: task.title, text: `السلام عليكم ${member.full_name}، تم إسناد مهمة «${task.title}» إليك في وصلة.${due} يرجى متابعة المهمة من بوابة وصلة.` };
}
