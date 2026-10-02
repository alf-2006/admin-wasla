import { Laptop, MapPin } from 'lucide-react';
import type { Member } from '../../types/db';

export function MemberHero({ member, onToggleField, isUpdating }: { member: Member; onToggleField: () => void; isUpdating: boolean }) {
  return (
    <section className="grid gap-5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)] sm:p-6" aria-labelledby="member-name">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="flex min-w-0 items-start gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[var(--primary)] text-xl font-black text-white">{member.full_name.charAt(0)}</span>
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1 id="member-name" className="text-xl font-black sm:text-2xl">{member.full_name}</h1></div><p className="mt-1 text-sm leading-6 text-[var(--text-2)]">{member.bio || 'عضو فاعل ومبدع في الفريق'}</p><p className="mt-1 break-all text-sm text-[var(--text-muted)]" dir="ltr">{member.email}</p></div>
        </div>
      </div>
      <div className="grid gap-2 border-t border-[var(--border)] pt-4 sm:grid-cols-2">
        <ReadinessInfo icon={<Laptop size={18} />} label="الجهاز المتوفر" value={member.device || 'غير محدد'} />
        <button type="button" onClick={onToggleField} disabled={isUpdating} aria-pressed={member.can_go_alexandria} className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 text-start text-sm font-bold disabled:opacity-60">
          <span className="flex items-center gap-2"><MapPin size={18} aria-hidden="true" />جاهزية الميدان</span><span>{member.can_go_alexandria ? 'متاح' : 'غير متاح'}</span>
        </button>
      </div>
    </section>
  );
}

function ReadinessInfo({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 text-sm"><span className="flex items-center gap-2 text-[var(--text-muted)]">{icon}{label}</span><strong>{value}</strong></div>;
}
