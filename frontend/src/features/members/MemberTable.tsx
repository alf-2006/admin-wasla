import type { Member } from '../../types/db';
import { DeviceChips, MemberRowMenu, ReadinessChip, WorkStatusChip } from './MemberCells';

/**
 * جدول الأعضاء لسطح المكتب (≥768px): تخطيط ثابت بعروض صريحة،
 * صفوف موحدة 68px، رأس لاصق، عمود إجراءات لاصق بجهة inline-end.
 */
export function MemberTable({
  members,
  startIndex,
  onView,
  onEdit,
  onDelete,
}: {
  members: Member[];
  startIndex: number;
  onView: (member: Member) => void;
  onEdit: (member: Member) => void;
  onDelete: (member: Member) => void;
}) {
  return (
    <div className="member-dir-shell">
      <table className="member-dir-table">
        <caption className="sr-only">جدول الأعضاء — اضغط على أي صف لعرض التفاصيل</caption>
        <thead>
          <tr>
            <th scope="col" className="member-col-index">#</th>
            <th scope="col" className="member-col-member">العضو</th>
            <th scope="col" className="member-col-status">الحالة</th>
            <th scope="col" className="member-col-devices">الأجهزة</th>
            <th scope="col" className="member-col-location">الموقع</th>
            <th scope="col" className="member-col-ready">الميدان</th>
            <th scope="col" className="member-col-actions">الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member, i) => (
            <tr key={member.id} onClick={() => onView(member)} className="member-dir-row" tabIndex={0}
              onKeyDown={(event) => { if (event.key === 'Enter') onView(member); }}
              aria-label={`عرض تفاصيل ${member.full_name}`}>
              <td className="member-col-index tabular-nums">{startIndex + i + 1}</td>
              <td className="member-col-member">
                <div className="member-identity">
                  <span className="member-avatar" aria-hidden="true">{member.full_name.trim().charAt(0) || '؟'}</span>
                  <span className="member-identity-copy">
                    <span className="member-name">{member.full_name}</span>
                    <span className="member-contact" dir="ltr" title={member.email}>{member.email}</span>
                    {member.phone && <span className="member-contact" dir="ltr" title={member.phone}>{member.phone}</span>}
                  </span>
                </div>
              </td>
              <td className="member-col-status"><WorkStatusChip status={member.work_status} /></td>
              <td className="member-col-devices"><DeviceChips device={member.device} /></td>
              <td className="member-col-location"><span className="member-location" title={member.residence || 'غير محدد'}>{member.residence || '—'}</span></td>
              <td className="member-col-ready"><ReadinessChip ready={member.can_go_alexandria} /></td>
              <td className="member-col-actions" onClick={(event) => event.stopPropagation()}>
                <MemberRowMenu member={member} onView={onView} onEdit={onEdit} onDelete={onDelete} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
