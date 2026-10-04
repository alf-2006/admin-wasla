import { useState } from 'react';
import { CheckSquare, Layers, List, Plus } from 'lucide-react';
import type { Task, TaskTrackingEntry } from '../../types/db';
import { useTasks, useDeleteTask } from './api';
import { useMembers } from '../members/api';
import { Button } from '../../components/ui/Button';
import { CardSkeletons } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { TaskAssignmentModal } from './TaskAssignmentModal';
import { toast } from '../../store/toast';
import { handleSupabaseError } from '../../lib/errorHandler';
import { TaskCard } from './TaskCard';
import { TaskTable } from './TaskTable';
import { TaskReviewModal } from './TaskReviewModal';
import { TaskDeleteModal } from './TaskDeleteModal';

type ReviewItem = { task: Task; memberId: number; entry: TaskTrackingEntry };

export default function TasksPage() {
  const tasksQuery = useTasks();
  const membersQuery = useMembers();
  const deleteTask = useDeleteTask();
  const [createOpen, setCreateOpen] = useState(false);
  const [view, setView] = useState<'cards' | 'table'>('cards');
  const [review, setReview] = useState<ReviewItem | null>(null);
  const [remove, setRemove] = useState<Task | null>(null);
  const tasks = tasksQuery.data ?? [];
  const members = membersQuery.data ?? [];
  const confirmDelete = async () => {
    if (!remove) return;
    try { await deleteTask.mutateAsync(remove.id); setRemove(null); toast.success('تم حذف المهمة بنجاح.'); }
    catch (cause) { toast.error(handleSupabaseError(cause).message || 'تعذر حذف المهمة.'); }
  };

  return <section className="grid gap-4" id="page-tasks" dir="rtl">
    <header className="grid gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)] sm:flex sm:items-center sm:justify-between sm:p-6">
      <div><h2 className="flex items-center gap-2 text-[var(--fs-xl)] font-black"><CheckSquare size={23} className="text-[var(--link)]" />إدارة وتكليفات المهام</h2><p className="mt-1 text-sm text-[var(--text-muted)]">{tasks.length} مهمة — تابع التسليمات وراجع الإنجاز.</p></div>
      <div className="grid gap-2 sm:flex"><Button onClick={() => setCreateOpen(true)} icon={<Plus size={18} />} fullOnMobile>تكليف مهمة جديدة</Button><Button variant="secondary" onClick={() => setView((current) => current === 'cards' ? 'table' : 'cards')} icon={view === 'cards' ? <List size={17} /> : <Layers size={17} />} fullOnMobile>{view === 'cards' ? 'عرض جدول' : 'عرض بطاقات'}</Button></div>
      <TaskAssignmentModal isOpen={createOpen} members={members} onClose={() => setCreateOpen(false)} />
    </header>
    {tasksQuery.isLoading ? <CardSkeletons count={3} />
      : tasksQuery.isError ? <ErrorState message="تعذر تحميل المهام والتكليفات." onRetry={() => { void tasksQuery.refetch(); }} />
        : tasks.length === 0 ? <EmptyState title="لا توجد مهام حاليًا" description="أنشئ أول تكليف لفريق العمل لمتابعة الإنجاز ومراجعة التسليمات." action={<Button onClick={() => setCreateOpen(true)} icon={<Plus size={17} />} fullOnMobile>إنشاء أول مهمة</Button>} />
          : view === 'cards' ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{tasks.map((task) => <TaskCard key={task.id} task={task} members={members} onReview={setReview} onDelete={setRemove} />)}</div>
            : <TaskTable tasks={tasks} onDelete={setRemove} />}
    <TaskReviewModal item={review} members={members} onClose={() => setReview(null)} />
    <TaskDeleteModal task={remove} isDeleting={deleteTask.isPending} onClose={() => setRemove(null)} onConfirm={() => void confirmDelete()} />
  </section>;
}
