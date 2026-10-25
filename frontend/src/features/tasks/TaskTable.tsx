import { Eye, Trash2 } from 'lucide-react';
import type { Task } from '../../types/db';
import { AR, arCount } from '../../lib/arabic';
import { BonusChip, DeadlineChip, STATUS_META, TaskProgress, summarizeTask, taskBonus } from './taskMeta';

export function TaskTable({ tasks, onDelete }: { tasks: Task[]; onDelete: (task: Task) => void }) {
  return (
    <div className="overflow-x-clip rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]">
      <table className="data-table w-full text-start text-sm">
        <thead className="bg-[var(--surface-2)] text-[var(--text-muted)]">
          <tr>{['عنوان المهمة', 'الموعد والبونص', 'المسند لهم', 'الإنجاز', 'الإجراءات'].map((label) => <th className="p-3" key={label}>{label}</th>)}</tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const summary = summarizeTask(task);
            return (
              <tr key={task.id}>
                <td data-label="عنوان المهمة">
                  <span className="grid gap-1">
                    <span className="font-bold">{task.title}</span>
                    {summary.awaitingReview > 0 && (
                      <span className={`inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold ${STATUS_META.under_review.tone}`}>
                        <Eye size={13} aria-hidden="true" />{arCount(summary.awaitingReview, AR.submission)} للمراجعة
                      </span>
                    )}
                  </span>
                </td>
                <td data-label="الموعد والبونص"><span className="flex flex-wrap items-center gap-1.5"><DeadlineChip task={task} summary={summary} /><BonusChip points={taskBonus(task)} /></span></td>
                <td data-label="المسند لهم">{task.assigned_to === 'ALL' ? `كل الفريق (${summary.total})` : arCount(summary.total, AR.member)}</td>
                <td data-label="الإنجاز">
                  <span className="grid min-w-28 gap-1">
                    <span className="text-xs font-bold tabular-nums">{summary.approved}/{summary.total} اتعتمد · {summary.percent}%</span>
                    <TaskProgress summary={summary} compact />
                  </span>
                </td>
                <td data-label="الإجراءات">
                  <button type="button" className="grid size-11 place-items-center rounded-lg border border-[var(--border)] text-[var(--danger)] transition-colors hover:bg-red-50 dark:hover:bg-red-950/40" aria-label={`امسح مهمة ${task.title}`} onClick={() => onDelete(task)}>
                    <Trash2 size={17} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
