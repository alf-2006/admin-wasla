import type { Member } from '../../types/db';
import { DeviceChips, MemberRowMenu, ReadinessChip, WorkStatusChip } from './MemberCells';

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
    <ul className="flex flex-col gap-4 p-4" aria-label="قائمة الأعضاء">
      {members.map((member) => (
        <li key={member.id} className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm transition-colors hover:border-[var(--primary-soft)]">
          <button type="button" onClick={() => onView(member)} className="flex min-w-0 flex-1 items-center gap-4 text-start outline-none" aria-label={`عرض تفاصيل ${member.full_name}`}>
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[var(--surface-2)] text-lg font-black text-[var(--link)]" aria-hidden="true">
              {member.full_name.trim().charAt(0) || '؟'}
            </span>
            <span className="flex min-w-0 flex-col gap-1.5">
              <span className="truncate text-sm font-bold text-[var(--text)]">{member.full_name}</span>
              <span className="flex flex-wrap gap-2">
                <WorkStatusChip status={member.work_status} />
                <ReadinessChip ready={member.can_go_alexandria} />
              </span>
              <span className="mt-0.5"><DeviceChips device={member.device} /></span>
            </span>
          </button>
          <div className="shrink-0" onClick={(event) => event.stopPropagation()}>
            <MemberRowMenu member={member} onView={onView} onEdit={onEdit} onDelete={onDelete} />
          </div>
        </li>
      ))}
    </ul>
  );
}
