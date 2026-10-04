import { RotateCcw, Search } from 'lucide-react';

export interface MemberFiltersValue { search: string; work_conditions: string; device: string; alexandria: string; }

/**
 * شريط أدوات التصفية: صف واحد على سطح المكتب، يلتف على الجوال.
 * زر مسح + عدد النتائج.
 */
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

  const selectClass = 'member-toolbar-input';
  const labelOf = (id: string, text: string) => (
    <label className="member-toolbar-label" htmlFor={id}>{text}</label>
  );

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-[var(--text-muted)]" role="status">
          عدد النتائج: <span className="font-black text-[var(--link)]">{resultCount}</span>
          <span className="font-normal"> من {totalCount}</span>
        </p>
        {isActive && (
          <button
            type="button"
            onClick={clear}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-xs font-black text-[var(--link)] hover:bg-[var(--primary-soft)]"
          >
            <RotateCcw size={15} aria-hidden="true" />
            مسح الفلاتر
          </button>
        )}
      </div>
      <div className="member-toolbar" role="search" aria-label="تصفية الأعضاء">
        <div className="member-toolbar-field member-toolbar-search">
          {labelOf('member-search', 'البحث')}
          <span className="relative block">
            <Search size={18} aria-hidden="true" className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              id="member-search"
              value={value.search}
              onChange={(event) => set('search', event.target.value)}
              placeholder="الاسم أو البريد أو الهاتف..."
              className="member-toolbar-input pe-10"
            />
          </span>
        </div>
        <div className="member-toolbar-field">
          {labelOf('member-work', 'ظروف العمل')}
          <select id="member-work" value={value.work_conditions} onChange={(event) => set('work_conditions', event.target.value)} className={selectClass}>
            <option value="ALL">الكل</option>
            {workConditions.map((condition) => <option key={condition} value={condition}>{condition}</option>)}
          </select>
        </div>
        <div className="member-toolbar-field">
          {labelOf('member-device', 'حالة الجهاز')}
          <select id="member-device" value={value.device} onChange={(event) => set('device', event.target.value)} className={selectClass}>
            <option value="ALL">جميع الأجهزة</option>
            <option value="لابتوب">لابتوب</option>
            <option value="كمبيوتر">كمبيوتر مكتبي (PC)</option>
            <option value="هاتف">هاتف محمول</option>
            <option value="بدون">بدون جهاز</option>
          </select>
        </div>
        <div className="member-toolbar-field">
          {labelOf('member-alex', 'الاستعداد الميداني')}
          <select id="member-alex" value={value.alexandria} onChange={(event) => set('alexandria', event.target.value)} className={selectClass}>
            <option value="ALL">الكل</option>
            <option value="YES">متاح للنزول الميداني</option>
            <option value="NO">غير متاح</option>
          </select>
        </div>
      </div>
    </div>
  );
}
