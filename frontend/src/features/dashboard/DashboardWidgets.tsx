import { Trophy, TrendingDown, Clock, Activity, History, Laptop, BarChart3, Users, PieChart as PieChartIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, AreaChart, Area, CartesianGrid } from 'recharts';
import type { Task } from '../../types/db';
import type { DashboardMetrics } from './metrics';
import { formatDate, formatRelativeTime } from '../../lib/dateUtils';

const COLORS = ['#10B981', '#3B82F6', '#EF4444', '#9CA3AF'];

export function DashboardWidgets({ metrics }: { metrics: DashboardMetrics; tasks: Task[] }) {
  const navigate = useNavigate();

  const tasksData = [
    { name: 'مكتمل', value: metrics.approvedTasks ?? 0 },
    { name: 'قيد التنفيذ', value: metrics.inProgress ?? 0 },
    { name: 'متأخر', value: metrics.overdue ?? 0 },
    { name: 'لم يبدأ', value: metrics.notStarted ?? 0 },
  ].filter(d => d.value > 0);

  const deviceData = [
    { name: 'لاب توب', count: metrics.laptopCount ?? 0, fill: '#10B981' },
    { name: 'كمبيوتر', count: metrics.pcCount ?? 0, fill: '#3B82F6' },
    { name: 'تابلت/هاتف', count: Math.max(0, (metrics.totalMembers ?? 0) - (metrics.laptopCount ?? 0) - (metrics.pcCount ?? 0)), fill: '#F59E0B' },
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      
      {/* 1. Tasks Analytics */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-black"><PieChartIcon size={18} className="text-violet-600" />حالة المهام (Tasks)</h3>
          <button onClick={() => navigate('/admin/tasks')} className="text-sm font-bold text-[var(--link)] hover:text-purple-700">إدارة المهام</button>
        </div>
        <div className="h-56 w-full">
          {tasksData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={tasksData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                  {tasksData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--surface)', fontWeight: 'bold' }} itemStyle={{color: 'var(--text)'}} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm font-bold text-[var(--text-muted)]">لا توجد مهام حالياً</div>
          )}
        </div>
        <div className="mt-2 flex flex-wrap justify-center gap-4 text-xs font-bold text-[var(--text-secondary)]">
          <span className="flex items-center gap-2"><span className="size-3 rounded-full bg-[#10B981]"></span>مكتمل ({metrics.approvedTasks ?? 0})</span>
          <span className="flex items-center gap-2"><span className="size-3 rounded-full bg-[#3B82F6]"></span>قيد التنفيذ ({metrics.inProgress ?? 0})</span>
          <span className="flex items-center gap-2"><span className="size-3 rounded-full bg-[#EF4444]"></span>متأخر ({metrics.overdue ?? 0})</span>
        </div>
      </div>

      {/* 2. Top Ranking */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-black"><Trophy size={18} className="text-amber-500" />أعلى 3 أعضاء (الترتيب)</h3>
          <button onClick={() => navigate('/admin/ranking')} className="text-sm font-bold text-[var(--link)] hover:text-purple-700">لوحة الترتيب</button>
        </div>
        <div className="grid gap-3">
          {(metrics.topMembers ?? []).length > 0 ? metrics.topMembers.map((m, i) => (
            <div key={m.id} onClick={() => navigate('/admin/ranking')} className="flex cursor-pointer items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3 transition-colors hover:border-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/20">
              <div className="flex items-center gap-3">
                <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg font-black text-white ${i === 0 ? 'bg-amber-500 shadow-sm' : i === 1 ? 'bg-slate-400 shadow-sm' : 'bg-amber-700 shadow-sm'}`}>
                  {i + 1}
                </div>
                <div className="font-bold text-[var(--text)]">{m.full_name}</div>
              </div>
              <div className="flex flex-col items-center rounded-lg border-2 border-dashed border-violet-500 bg-[var(--card)] px-3 py-1 font-black text-violet-600 dark:border-violet-400 dark:text-violet-400">
                <span>+{m.totalBonus}</span>
              </div>
            </div>
          )) : (
            <div className="flex h-32 flex-col items-center justify-center text-[var(--text-muted)]"><Trophy size={32} className="mb-2 opacity-50" /><span className="text-sm font-bold">لم يتم تسجيل نقاط بونص بعد</span></div>
          )}
        </div>
      </div>

      {/* 3. Device Readiness */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-black"><Laptop size={18} className="text-violet-600" />جاهزية الأجهزة</h3>
        </div>
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={deviceData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)', fontWeight: 600 }} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--surface)', fontWeight: 'bold' }} itemStyle={{color: 'var(--text)'}} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Danger Zone (Lowest Ranking) */}
      <div className="rounded-[var(--radius-lg)] border border-red-200 bg-[#fff5f5] p-5 shadow-sm dark:border-red-900/50 dark:bg-red-950/10">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-black text-red-600 dark:text-red-500"><TrendingDown size={18} />مؤشر الخطر (أقل بونص)</h3>
        </div>
        <div className="grid gap-2">
          {(metrics.lowestMembers ?? []).length > 0 ? metrics.lowestMembers.map(m => (
            <div key={m.id} className="flex items-center justify-between border-b border-dashed border-red-200 pb-2 last:border-0 last:pb-0 dark:border-red-900/50">
              <div className="flex items-center gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-red-200 bg-red-50 font-black text-red-600 dark:border-red-800 dark:bg-red-900/30">{m.full_name.charAt(0)}</div>
                <span className="font-bold text-[var(--text)]">{m.full_name}</span>
              </div>
              <span className="rounded-md border border-red-200 bg-red-50 px-2 py-0.5 font-black text-red-600 dark:border-red-800 dark:bg-red-900/30">{m.totalBonus}</span>
            </div>
          )) : (
             <div className="flex h-32 flex-col items-center justify-center text-emerald-600 dark:text-emerald-500"><div className="mb-2 flex size-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30"><div className="size-6 rounded-full border-2 border-current" /></div><span className="text-sm font-bold">لا يوجد أعضاء في نطاق الخطر!</span></div>
          )}
        </div>
      </div>

      {/* 5. Performance Trends Over Time */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm lg:col-span-2">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-black"><BarChart3 size={18} className="text-violet-600" />أداء الفريق بمرور الوقت (نقاط بونص)</h3>
        </div>
        <div className="h-56 w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={metrics.timelineData ?? []} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="date" tickFormatter={(v) => typeof v === 'string' && v.includes('-') ? formatDate(v, 'dd MMM') : v} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)', fontWeight: 600 }} dy={10} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <Tooltip labelFormatter={(v) => typeof v === 'string' && v.includes('-') ? formatDate(v as string) : v} contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--surface)', fontWeight: 'bold' }} itemStyle={{color: 'var(--text)'}} />
              <Area type="monotone" dataKey="bonus" name="إجمالي البونص" stroke="#8B5CF6" strokeWidth={2} fill="#8B5CF6" fillOpacity={0.15} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 6. Late tasks radar */}
      <div className="rounded-[var(--radius-lg)] border border-amber-200 bg-[#fffbeb] p-5 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/10">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-black text-amber-700 dark:text-amber-500"><Clock size={18} />متأخرون عن المهام</h3>
          <button onClick={() => navigate('/admin/tasks')} className="text-sm font-bold text-[var(--link)] hover:text-amber-600">عرض المهام</button>
        </div>
        <div className="grid gap-2">
          {(metrics.lateMembers ?? []).length > 0 ? metrics.lateMembers.slice(0, 5).map((item, idx) => (
            <div key={`${item.member.id}-${idx}`} className="flex items-center justify-between border-b border-dashed border-amber-200 pb-2 last:border-0 last:pb-0 dark:border-amber-900/50">
              <div className="flex items-center gap-3">
                <Users size={16} className="text-amber-600 opacity-70" />
                <span className="font-bold text-[var(--text)]">{item.member.full_name}</span>
              </div>
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-black text-red-700 dark:bg-red-900/50 dark:text-red-400">متأخر</span>
            </div>
          )) : (
            <div className="flex h-32 flex-col items-center justify-center text-[var(--text-muted)]"><Clock size={28} className="mb-2 opacity-40 text-amber-600" /><span className="text-sm font-bold">الكل ملتزم بالوقت!</span></div>
          )}
        </div>
      </div>

      {/* 7. Recent Activity Feed */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-black"><History size={18} className="text-violet-600" />أحدث النشاطات</h3>
        </div>
        <div className="relative grid gap-4 before:absolute before:right-[15px] before:top-2 before:h-[calc(100%-20px)] before:w-0.5 before:bg-[var(--border-light)]">
          {(metrics.recentActivity ?? []).length > 0 ? metrics.recentActivity.map((activity) => (
            <div key={activity.id} className="relative z-10 flex items-start gap-4">
              <div className={`flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-[var(--surface)] text-white shadow-sm ${activity.type === 'note' ? 'bg-violet-500' : activity.type === 'task' ? 'bg-blue-500' : 'bg-emerald-500'}`}>
                {activity.type === 'note' ? <Activity size={14} /> : activity.type === 'task' ? <Clock size={14} /> : <Users size={14} />}
              </div>
              <div className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3 shadow-sm">
                <p className="font-bold text-[var(--text)]">{activity.title}</p>
                <div className="mt-1 flex items-center justify-between text-xs font-semibold text-[var(--text-muted)]">
                  <span>{activity.meta}</span>
                  <span dir="ltr">{activity.date instanceof Date ? formatRelativeTime(activity.date.toISOString()) : 'الآن'}</span>
                </div>
              </div>
            </div>
          )) : (
            <div className="flex h-32 items-center justify-center text-sm font-bold text-[var(--text-muted)]">لا يوجد نشاطات مسجلة</div>
          )}
        </div>
      </div>

    </div>
  );
}
