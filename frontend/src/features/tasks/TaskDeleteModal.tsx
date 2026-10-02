import type { Task } from '../../types/db';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';

export function TaskDeleteModal({ task, isDeleting, onClose, onConfirm }: { task: Task | null; isDeleting: boolean; onClose: () => void; onConfirm: () => void }) {
  return <Modal isOpen={Boolean(task)} onClose={onClose} title="تأكيد حذف المهمة" maxWidth="sm">
    {task && <div className="grid gap-4"><p className="text-sm leading-6">هل تريد حذف المهمة <strong>{task.title}</strong> نهائيًا؟</p><div className="flex flex-col-reverse gap-2 border-t border-[var(--border)] pt-4 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={onClose} fullOnMobile>إلغاء</Button><Button variant="danger" disabled={isDeleting} onClick={onConfirm} fullOnMobile>{isDeleting ? 'جارٍ الحذف...' : 'تأكيد الحذف'}</Button></div></div>}
  </Modal>;
}
