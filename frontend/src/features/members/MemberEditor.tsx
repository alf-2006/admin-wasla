import type { FormEvent } from 'react';
import type { Member, MemberInsert } from '../../types/db';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

interface Props { isOpen: boolean; isSaving: boolean; member: Member | null; value: MemberInsert; error: string; onChange: (value: MemberInsert) => void; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }

export function MemberEditor({ isOpen, isSaving, member, value, error, onChange, onClose, onSubmit }: Props) {
  const textField = (key: keyof MemberInsert, label: string, type = 'text') => <label className="grid gap-1.5 text-sm font-bold text-[var(--text-2)]">{label}<input type={type} required={key === 'email' || key === 'full_name'} dir={key === 'email' || key === 'phone' ? 'ltr' : undefined} value={String(value[key] ?? '')} onChange={(event) => onChange({ ...value, [key]: event.target.value })} className="min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 text-base font-normal" /></label>;
  const selectField = (key: keyof MemberInsert, label: string, options: string[]) => <label className="grid gap-1.5 text-sm font-bold text-[var(--text-2)]">{label}<select value={String(value[key] ?? '')} onChange={(event) => onChange({ ...value, [key]: event.target.value })} className="min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 text-base font-normal">{options.map((option) => <option key={option}>{option}</option>)}</select></label>;

  return <Modal isOpen={isOpen} onClose={onClose} title={member ? 'تعديل بيانات العضو' : 'إضافة عضو جديد'} maxWidth="lg">
    <form onSubmit={onSubmit} className="grid gap-4">
      {error && <p className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-900 dark:border-red-800 dark:bg-red-950/50 dark:text-red-100" role="alert">{error}</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {textField('full_name', 'الاسم الكامل')}{textField('email', 'البريد الإلكتروني', 'email')}

        {textField('phone', 'رقم الهاتف', 'tel')}
        {textField('work_conditions', 'ظروف العمل')}{selectField('device', 'الجهاز المتوفر', ['لابتوب', 'كمبيوتر مكتبي (PC)', 'بدون جهاز', 'هاتف محمول', 'لابتوب، هاتف محمول', 'لابتوب، جهاز لوحي، هاتف محمول'])}
        {textField('residence', 'محل الإقامة')}{selectField('gender', 'الجنس', ['', 'ذكر', 'أنثى'])}
        {selectField('work_status', 'حالة الحساب', ['active', 'inactive'])}
      </div>
      {textField('bio', 'نبذة / الدور')}
      <label className="flex min-h-11 items-center gap-3 rounded-xl border border-[var(--border)] p-3 text-sm font-bold"><input type="checkbox" checked={value.can_go_alexandria} onChange={(event) => onChange({ ...value, can_go_alexandria: event.target.checked })} />متاح للنزول الميداني واجتماعات الإسكندرية</label>
      <div className="flex flex-col-reverse gap-2 border-t border-[var(--border)] pt-4 sm:flex-row sm:justify-end"><Button type="button" variant="secondary" onClick={onClose} fullOnMobile>إلغاء</Button><Button type="submit" disabled={isSaving} fullOnMobile>{isSaving ? 'جارٍ الحفظ...' : member ? 'حفظ التعديلات' : 'إضافة العضو'}</Button></div>
    </form>
  </Modal>;
}
