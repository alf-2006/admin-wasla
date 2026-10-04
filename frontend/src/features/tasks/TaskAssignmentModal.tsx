import { useState, type FormEvent } from 'react';
import type { Member, TaskInsert, TaskTrackingEntry } from '../../types/db';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { toast } from '../../store/toast';
import { useCreateTask } from './api';

export function TaskAssignmentModal({ isOpen, members, onClose }: { isOpen: boolean; members: Member[]; onClose: () => void }) {
  const create = useCreateTask();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [assignAll, setAssignAll] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');
  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError('');
    const cleanTitle = title.trim();
    if (!cleanTitle) { setError('عنوان المهمة إجباري — اكتب عنواناً واضحاً.'); return; }
    if (cleanTitle.length < 3) { setError('العنوان قصير جداً — 3 أحرف على الأقل.'); return; }
    if (!members.length) { setError('لا يوجد أعضاء متاحون للإسناد حالياً.'); return; }
    if (!assignAll && !selected.length) { setError('اختر عضوًا واحدًا على الأقل أو أسند المهمة للفريق كله.'); return; }
    const assignees = assignAll ? members.map((member) => String(member.id)) : selected;
    const tracking: Record<string, TaskTrackingEntry> = Object.fromEntries(assignees.map((id) => [id, { status: 'pending', updated_at: new Date().toISOString() }]));
    const payload: TaskInsert = { title: cleanTitle, description: description.trim() || null, has_deadline: Boolean(deadline), deadline_date: deadline || null, assigned_to: assignAll ? 'ALL' : selected, tracking };
    try { await create.mutateAsync(payload); setTitle(''); setDescription(''); setDeadline(''); setAssignAll(true); setSelected([]); onClose(); toast.success('تم إنشاء المهمة وإسنادها بنجاح.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر إنشاء المهمة.'); }
  };

  return <Modal isOpen={isOpen} onClose={onClose} title="تكليف مهمة جديدة" maxWidth="lg">
    <form onSubmit={(event) => void submit(event)} className="grid gap-4">
      {error && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-900 dark:border-red-800 dark:bg-red-950/50 dark:text-red-100">{error}</p>}
      <label className="grid gap-1.5 text-sm font-bold">عنوان المهمة<input required minLength={3} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="مثال: تجهيز تصاميم الحملة" aria-invalid={Boolean(error) || undefined} className="min-h-11 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 text-base font-normal" /></label>
      <label className="grid gap-1.5 text-sm font-bold">التفاصيل<textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-24 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3 text-base font-normal" /></label>
      <label className="grid gap-1.5 text-sm font-bold">الموعد النهائي (اختياري)<input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} className="min-h-11 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 text-base font-normal" /></label>
      <label className="flex min-h-11 items-center gap-3 rounded-xl border border-[var(--border)] p-3 text-sm font-bold"><input type="checkbox" checked={assignAll} onChange={(event) => setAssignAll(event.target.checked)} />إسناد لجميع الأعضاء ({members.length})</label>
      {!assignAll && <div className="grid max-h-48 gap-1 overflow-y-auto rounded-xl border border-[var(--border)] p-2">{members.map((member) => <label key={member.id} className="flex min-h-11 items-center gap-3 rounded-lg px-2"><input type="checkbox" checked={selected.includes(String(member.id))} onChange={() => toggle(String(member.id))} />{member.full_name}</label>)}</div>}
      <div className="flex flex-col-reverse gap-2 border-t border-[var(--border)] pt-4 sm:flex-row sm:justify-end"><Button type="button" variant="secondary" onClick={onClose} fullOnMobile>إلغاء</Button><Button type="submit" isLoading={create.isPending} loadingText="جارٍ الإنشاء..." fullOnMobile>إنشاء وتكليف</Button></div>
    </form>
  </Modal>;
}
