import { useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, Send } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import type { Member, Task } from '../../types/db';
import type { WhatsAppSendResult } from './api';
import { WhatsAppConfirmModal } from './WhatsAppConfirmModal';

interface Props {
  task: Task;
  members: Member[];
  isConnected: boolean;
  isPending: boolean;
  result?: WhatsAppSendResult;
  error?: string;
  onSend: (confirmed: boolean) => void;
}

export function buildTaskMessage(task: Task, member: Member): string {
  const formatArabicDate = (iso: string) => {
    try {
      return new Intl.DateTimeFormat('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
  const deadlineText =
    task.has_deadline && task.deadline_date
      ? `\nالموعد النهائي المخطط للإنجاز: ${formatArabicDate(task.deadline_date)}`
      : '';

  return (
    `السلام عليكم ${member.full_name}،\n\n` +
    `نود إعلامك بأنه قد تم إسناد تكليف جديد إليك في منظومة وصلة بعنوان:\n` +
    `«${task.title}»${deadlineText}\n\n` +
    `يرجى التكرم بالدخول إلى بوابة وصلة لمراجعة تفاصيل المهمة والبدء في التنفيذ:\n` +
    `${baseUrl}/login\n\n` +
    `تمنياتنا لك بالتوفيق،\n` +
    `فريق إدارة وصلة.`
  );
}

export function WhatsAppDispatch({
  task,
  members,
  isConnected,
  isPending,
  result,
  error,
  onSend,
}: Props) {
  const [openModal, setOpenModal] = useState(false);
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [previewMemberIndex, setPreviewMemberIndex] = useState(0);

  const activeMember = members[previewMemberIndex] ?? members[0];
  const renderedPreview = activeMember ? buildTaskMessage(task, activeMember) : '';

  const handleOpenModal = () => {
    if (!consentConfirmed || members.length === 0 || !isConnected) return;
    setOpenModal(true);
  };

  const handleConfirmSend = () => {
    onSend(true);
    setOpenModal(false);
  };

  return (
    <div className="grid gap-4 border-t border-[var(--border)] pt-4" dir="rtl">
      {/* Per-recipient Message Preview */}
      {activeMember && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm leading-6">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 font-extrabold text-[var(--text)]">
              <Eye size={16} className="text-[var(--primary)]" aria-hidden="true" />
              <span>معاينة نص الرسالة للمستلم:</span>
            </span>

            {members.length > 1 && (
              <label className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <span>اختر العضو للمعاينة:</span>
                <select
                  value={previewMemberIndex}
                  onChange={(e) => setPreviewMemberIndex(Number(e.target.value))}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-xs font-bold text-[var(--text)]"
                >
                  {members.map((m, idx) => (
                    <option key={m.id} value={idx}>
                      {m.full_name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 font-sans whitespace-pre-wrap text-xs leading-6 text-[var(--text)]">
            {renderedPreview}
          </div>
        </div>
      )}

      {/* Recipient Consent Checkbox */}
      <label className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50/70 p-3 text-sm leading-6 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
        <input
          type="checkbox"
          className="mt-1 size-5 shrink-0 accent-[var(--primary)]"
          checked={consentConfirmed}
          onChange={(event) => setConsentConfirmed(event.target.checked)}
        />
        <span>
          أؤكد أن الأعضاء المحددين وافقوا مسبقاً وبشكل صريح على استلام إشعارات المهام عبر واتساب، وأن المحتوى يخص مهام مسندة إليهم حصراً.
        </span>
      </label>

      {/* Dispatch Action Button */}
      <Button
        icon={<Send size={17} aria-hidden="true" />}
        disabled={members.length === 0 || !isConnected || !consentConfirmed || isPending}
        onClick={handleOpenModal}
        fullOnMobile
      >
        استمرار ومراجعة الإرسال ({members.length} عضو)
      </Button>

      {!isConnected && (
        <p className="text-sm text-[var(--text-muted)]">
          اربط رقم واتساب أولًا عبر رمز QR لتتمكن من تفعيل الإرسال التجريبي.
        </p>
      )}

      {error && (
        <p role="alert" className="flex items-center gap-2 text-sm text-[var(--danger)]">
          <AlertCircle size={17} aria-hidden="true" />
          {error}
        </p>
      )}

      {/* Results Box */}
      {result && (
        <div className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm leading-6">
          <p className="mb-2 flex items-center gap-2 font-bold text-[var(--text)]">
            <CheckCircle2 size={18} className="text-emerald-600" aria-hidden="true" />
            <span>نتائج الإرسال التجريبي:</span>
          </p>
          <ul className="list-inside list-disc">
            <li>
              تم الإرسال التجريبي بنجاح إلى: <b>{result.sent}</b>
            </li>
            <li>
              فشل الإرسال إلى: <b>{result.failed}</b>
            </li>
            {result.errors && result.errors.length > 0 && (
              <li className="text-[var(--danger)]">الأخطاء: {result.errors.join('، ')}</li>
            )}
          </ul>
        </div>
      )}

      {/* Confirmation Modal */}
      {activeMember && (
        <WhatsAppConfirmModal
          isOpen={openModal}
          onClose={() => setOpenModal(false)}
          taskTitle={task.title}
          recipientCount={members.length}
          previewMemberName={activeMember.full_name}
          messagePreview={renderedPreview}
          isPending={isPending}
          onConfirm={handleConfirmSend}
        />
      )}
    </div>
  );
}
