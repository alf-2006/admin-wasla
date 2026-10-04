import { Award, Briefcase, CheckCircle2, FileText, Laptop, MapPin, Pencil, Phone, Shield, Trash2, XCircle } from 'lucide-react';
import type { Member, Note } from '../../types/db';
import { Drawer } from '../../components/ui/Drawer';
import { Button } from '../../components/ui/Button';
import { calculateBonus } from '../dashboard/metrics';
import { parseBio } from './memberDisplay';
import { useMemo } from 'react';

/** درج تفاصيل العضو (جهة inline-end): تواصل + أجهزة + موقع + تخصص + ملاحظات. */
export function MemberDrawer({
  member,
  notes = [],
  onClose,
  onEdit,
  onDelete,
}: {
  member: Member | null;
  notes?: Note[];
  onClose: () => void;
  onEdit: (member: Member) => void;
  onDelete: (member: Member) => void;
}) {
  const bonus = useMemo(() => (member ? calculateBonus(notes, member.id) : 0), [member, notes]);
  const memberNotes = useMemo(
    () => (member ? notes.filter((n) => n.target_member_id === member.id) : []),
    [member, notes],
  );
  const parsed = useMemo(() => parseBio(member?.bio), [member]);

  if (!member) return null;

  const d = (member.device || '').toLowerCase();
  const hasLaptop = d.includes('لاب') || d.includes('الاثنان') || d.includes('laptop');

  const infoItems = [
    { icon: Phone, label: 'رقم الهاتف', val: member.phone || 'غير مسجل', dir: 'ltr' as const },
    { icon: MapPin, label: 'محل الإقامة', val: member.residence || 'غير محدد' },
    { icon: Laptop, label: 'العتاد', val: member.device ? `${member.device}${hasLaptop ? ' (يمتلك لابتوب)' : ''}` : 'بدون جهاز' },
    { icon: member.can_go_alexandria ? CheckCircle2 : XCircle, label: 'النزول الميداني', val: member.can_go_alexandria ? 'متاح للنزول الميداني' : 'غير متاح حالياً', isAlex: true },
    { icon: Briefcase, label: 'ظروف العمل / الدراسة', val: member.work_conditions || 'لا توجد تفاصيل' },
    { icon: Shield, label: 'رتبة الإنجاز', val: member.completion_rank ? `#${member.completion_rank}` : 'غير محدد' },
  ];

  return (
    <Drawer isOpen onClose={onClose} title={`ملف ${member.full_name}`}>
      <div className="grid gap-4" dir="rtl">
        <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[var(--primary)] text-xl font-black text-white" aria-hidden="true">
            {member.full_name.trim().charAt(0)}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-lg font-black text-[var(--text)]">{member.full_name}</h3>
            <p className="truncate text-xs text-[var(--text-muted)]" dir="ltr">{member.email}</p>
          </div>
          <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-bold ${member.work_status === 'active' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-[var(--surface-2)] text-[var(--text-muted)]'}`}>
            {member.work_status === 'active' ? 'نشط' : 'غير نشط'}
          </span>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
          <Award size={17} className="shrink-0 text-[var(--text-muted)]" aria-hidden="true" />
          <span className="text-xs font-bold text-[var(--text-muted)]">رصيد التقييم (البونص)</span>
          <span className="ms-auto text-sm font-black text-[var(--text)]">{bonus > 0 ? `+${bonus}` : bonus} نقطة</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {infoItems.map(({ icon: Icon, label, val, dir, isAlex }, idx) => (
            <div key={idx} className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
              <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${isAlex ? (member.can_go_alexandria ? 'bg-emerald-500/10 text-emerald-600' : 'bg-[var(--surface-2)] text-[var(--text-muted)]') : 'bg-[var(--surface-2)] text-[var(--text-muted)]'}`}>
                <Icon size={17} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold text-[var(--text-muted)]">{label}</span>
                <span className="block truncate text-sm font-semibold text-[var(--text)]" dir={dir} title={val}>{val}</span>
              </span>
            </div>
          ))}
        </div>

        {parsed.specialization && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5">
            <span className="block text-xs font-bold text-[var(--text-muted)]">التخصص</span>
            <p className="mt-1 text-sm leading-7 text-[var(--text)]">{parsed.specialization}</p>
          </div>
        )}

        {(parsed.notes || member.team_notes) && (
          <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3.5 dark:border-violet-900/50 dark:bg-violet-950/20">
            <span className="block text-xs font-bold text-[var(--primary)]">ملاحظات الإدارة عن العضو</span>
            {parsed.notes && <p className="mt-1 text-sm leading-7 text-[var(--text)]">{parsed.notes}</p>}
            {member.team_notes && <p className="mt-1 text-sm leading-7 text-[var(--text)]">{member.team_notes}</p>}
          </div>
        )}

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5">
          <span className="mb-2 flex items-center gap-2 text-xs font-bold text-[var(--text-muted)]">
            <FileText size={14} aria-hidden="true" />
            سجل الملاحظات الخاصة بالعضو ({memberNotes.length})
          </span>
          {memberNotes.length > 0 ? (
            <div className="max-h-36 divide-y divide-[var(--border)] overflow-y-auto">
              {memberNotes.slice(0, 5).map((n) => (
                <div key={n.id} className="py-2 text-xs">
                  <div className="flex items-center justify-between font-bold text-[var(--text-secondary)]">
                    <span>{n.author || 'الإدارة'}</span>
                    <span className="text-[10px] text-[var(--text-muted)]">{n.date || ''}</span>
                  </div>
                  <p className="mt-0.5 text-[var(--text)]">{n.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[var(--text-muted)]">لا توجد ملاحظات مسجلة لهذا العضو بعد.</p>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-[var(--border)] pt-4 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} fullOnMobile>
            إغلاق
          </Button>
          <Button variant="secondary" onClick={() => onDelete(member)} icon={<Trash2 size={16} />} fullOnMobile className="text-[var(--danger)]">
            حذف
          </Button>
          <Button onClick={() => onEdit(member)} icon={<Pencil size={16} />} fullOnMobile>
            تعديل بيانات العضو
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
