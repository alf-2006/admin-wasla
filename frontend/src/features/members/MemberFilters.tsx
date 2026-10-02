import { Search, Filter } from 'lucide-react';

export interface MemberFiltersValue { search: string; work_conditions: string; device: string; alexandria: string; }

export function MemberFilters({ workConditions, value, onChange }: { workConditions: string[]; value: MemberFiltersValue; onChange: (value: MemberFiltersValue) => void }) {
  const set = (key: keyof MemberFiltersValue, next: string) => onChange({ ...value, [key]: next });
  
  return <div className="flex flex-col gap-4">
    <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
      <Filter size={18} className="text-[var(--primary)]" />
      <h3 className="font-bold text-[var(--text)]">محددات العرض</h3>
    </div>
    
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-bold text-[var(--text-muted)]">البحث</span>
        <div className="relative">
          <Search size={18} className="absolute end-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input value={value.search} onChange={(event) => set('search', event.target.value)} placeholder="الاسم أو البريد..." className="w-full h-11 bg-[var(--bg)] border border-[var(--border)] rounded-xl pe-10 ps-4 text-sm focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-shadow text-[var(--text)] placeholder:text-[var(--text-muted)]" />
        </div>
      </label>


      
      <label className="flex flex-col gap-2">
        <span className="text-sm font-bold text-[var(--text-muted)]">ظروف العمل</span>
        <select value={value.work_conditions} onChange={(event) => set('work_conditions', event.target.value)} className="w-full h-11 bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 text-sm focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-shadow text-[var(--text)]">
          <option value="ALL">الكل</option>
          {workConditions.map((condition) => <option key={condition} value={condition}>{condition}</option>)}
        </select>
      </label>
      
      <label className="flex flex-col gap-2">
        <span className="text-sm font-bold text-[var(--text-muted)]">حالة الجهاز</span>
        <select value={value.device} onChange={(event) => set('device', event.target.value)} className="w-full h-11 bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 text-sm focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-shadow text-[var(--text)]">
          <option value="ALL">جميع الأجهزة</option>
          <option>لابتوب</option>
          <option>كمبيوتر</option>
          <option>بدون</option>
        </select>
      </label>
      
      <label className="flex flex-col gap-2">
        <span className="text-sm font-bold text-[var(--text-muted)]">الاستعداد الميداني</span>
        <select value={value.alexandria} onChange={(event) => set('alexandria', event.target.value)} className="w-full h-11 bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 text-sm focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-shadow text-[var(--text)]">
          <option value="ALL">الكل</option>
          <option value="YES">متاح للنزول الميداني</option>
          <option value="NO">غير متاح</option>
        </select>
      </label>
    </div>
  </div>;
}
