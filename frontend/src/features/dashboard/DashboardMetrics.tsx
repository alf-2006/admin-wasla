import { Clock3, Laptop, MapPinned, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { DashboardMetrics } from './metrics';

const cards = [
  { key: 'totalMembers', title: 'أعضاء الفريق', icon: Users, color: 'text-[var(--link)]', to: '/admin/members', value: (metrics: DashboardMetrics) => metrics.totalMembers, detail: 'إجمالي الأعضاء المسجلين — اضغط للعرض' },
  { key: 'laptopPercentage', title: 'جاهزية الأجهزة', icon: Laptop, color: 'text-cyan-700 dark:text-cyan-300', to: '/admin/members', value: (metrics: DashboardMetrics) => `${metrics.laptopPercentage}%`, detail: (metrics: DashboardMetrics) => `${metrics.laptopCount} لديهم لابتوب — اضغط للعرض` },
  { key: 'alexPercentage', title: 'جاهزية الميدان', icon: MapPinned, color: 'text-emerald-700 dark:text-emerald-300', to: '/admin/members', value: (metrics: DashboardMetrics) => `${metrics.alexPercentage}%`, detail: (metrics: DashboardMetrics) => `${metrics.alexCount} متاحون للنزول — اضغط للعرض` },
  { key: 'underReview', title: 'تسليمات للمراجعة', icon: Clock3, color: 'text-amber-700 dark:text-amber-300', to: '/admin/tasks', value: (metrics: DashboardMetrics) => metrics.underReview, detail: (metrics: DashboardMetrics) => metrics.overdue ? `${metrics.overdue} مهام متأخرة — اضغط للمراجعة` : 'لا توجد مهام متأخرة — اضغط للمراجعة' },
];

export function DashboardMetricsGrid({ metrics }: { metrics: DashboardMetrics }) {
  const navigate = useNavigate();
  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="مؤشرات الفريق">
      {cards.map(({ key, title, icon: Icon, color, to, value, detail }) => (
        <button key={key} type="button" onClick={() => navigate(to)} aria-label={`${title} — عرض التفاصيل`} className="min-w-0 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 text-start shadow-[var(--shadow-sm)] transition-colors hover:bg-[var(--surface-2)] focus-visible:outline-2 sm:p-5">
          <div className="flex items-start justify-between gap-2"><h2 className="text-sm font-bold text-[var(--text-2)]">{title}</h2><Icon size={20} className={`${color} shrink-0`} aria-hidden="true" /></div>
          <p className={`mt-4 text-2xl font-black ${color}`}>{value(metrics)}</p>
          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{typeof detail === 'string' ? detail : detail(metrics)}</p>
        </button>
      ))}
    </section>
  );
}
