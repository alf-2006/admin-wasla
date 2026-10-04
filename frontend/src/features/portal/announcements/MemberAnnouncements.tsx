import { useState, useEffect } from 'react';
import { Bell, Eye, Clock, AlertTriangle, Info } from 'lucide-react';
import AnnouncementsAPI from '../../../lib/api/announcements';
import type { MemberAnnouncement } from '../../../types/db';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { ErrorState } from '../../../components/ui/ErrorState';
import { EmptyState } from '../../../components/ui/EmptyState';
import { CardSkeletons } from '../../../components/ui/Skeleton';
import { toast } from '../../../store/toast';

interface MemberAnnouncementsProps {
  memberId: number;
}

export default function MemberAnnouncements({ memberId }: MemberAnnouncementsProps) {
  const [announcements, setAnnouncements] = useState<MemberAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionsLoading, setActionsLoading] = useState<Set<number>>(new Set());

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await AnnouncementsAPI.getMemberAnnouncements(memberId);
      setAnnouncements(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ في تحميل الإعلانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (memberId) {
      void loadAnnouncements();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId]);

  const handleMarkAsRead = async (announcementId: number) => {
    if (actionsLoading.has(announcementId)) return;

    try {
      setActionsLoading(prev => new Set([...prev, announcementId]));

      const success = await AnnouncementsAPI.markAnnouncementRead(announcementId, memberId);
      if (success) {
        setAnnouncements(prev =>
          prev.map(ann =>
            ann.id === announcementId
              ? { ...ann, is_read: true }
              : ann
          )
        );
        toast.success('تم تعليم الإعلان كمقروء.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'تعذر تعليم الإعلان كمقروء.');
    } finally {
      setActionsLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(announcementId);
        return newSet;
      });
    }
  };

  const handleDismiss = async (announcementId: number) => {
    if (actionsLoading.has(announcementId)) return;

    try {
      setActionsLoading(prev => new Set([...prev, announcementId]));

      const success = await AnnouncementsAPI.dismissAnnouncement(announcementId, memberId);
      if (success) {
        setAnnouncements(prev =>
          prev.filter(ann => ann.id !== announcementId)
        );
        toast.success('تم مسح الإعلان.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'تعذر مسح الإعلان.');
    } finally {
      setActionsLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(announcementId);
        return newSet;
      });
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <AlertTriangle className="text-red-600 dark:text-red-400" size={18} aria-hidden="true" />;
      case 'high':
        return <AlertTriangle className="text-amber-600 dark:text-amber-400" size={18} aria-hidden="true" />;
      case 'normal':
        return <Info className="text-[var(--link)]" size={18} aria-hidden="true" />;
      case 'low':
        return <Clock className="text-[var(--text-muted)]" size={18} aria-hidden="true" />;
      default:
        return <Bell className="text-[var(--link)]" size={18} aria-hidden="true" />;
    }
  };

  const getPriorityVariant = (priority: string): 'neutral' | 'info' | 'warning' | 'danger' => {
    if (priority === 'urgent') return 'danger';
    if (priority === 'high') return 'warning';
    if (priority === 'normal') return 'info';
    return 'neutral';
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  };

  const unreadCount = announcements.filter(ann => !ann.is_read).length;

  if (loading) {
    return (
      <div dir="rtl" aria-label="جاري تحميل الإعلانات">
        <CardSkeletons count={2} />
      </div>
    );
  }

  if (error) {
    return (
      <div dir="rtl">
        <ErrorState message={error} onRetry={() => { void loadAnnouncements(); }} />
      </div>
    );
  }

  return (
    <div className="grid gap-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--link)]">
            <Bell size={20} aria-hidden="true" />
          </span>
          <h2 className="text-xl font-black text-[var(--text)]">الإعلانات</h2>
          {unreadCount > 0 && (
            <Badge variant="danger">
              {unreadCount} جديد
            </Badge>
          )}
        </div>

        {announcements.length > 0 && (
          <p className="text-sm text-[var(--text-muted)]">
            {announcements.length} إعلان
          </p>
        )}
      </div>

      {announcements.length === 0 ? (
        <EmptyState title="لا توجد إعلانات" description="ستظهر هنا الإعلانات الجديدة من الإدارة." />
      ) : (
        <div className="grid gap-3">
          {announcements.map((announcement) => (
            <Card
              key={announcement.id}
              className={`grid gap-3 p-4 transition-colors sm:p-5 ${
                !announcement.is_read
                  ? 'border-s-4 border-s-[var(--primary)] bg-[var(--primary-soft)]'
                  : ''
              }`}
            >
                {/* Header with title and priority */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    {getPriorityIcon(announcement.priority)}
                    <h3 className="font-black text-[var(--text)]">
                      {announcement.title}
                    </h3>
                    <Badge variant={getPriorityVariant(announcement.priority)}>
                      {AnnouncementsAPI.getPriorityLabel(announcement.priority)}
                    </Badge>
                    {!announcement.is_read && (
                      <Badge variant="info">
                        جديد
                      </Badge>
                    )}
                  </div>

                  <time className="shrink-0 text-xs text-[var(--text-muted)]">
                    {formatDate(announcement.created_at)}
                  </time>
                </div>

                {/* Content */}
                <p className={`text-sm leading-6 ${
                  !announcement.is_read ? 'font-semibold text-[var(--text)]' : 'text-[var(--text-2)]'
                }`}>
                  {announcement.content}
                </p>

                {/* Actions */}
                <div className="flex flex-col gap-2 border-t border-[var(--border)] pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    {!announcement.is_read ? (
                      <Button
                        variant="secondary"
                        onClick={() => handleMarkAsRead(announcement.id)}
                        isLoading={actionsLoading.has(announcement.id)}
                        loadingText="جارٍ..."
                        icon={<Eye size={16} aria-hidden="true" />}
                        fullOnMobile
                      >
                        تمت القراءة
                      </Button>
                    ) : (
                      <span className="flex min-h-11 items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-400">
                        <Eye size={16} aria-hidden="true" />
                        تمت القراءة
                      </span>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    onClick={() => handleDismiss(announcement.id)}
                    isLoading={actionsLoading.has(announcement.id)}
                    loadingText="جارٍ المسح..."
                    fullOnMobile
                  >
                    مسح
                  </Button>
                </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
