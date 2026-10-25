import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';
import { useTasks, useUpdateTaskStatus } from '../tasks/api';
import { logoutMemberDevice, updateMemberReadiness } from '../members/api';
import type { Task } from '../../types/db';
import { PortalHeader } from './PortalHeader';
import { toast } from '../../store/toast';
import { handleSupabaseError } from '../../lib/errorHandler';
import { MemberHero } from './MemberHero';
import { MemberTasks } from './MemberTasks';
import { SubmissionModal } from './SubmissionModal';
import MemberAnnouncements from './announcements/MemberAnnouncements';
import { SubmissionSuccessModal, type SubmissionCelebration } from './SubmissionSuccessModal';
import { useMemberBonus } from './useMemberBonus';
import { taskBonus } from '../tasks/taskMeta';

export default function MemberPortalPage() {
  const member = useAuthStore((state) => state.currentMember);
  const logoutMember = useAuthStore((state) => state.logoutMember);
  const navigate = useNavigate();
  const tasksQuery = useTasks();
  const updateTask = useUpdateTaskStatus();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [submissionNote, setSubmissionNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTogglingReadiness, setIsTogglingReadiness] = useState(false);
  const [celebration, setCelebration] = useState<SubmissionCelebration | null>(null);
  const bonusQuery = useMemberBonus(member?.id);

  if (!member) return <Navigate to="/login" replace />;

  const memberId = String(member.id);
  const myTasks = (tasksQuery.data ?? []).filter((task) => {
    if (task.assigned_to === 'ALL') return true;
    return Array.isArray(task.assigned_to) && task.assigned_to.some((id) => String(id) === memberId);
  });

  const logout = () => {
    const memberId = member.id;
    logoutMember();
    navigate('/login');
    void logoutMemberDevice(memberId);
  };

  const startTask = async (task: Task) => {
    try {
      // الخادم يستبدل الملاحظة والرابط بما يصله — نمرر الموجود حتى لا يُمسح
      const current = task.tracking?.[String(member.id)];
      await updateTask.mutateAsync({ taskId: task.id, memberId: member.id, status: 'in_progress', note: current?.note ?? '', submissionUrl: current?.submission_url ?? '', currentTracking: task.tracking ?? {} });
      toast.success('بدأت المهمة — بالتوفيق!');
    } catch (cause) {
      toast.error(handleSupabaseError(cause).message || 'معرفناش نبدأ المهمة — مفيش حاجة اتغيرت.');
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
      const submitted = selectedTask;
      setSelectedTask(null);
      setSubmissionUrl('');
      setSubmissionNote('');
      void bonusQuery.refetch();
      setCelebration({
        taskId: submitted.id,
        taskTitle: submitted.title,
        firstName: member.full_name.trim().split(/\s+/)[0] || member.full_name,
        bonus: taskBonus(submitted),
        deadline: submitted.has_deadline ? submitted.deadline_date : null,
        submittedAt: new Date().toISOString(),
        isResubmission: submitted.tracking?.[memberId]?.status === 'revision_requested',
      });
    } catch (cause) {
      toast.error(handleSupabaseError(cause).message || 'معرفناش نسلّم المهمة — جرّب تاني.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleFieldReadiness = async () => {
    const canGo = !member.can_go_alexandria;
    setIsTogglingReadiness(true);
    try {
      await updateMemberReadiness(member.id, canGo);
      useAuthStore.getState().setMember({ ...member, can_go_alexandria: canGo });
      toast.success(canGo ? 'جاهزية النزول الميداني اتفعّلت.' : 'جاهزية النزول الميداني اتوقفت.');
    } catch (cause) {
      toast.error(handleSupabaseError(cause).message || 'معرفناش نحدّث حالة الجاهزية.');
    } finally {
      setIsTogglingReadiness(false);
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
        <MemberHero member={member} onToggleField={toggleFieldReadiness} isUpdating={isTogglingReadiness} totalBonus={bonusQuery.data ?? null} bonusLoading={bonusQuery.isLoading} />
        <MemberTasks tasks={myTasks} memberId={memberId} isLoading={tasksQuery.isLoading} isError={tasksQuery.isError} onRetry={() => { void tasksQuery.refetch(); }} onStart={startTask} onSubmit={openSubmission} />
        <MemberAnnouncements memberId={member.id} />
      </main>
      <SubmissionModal task={selectedTask} url={submissionUrl} note={submissionNote} isSubmitting={isSubmitting} onUrlChange={setSubmissionUrl} onNoteChange={setSubmissionNote} onClose={() => setSelectedTask(null)} onSubmit={submitTask} />
      <SubmissionSuccessModal celebration={celebration} totalBonus={bonusQuery.data} totalLoading={bonusQuery.isLoading || bonusQuery.isFetching} onClose={() => setCelebration(null)} />
    </div>
  );
}
