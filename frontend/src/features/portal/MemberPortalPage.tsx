import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';
import { useTasks, useUpdateTaskStatus } from '../tasks/api';
import { useUpdateMember } from '../members/api';
import type { Task } from '../../types/db';
import { PortalHeader } from './PortalHeader';
import { MemberHero } from './MemberHero';
import { MemberTasks } from './MemberTasks';
import { SubmissionModal } from './SubmissionModal';

export default function MemberPortalPage() {
  const member = useAuthStore((state) => state.currentMember);
  const logoutMember = useAuthStore((state) => state.logoutMember);
  const navigate = useNavigate();
  const tasksQuery = useTasks();
  const updateTask = useUpdateTaskStatus();
  const updateMember = useUpdateMember();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [submissionNote, setSubmissionNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!member) return <Navigate to="/login" replace />;

  const memberId = String(member.id);
  const myTasks = (tasksQuery.data ?? []).filter((task) => {
    if (task.assigned_to === 'ALL') return true;
    return Array.isArray(task.assigned_to) && task.assigned_to.some((id) => String(id) === memberId);
  });

  const logout = () => {
    logoutMember();
    navigate('/login');
  };

  const startTask = async (task: Task) => {
    try {
      await updateTask.mutateAsync({ taskId: task.id, memberId: member.id, status: 'in_progress', currentTracking: task.tracking ?? {} });
    } catch (cause) {
      alert(cause instanceof Error ? cause.message : 'تعذر بدء المهمة — لم يتغير شيء.');
    }
  };

  const submitTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTask) return;
    setIsSubmitting(true);
    try {
      await updateTask.mutateAsync({
        taskId: selectedTask.id,
        memberId: member.id,
        status: 'under_review',
        submissionUrl: submissionUrl.trim(),
        note: submissionNote.trim(),
        currentTracking: selectedTask.tracking ?? {},
      });
      setSelectedTask(null);
      setSubmissionUrl('');
      setSubmissionNote('');
    } catch (cause) {
      alert(cause instanceof Error ? cause.message : 'تعذر تسليم المهمة — حاول مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleFieldReadiness = async () => {
    const canGo = !member.can_go_alexandria;
    try {
      await updateMember.mutateAsync({ id: member.id, can_go_alexandria: canGo });
      useAuthStore.getState().setMember({ ...member, can_go_alexandria: canGo });
    } catch (cause) {
      alert(cause instanceof Error ? cause.message : 'تعذر تحديث حالة الاستعداد — لن يتم الحفظ حتى تكسَب صلاحية الحساب الكامل (قادم في المرحلة 3).');
    }
  };

  const openSubmission = (task: Task) => {
    setSelectedTask(task);
    setSubmissionNote(task.tracking?.[memberId]?.note ?? '');
    setSubmissionUrl(task.tracking?.[memberId]?.submission_url ?? '');
  };

  return (
    <div className="min-h-dvh bg-[var(--bg)] text-[var(--text)]" dir="rtl">
      <PortalHeader onLogout={logout} />
      <main className="mx-auto grid w-full max-w-[var(--content-max)] gap-6 px-4 pb-8 pt-5 sm:px-6 sm:pt-7">
        <MemberHero member={member} onToggleField={toggleFieldReadiness} isUpdating={updateMember.isPending} />
        <MemberTasks tasks={myTasks} memberId={memberId} isLoading={tasksQuery.isLoading} isError={tasksQuery.isError} onRetry={() => { void tasksQuery.refetch(); }} onStart={startTask} onSubmit={openSubmission} />
      </main>
      <SubmissionModal task={selectedTask} url={submissionUrl} note={submissionNote} isSubmitting={isSubmitting} onUrlChange={setSubmissionUrl} onNoteChange={setSubmissionNote} onClose={() => setSelectedTask(null)} onSubmit={submitTask} />
    </div>
  );
}
