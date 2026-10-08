import { useState, useEffect } from 'react';
import { Users, Eye, EyeOff, Trash2, Footprints } from 'lucide-react';
import AnnouncementsAPI from '../../../lib/api/announcements';
import type { AnnouncementMemberDetail, AnnouncementStats } from '../../../types/db';
import { Modal } from '../../../components/ui/Modal';
import { ErrorState } from '../../../components/ui/ErrorState';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Badge } from '../../../components/ui/Badge';

interface AnnouncementStatsModalProps {
  announcementId: number;
  onClose: () => void;
}

export default function AnnouncementStatsModal({
  announcementId,
  onClose,
}: AnnouncementStatsModalProps) {
  const [stats, setStats] = useState<AnnouncementStats | null>(null);
  const [details, setDetails] = useState<AnnouncementMemberDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsData, detailsData] = await Promise.all([
        AnnouncementsAPI.getAnnouncementStats(announcementId),
        AnnouncementsAPI.getAnnouncementDetails(announcementId),
      ]);
      setStats(statsData);
      setDetails(detailsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير معروف');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [announcementId]);

  const getReadPercentage = () => {
    if (!stats || stats.total_recipients === 0) return 0;
    return Math.round((stats.read_count / stats.total_recipients) * 100);
  };

  const getDismissedPercentage = () => {
    if (!stats || stats.total_recipients === 0) return 0;
    return Math.round((stats.dismissed_count / stats.total_recipients) * 100);
  };

  const getViewedPercentage = () => {
    if (!stats || stats.total_recipients === 0) return 0;
    return Math.round((stats.viewed_count / stats.total_recipients) * 100);
  };

  const formatDateTime = (value: string | null) => {
    if (!value) return '—';
    return new Intl.DateTimeFormat('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  };

  const memberStatus = (row: AnnouncementMemberDetail): { label: string; variant: 'success' | 'info' | 'warning' | 'neutral' } => {
    if (row.dismissed_at) return { label: 'مسح الإعلان', variant: 'neutral' };
    if (row.read_at) return { label: 'قرأ الإعلان', variant: 'success' };
    if (row.viewed_at) return { label: 'فتح ولم يقرأ', variant: 'warning' };
    return { label: 'لم يفتح بعد', variant: 'info' };
  };

  return (
    <Modal isOpen onClose={onClose} title="إحصائيات الإعلان" maxWidth="lg">
      <div className="grid gap-4" dir="rtl">
        {loading ? (
          <div className="grid gap-3" role="status" aria-label="جاري تحميل الإحصائيات">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={() => { void loadStats(); }} />
        ) : !stats ? (
          <div className="py-8 text-center text-[var(--text-muted)]">
            لا توجد إحصائيات متاحة لهذا الإعلان
          </div>
        ) : (
          <div className="grid gap-4">
            {/* إجمالي المستلمين */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--primary-soft)] p-4">
              <div className="mb-2 flex items-center gap-3">
                <Users className="text-[var(--link)]" size={24} aria-hidden="true" />
                <h3 className="font-semibold text-[var(--text)]">إجمالي المستلمين</h3>
              </div>
              <p className="text-2xl font-bold text-[var(--text)]">
                {stats.total_recipients}
              </p>
              <p className="text-sm text-[var(--text-muted)]">
                عدد الأعضاء الذين وُجه إليهم هذا الإعلان
              </p>
            </div>

            {/* إحصائيات المشاهدة والقراءة والمسح */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* فتح الإعلان */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Footprints className="text-[var(--link)]" size={20} aria-hidden="true" />
                  <h4 className="font-semibold text-[var(--text)]">فتح الإعلان</h4>
                </div>
                <p className="text-xl font-bold text-[var(--text)]">
                  {stats.viewed_count}
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {getViewedPercentage()}% فتحوه ولو مرة واحدة
                </p>
              </div>

              {/* تمت القراءة */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
                <div className="mb-2 flex items-center gap-2">
                  <Eye className="text-emerald-600 dark:text-emerald-400" size={20} aria-hidden="true" />
                  <h4 className="font-semibold text-emerald-900 dark:text-emerald-100">تمت القراءة</h4>
                </div>
                <p className="text-xl font-bold text-emerald-900 dark:text-emerald-100">
                  {stats.read_count}
                </p>
                <div className="mt-2">
                  <div className="h-2 rounded-full bg-emerald-200 dark:bg-emerald-900" role="progressbar" aria-valuenow={getReadPercentage()} aria-valuemin={0} aria-valuemax={100} aria-label="نسبة القراءة">
                    <div
                      className="h-2 rounded-full bg-emerald-600 transition-all duration-500 dark:bg-emerald-400"
                      style={{ width: `${getReadPercentage()}%` }}
                    ></div>
                  </div>
                  <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                    {getReadPercentage()}% من المستلمين
                  </p>
                </div>
              </div>

              {/* تم المسح */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Trash2 className="text-[var(--text-muted)]" size={20} aria-hidden="true" />
                  <h4 className="font-semibold text-[var(--text)]">تم المسح</h4>
                </div>
                <p className="text-xl font-bold text-[var(--text)]">
                  {stats.dismissed_count}
                </p>
                <div className="mt-2">
                  <div className="h-2 rounded-full bg-[var(--border)]" role="progressbar" aria-valuenow={getDismissedPercentage()} aria-valuemin={0} aria-valuemax={100} aria-label="نسبة المسح">
                    <div
                      className="h-2 rounded-full bg-[var(--text-muted)] transition-all duration-500"
                      style={{ width: `${getDismissedPercentage()}%` }}
                    ></div>
                  </div>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {getDismissedPercentage()}% من المستلمين
                  </p>
                </div>
              </div>
            </div>

            {/* لم يقرأ بعد */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
              <div className="mb-2 flex items-center gap-2">
                <EyeOff className="text-amber-600 dark:text-amber-400" size={20} aria-hidden="true" />
                <h4 className="font-semibold text-amber-900 dark:text-amber-100">لم يقرأ بعد</h4>
              </div>
              <p className="text-xl font-bold text-amber-900 dark:text-amber-100">
                {stats.pending_count}
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                عدد الأعضاء الذين لم يقرأوا الإعلان بعد
              </p>
            </div>

            {/* تفاصيل كل عضو */}
            <div className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4">
              <h4 className="font-black text-[var(--text)]">تفاصيل الأعضاء ({details.length})</h4>
              {details.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">لا يوجد مستلمون لهذا الإعلان.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table text-sm">
                    <thead>
                      <tr className="text-xs text-[var(--text-muted)]">
                        <th className="text-start font-bold">العضو</th>
                        <th className="text-start font-bold">الحالة</th>
                        <th className="text-start font-bold">أول فتح</th>
                        <th className="text-start font-bold">آخر فتح (مرات)</th>
                        <th className="text-start font-bold">تمت القراءة</th>
                        <th className="text-start font-bold">المسح</th>
                      </tr>
                    </thead>
                    <tbody>
                      {details.map((row) => {
                        const status = memberStatus(row);
                        return (
                          <tr key={row.member_id}>
                            <td data-label="العضو">
                              <p className="font-bold text-[var(--text)]">{row.full_name}</p>
                              <p className="text-xs text-[var(--text-muted)]" dir="ltr">{row.email}</p>
                            </td>
                            <td data-label="الحالة">
                              <Badge variant={status.variant === 'success' ? 'success' : status.variant === 'warning' ? 'warning' : status.variant === 'info' ? 'info' : 'neutral'}>
                                {status.label}
                              </Badge>
                            </td>
                            <td data-label="أول فتح" className="whitespace-nowrap text-[var(--text-2)]">{formatDateTime(row.viewed_at)}</td>
                            <td data-label="آخر فتح" className="whitespace-nowrap text-[var(--text-2)]">
                              {row.view_count > 0 ? `${formatDateTime(row.last_viewed_at)} (${row.view_count})` : '—'}
                            </td>
                            <td data-label="تمت القراءة" className="whitespace-nowrap text-[var(--text-2)]">{formatDateTime(row.read_at)}</td>
                            <td data-label="المسح" className="whitespace-nowrap text-[var(--text-2)]">{formatDateTime(row.dismissed_at)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ملخص سريع */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <h4 className="mb-3 font-semibold text-[var(--text)]">ملخص سريع</h4>
              <dl className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-[var(--text-muted)]">معدل الفتح:</dt>
                  <dd className="font-medium text-[var(--text)]">{getViewedPercentage()}%</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--text-muted)]">معدل القراءة:</dt>
                  <dd className="font-medium text-[var(--text)]">{getReadPercentage()}%</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--text-muted)]">معدل المسح:</dt>
                  <dd className="font-medium text-[var(--text)]">{getDismissedPercentage()}%</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--text-muted)]">معدل الانتظار:</dt>
                  <dd className="font-medium text-[var(--text)]">
                    {stats.total_recipients > 0 ? Math.round((stats.pending_count / stats.total_recipients) * 100) : 0}%
                  </dd>
                </div>
              </dl>
            </div>

            {/* معلومات إضافية */}
            {stats.total_recipients > 0 && (
              <p className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-xs leading-6 text-[var(--text-muted)]">
                إذا كان معدل القراءة منخفضاً، جرب تغيير توقيت الإرسال أو استخدام عناوين أكثر جذباً.
                إذا كان معدل المسح عالياً، قد تحتاج لمراجعة محتوى الإعلانات لجعلها أكثر فائدة للأعضاء.
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
