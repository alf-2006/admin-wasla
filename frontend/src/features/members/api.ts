// =====================================================
// طبقة بيانات الأعضاء — Online-First صارمة
// لا قاعدة ظل. لا سقوط صامت. الخطأ = isError في الواجهة.
// التحديثات التفاؤلية (Optimistic) مع تراجع تلقائي عند رفض الخادم.
// =====================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase/client';
import { toAppError } from '../../lib/supabase/errors';
import { TABLES } from '../../types/db';
import type { Member, MemberInsert, MemberUpdate } from '../../types/db';
import { getDeviceToken, setDeviceToken } from '../../store/auth';

/**
 * الأعمدة العامة المسموح للـ anon بقراءتها (مطابقة لـ GRANT في
 * backend/migrations/0009_member_device_binding.sql).
 * session_token مستبعد عمداً — يُدار server-side فقط ولا يُرجع لأي عميل.
 */
export const PUBLIC_MEMBER_COLUMNS =
  'id, created_at, email, full_name, completion_rank, bio, device, meeting_attendance, work_status, can_go_alexandria' as const;

/**
 * الحقول القابلة للكتابة عبر مسار الإدارة فقط.
 * أي حقل خارج هذه القائمة (session_token, push_subscription, id,
 * created_at, completion_rank) يُسقط بصمت قبل الإرسال لمنع
 * Mass Assignment / Privilege Escalation.
 */
export const MEMBER_WRITABLE_FIELDS = [
  'email',
  'full_name',
  'team_notes',
  'residence',
  'work_conditions',
  'bio',
  'phone',
  'device',
  'gender',
  'meeting_attendance',
  'work_status',
  'can_go_alexandria',
] as const;

type WritableUpdate = Partial<MemberInsert>;

export const sanitizeMemberUpdate = (member: MemberUpdate): WritableUpdate => {
  const clean: Record<string, unknown> = {};
  for (const field of MEMBER_WRITABLE_FIELDS) {
    if ((member as Record<string, unknown>)[field as string] !== undefined) {
      clean[field as string] = (member as Record<string, unknown>)[field as string];
    }
  }
  return clean as WritableUpdate;
};

const getMembers = async (): Promise<Member[]> => {
  const { data: sessionData } = await supabase.auth.getSession();
  const query = supabase.from(TABLES.members);

  if (sessionData.session) {
    const { data, error } = await query.select('*').order('full_name', { ascending: true });
    if (error) throw toAppError(error, 'حدث خطأ أثناء تحميل الأعضاء.');
    return data ?? [];
  }

  const { data, error } = await query
    .select(PUBLIC_MEMBER_COLUMNS)
    .order('full_name', { ascending: true });
  if (error) throw toAppError(error, 'حدث خطأ أثناء تحميل الأعضاء.');
  return (data ?? []) as Member[];
};

export const useMembers = () => {
  return useQuery({
    queryKey: ['members'],
    queryFn: getMembers,
  });
};

export const useAddMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (member: MemberInsert) => {
      // لا يُنشأ session_token/push_subscription من العميل — تُدار server-side فقط.
      const { session_token: _st, push_subscription: _ps, ...insertable } = member as MemberInsert & {
        session_token?: unknown;
        push_subscription?: unknown;
      };
      const { data, error } = await supabase
        .from(TABLES.members)
        .insert(insertable)
        .select()
        .single();
      if (error) throw toAppError(error, 'فشل إضافة العضو.');
      return data as Member;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['members'] }),
  });
};

export const useUpdateMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (member: MemberUpdate) => {
      const sanitized = sanitizeMemberUpdate(member);
      const { data, error } = await supabase
        .from(TABLES.members)
        .update(sanitized)
        .eq('id', member.id)
        .select()
        .single();
      if (error) throw toAppError(error, 'فشل تحديث بيانات العضو.');
      return data as Member;
    },
    // تحديث تفاؤلي: أظهر التغيير فوراً، وارْجِعه إن رفض الخادم
    onMutate: async (member: MemberUpdate) => {
      await qc.cancelQueries({ queryKey: ['members'] });
      const prev = qc.getQueryData<Member[]>(['members']);
      qc.setQueryData<Member[]>(['members'], (old) =>
        old?.map((m) => (m.id === member.id ? { ...m, ...member } : m)) ?? []
      );
      return { prev };
    },
    onError: (_err, _member, ctx) => {
      if (ctx?.prev) qc.setQueryData(['members'], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['members'] }),
  });
};

export const useDeleteMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from(TABLES.members).delete().eq('id', id);
      if (error) throw toAppError(error, 'تعذر حذف العضو.');
      return id;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['members'] }),
  });
};

export const useBulkUpsertMembers = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (members: MemberInsert[]) => {
      const { data, error } = await supabase
        .from(TABLES.members)
        .upsert(members, { onConflict: 'email' })
        .select();
      if (error) throw toAppError(error, 'فشل استيراد الدفعة — لم يُحفظ شيء.');
      return (data ?? []) as Member[];
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['members'] }),
  });
};

/**
 * البحث عن عضو ببريده — لتسجيل دخول بوابة الأعضاء.
 * يستخدم RPC محصورة (lookup_member_by_email) بدل SELECT مباشر.
 * تُرجع الأعمدة العامة فقط (بلا session_token) — رمز الجهاز يُحفظ
 * في مفتاح مستقل ويُمرر لكل RPC عضوية لاحقة لإثبات الملكية.
 */
export const fetchMemberByEmail = async (email: string, deviceToken?: string): Promise<Member | null> => {
  const cleanEmail = email.trim().toLowerCase();
  const { data, error } = await supabase
    .rpc('lookup_member_by_email', {
      p_email: cleanEmail,
      p_device_token: deviceToken || null,
    })
    .maybeSingle();

  if (error) {
    if (error.message.includes('DEVICE_CONFLICT')) {
      throw new Error('هذا الحساب مسجّل الدخول من متصفح أو جهاز آخر. يرجى تسجيل الخروج من الجهاز الأول ثم المحاولة مجدداً.');
    }
    throw toAppError(error, 'تعذر التحقق من البريد الإلكتروني.');
  }
  if (data && deviceToken) setDeviceToken(deviceToken);
  return (data as Member | null) ?? null;
};

export const logoutMemberDevice = async (memberId: number): Promise<void> => {
  await supabase.rpc('logout_member_device', {
    p_member_id: memberId,
    p_device_token: getDeviceToken(),
  });
};

/** جاهزية الميدان — خدمة ذاتية للعضو عبر RPC (عمود واحد، برمز الجهاز) */
export const updateMemberReadiness = async (memberId: number, canGo: boolean): Promise<boolean> => {
  const { data, error } = await supabase.rpc('update_member_readiness', {
    p_member_id: memberId,
    p_device_token: getDeviceToken() ?? '',
    p_can_go: canGo,
  });
  if (error) throw toAppError(error, 'تعذر تحديث حالة الاستعداد.');
  return data === true;
};
