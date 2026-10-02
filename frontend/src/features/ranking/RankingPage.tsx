import { useMemo, useState } from 'react';
import { Trophy, Search, Filter, Plus, Users, Award } from 'lucide-react';
import type { Member } from '../../types/db';
import { useRanking } from './useRanking';
import { RankingPodium } from './RankingPodium';
import { RankingTable } from './RankingTable';
import { BonusAdjustmentModal } from './BonusAdjustmentModal';
import { MemberProfileModal } from '../members/MemberProfileModal';
import { Button } from '../../components/ui/Button';
import { CardSkeletons } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';

export default function RankingPage() {
  const { members, notes, rankedAllMembers, topThree, isLoading, isError, refetch } = useRanking();

  const [search, setSearch] = useState('');
  const [onlyWithBonus, setOnlyWithBonus] = useState(false);

  const [adjustingMember, setAdjustingMember] = useState<Member | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [profileMember, setProfileMember] = useState<Member | null>(null);

  const filteredMembers = useMemo(() => {
    return rankedAllMembers.filter((m) => {
      const q = search.trim().toLowerCase();
      const matchSearch = !q || m.full_name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
      const matchBonus = !onlyWithBonus || m.totalBonus !== 0;
      return matchSearch && matchBonus;
    });
  }, [rankedAllMembers, search, onlyWithBonus]);

  const handleOpenAdjust = (member?: Member) => {
    if (member) {
      setAdjustingMember(member);
    } else if (members.length > 0) {
      setAdjustingMember(members[0]);
    }
    setIsAdjustModalOpen(true);
  };

  if (isLoading) {
    return <div className="grid gap-5" dir="rtl"><CardSkeletons count={3} /></div>;
  }

  if (isError) {
    return <div className="grid gap-5" dir="rtl"><ErrorState message="تعذر تحميل بيانات الترتيب والتقييم." onRetry={() => { void refetch(); }} /></div>;
  }

  return (
    <div className="grid gap-6 text-start" dir="rtl">
      {/* Header */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 shadow-[var(--shadow-sm)]">
        <div className="flex items-start gap-3.5">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
            <Trophy size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-[var(--text)] sm:text-2xl">ترتيب الفريق (Leaderboard)</h2>
            <p className="mt-1 text-xs text-[var(--text-muted)] sm:text-sm max-w-xl leading-relaxed">
              ترتيب أعضاء وصلة حسب نقاط التقييم (البونص) ومؤشرات الإنجاز الموثقة بالسجل. انقر على أي عضو لعرض ملفه الكامل.
            </p>
          </div>
        </div>
        <Button onClick={() => handleOpenAdjust()} icon={<Plus size={17} />} fullOnMobile className="min-h-11">
          تسجيل تقييم جديد
        </Button>
      </section>

      {/* Top 3 Podium */}
      <section aria-label="منصة المتصدرين">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-black text-sm text-[var(--text)] flex items-center gap-2">
            <Award size={18} className="text-amber-500" />
            منصة المتصدرين (أعلى 3 أعضاء)
          </h3>
          <span className="text-xs text-[var(--text-muted)]">إجمالي الأعضاء: <b className="text-[var(--text)]">{members.length}</b></span>
        </div>
        <RankingPodium
          topMembers={topThree}
          onSelectMember={(m) => setProfileMember(m)}
          onAdjustBonus={(m) => handleOpenAdjust(m)}
        />
      </section>

      {/* Filters and Search */}
      <section className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]">
        <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2.5">
          <Filter size={16} className="text-[var(--primary)]" />
          <h4 className="font-bold text-xs text-[var(--text)]">تصفية وبحث جدول الترتيب</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search size={16} className="absolute end-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم أو البريد..."
              className="w-full h-11 rounded-xl border border-[var(--border)] bg-[var(--bg)] pe-9 ps-3 text-sm focus:outline-none focus:border-[var(--primary)]"
            />
          </div>
          <label className="flex items-center gap-2.5 h-11 px-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs font-bold text-[var(--text)] cursor-pointer">
            <input
              type="checkbox"
              checked={onlyWithBonus}
              onChange={(e) => setOnlyWithBonus(e.target.checked)}
              className="size-4 rounded text-[var(--primary)]"
            />
            <span>عرض أصحاب نقاط التقييم فقط (بونص ≠ 0)</span>
          </label>
        </div>
      </section>

      {/* Ranking Table */}
      <section aria-label="جدول الترتيب الكامل">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-black text-sm text-[var(--text)] flex items-center gap-2">
            <Users size={17} className="text-[var(--primary)]" />
            قائمة الترتيب العامة ({filteredMembers.length})
          </h3>
        </div>
        <RankingTable
          members={filteredMembers}
          onSelectMember={(m) => setProfileMember(m)}
          onAdjustBonus={(m) => handleOpenAdjust(m)}
        />
      </section>

      <BonusAdjustmentModal
        isOpen={isAdjustModalOpen}
        member={adjustingMember}
        onClose={() => {
          setIsAdjustModalOpen(false);
          setAdjustingMember(null);
        }}
        onSuccess={() => void refetch()}
      />

      <MemberProfileModal
        isOpen={Boolean(profileMember)}
        member={profileMember}
        notes={notes}
        onClose={() => setProfileMember(null)}
        onAdjustBonus={(m) => {
          setProfileMember(null);
          handleOpenAdjust(m);
        }}
      />
    </div>
  );
}
