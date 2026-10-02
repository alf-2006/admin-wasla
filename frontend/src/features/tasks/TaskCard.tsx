import { Clock3, Eye, Trash2, AlertCircle } from 'lucide-react';
import type { Member, Task, TaskTrackingEntry, TaskStatus } from '../../types/db';
import { TaskStatusBadge } from '../../components/ui/Badge';
import { formatDate, isOverdue, daysRemaining } from '../../lib/dateUtils';
import { useUpdateTaskStatus } from './api';

export function TaskCard({ task, members, onReview, onDelete }: { task: Task; members: Member[]; onReview: (item: { task: Task; memberId: number; entry: TaskTrackingEntry }) => void; onDelete: (task: Task) => void }) {
  const updateStatus = useUpdateTaskStatus();
  const entries = Object.entries(task.tracking ?? {});
  const approved = entries.filter(([, entry]) => entry.status === 'approved').length;
  const awaitingReview = entries.filter(([, entry]) => entry.status === 'under_review');
  const overdue = isOverdue(task.deadline_date);
  const daysLeft = daysRemaining(task.deadline_date);
  
  return <article className="grid content-between gap-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)] sm:p-5">
    <div className="grid gap-3">
      <div className="flex items-start justify-between gap-3"><h3 className="text-base font-black leading-6">{task.title}</h3><button type="button" className="grid size-11 shrink-0 place-items-center rounded-lg border border-[var(--border)] text-[var(--danger)]" aria-label={`حذف ${task.title}`} onClick={() => onDelete(task)}><Trash2 size={17} /></button></div>
      {task.description && <p className="text-sm leading-6 text-[var(--text-2)]">{task.description}</p>}
      {task.has_deadline && task.deadline_date && (
        <p className={`flex items-center gap-2 text-sm font-bold ${overdue ? 'text-red-700 dark:text-red-400' : 'text-amber-800 dark:text-amber-300'}`}>
          {overdue ? <AlertCircle size={16} /> : <Clock3 size={16} />}
          {overdue ? 'متأخر: ' : 'الموعد: '}
          {formatDate(task.deadline_date)}
          {daysLeft !== null && !overdue && daysLeft <= 3 && (
            <span className="text-xs">({daysLeft} {daysLeft === 1 ? 'يوم' : 'أيام'} متبقية)</span>
          )}
        </p>
      )}
      <p className="text-sm font-bold text-[var(--text-muted)]">الإنجاز: {approved} من {entries.length} مكتمل</p>
      <div className="flex max-h-[260px] flex-col gap-1 overflow-y-auto border-t border-[var(--border)] pt-3 pe-2">
        {entries.map(([id, entry]) => {
          const memberId = Number(id);
          const member = members.find((candidate) => candidate.id === memberId);
          const memberName = member?.full_name || `عضو #${id}`;
          
          return <div key={id} className="flex items-center justify-between gap-2 border-b border-[var(--border)] py-2 last:border-0">
            <span className="truncate text-sm font-medium">{memberName}</span>
            <span className="flex shrink-0 items-center gap-2">
              <TaskStatusBadge status={entry.status} />
              
              <select
                className="h-8 min-h-0 cursor-pointer rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 text-xs font-bold text-[var(--text)] transition-colors hover:border-[var(--primary)] focus:border-[var(--primary)] focus:outline-none disabled:opacity-50"
                value={entry.status}
                onChange={(e) => updateStatus.mutate({ taskId: task.id, memberId, status: e.target.value as TaskStatus, currentTracking: task.tracking ?? {} })}
                disabled={updateStatus.isPending}
              >
                <option value="pending">لم يبدأ</option>
                <option value="in_progress">قيد التنفيذ</option>
                <option value="under_review">مراجعة</option>
                <option value="approved">مكتمل</option>
              </select>

              {entry.status === 'under_review' && (
                <button 
                  type="button" 
                  className="flex h-8 items-center gap-1 rounded-lg bg-amber-700 px-2 text-xs font-bold text-white transition-colors hover:bg-amber-800" 
                  onClick={() => onReview({ task, memberId, entry })}
                >
                  <Eye size={14} />
                  عرض
                </button>
              )}
            </span>
          </div>;
        })}
      </div>
    </div>
    <p className="border-t border-[var(--border)] pt-3 text-xs text-[var(--text-muted)]">
      تاريخ التكليف: {formatDate(task.created_at, 'dd MMM yyyy')}
      {awaitingReview.length > 0 && (
        <strong className="ms-2 text-amber-800 dark:text-amber-300">
          {awaitingReview.length} تسليم للمراجعة
        </strong>
      )}
    </p>
  </article>;
}
