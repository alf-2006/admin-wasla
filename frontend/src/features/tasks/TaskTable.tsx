import { Trash2 } from 'lucide-react';
import type { Task } from '../../types/db';

export function TaskTable({ tasks, onDelete }: { tasks: Task[]; onDelete: (task: Task) => void }) {
  return <div className="overflow-x-clip rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]"><table className="data-table w-full text-start text-sm">
    <thead className="bg-[var(--surface-2)] text-[var(--text-muted)]"><tr>{['عنوان المهمة', 'الموعد النهائي', 'المكلفون', 'الإنجاز', 'الإجراءات'].map((label) => <th className="p-3" key={label}>{label}</th>)}</tr></thead>
    <tbody>{tasks.map((task) => {
      const entries = Object.values(task.tracking ?? {});
      const completed = entries.filter((entry) => entry.status === 'approved').length;
      return <tr key={task.id}><td data-label="عنوان المهمة" className="font-bold">{task.title}</td><td data-label="الموعد النهائي">{task.has_deadline ? task.deadline_date : 'بدون موعد'}</td><td data-label="المكلفون">{task.assigned_to === 'ALL' ? 'كل الفريق' : `${entries.length} أعضاء`}</td><td data-label="الإنجاز">{completed}/{entries.length} منجز</td><td data-label="الإجراءات"><button type="button" className="grid size-11 place-items-center rounded-lg border border-[var(--border)] text-[var(--danger)]" aria-label={`حذف ${task.title}`} onClick={() => onDelete(task)}><Trash2 size={17} /></button></td></tr>;
    })}</tbody>
  </table></div>;
}
