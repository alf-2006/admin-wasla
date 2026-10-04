import { useState } from 'react';
import { CheckCircle2, ExternalLink } from 'lucide-react';
import type { Member, Task, TaskTrackingEntry } from '../../types/db';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { toast } from '../../store/toast';
import { handleSupabaseError } from '../../lib/errorHandler';
import { useApproveTaskSubmission, useUpdateTaskStatus } from './api';

export function TaskReviewModal({ item, members, onClose }: { item: { task: Task; memberId: number; entry: TaskTrackingEntry | undefined } | null; members: Member[]; onClose: () => void }) {
  const approve = useApproveTaskSubmission();
  const revise = useUpdateTaskStatus();
  const [feedback, setFeedback] = useState('');
  const member = item && members.find((candidate) => candidate.id === item.memberId);
  const accept = async () => {
    if (!item) return;
    try { await approve.mutateAsync({ taskId: item.task.id, memberId: item.memberId }); toast.success('تم اعتماد التسليم وإضافة النقاط.'); onClose(); }
    catch (cause) { toast.error(handleSupabaseError(cause).message || 'فشل الاعتماد — لم يتغير شيء.'); }
  };
  const requestRevision = async () => {
    if (!item) return;
    try { await revise.mutateAsync({ taskId: item.task.id, memberId: item.memberId, status: 'revision_requested', note: feedback.trim() || 'طلب تعديل من الإدارة', submissionUrl: item.entry?.submission_url, currentTracking: item.task.tracking ?? {} }); setFeedback(''); toast.info('تم إرسال طلب التعديل للعضو.'); onClose(); }
    catch (cause) { toast.error(handleSupabaseError(cause).message || 'فشل طلب التعديل — لم يتغير شيء.'); }
  };

  return <Modal isOpen={Boolean(item)} onClose={onClose} title="مراجعة تسليم المهمة" subtitle={item?.task.title} maxWidth="md">
    {item && <div className="grid gap-4 text-sm">
      <p className="font-bold">العضو: <span className="text-[var(--link)]">{member?.full_name ?? `عضو #${item.memberId}`}</span></p>
      {item.entry?.submission_url && <a href={item.entry.submission_url} target="_blank" rel="noreferrer" className="flex min-h-11 items-center gap-2 break-all text-[var(--link)] underline"><ExternalLink size={16} />{item.entry.submission_url}</a>}
      {item.entry?.note && <p className="rounded-xl bg-[var(--bg)] p-3 leading-6">{item.entry.note}</p>}
      <label className="grid gap-1.5 font-bold">ملاحظة أو توجيهات تعديل<textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} rows={2} className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3 text-base" /></label>
      <div className="flex flex-col-reverse gap-2 border-t border-[var(--border)] pt-4 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={() => void requestRevision()} isLoading={revise.isPending} loadingText="جارٍ الإرسال..." fullOnMobile>طلب تعديل</Button><Button variant="secondary" onClick={onClose} fullOnMobile>إغلاق</Button><Button onClick={() => void accept()} isLoading={approve.isPending} loadingText="جارٍ الاعتماد..." icon={<CheckCircle2 size={17} />} fullOnMobile>اعتماد</Button></div>
    </div>}
  </Modal>;
}
