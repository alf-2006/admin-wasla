import { useState } from 'react';
import type { FormEvent } from 'react';
import { AlertCircle } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import type { Member, NoteInsert } from '../../types/db';
import { useCreateNote } from './api';

export function NoteEditor({ isOpen, members, onClose }: { isOpen: boolean; members: Member[]; onClose: () => void }) {
  const [text, setText] = useState('');
  const [author, setAuthor] = useState('إدارة وصلة');
  const [targetType, setTargetType] = useState<'all' | 'member'>('all');
  const [targetMemberId, setTargetMemberId] = useState<number | null>(null);
  const [formError, setFormError] = useState('');
  const createNote = useCreateNote();

  const reset = () => {
    setText('');
    setAuthor('إدارة وصلة');
    setTargetType('all');
    setTargetMemberId(null);
    setFormError('');
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!text.trim()) {
      setFormError('محتوى الملاحظة مطلوب.');
      return;
    }
    const targetMember = members.find((member) => member.id === targetMemberId);
    const payload: NoteInsert = {
      text: text.trim(),
      author: author.trim() || 'الإدارة',
      author_role: 'Admin',
      date: new Date().toLocaleDateString('ar-EG', { dateStyle: 'medium' }),
      target_member_id: targetType === 'member' ? targetMemberId : null,
      target_name: targetType === 'member' ? targetMember?.full_name ?? null : null,
    };
    try {
      await createNote.mutateAsync(payload);
      reset();
      onClose();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'فشل حفظ الملاحظة.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="كتابة ملاحظة وتوجيه جديد" maxWidth="md">
      <form onSubmit={submit} className="grid gap-4">
        {formError && <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100" role="alert"><AlertCircle size={18} />{formError}</p>}
        <label className="grid gap-2 text-sm font-bold">نص الملاحظة والتوجيه *
          <textarea rows={4} required value={text} onChange={(event) => setText(event.target.value)} placeholder="اكتب التوجيه أو الملاحظة هنا بالتفصيل..." className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3 leading-6" />
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold">اسم الكاتب
            <input value={author} onChange={(event) => setAuthor(event.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3" />
          </label>
          <label className="grid gap-2 text-sm font-bold">توجيه الملاحظة إلى
            <select value={targetType} onChange={(event) => setTargetType(event.target.value as typeof targetType)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3">
              <option value="all">كل الفريق</option><option value="member">عضو محدد</option>
            </select>
          </label>
        </div>
        {targetType === 'member' && <label className="grid gap-2 text-sm font-bold">العضو المستهدف<select required value={targetMemberId ?? ''} onChange={(event) => setTargetMemberId(Number(event.target.value))} className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3"><option value="">اختر عضوًا</option>{members.map((member) => <option key={member.id} value={member.id}>{member.full_name}</option>)}</select></label>}
        <div className="flex flex-col-reverse gap-2 border-t border-[var(--border)] pt-4 sm:flex-row sm:justify-end"><Button type="button" variant="secondary" onClick={onClose} fullOnMobile>إلغاء</Button><Button type="submit" isLoading={createNote.isPending} loadingText="جارٍ الحفظ..." fullOnMobile>حفظ الملاحظة</Button></div>
      </form>
    </Modal>
  );
}
