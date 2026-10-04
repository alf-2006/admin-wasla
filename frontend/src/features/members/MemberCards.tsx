import type { Member } from '../../types/db';
import { DeviceChips, MemberRowMenu, ReadinessChip, WorkStatusChip } from './MemberCells';

/** بطاقات الأعضاء للجوال (<768px): صورة + اسم + شارة + أجهزة + زرّان. */
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
    <ul className="member-cards" aria-label="قائمة الأعضاء">
      {members.map((member) => (
        <li key={member.id} className="member-card">
          <button type="button" onClick={() => onView(member)} className="member-card-main" aria-label={`عرض تفاصيل ${member.full_name}`}>
            <span className="member-avatar" aria-hidden="true">{member.full_name.trim().charAt(0) || '؟'}</span>
            <span className="member-identity-copy">
              <span className="member-name">{member.full_name}</span>
              <span className="member-card-meta">
                <WorkStatusChip status={member.work_status} />
                <ReadinessChip ready={member.can_go_alexandria} />
              </span>
              <span className="member-card-devices"><DeviceChips device={member.device} /></span>
            </span>
          </button>
          <span className="member-card-actions" onClick={(event) => event.stopPropagation()}>
            <MemberRowMenu member={member} onView={onView} onEdit={onEdit} onDelete={onDelete} />
          </span>
        </li>
      ))}
    </ul>
  );
}
