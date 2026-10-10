import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Award, Plus, Minus, AlertCircle } from 'lucide-react';
import type { Member, NoteInsert } from '../../types/db';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { useCreateNote } from '../notes/api';

interface BonusAdjustmentModalProps {
  isOpen: boolean;
  member: Member | null;
  members: Member[];
  onClose: () => void;
  onSuccess?: () => void;
}

export function BonusAdjustmentModal({ isOpen, member, members, onClose, onSuccess }: BonusAdjustmentModalProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [points, setPoints] = useState<number>(1);
  const [reason, setReason] = useState<string>('');
  const [author, setAuthor] = useState<string>('إدارة وصلة');
  const [error, setError] = useState<string>('');
  const createNote = useCreateNote();

  // مزامنة العضو المختار مع كل فتح (القادم من الجدول/المنصة أو الافتراضي)
  useEffect(() => {
    if (isOpen) {
      setSelectedId(member?.id ?? members[0]?.id ?? null);
      setPoints(1);
      setReason('');
      setError('');
    }
  }, [isOpen, member, members]);

  const selectedMember = members.find((m) => m.id === selectedId) ?? member ?? null;
  if (!selectedMember) return null;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('يرجى كتابة سبب التقييم لتوثيق الملاحظة في السجل.');
      return;
    }

    // صفر = توثيق ملاحظة بدون نقاط (مسموح — لا وسم بونص)
    const tag = points === 0 ? '' : points > 0 ? `[B:+${points}]` : `[B:${points}]`;
    const fullText = tag ? `${reason.trim()} ${tag}` : reason.trim();

    const payload: NoteInsert = {
      text: fullText,
      author: author.trim() || 'إدارة وصلة',
      author_role: 'Admin',
      date: new Date().toISOString().slice(0, 10),
      target_member_id: selectedMember.id,
      target_name: selectedMember.full_name,
    };

    try {
      setError('');
      await createNote.mutateAsync(payload);
      setReason('');
      setPoints(1);
      onSuccess?.();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تسجيل نقاط التقييم.');
    }
  };

  const positiveOptions = [1, 2, 3, 4, 5];
  const negativeOptions = [-1, -2, -3, -4, -5];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تعديل نقاط التقييم (البونص)" maxWidth="md">
      <form onSubmit={handleSubmit} className="grid gap-4 text-start" dir="rtl">
        {error && (
          <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100" role="alert">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </p>
        )}

        {/* Member selector + preview header */}
        <label className="grid gap-1.5 text-sm font-bold text-[var(--text)]">
          العضو المستهدف
          <select
            value={selectedMember.id}
            onChange={(event) => setSelectedId(Number(event.target.value))}
            className="min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 text-sm font-normal"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.full_name}</option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
          <div className="grid size-11 place-items-center rounded-xl bg-[var(--primary)] text-white font-black text-base">
            {selectedMember.full_name.charAt(0)}
          </div>
          <div>
            <div className="font-black text-sm text-[var(--text)]">{selectedMember.full_name}</div>
            <div className="text-xs text-[var(--text-muted)]" dir="ltr">{selectedMember.email}</div>
          </div>
        </div>

        {/* Bonus selection */}
        <div>
          <label className="block text-sm font-bold text-[var(--text)] mb-2">
            قيمة التقييم المضافة أو المخصومة
          </label>
          <div className="grid gap-2">
            {/* Zero (document only) */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPoints(0)}
                className={`min-h-11 px-3 rounded-xl text-sm font-black transition-colors ${
                  points === 0
                    ? 'bg-[var(--primary)] text-white shadow-sm'
                    : 'border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:border-[var(--primary)]'
                }`}
              >
                0 — توثيق بدون نقاط
              </button>
            </div>
            {/* Positive Options */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 ms-1">
                <Plus size={13} /> إضافة:
              </span>
              {positiveOptions.map((val) => (
                <button
                  type="button"
                  key={`pos-${val}`}
                  onClick={() => setPoints(val)}
                  className={`min-h-11 min-w-11 px-3 rounded-xl text-sm font-black transition-colors ${
                    points === val
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:border-emerald-400'
                  }`}
                >
                  +{val}
                </button>
              ))}
            </div>

            {/* Negative Options */}
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <span className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1 ms-1">
                <Minus size={13} /> خصم:
              </span>
              {negativeOptions.map((val) => (
                <button
                  type="button"
                  key={`neg-${val}`}
                  onClick={() => setPoints(val)}
                  className={`min-h-11 min-w-11 px-3 rounded-xl text-sm font-black transition-colors ${
                    points === val
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:border-red-400'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-2 text-xs font-semibold text-[var(--text-muted)] flex items-center gap-1">
            <Award size={14} className="text-[var(--primary)]" />
            <span>
              {points === 0 ? (
                <>توثيق ملاحظة بدون نقاط (لن تتأثر نتيجة الترتيب)</>
              ) : (
                <>القيمة المحددة: <b className={points > 0 ? 'text-emerald-600' : 'text-red-600'}>{points > 0 ? `+${points}` : points} نقطة</b> (سيتم تسجيل الوسم {points > 0 ? `[B:+${points}]` : `[B:${points}]`})</>
              )}
            </span>
          </div>
        </div>

        {/* Reason / Note text */}
        <label className="grid gap-1.5 text-sm font-bold text-[var(--text)]">
          سبب التقييم والملاحظة الموثقة *
          <textarea
            required
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="مثال: التزام ممتاز بتسليم المهمة قبل الموعد، أو تفاعل إيجابي في الاجتماع..."
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3 text-sm leading-relaxed"
          />
        </label>

        {/* Author */}
        <label className="grid gap-1.5 text-sm font-bold text-[var(--text)]">
          اسم المسؤول / الكاتب
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 text-sm"
          />
        </label>

        {/* Form Actions */}
        <div className="flex flex-col-reverse gap-2 border-t border-[var(--border)] pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose} fullOnMobile className="min-h-11">
            إلغاء
          </Button>
          <Button type="submit" isLoading={createNote.isPending} loadingText="جارٍ التسجيل..." fullOnMobile className="min-h-11">
            حفظ التقييم والملاحظة
          </Button>
        </div>
      </form>
    </Modal>
  );
}
