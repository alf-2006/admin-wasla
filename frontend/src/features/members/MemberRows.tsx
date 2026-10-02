import { CheckCircle2, Edit2, Laptop, Trash2 } from 'lucide-react';
import type { Member } from '../../types/db';

export function MemberRows({ members, onEdit, onDelete, onSelectMember }: { members: Member[]; onEdit: (member: Member) => void; onDelete: (member: Member) => void; onSelectMember?: (member: Member) => void }) {
  return <div className="w-full overflow-x-auto">
    <table className="w-full text-start border-collapse min-w-[850px]">
    <thead className="bg-[var(--bg)] border-b border-[var(--border)]">
      <tr>
        {['#', 'العضو', 'ظروف العمل', 'العتاد', 'الموقع', 'الميدان', 'نبذة / التخصص', ''].map((label, i) => (
          <th key={i} className="py-4 font-bold text-[var(--text-muted)] text-xs text-start pr-6 uppercase whitespace-nowrap">
            {label}
          </th>
        ))}
      </tr>
    </thead>
    <tbody className="divide-y divide-[var(--border)]">{members.map((member, index) => <tr key={member.id} onClick={() => onSelectMember?.(member)} className="hover:bg-[var(--bg)] transition-colors group cursor-pointer">
      <td className="py-4 pr-6 w-14 text-sm font-bold tabular-nums text-[var(--text-muted)] whitespace-nowrap">
        {index + 1}
      </td>
      <td className="py-4 pr-6 whitespace-nowrap min-w-[220px]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--primary-soft)] text-[var(--primary)] font-bold flex items-center justify-center shrink-0">
            {member.full_name.trim().slice(0, 1)}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-[var(--text)] mb-0.5 truncate">{member.full_name}</div>
            <div className="text-xs text-[var(--text-muted)] truncate" dir="ltr">{member.email}</div>
          </div>
        </div>
      </td>

      <td className="py-4 pr-6 whitespace-nowrap">
        <span className="inline-flex items-center px-2.5 py-1 bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] text-xs font-bold rounded-lg">
          {member.work_conditions || '—'}
        </span>
      </td>
      <td className="py-4 pr-6 whitespace-nowrap">
        <div className="flex items-center gap-2 text-sm text-[var(--text)] font-medium">
          <Laptop size={16} className="text-[var(--text-muted)] shrink-0" />
          <span className="truncate max-w-[120px]">{member.device || '—'}</span>
        </div>
      </td>
      <td className="py-4 pr-6 text-sm text-[var(--text)] font-medium whitespace-nowrap max-w-[180px] truncate">
        {member.residence || '—'}
      </td>
      <td className="py-4 pr-6 whitespace-nowrap">
        {member.can_go_alexandria ? 
          <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 text-xs font-bold bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 px-2.5 py-1 rounded-lg"><CheckCircle2 size={14} /> جاهز للنزول</span> : 
          <span className="text-[var(--text-muted)] text-xs font-medium bg-[var(--bg)] border border-[var(--border)] px-2.5 py-1 rounded-lg">غير متاح</span>
        }
      </td>
      <td className="py-4 pr-6 text-sm text-[var(--text-muted)] max-w-xs truncate">
        {member.bio || '—'}
      </td>
      <td className="py-4 pr-6 pl-4 text-left">
        <div className="flex items-center justify-end gap-1.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button type="button" aria-label="تعديل بيانات العضو" onClick={(e) => { e.stopPropagation(); onEdit(member); }} className="size-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary-soft)] transition-colors"><Edit2 size={16} /></button>
          <button type="button" aria-label="حذف العضو" onClick={(e) => { e.stopPropagation(); onDelete(member); }} className="size-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"><Trash2 size={16} /></button>
        </div>
      </td>
    </tr>)}</tbody>
  </table></div>;
}
