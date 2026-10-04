import { useRef, useState } from 'react';
import { Download, FileSpreadsheet, Upload } from 'lucide-react';
import type { Member, MemberInsert } from '../../types/db';
import { useBulkUpsertMembers } from './api';
import { parseMemberWorkbook, downloadMembersWorkbook } from './memberExcel';
import { Modal } from '../../components/ui/Modal';
import { toast } from '../../store/toast';
import { Button } from '../../components/ui/Button';

export function MemberExcelActions({ members }: { members: Member[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const importMembers = useBulkUpsertMembers();
  const [isOpen, setIsOpen] = useState(false);
  const [rows, setRows] = useState<MemberInsert[]>([]);
  const [message, setMessage] = useState('');
  const chooseFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed = parseMemberWorkbook(await file.arrayBuffer(), members);
      setRows(parsed.members);
      setMessage(`تم تجهيز ${parsed.members.length} عضو. تم تجاهل ${parsed.skipped} صف بسبب نقص البيانات أو التكرار.`);
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'تعذرت قراءة ملف Excel.'); }
  };
  const confirmImport = async () => {
    try { await importMembers.mutateAsync(rows); setRows([]); setIsOpen(false); setMessage(''); toast.success('تم استيراد بيانات الأعضاء بنجاح.'); }
    catch (cause) { const msg = cause instanceof Error ? cause.message : 'فشل الاستيراد.'; setMessage(msg); toast.error(msg); }
  };

  return <>
    <Button variant="secondary" onClick={() => { setIsOpen(true); setRows([]); setMessage(''); }} icon={<Upload size={17} />} fullOnMobile className="whitespace-nowrap">استيراد بيانات</Button>
    <Button variant="secondary" onClick={() => members.length ? downloadMembersWorkbook(members) : toast.warning('لا توجد بيانات لتصديرها.')} icon={<Download size={17} />} fullOnMobile className="whitespace-nowrap">تصدير Excel</Button>
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="استيراد بيانات الأعضاء من Excel" maxWidth="xl">
      <div className="grid gap-4">
        <label className="grid gap-3 rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--bg)] p-5 text-center"><FileSpreadsheet size={34} className="mx-auto text-emerald-700 dark:text-emerald-300" /><span className="text-sm font-bold">اختر ملف Excel أو CSV</span><input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" onChange={(event) => { void chooseFile(event.target.files?.[0]); }} className="min-h-11 text-sm" /></label>
        {message && <p className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm" role="status">{message}</p>}
        {rows.length > 0 && <><div className="max-h-64 overflow-auto rounded-xl border border-[var(--border)]"><table className="data-table w-full text-start text-sm"><thead><tr><th>الاسم</th><th>البريد الإلكتروني</th><th>حالة العمل</th><th>الجهاز</th></tr></thead><tbody>{rows.slice(0, 10).map((row) => <tr key={row.email}><td data-label="الاسم">{row.full_name}</td><td data-label="البريد الإلكتروني" dir="ltr">{row.email}</td><td data-label="حالة العمل">{row.work_status || '—'}</td><td data-label="الجهاز">{row.device || '—'}</td></tr>)}</tbody></table></div><p className="text-sm text-[var(--text-muted)]">سيتم تحديث الأعضاء المطابقين للبريد وإضافة الأعضاء الجدد.</p></>}
        <div className="flex flex-col-reverse gap-2 border-t border-[var(--border)] pt-4 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={() => setIsOpen(false)} fullOnMobile>إلغاء</Button><Button onClick={() => void confirmImport()} disabled={!rows.length} isLoading={importMembers.isPending} loadingText="جارٍ الاستيراد..." fullOnMobile>تأكيد الاستيراد</Button></div>
      </div>
    </Modal>
  </>;
}
