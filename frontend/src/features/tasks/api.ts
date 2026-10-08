// =====================================================
// طبقة بيانات المهام — Online-First صارمة
// لا قاعدة ظل. لا سقوط صامت. الاعتماد إداري (الخادم يفرضه بالـ Trigger).
// =====================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase/client';
import { toAppError } from '../../lib/supabase/errors';
import { TABLES } from '../../types/db';
import type { Task, TaskInsert, TaskStatus, TaskTrackingEntry } from '../../types/db';
import { getDeviceToken } from '../../store/auth';
import { isPositiveId, safeHref } from '../../lib/validators';

/** الحالات المسموحة من بوابة الأعضاء — approved لا تمر من هنا أبداً */
const MEMBER_WRITABLE_STATUSES: TaskStatus[] = ['pending', 'in_progress', 'under_review', 'revision_requested'];

export const useTasks = () => {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.tasks)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw toAppError(error, 'حدث خطأ أثناء تحميل المهام.');
      return (data ?? []) as Task[];
    },
  });
};

export const useCreateTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (newTask: TaskInsert) => {
      const { data, error } = await supabase
        .from(TABLES.tasks)
        .insert(newTask)
        .select()
        .single();
      if (error) throw toAppError(error, 'فشل إنشاء المهمة.');
      return data as Task;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
};

/** تفويض عضو لحالة داخل تتبع المهمة (tracking JSONB) */
const buildTrackingPatch = (
  currentTracking: Record<string, TaskTrackingEntry>,
  memberId: number,
  entry: TaskTrackingEntry
): Record<string, TaskTrackingEntry> => ({
  ...currentTracking,
  [memberId.toString()]: {
    ...currentTracking[memberId.toString()],
    ...entry,
    updated_at: new Date().toISOString(),
  },
});

export const useUpdateTaskStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      taskId,
      memberId,
      status,
      note,
      submissionUrl,
    }: {
      taskId: number;
      memberId: number;
      status: TaskStatus;
      note?: string;
      submissionUrl?: string;
      currentTracking?: Record<string, TaskTrackingEntry>;
    }) => {
      // تحقق client-side (الدفاع الحقيقي في submit_task_status server-side)
      if (!isPositiveId(taskId) || !isPositiveId(memberId)) {
        throw new Error('معرّفات المهمة أو العضو غير صالحة.');
      }
      if (!MEMBER_WRITABLE_STATUSES.includes(status)) {
        throw new Error('حالة المهمة غير مسموحة.');
      }
      const cleanNote = (note || '').slice(0, 2000);
      const rawUrl = (submissionUrl || '').trim().slice(0, 2048);
      if (rawUrl && !safeHref(rawUrl)) {
        throw new Error('رابط التسليم غير صالح — يجب أن يبدأ بـ http:// أو https://.');
      }
      // الخادم يرقّع مفتاح هذا العضو فقط بعد التحقق من جهازه وتكليفه —
      // لا نرسل tracking كاملاً من العميل (منع الكتابة فوق مفاتيح الآخرين).
      const { error } = await supabase.rpc('submit_task_status', {
        p_task_id: taskId,
        p_member_id: memberId,
        p_device_token: getDeviceToken(),
        p_status: status,
        p_note: cleanNote,
        p_submission_url: rawUrl,
      });

      if (error) throw toAppError(error, 'فشل تحديث حالة المهمة.');
      const { data, error: fetchError } = await supabase
        .from(TABLES.tasks)
        .select('*')
        .eq('id', taskId)
        .single();
      if (fetchError) throw toAppError(fetchError, 'فشل تحديث حالة المهمة.');
      return data as Task;
    },
    // تحديث تفاؤلي يشعر العضو بفورية تسليمه، مع تراجع عند الفشل
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ['tasks'] });
      const prev = qc.getQueryData<Task[]>(['tasks']);
      const optimisticTracking = buildTrackingPatch(vars.currentTracking ?? {}, vars.memberId, {
        status: vars.status,
        note: vars.note || '',
        submission_url: vars.submissionUrl || '',
        updated_at: new Date().toISOString(),
      });
      qc.setQueryData<Task[]>(['tasks'], (old) =>
        old?.map((t) => (t.id === vars.taskId ? { ...t, tracking: optimisticTracking } : t)) ?? []
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['tasks'], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
};

/**
 * اعتماد تسليم عضو + منحه نقاطاً — ذرّياً عبر RPC واحدة.
 * migration 0003: approve_task_submission تحدّث tasks.tracking و members.completion_rank
 * في معاملة PostgreSQL واحدة — لا احتمال لاعتماد بدون نقاط أو العكس.
 */
export const useApproveTaskSubmission = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      taskId,
      memberId,
      bonus = 0,
    }: {
      taskId: number;
      memberId: number;
      bonus?: number;
    }) => {
      const { data, error } = await supabase
        .rpc('approve_task_submission', { p_task_id: taskId, p_member_id: memberId, p_bonus: bonus })
        .single();

      if (error) throw toAppError(error, 'فشل تسجيل الاعتماد على المهمة.');
      return data;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['members'] });
    },
  });
};

export const useDeleteTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: number) => {
      const { error } = await supabase.from(TABLES.tasks).delete().eq('id', taskId);
      if (error) throw toAppError(error, 'تعذر حذف المهمة.');
      return taskId;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
};
