import { CheckCircle2, Clock3, Send } from 'lucide-react';
import type { Task, TaskStatus } from '../../types/db';
import { TaskStatusBadge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export function MemberTaskCard({ task, memberId, onStart, onSubmit }: { task: Task; memberId: string; onStart: (task: Task) => void; onSubmit: (task: Task) => void }) {
  const tracking = task.tracking?.[memberId] || { status: 'pending' as TaskStatus };
  const isApproved = tracking.status === 'approved';
  const isUnderReview = tracking.status === 'under_review';
  return (
    <Card className="grid content-between gap-4">
      <div className="grid gap-3">
        <div className="flex items-start justify-between gap-3"><h3 className="text-base font-black leading-6">{task.title}</h3><TaskStatusBadge status={tracking.status} /></div>
        {task.description && <p className="whitespace-pre-line text-sm leading-6 text-[var(--text-2)]">{task.description}</p>}
        {task.has_deadline && task.deadline_date && <p className="flex items-center gap-2 text-sm font-bold text-amber-800 dark:text-amber-300"><Clock3 size={16} />الموعد النهائي: {task.deadline_date}</p>}
        {tracking.note && <p className="rounded-lg bg-[var(--bg)] p-3 text-sm leading-6"><strong className="block">ملاحظتك السابقة</strong>{tracking.note}</p>}
      </div>
      <div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-3">
        {isApproved ? <span className="flex min-h-11 items-center gap-2 text-sm font-bold text-emerald-800 dark:text-emerald-300"><CheckCircle2 size={18} />تم اعتماد المهمة</span>
          : isUnderReview ? <span className="flex min-h-11 items-center gap-2 text-sm font-bold text-amber-800 dark:text-amber-300"><Clock3 size={18} />بانتظار مراجعة الإدارة</span>
            : <>
              {tracking.status === 'pending' && <Button variant="secondary" onClick={() => onStart(task)} fullOnMobile>بدء العمل</Button>}
              <Button onClick={() => onSubmit(task)} icon={<Send size={17} />} fullOnMobile>{tracking.status === 'in_progress' ? 'تسليم للمراجعة' : 'تسليم المهمة'}</Button>
            </>}
      </div>
    </Card>
  );
}
