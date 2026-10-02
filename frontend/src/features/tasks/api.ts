// =====================================================
// طبقة بيانات المهام — Online-First صارمة
// لا قاعدة ظل. لا سقوط صامت. الاعتماد إداري (الخادم يفرضه بالـ Trigger).
// =====================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase/client';
import { toAppError } from '../../lib/supabase/errors';
import { TABLES } from '../../types/db';
import type { Task, TaskInsert, TaskStatus, TaskTrackingEntry } from '../../types/db';

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
      currentTracking = {},
    }: {
      taskId: number;
      memberId: number;
      status: TaskStatus;
      note?: string;
      submissionUrl?: string;
      currentTracking?: Record<string, TaskTrackingEntry>;
    }) => {
      const updatedTracking = buildTrackingPatch(currentTracking, memberId, {
        status,
        note: note || '',
        submission_url: submissionUrl || '',
      });

      const { data, error } = await supabase
        .from(TABLES.tasks)
        .update({ tracking: updatedTracking })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw toAppError(error, 'فشل تحديث حالة المهمة.');
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
