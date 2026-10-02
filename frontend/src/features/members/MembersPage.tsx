import { useMemo, useState } from 'react';
import { Users, UserPlus } from 'lucide-react';
import type { Member, MemberInsert } from '../../types/db';
import { useMembers, useAddMember, useUpdateMember, useDeleteMember } from './api';
import { useNotes } from '../notes/api';
import { Button } from '../../components/ui/Button';
import { CardSkeletons } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { MemberFilters, type MemberFiltersValue } from './MemberFilters';
import { MemberRows } from './MemberRows';
import { MemberEditor } from './MemberEditor';
import { MemberProfileModal } from './MemberProfileModal';
import { MemberExcelActions } from './MemberExcelActions';
import { sanitizeText, isValidEmail } from '../../lib/validators';
import { handleSupabaseError, logError } from '../../lib/errorHandler';

const emptyMember: MemberInsert = { 
  email: '', 
  full_name: '', 
  team: 'Wasla',
  completion_rank: null,
  team_notes: null,
  residence: '', 
  work_conditions: '', 
  bio: '', 
  phone: '', 
  device: 'لابتوب', 
  gender: '', 
  meeting_attendance: null,
  work_status: 'active', 
  can_go_alexandria: false 
};

export default function MembersPage() {
  const query = useMembers();
  const notesQuery = useNotes();
  const add = useAddMember();
  const update = useUpdateMember();
  const remove = useDeleteMember();
  const [filters, setFilters] = useState<MemberFiltersValue>({ search: '', work_conditions: 'ALL', device: 'ALL', alexandria: 'ALL' });
  const [editing, setEditing] = useState<Member | null>(null);
  const [selectedProfileMember, setSelectedProfileMember] = useState<Member | null>(null);
  const [form, setForm] = useState<MemberInsert>(emptyMember);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const workConditions = useMemo(() => [...new Set((query.data ?? []).map((member) => member.work_conditions).filter((c): c is string => Boolean(c)))], [query.data]);
  
  const visibleMembers = useMemo(() => (query.data ?? []).filter((member) => {
    const term = filters.search.trim().toLowerCase();
    const matchesText = !term || `${member.full_name} ${member.email} ${member.residence ?? ''} ${member.bio ?? ''}`.toLowerCase().includes(term);
    const matchesWorkConditions = filters.work_conditions === 'ALL' || member.work_conditions === filters.work_conditions;
    const matchesDevice = filters.device === 'ALL' || (member.device ?? '').includes(filters.device);
    const matchesAlexandria = filters.alexandria === 'ALL' || member.can_go_alexandria === (filters.alexandria === 'YES');
    return matchesText && matchesWorkConditions && matchesDevice && matchesAlexandria;
  }), [filters, query.data]);

  const openNew = () => { setEditing(null); setForm(emptyMember); setFormError(''); setDialogOpen(true); };
  const openEdit = (member: Member) => {
    setEditing(member);
    setForm({ 
      email: member.email, 
      full_name: member.full_name, 
      team: member.team,
      completion_rank: member.completion_rank,
      team_notes: member.team_notes,
      residence: member.residence ?? '', 
      work_conditions: member.work_conditions ?? '', 
      bio: member.bio ?? '', 
      phone: member.phone ?? '', 
      device: member.device ?? 'لابتوب', 
      gender: member.gender ?? '', 
      meeting_attendance: member.meeting_attendance,
      work_status: member.work_status ?? 'active', 
      can_go_alexandria: member.can_go_alexandria 
    });
    setFormError(''); setDialogOpen(true);
  };
  
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setFormError('');
    
    // Validation
    const trimmedName = sanitizeText(form.full_name.trim());
    const trimmedEmail = form.email.trim().toLowerCase();
    
    if (!trimmedName || !trimmedEmail) { 
      setFormError('الاسم والبريد الإلكتروني حقول إجبارية.'); 
      return; 
    }
    
    // Email format validation
    if (!isValidEmail(trimmedEmail)) {
      setFormError('البريد الإلكتروني غير صالح. يجب أن يحتوي على @ ونطاق صحيح.');
      return;
    }
    
    try {
      const cleanedForm = {
        ...form,
        full_name: trimmedName,
        email: trimmedEmail,
        bio: sanitizeText(form.bio || ''),
      };
      
      if (editing) await update.mutateAsync({ id: editing.id, ...cleanedForm });
      else await add.mutateAsync(cleanedForm);
      setDialogOpen(false);
    } catch (cause) { 
      logError(cause, 'MembersPage.save');
      const error = handleSupabaseError(cause);
      setFormError(error.message);
    }
  };
  const confirmDelete = async () => {
    if (!memberToDelete) return;
    try { await remove.mutateAsync(memberToDelete.id); setMemberToDelete(null); }
    catch (cause) { alert(cause instanceof Error ? cause.message : 'تعذر حذف العضو.'); }
  };

  return <section className="flex flex-col gap-6 p-2 sm:p-6 min-w-0 w-full" id="page-members" dir="rtl">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end justify-between bg-[var(--surface)] p-6 rounded-[var(--radius-lg)] border border-[var(--border)] shadow-[var(--shadow-sm)]">
      <div className="flex items-start gap-4">
        <div className="grid place-items-center w-12 h-12 rounded-xl bg-[var(--primary-soft)] text-[var(--primary)] shrink-0">
          <Users size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-[var(--text)]">دليل وجاهزية الأعضاء</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)] max-w-xl">
            سجل الحالة التشغيلية، الأجهزة، وتوفر الكوادر للنزول الميداني. العدد الحالي: <span className="font-bold text-[var(--primary)]">{query.data?.length ?? 0}</span> عضو.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
        <Button onClick={openNew} icon={<UserPlus size={18} />} fullOnMobile>تسجيل عضو جديد</Button>
        <MemberExcelActions members={query.data ?? []} />
      </div>
      <MemberEditor isOpen={dialogOpen} isSaving={add.isPending || update.isPending} member={editing} value={form} error={formError} onChange={setForm} onClose={() => setDialogOpen(false)} onSubmit={save} />
    </header>

    <div className="flex flex-col gap-6 min-w-0 w-full">
      <div className="bg-[var(--surface)] p-5 rounded-[var(--radius-lg)] border border-[var(--border)] shadow-[var(--shadow-sm)]">
        <MemberFilters workConditions={workConditions} value={filters} onChange={setFilters} />
      </div>
      
      <div className="bg-[var(--surface)] rounded-[var(--radius-lg)] border border-[var(--border)] shadow-[var(--shadow-sm)] overflow-hidden min-w-0 w-full">
        {query.isLoading ? <div className="p-6"><CardSkeletons count={4} /></div>
          : query.isError ? <div className="p-6"><ErrorState message="تعذر تحميل سجلات الأعضاء." onRetry={() => { void query.refetch(); }} /></div>
            : visibleMembers.length ? <MemberRows members={visibleMembers} onEdit={openEdit} onDelete={setMemberToDelete} onSelectMember={setSelectedProfileMember} />
              : <div className="p-12"><EmptyState title="لا يوجد تطابق" description="لم نجد أي عضو يطابق معايير التصفية." /></div>}
      </div>
    </div>

    {memberToDelete && <div className="fixed inset-0 z-[var(--z-modal)] grid place-items-center bg-black/50 p-4"><section className="w-full max-w-sm bg-[var(--surface)] rounded-[var(--radius-lg)] p-6 shadow-xl border border-[var(--border)]" role="dialog" aria-modal="true" aria-labelledby="delete-member-title"><div className="w-12 h-12 bg-red-100 dark:bg-red-950/30 text-red-600 rounded-full flex items-center justify-center mb-4"><Users size={24} /></div><h2 id="delete-member-title" className="text-lg font-black mb-2 text-[var(--text)]">تأكيد الحذف</h2><p className="mb-6 text-[var(--text-muted)] text-sm leading-relaxed">هل أنت متأكد من حذف السجل الخاص بـ <b className="text-[var(--text)]">{memberToDelete.full_name}</b>؟ هذا الإجراء سيؤدي إلى إزالة كافة بياناته من النظام ولا يمكن التراجع عنه.</p><div className="flex gap-3"><Button variant="secondary" onClick={() => setMemberToDelete(null)} className="flex-1" fullOnMobile>إلغاء</Button><Button variant="danger" onClick={() => void confirmDelete()} className="flex-1" fullOnMobile>حذف نهائي</Button></div></section></div>}

    <MemberProfileModal
      isOpen={Boolean(selectedProfileMember)}
      member={selectedProfileMember}
      notes={notesQuery.data ?? []}
      onClose={() => setSelectedProfileMember(null)}
      onEdit={(m) => {
        setSelectedProfileMember(null);
        openEdit(m);
      }}
    />
  </section>;
}
