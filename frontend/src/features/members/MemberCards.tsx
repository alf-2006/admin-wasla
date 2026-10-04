import type { Member } from '../../types/db';
import { DeviceChips } from './MemberCells';
import { Eye, Pencil, Trash2 } from 'lucide-react';

export function MemberCards({
  members,
  onView,
  onEdit,
  onDelete,
}: {
  members: Member[];
  onView: (member: Member) => void;
  onEdit: (member: Member) => void;
  onDelete: (member: Member) => void;
}) {
  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" aria-label="قائمة الأعضاء">
      {members.map((member, index) => (
        <li 
          key={member.id} 
          className="flex flex-col gap-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-md)] relative"
        >
          <div className="flex justify-between items-start gap-4">
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-[var(--text-muted)] bg-[var(--surface-2)] px-1.5 py-0.5 rounded-md shrink-0">#{index + 1}</span>
                <span className="text-xl font-bold leading-tight text-[var(--text)]">{member.full_name}</span>
              </div>
              <span className="text-sm text-[var(--text-muted)] font-semibold break-words leading-relaxed mt-1">{member.bio ?? 'بدون وصف'}</span>
            </div>
            {/* Status Indicator Dot */}
            <div 
              className={`mt-1.5 size-2.5 rounded-full shrink-0 ${member.work_status === 'active' ? 'bg-[var(--success)] shadow-sm' : 'bg-[var(--text-muted)]'}`} 
              title={member.work_status === 'active' ? 'نشط' : 'غير نشط'}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm mt-2 border-t border-[var(--border)] pt-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-[var(--text-muted)]">الموقع</span>
              <span className="font-bold break-words text-[var(--text-2)]">{member.residence || '—'}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-[var(--text-muted)]">الميدان</span>
              <span className="font-bold break-words text-[var(--text-2)]">{member.can_go_alexandria ? 'جاهز للنزول' : 'غير متاح'}</span>
            </div>
            <div className="col-span-2 flex flex-col gap-1 mt-2">
              <span className="text-xs font-semibold text-[var(--text-muted)]">الأجهزة</span>
              <span className="font-bold mt-1"><DeviceChips device={member.device} /></span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-[var(--border)] pt-4 mt-auto">
            <div className="flex items-center gap-2">
              <button onClick={() => onView(member)} className="text-sm font-bold flex items-center gap-1.5 text-[var(--primary)] bg-[var(--primary-soft)] hover:bg-[var(--primary-hover)] hover:text-white px-3 py-1.5 rounded-[var(--radius-sm)] transition-colors">
                <Eye size={16} /> عرض
              </button>
              <button onClick={() => onEdit(member)} className="text-sm font-bold flex items-center gap-1.5 text-[var(--text-2)] hover:bg-[var(--surface-2)] px-3 py-1.5 rounded-[var(--radius-sm)] transition-colors">
                <Pencil size={16} /> تعديل
              </button>
            </div>
            <button onClick={() => onDelete(member)} className="text-sm font-bold flex items-center gap-1.5 text-[var(--danger)] hover:bg-red-50 dark:hover:bg-red-950/30 px-3 py-1.5 rounded-[var(--radius-sm)] transition-colors" title="حذف">
              <Trash2 size={16} />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
