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

/**
 * الأعمدة العامة المسموح للـ anon بقراءتها (مطابقة لـ GRANT في
 * backend/supabase_setup.sql). بوابة الأعضاء (غير المسجلة) تلتزم بها
 * حتى لا تفشل بحاجب الصلاحيات — الإدارة المسجلة تقرأ كل شيء
 * عبر نفس الـ hook لأنها تعمل بهوية authenticated.
 */
export const PUBLIC_MEMBER_COLUMNS =
  'id, created_at, email, full_name, team, completion_rank, bio, device, meeting_attendance, work_status, can_go_alexandria' as const;

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
      const { data, error } = await supabase
        .from(TABLES.members)
        .insert(member)
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
      const { id, ...rest } = member;
      const { data, error } = await supabase
        .from(TABLES.members)
        .update(rest)
        .eq('id', id)
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
 * يستخدم RPC محصورة (lookup_member_by_email) بدل SELECT مباشر:
 * سياسة anon المفتوحة على members أُغلقت في migration 0003،
 * فالبحث الوحيد الممكن هو عبر هذه الدالة التي تُرجع صفاً واحداً
 * بالأعمدة العامة فقط.
 * eq (وليس ilike) صراحةً: قيمة المستخدم قيمة مطابقة تماماً
 * وليست نمط LIKE — وإلا فـ "%" في حقل البريد تعني "أي بريد"!
 */
export const fetchMemberByEmail = async (email: string): Promise<Member | null> => {
  const cleanEmail = email.trim().toLowerCase();
  const { data, error } = await supabase
    .rpc('lookup_member_by_email', { p_email: cleanEmail })
    .maybeSingle();

  if (error) throw toAppError(error, 'تعذر التحقق من البريد الإلكتروني.');
  // العضو كائن جزئي بوابة (أعمدة عامة فقط) — الحقول الشخصية مقصودة خارجاً
  return (data as Member | null) ?? null;
};
