import { CheckCircle2 } from 'lucide-react';
import type { Task } from '../../types/db';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { CardSkeletons } from '../../components/ui/Skeleton';
import { MemberTaskCard } from './MemberTaskCard';
import { isOverdue, daysRemaining } from '../../lib/dateUtils';

interface MemberTasksProps {
  tasks: Task[];
  memberId: string;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onStart: (task: Task) => void;
  onSubmit: (task: Task) => void;
}

export function MemberTasks({ tasks, memberId, isLoading, isError, onRetry, onStart, onSubmit }: MemberTasksProps) {
  const statusOf = (task: Task) => task.tracking?.[memberId]?.status ?? 'pending';
  const urgent = tasks.filter((t) => { const s = statusOf(t); return (s === 'pending' || s === 'in_progress') && (isOverdue(t.deadline_date) || (daysRemaining(t.deadline_date) ?? 99) <= 3); });
  const ongoing = tasks.filter((t) => { const s = statusOf(t); return (s === 'pending' || s === 'in_progress') && !urgent.includes(t); });
  const review = tasks.filter((t) => ['under_review', 'revision_requested'].includes(statusOf(t)));
  const done = tasks.filter((t) => statusOf(t) === 'approved');
  const group = (title: string, items: Task[]) => items.length ? (
    <div className="grid gap-3">
      <h3 className="text-sm font-black text-[var(--text-muted)]">{title} <span>({items.length})</span></h3>
      <div className="grid gap-3 lg:grid-cols-2">{items.map((task) => <MemberTaskCard key={task.id} task={task} memberId={memberId} onStart={onStart} onSubmit={onSubmit} />)}</div>
    </div>
  ) : null;
  return (
    <section className="grid gap-6" aria-labelledby="member-tasks-title">
      <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--link)]"><CheckCircle2 size={20} aria-hidden="true" /></span><h2 id="member-tasks-title" className="text-lg font-black">مهامي والتكليفات <span className="text-sm text-[var(--text-muted)]">({tasks.length})</span></h2></div>
      {isLoading ? <CardSkeletons count={2} />
        : isError ? <ErrorState message="تعذر تحميل مهامك." onRetry={onRetry} />
          : tasks.length === 0 ? <EmptyState title="لا توجد مهام معلقة" description="ستظهر هنا المهام الجديدة المسندة إليك." />
            : <>{group('عاجل — يحتاج تحرك سريع', urgent)}{group('جاري التنفيذ', ongoing)}{group('قيد المراجعة', review)}{group('مكتملة ومعتمدة', done)}</>}
    </section>
  );
}
