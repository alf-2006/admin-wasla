import { CheckCircle2, Send, ShieldAlert, Users } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';

interface WhatsAppConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskTitle: string;
  recipientCount: number;
  previewMemberName: string;
  messagePreview: string;
  isPending: boolean;
  onConfirm: () => void;
}

export function WhatsAppConfirmModal({
  isOpen,
  onClose,
  taskTitle,
  recipientCount,
  previewMemberName,
  messagePreview,
  isPending,
  onConfirm,
}: WhatsAppConfirmModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="تأكيد بدء الإرسال التجريبي عبر واتساب"
      subtitle={`إلى ${recipientCount} عضو بخصوص «${taskTitle}»`}
      maxWidth="lg"
    >
      <div className="grid gap-4" dir="rtl">
        {/* Summary Info Cards */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
            <Users className="text-[var(--primary)]" size={20} aria-hidden="true" />
            <div>
              <p className="text-xs text-[var(--text-muted)]">إجمالي المستلمين:</p>
              <p className="text-sm font-extrabold text-[var(--text)]">{recipientCount} عضو مؤكد</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/20">
            <CheckCircle2 className="text-emerald-600 dark:text-emerald-400" size={20} aria-hidden="true" />
            <div>
              <p className="text-xs text-emerald-800 dark:text-emerald-300">إقرار الموافقة الصريحة:</p>
              <p className="text-sm font-extrabold text-emerald-900 dark:text-emerald-200">مؤكد ومُعتمد إدارياً</p>
            </div>
          </div>
        </div>

        {/* Message Preview Box */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm leading-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-extrabold text-[var(--text)]">معاينة الرسالة الموجهة:</span>
            <span className="text-xs text-[var(--text-muted)]">نموذج العضو: {previewMemberName}</span>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 font-sans whitespace-pre-wrap text-xs leading-6 text-[var(--text)]">
            {messagePreview}
          </div>
        </div>

        {/* Mock Safety Notice */}
        <div className="flex items-start gap-2.5 rounded-xl border border-[var(--primary)] bg-[var(--primary-soft)] p-3 text-xs leading-5 text-[var(--text)]">
          <ShieldAlert className="mt-0.5 shrink-0 text-[var(--link)]" size={17} aria-hidden="true" />
          <p>
            سيتم تنفيذ هذا الإرسال بنمط المحاكاة المعزول (Baileys Mock) دون إرسال حزم فعلية عبر شبكة واتساب، وذلك لاختبار مسار المهام وسجلات التسليم الداخلية.
          </p>
        </div>

        {/* Modal Actions */}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end border-t border-[var(--border)] pt-4">
          <Button variant="secondary" onClick={onClose} disabled={isPending} fullOnMobile>
            إلغاء
          </Button>
          <Button
            variant="primary"
            icon={<Send size={16} aria-hidden="true" />}
            disabled={isPending}
            onClick={onConfirm}
            fullOnMobile
          >
            {isPending ? 'جارٍ الإرسال التجريبي...' : 'تأكيد وبدء الإرسال التجريبي'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
