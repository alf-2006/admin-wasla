import { RotateCcw, Search } from 'lucide-react';

export interface MemberFiltersValue { search: string; work_conditions: string; device: string; alexandria: string; }

export function MemberToolbar({
  workConditions,
  value,
  onChange,
  resultCount,
  totalCount,
}: {
  workConditions: string[];
  value: MemberFiltersValue;
  onChange: (value: MemberFiltersValue) => void;
  resultCount: number;
  totalCount: number;
}) {
  const set = (key: keyof MemberFiltersValue, next: string) => onChange({ ...value, [key]: next });
  const isActive =
    value.search.trim() !== '' || value.work_conditions !== 'ALL' || value.device !== 'ALL' || value.alexandria !== 'ALL';
  const clear = () => onChange({ search: '', work_conditions: 'ALL', device: 'ALL', alexandria: 'ALL' });

  const selectClass = 'h-[var(--touch)] rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-0 text-sm font-bold text-[var(--text)] transition-colors hover:border-[var(--primary-hover)] focus-visible:border-[var(--primary-hover)] outline-none min-w-36';

  return (
    <div className="flex flex-col gap-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 md:flex-row md:items-center">
      <div className="flex flex-1 flex-wrap items-center gap-4">
        <span className="relative flex-1 min-w-48">
          <Search size={18} aria-hidden="true" className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={value.search}
            onChange={(event) => set('search', event.target.value)}
            placeholder="البحث بالاسم، الهاتف..."
            className="h-[var(--touch)] w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] pe-10 ps-3 text-sm font-bold text-[var(--text)] placeholder-[var(--text-muted)] transition-colors hover:border-[var(--primary-hover)] focus-visible:border-[var(--primary-hover)] focus-visible:bg-[var(--surface)] outline-none"
            aria-label="البحث"
          />
        </span>
        <select value={value.work_conditions} onChange={(event) => set('work_conditions', event.target.value)} className={selectClass} aria-label="حالة العمل">
          <option value="ALL">جميع حالات العمل</option>
          {workConditions.map((condition) => <option key={condition} value={condition}>{condition}</option>)}
        </select>
        <select value={value.device} onChange={(event) => set('device', event.target.value)} className={selectClass} aria-label="الجهاز">
          <option value="ALL">جميع الأجهزة</option>
          <option value="لابتوب">لابتوب</option>
          <option value="كمبيوتر">كمبيوتر مكتبي (PC)</option>
          <option value="هاتف">هاتف محمول</option>
          <option value="بدون">بدون جهاز</option>
        </select>
        <select value={value.alexandria} onChange={(event) => set('alexandria', event.target.value)} className={selectClass} aria-label="الاستعداد الميداني">
          <option value="ALL">ميداني: الكل</option>
          <option value="YES">جاهز للنزول الميداني</option>
          <option value="NO">غير متاح</option>
        </select>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-4 border-t border-[var(--border)] pt-4 md:border-t-0 md:border-s md:pt-0 md:ps-4">
        <p className="text-sm font-bold text-[var(--text-muted)]" role="status">
          <span className="font-black text-[var(--link)]">{resultCount}</span> / {totalCount}
        </p>
        {isActive && (
          <button
            type="button"
            onClick={clear}
            className="inline-flex h-[var(--touch)] items-center justify-center gap-1.5 rounded-[var(--radius-sm)] px-3 text-xs font-black text-[var(--link)] hover:bg-[var(--primary-soft)]"
          >
            <RotateCcw size={15} aria-hidden="true" />
            مسح
          </button>
        )}
      </div>
    </div>
  );
}
