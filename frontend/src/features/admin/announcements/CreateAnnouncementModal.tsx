import { useState, useEffect } from 'react';
import { Users, User, Send, AlertCircle } from 'lucide-react';
import AnnouncementsAPI from '../../../lib/api/announcements';
import { supabase } from '../../../lib/supabase/client';
import type { AnnouncementInsert, AnnouncementPriority } from '../../../types/db';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { toast } from '../../../store/toast';

interface CreateAnnouncementModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const fieldLabel = 'grid gap-1.5 text-sm font-bold text-[var(--text-2)]';
const fieldInput =
  'min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 text-sm text-[var(--text)] focus:border-[var(--primary)] focus:outline-none';
const checkInput = 'size-5 shrink-0 accent-[var(--primary)]';

export default function CreateAnnouncementModal({
  onClose,
  onSuccess,
}: CreateAnnouncementModalProps) {
  const [formData, setFormData] = useState<AnnouncementInsert>({
    title: '',
    content: '',
    target_audience: { type: 'all' },
    priority: 'normal',
    send_push: true,
    send_whatsapp: false,
    expires_at: null,
    is_active: true,
    created_by: null
  });

  const [members, setMembers] = useState<Array<{ id: number; full_name: string; email: string; residence: string | null }>>([]);
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [membersLoading, setMembersLoading] = useState(false);

  // جلب قائمة الأعضاء عند اختيار "أعضاء محددين"
  const loadMembers = async () => {
    if (formData.target_audience.type !== 'specific') return;

    try {
      setMembersLoading(true);
      const { data, error: membersError } = await supabase
        .from('members')
        .select('id, full_name, email, residence')
        .order('full_name');

      if (membersError) throw membersError;
      setMembers(data ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'تعذر تحميل الأعضاء.');
    } finally {
      setMembersLoading(false);
    }
  };

  useEffect(() => {
    void loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.target_audience.type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.content.trim()) {
      setError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    if (formData.target_audience.type === 'specific' && selectedMembers.length === 0) {
      setError('يرجى اختيار عضو واحد على الأقل');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const dataToSubmit: AnnouncementInsert = {
        ...formData,
        target_audience: formData.target_audience.type === 'specific'
          ? { type: 'specific', member_ids: selectedMembers }
          : { type: 'all' },
        expires_at: formData.expires_at || null
      };

      await AnnouncementsAPI.createAnnouncement(dataToSubmit);
      toast.success('تم نشر الإعلان بنجاح.');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير معروف');
    } finally {
      setLoading(false);
    }
  };

  const handleTargetAudienceChange = (type: 'all' | 'specific') => {
    setFormData((prev) => ({
      ...prev,
      target_audience: type === 'specific' ? { type, member_ids: selectedMembers } : { type },
    }));
    setSelectedMembers([]);
    setMemberSearch('');
  };

  const handleMemberToggle = (memberId: number) => {
    setSelectedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const visibleMembers = members.filter((m) => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return true;
    return m.full_name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
  });

  return (
    <Modal isOpen onClose={onClose} title="إنشاء إعلان جديد" maxWidth="lg">
      <form onSubmit={handleSubmit} className="grid gap-4" dir="rtl" noValidate>
        {error && (
          <p className="flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-900 dark:border-red-800 dark:bg-red-950/50 dark:text-red-100" role="alert">
            <AlertCircle size={20} aria-hidden="true" className="shrink-0" />
            <span>{error}</span>
          </p>
        )}

        {/* العنوان */}
        <label className={fieldLabel}>عنوان الإعلان *
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            className={fieldInput}
            placeholder="أدخل عنوان الإعلان"
            required
          />
        </label>

        {/* المحتوى */}
        <label className={fieldLabel}>نص الإعلان *
          <textarea
            value={formData.content}
            onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
            rows={4}
            className={`${fieldInput} min-h-24 p-3 leading-6`}
            placeholder="اكتب محتوى الإعلان هنا..."
            required
          />
        </label>

        {/* الأولوية */}
        <label className={fieldLabel}>درجة الأولوية
          <select
            value={formData.priority}
            onChange={(e) => setFormData((prev) => ({ ...prev, priority: e.target.value as AnnouncementPriority }))}
            className={fieldInput}
          >
            <option value="low">منخفضة</option>
            <option value="normal">عادية</option>
            <option value="high">عالية</option>
            <option value="urgent">عاجلة</option>
          </select>
        </label>

        {/* الجمهور المستهدف */}
        <fieldset className="grid gap-3">
          <legend className="text-sm font-bold text-[var(--text-2)]">الجمهور المستهدف</legend>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-[var(--border)] px-3">
            <input
              type="radio"
              name="audience"
              checked={formData.target_audience.type === 'all'}
              onChange={() => handleTargetAudienceChange('all')}
              className={checkInput}
            />
            <span className="flex items-center gap-2 text-sm font-bold">
              <Users size={20} className="text-[var(--link)]" aria-hidden="true" />
              جميع الأعضاء
            </span>
          </label>

          <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-[var(--border)] px-3">
            <input
              type="radio"
              name="audience"
              checked={formData.target_audience.type === 'specific'}
              onChange={() => handleTargetAudienceChange('specific')}
              className={checkInput}
            />
            <span className="flex items-center gap-2 text-sm font-bold">
              <User size={20} className="text-[var(--link)]" aria-hidden="true" />
              أعضاء محددين
            </span>
          </label>

          {/* قائمة الأعضاء المحددين */}
          {formData.target_audience.type === 'specific' && (
            <div className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4">
              <label className="block">
                <span className="sr-only">البحث عن عضو</span>
                <input
                  type="search"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="ابحث بالاسم أو البريد..."
                  className={fieldInput}
                />
              </label>
              {membersLoading ? (
                <p className="py-4 text-center text-sm text-[var(--text-muted)]" role="status">جاري تحميل الأعضاء...</p>
              ) : members.length === 0 ? (
                <p className="py-4 text-center text-[var(--text-muted)]">لا توجد أعضاء متاحين</p>
              ) : (
                <div className="grid gap-1">
                  <p className="border-b border-[var(--border)] pb-2 text-sm font-bold text-[var(--text-2)]">
                    اختر الأعضاء ({selectedMembers.length} مختار)
                  </p>
                  <div className="grid max-h-60 gap-1 overflow-y-auto">
                    {visibleMembers.map((member) => (
                      <label
                        key={member.id}
                        className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-[var(--surface-2)]"
                      >
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(member.id)}
                          onChange={() => handleMemberToggle(member.id)}
                          className={checkInput}
                          aria-label={`اختيار ${member.full_name}`}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-bold">{member.full_name}</span>
                          <span className="block truncate text-sm text-[var(--text-muted)]" dir="ltr">
                            {member.email}{member.residence ? ` • ${member.residence}` : ''}
                          </span>
                        </span>
                      </label>
                    ))}
                    {visibleMembers.length === 0 && (
                      <p className="py-4 text-center text-sm text-[var(--text-muted)]">لا نتائج مطابقة للبحث.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </fieldset>

        {/* خيارات الإرسال */}
        <fieldset className="grid gap-3">
          <legend className="text-sm font-bold text-[var(--text-2)]">طرق الإرسال</legend>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-[var(--border)] px-3 text-sm font-bold">
            <input
              type="checkbox"
              checked={formData.send_push}
              onChange={(e) => setFormData(prev => ({ ...prev, send_push: e.target.checked }))}
              className={checkInput}
            />
            إشعار فوري في التطبيق
          </label>

          <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-[var(--border)] px-3 text-sm font-bold">
            <input
              type="checkbox"
              checked={formData.send_whatsapp}
              onChange={(e) => setFormData(prev => ({ ...prev, send_whatsapp: e.target.checked }))}
              className={checkInput}
            />
            رسالة واتساب
          </label>
        </fieldset>

        {/* تاريخ الانتهاء (اختياري) */}
        <label className={fieldLabel}>تاريخ انتهاء الصلاحية (اختياري)
          <input
            type="datetime-local"
            value={formData.expires_at || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, expires_at: e.target.value || null }))}
            className={fieldInput}
          />
          <span className="text-xs font-semibold text-[var(--text-muted)]">
            اتركه فارغاً إذا كان الإعلان دائماً
          </span>
        </label>

        {/* أزرار الإجراءات */}
        <div className="flex flex-col-reverse gap-2 border-t border-[var(--border)] pt-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            fullOnMobile
          >
            إلغاء
          </Button>
          <Button
            type="submit"
            isLoading={loading}
            loadingText="جارٍ النشر..."
            icon={<Send size={16} aria-hidden="true" />}
            fullOnMobile
          >
            نشر الإعلان
          </Button>
        </div>
      </form>
    </Modal>
  );
}
