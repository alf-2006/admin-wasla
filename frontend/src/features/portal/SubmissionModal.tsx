import { AlertCircle } from 'lucide-react';
import type { FormEvent } from 'react';
import type { Task } from '../../types/db';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

interface SubmissionModalProps {
  task: Task | null;
  url: string;
  note: string;
  isSubmitting: boolean;
  onUrlChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function SubmissionModal({ task, url, note, isSubmitting, onUrlChange, onNoteChange, onClose, onSubmit }: SubmissionModalProps) {
  return (
    <Modal isOpen={!!task} onClose={onClose} title="تسليم المهمة للإدارة" subtitle={task?.title}>
      <form onSubmit={onSubmit} className="grid gap-4">
        <label className="grid gap-2 text-sm font-bold">رابط التسليم
          <input type="url" dir="ltr" placeholder="https://..." value={url} onChange={(event) => onUrlChange(event.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 text-start" />
        </label>
        <label className="grid gap-2 text-sm font-bold">ملاحظات التسليم
          <textarea rows={4} placeholder="اكتب ما أنجزته والتفاصيل التي تود مشاركتها." value={note} onChange={(event) => onNoteChange(event.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3 leading-6" />
        </label>
        <p className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm leading-6 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"><AlertCircle size={18} className="mt-1 shrink-0" />بعد الإرسال ستتحول المهمة إلى قيد المراجعة حتى تعتمدها الإدارة.</p>
        <div className="flex flex-col-reverse gap-2 border-t border-[var(--border)] pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose} fullOnMobile>إلغاء</Button>
          <Button type="submit" disabled={isSubmitting} fullOnMobile>{isSubmitting ? 'جاري الإرسال...' : 'تأكيد التسليم'}</Button>
        </div>
      </form>
    </Modal>
  );
}
