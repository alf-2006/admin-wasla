import { useMemo } from 'react';
import { 
  Laptop, MapPin, Phone, Award, CheckCircle2, 
  XCircle, Edit2, Shield, FileText, Briefcase
} from 'lucide-react';
import type { Member, Note } from '../../types/db';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { calculateBonus } from '../dashboard/metrics';

interface MemberProfileModalProps {
  isOpen: boolean;
  member: Member | null;
  notes?: Note[];
  onClose: () => void;
  onEdit?: (member: Member) => void;
  onAdjustBonus?: (member: Member) => void;
}

export function MemberProfileModal({
  isOpen,
  member,
  notes = [],
  onClose,
  onEdit,
  onAdjustBonus,
}: MemberProfileModalProps) {
  const bonus = useMemo(() => {
    if (!member) return 0;
    return calculateBonus(notes, member.id);
  }, [member, notes]);

  const memberNotes = useMemo(() => {
    if (!member) return [];
    return notes.filter((n) => n.target_member_id === member.id);
  }, [member, notes]);

  if (!member) return null;

  const d = (member.device || '').toLowerCase();
  const hasLaptop = d.includes('لاب') || d.includes('الاثنان') || d.includes('laptop');

  const infoItems = [
    { icon: Phone, label: 'رقم الهاتف', val: member.phone || 'غير مسجل', dir: 'ltr' as const },
    { icon: MapPin, label: 'محل الإقامة', val: member.residence || 'غير محدد' },
    { icon: Laptop, label: 'العتاد وجاهزية اللابتوب', val: `${member.device || 'بدون جهاز'} ${hasLaptop ? '(يمتلك لابتوب)' : ''}` },
    { icon: member.can_go_alexandria ? CheckCircle2 : XCircle, label: 'النزول لاجتماع الإسكندرية', val: member.can_go_alexandria ? 'متاح للنزول الميداني' : 'غير متاح حالياً', isAlex: true },
    { icon: Briefcase, label: 'ظروف العمل / الدراسة', val: member.work_conditions || 'لا توجد تفاصيل' },
    { icon: Shield, label: 'رتبة الإنجاز', val: member.completion_rank ? `#${member.completion_rank}` : 'غير محدد' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="الملف الشخصي للعضو" maxWidth="lg">
      <div className="grid gap-5 text-start" dir="rtl">
        {/* Header Summary */}
        <div className="flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[var(--primary)] text-xl font-black text-white">
              {member.full_name.trim().charAt(0)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-black text-[var(--text)]">{member.full_name}</h3>
                <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${member.work_status === 'active' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-[var(--surface-2)] text-[var(--text-muted)]'}`}>
                  {member.work_status === 'active' ? 'نشط' : 'غير نشط'}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]" dir="ltr">{member.email}</p>
            </div>
          </div>

          {/* Bonus Badge */}
          <div className="flex items-center gap-3 sm:flex-col sm:items-end">
            <div className="text-xs font-bold text-[var(--text-muted)]">رصيد التقييم (البونص)</div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-xl border px-3 py-1 text-sm font-black ${
                bonus > 0 
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : bonus < 0
                  ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300'
                  : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)]'
              }`}>
                <Award size={15} />
                {bonus > 0 ? `+${bonus}` : bonus} نقطة
              </span>
              {onAdjustBonus && (
                <button
                  type="button"
                  onClick={() => onAdjustBonus(member)}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs font-bold text-[var(--primary)] hover:bg-[var(--primary-soft)]"
                >
                  تعديل
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid gap-3 sm:grid-cols-2">
          {infoItems.map(({ icon: Icon, label, val, dir, isAlex }, idx) => (
            <div key={idx} className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
              <div className={`grid size-9 shrink-0 place-items-center rounded-lg ${isAlex ? (member.can_go_alexandria ? 'bg-emerald-500/10 text-emerald-600' : 'bg-[var(--surface-2)] text-[var(--text-muted)]') : 'bg-[var(--surface-2)] text-[var(--text-muted)]'}`}>
                <Icon size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-xs font-bold text-[var(--text-muted)]">{label}</span>
                <span className="truncate text-sm font-semibold text-[var(--text)] block" dir={dir}>{val}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Bio */}
        {member.bio && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5">
            <span className="block text-xs font-bold text-[var(--text-muted)]">نبذة / التخصص</span>
            <p className="mt-1 text-sm leading-relaxed text-[var(--text)]">{member.bio}</p>
          </div>
        )}

        {/* Team Notes */}
        {member.team_notes && (
          <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3.5 dark:border-violet-900/50 dark:bg-violet-950/20">
            <span className="block text-xs font-bold text-[var(--primary)]">ملاحظات الإدارة عن العضو</span>
            <p className="mt-1 text-sm leading-relaxed text-[var(--text)]">{member.team_notes}</p>
          </div>
        )}

        {/* Recent Notes Thread */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5">
          <span className="mb-2 flex items-center gap-2 text-xs font-bold text-[var(--text-muted)]">
            <FileText size={14} />
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

        {/* Modal Actions */}
        <div className="flex flex-col-reverse gap-2 border-t border-[var(--border)] pt-4 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} fullOnMobile className="min-h-11">
            إغلاق
          </Button>
          {onEdit && (
            <Button
              onClick={() => {
                onClose();
                onEdit(member);
              }}
              icon={<Edit2 size={16} />}
              fullOnMobile
              className="min-h-11"
            >
              تعديل بيانات العضو
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
