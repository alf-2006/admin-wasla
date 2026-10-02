import { CheckCircle2 } from 'lucide-react';
import type { Task } from '../../types/db';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { CardSkeletons } from '../../components/ui/Skeleton';
import { MemberTaskCard } from './MemberTaskCard';

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
  return (
    <section className="grid gap-4" aria-labelledby="member-tasks-title">
      <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--link)]"><CheckCircle2 size={20} /></span><h2 id="member-tasks-title" className="text-lg font-black">مهامي والتكليفات <span className="text-sm text-[var(--text-muted)]">({tasks.length})</span></h2></div>
      {isLoading ? <CardSkeletons count={2} />
        : isError ? <ErrorState message="تعذر تحميل مهامك." onRetry={onRetry} />
          : tasks.length === 0 ? <EmptyState title="لا توجد مهام معلقة" description="ستظهر هنا المهام الجديدة المسندة إليك." />
            : <div className="grid gap-3 lg:grid-cols-2">{tasks.map((task) => <MemberTaskCard key={task.id} task={task} memberId={memberId} onStart={onStart} onSubmit={onSubmit} />)}</div>}
    </section>
  );
}
