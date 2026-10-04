import { useState, useEffect } from 'react';
import { Plus, Eye, MessageSquare, Users, Clock, AlertTriangle, Trash2 } from 'lucide-react';
import AnnouncementsAPI from '../../../lib/api/announcements';
import type { Announcement } from '../../../types/db';
import CreateAnnouncementModal from './CreateAnnouncementModal';
import AnnouncementStatsModal from './AnnouncementStatsModal';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { ErrorState } from '../../../components/ui/ErrorState';
import { EmptyState } from '../../../components/ui/EmptyState';
import { CardSkeletons } from '../../../components/ui/Skeleton';
import { Modal } from '../../../components/ui/Modal';
import { toast } from '../../../store/toast';

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Announcement | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await AnnouncementsAPI.getAnnouncements();
      setAnnouncements(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير معروف');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    loadAnnouncements();
  };

  const handleViewStats = (announcementId: number) => {
    setSelectedAnnouncementId(announcementId);
    setShowStatsModal(true);
  };

  const handleToggleActive = async (announcement: Announcement) => {
    try {
      await AnnouncementsAPI.updateAnnouncement(announcement.id, {
        is_active: !announcement.is_active
      });
      toast.success(announcement.is_active ? 'تم إلغاء تفعيل الإعلان.' : 'تم تفعيل الإعلان.');
      loadAnnouncements();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'تعذر تغيير حالة الإعلان.');
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await AnnouncementsAPI.deleteAnnouncement(pendingDelete.id);
      toast.success('تم حذف الإعلان نهائياً.');
      setPendingDelete(null);
      loadAnnouncements();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'تعذر حذف الإعلان.');
    } finally {
      setIsDeleting(false);
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

  if (loading) {
    return (
      <div className="grid gap-4" dir="rtl" aria-label="جاري تحميل الإعلانات">
        <CardSkeletons count={3} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid gap-4" dir="rtl">
        <ErrorState message={`خطأ في تحميل الإعلانات: ${error}`} onRetry={() => { void loadAnnouncements(); }} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-[var(--text)]">إدارة الإعلانات</h1>
          <p className="mt-1 text-[var(--text-muted)]">
            إنشاء وإدارة الإعلانات للأعضاء
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          icon={<Plus size={20} aria-hidden="true" />}
          fullOnMobile
        >
          إعلان جديد
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--link)]">
              <MessageSquare size={20} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm text-[var(--text-muted)]">إجمالي الإعلانات</p>
              <p className="text-xl font-black text-[var(--text)]">{announcements.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Users size={20} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm text-[var(--text-muted)]">نشطة</p>
              <p className="text-xl font-black text-[var(--text)]">
                {announcements.filter(a => a.is_active).length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <AlertTriangle size={20} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm text-[var(--text-muted)]">عالية الأولوية</p>
              <p className="text-xl font-black text-[var(--text)]">
                {announcements.filter(a => a.priority === 'high' || a.priority === 'urgent').length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--link)]">
              <Clock size={20} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm text-[var(--text-muted)]">اليوم</p>
              <p className="text-xl font-black text-[var(--text)]">
                {announcements.filter(a => {
                  const today = new Date().toDateString();
                  const announcementDate = new Date(a.created_at).toDateString();
                  return today === announcementDate;
                }).length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Announcements List */}
      <Card>
        <div className="grid gap-4 p-4 sm:p-6">
          <h2 className="text-lg font-black text-[var(--text)]">قائمة الإعلانات</h2>

          {announcements.length === 0 ? (
            <EmptyState title="لا توجد إعلانات" description="ابدأ بإنشاء أول إعلان للأعضاء." action={<Button onClick={() => setShowCreateModal(true)} icon={<Plus size={17} />} fullOnMobile>إنشاء إعلان جديد</Button>} />
          ) : (
            <div className="grid gap-3">
              {announcements.map((announcement) => (
                <article
                  key={announcement.id}
                  className="grid gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] p-4 transition-colors hover:border-[var(--primary)]"
                >
                  <div className="grid gap-3 lg:flex lg:items-start lg:justify-between">
                    <div className="grid min-w-0 gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black text-[var(--text)]">
                          {announcement.title}
                        </h3>
                        <Badge variant={getPriorityVariant(announcement.priority)}>
                          {AnnouncementsAPI.getPriorityLabel(announcement.priority)}
                        </Badge>
                        {!announcement.is_active && (
                          <Badge variant="neutral">
                            غير نشط
                          </Badge>
                        )}
                      </div>

                      <p className="line-clamp-2 text-sm leading-6 text-[var(--text-2)]">
                        {announcement.content}
                      </p>

                      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--text-muted)]">
                        <span>{formatDate(announcement.created_at)}</span>
                        <span>{AnnouncementsAPI.getAudienceLabel(announcement.target_audience)}</span>
                        {announcement.send_whatsapp && (
                          <span>واتساب</span>
                        )}
                        {announcement.send_push && (
                          <span>إشعار فوري</span>
                        )}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
                      <Button
                        variant="secondary"
                        onClick={() => handleViewStats(announcement.id)}
                        icon={<Eye size={16} aria-hidden="true" />}
                        fullOnMobile
                      >
                        الإحصائيات
                      </Button>

                      <Button
                        variant="secondary"
                        onClick={() => handleToggleActive(announcement)}
                        fullOnMobile
                      >
                        {announcement.is_active ? 'إلغاء التفعيل' : 'تفعيل'}
                      </Button>

                      <Button
                        variant="danger"
                        onClick={() => setPendingDelete(announcement)}
                        icon={<Trash2 size={16} aria-hidden="true" />}
                        fullOnMobile
                        aria-label={`حذف إعلان ${announcement.title}`}
                      >
                        حذف
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Modals */}
      {showCreateModal && (
        <CreateAnnouncementModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {showStatsModal && selectedAnnouncementId && (
        <AnnouncementStatsModal
          announcementId={selectedAnnouncementId}
          onClose={() => {
            setShowStatsModal(false);
            setSelectedAnnouncementId(null);
          }}
        />
      )}

      <Modal
        isOpen={pendingDelete != null}
        onClose={() => setPendingDelete(null)}
        title="حذف الإعلان"
        subtitle={pendingDelete ? `سيتم حذف "${pendingDelete.title}" نهائياً من كل الأعضاء.` : undefined}
        maxWidth="sm"
      >
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setPendingDelete(null)} fullOnMobile>إلغاء</Button>
          <Button variant="danger" onClick={() => void confirmDelete()} isLoading={isDeleting} loadingText="جارٍ الحذف..." fullOnMobile>حذف نهائي</Button>
        </div>
      </Modal>
    </div>
  );
}