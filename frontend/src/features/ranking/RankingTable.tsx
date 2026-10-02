import { Trophy, Medal, Award, User, Edit3 } from 'lucide-react';
import type { Member } from '../../types/db';
import type { RankedMember } from './RankingPodium';
import { formatDate } from '../../lib/dateUtils';

interface RankingTableProps {
  members: RankedMember[];
  onSelectMember?: (member: Member) => void;
  onAdjustBonus?: (member: Member) => void;
}

export function RankingTable({ members, onSelectMember, onAdjustBonus }: RankingTableProps) {
  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-[var(--text-muted)] bg-[var(--surface)] rounded-[var(--radius-lg)] border border-[var(--border)]">
        <Trophy size={36} className="mb-3 opacity-30 text-[var(--primary)]" />
        <h4 className="font-black text-base text-[var(--text)] mb-1">لا يوجد أعضاء في الترتيب</h4>
        <p className="text-xs text-[var(--text-muted)]">لم يتم العثور على أعضاء يطابقون معايير التصفية الحالية.</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
      <table className="w-full text-start border-collapse min-w-[750px]">
        <thead className="bg-[var(--bg)] border-b border-[var(--border)]">
          <tr>
            {['الترتيب', 'العضو', 'الفريق', 'نقاط البونص', 'رتبة الإنجاز', 'تاريخ الانضمام', 'إجراءات'].map((label, idx) => (
              <th
                key={idx}
                className="py-4 pr-6 text-start text-xs font-bold uppercase text-[var(--text-muted)] whitespace-nowrap"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {members.map((member) => {
            const isTop1 = member.rank === 1;
            const isTop2 = member.rank === 2;
            const isTop3 = member.rank === 3;

            return (
              <tr
                key={member.id}
                onClick={() => onSelectMember?.(member)}
                className="hover:bg-[var(--bg)] transition-colors group cursor-pointer"
              >
                {/* Rank number */}
                <td className="py-4 pr-6 w-16 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    {isTop1 ? (
                      <span className="inline-flex items-center justify-center size-8 rounded-lg bg-amber-500 text-white font-black text-xs shadow-sm">
                        <Trophy size={14} />
                      </span>
                    ) : isTop2 ? (
                      <span className="inline-flex items-center justify-center size-8 rounded-lg bg-slate-500 text-white font-black text-xs shadow-sm">
                        <Medal size={14} />
                      </span>
                    ) : isTop3 ? (
                      <span className="inline-flex items-center justify-center size-8 rounded-lg bg-amber-700 text-white font-black text-xs shadow-sm">
                        <Award size={14} />
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center size-8 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] font-black text-xs tabular-nums">
                        {member.rank}
                      </span>
                    )}
                  </div>
                </td>

                {/* Member Info */}
                <td className="py-4 pr-6 whitespace-nowrap min-w-[200px]">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-xl bg-[var(--primary-soft)] text-[var(--primary)] font-bold flex items-center justify-center shrink-0 text-sm">
                      {member.full_name.trim().charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-[var(--text)] group-hover:text-[var(--primary)] transition-colors truncate">
                        {member.full_name}
                      </div>
                      <div className="text-xs text-[var(--text-muted)] truncate" dir="ltr">
                        {member.email}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Team */}
                <td className="py-4 pr-6 whitespace-nowrap">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-[var(--border)] bg-[var(--surface-2)] text-xs font-bold text-[var(--text-muted)]">
                    {member.team || 'Wasla'}
                  </span>
                </td>

                {/* Bonus Score */}
                <td className="py-4 pr-6 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black border ${
                      member.totalBonus > 0
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400'
                        : member.totalBonus < 0
                        ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400'
                        : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)]'
                    }`}
                  >
                    {member.totalBonus > 0 ? `+${member.totalBonus}` : member.totalBonus} نقطة
                  </span>
                </td>

                {/* Completion Rank */}
                <td className="py-4 pr-6 whitespace-nowrap text-xs font-bold text-[var(--text-muted)]">
                  {member.completion_rank ? `#${member.completion_rank}` : '—'}
                </td>

                {/* Date */}
                <td className="py-4 pr-6 whitespace-nowrap text-xs text-[var(--text-muted)] font-medium" dir="ltr">
                  {member.created_at ? formatDate(member.created_at, 'dd MMM yyyy') : '—'}
                </td>

                {/* Actions */}
                <td className="py-4 pr-6 pl-4 text-left whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      aria-label="عرض الملف الشخصي"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectMember?.(member);
                      }}
                      className="size-11 min-w-[44px] min-h-[44px] rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--surface)] transition-colors flex items-center justify-center"
                    >
                      <User size={16} />
                    </button>
                    {onAdjustBonus && (
                      <button
                        type="button"
                        aria-label="تعديل نقاط البونص"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAdjustBonus(member);
                        }}
                        className="size-11 min-w-[44px] min-h-[44px] rounded-xl bg-[var(--primary-soft)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-colors flex items-center justify-center"
                      >
                        <Edit3 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
