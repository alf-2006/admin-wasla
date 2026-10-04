import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, UserPlus, Users } from 'lucide-react';
import type { Member, MemberInsert } from '../../types/db';
import { useMembers, useAddMember, useUpdateMember, useDeleteMember } from './api';
import { useNotes } from '../notes/api';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { CardSkeletons } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { MemberToolbar } from './MemberToolbar';
import type { MemberFiltersValue } from './MemberToolbar';
import { MemberCards } from './MemberCards';
import { MemberProfileModal } from './MemberProfileModal';
import { MemberEditor } from './MemberEditor';
import { MemberExcelActions } from './MemberExcelActions';
import { sanitizeText, isValidEmail, isValidEgyptianPhone } from '../../lib/validators';
import { handleSupabaseError, logError } from '../../lib/errorHandler';
import { toast } from '../../store/toast';

const emptyMember: MemberInsert = {
  email: '',
  full_name: '',
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
  can_go_alexandria: false,
};

const PAGE_SIZES = [10, 20, 50] as const;
const DELETE_UNDO_MS = 5000;

export default function MembersPage() {
  const query = useMembers();
  const notesQuery = useNotes();
  const add = useAddMember();
  const update = useUpdateMember();
  const remove = useDeleteMember();
  const [filters, setFilters] = useState<MemberFiltersValue>({ search: '', work_conditions: 'ALL', device: 'ALL', alexandria: 'ALL' });
  const [editing, setEditing] = useState<Member | null>(null);
  const [drawerMember, setDrawerMember] = useState<Member | null>(null);
  const [form, setForm] = useState<MemberInsert>(emptyMember);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(10);
  const deleteTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (deleteTimer.current !== null) window.clearTimeout(deleteTimer.current);
  }, []);

  const workConditions = useMemo(() => [...new Set((query.data ?? []).map((member) => member.work_conditions).filter((c): c is string => Boolean(c)))], [query.data]);

  const visibleMembers = useMemo(() => (query.data ?? []).filter((member) => {
    const term = filters.search.trim().toLowerCase();
    const matchesText = !term || `${member.full_name} ${member.email} ${member.phone ?? ''} ${member.residence ?? ''} ${member.bio ?? ''}`.toLowerCase().includes(term);
    const matchesWorkConditions = filters.work_conditions === 'ALL' || member.work_conditions === filters.work_conditions;
    const matchesDevice = filters.device === 'ALL' || (member.device ?? '').includes(filters.device);
    const matchesAlexandria = filters.alexandria === 'ALL' || member.can_go_alexandria === (filters.alexandria === 'YES');
    return matchesText && matchesWorkConditions && matchesDevice && matchesAlexandria;
  }), [filters, query.data]);

  // العودة لأول صفحة عند تغير الفلاتر أو البيانات أو حجم الصفحة
  useEffect(() => { setPage(0); }, [filters, pageSize, query.data?.length]);

  const totalPages = Math.max(1, Math.ceil(visibleMembers.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageMembers = visibleMembers.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const rangeStart = visibleMembers.length ? safePage * pageSize + 1 : 0;
  const rangeEnd = Math.min(visibleMembers.length, safePage * pageSize + pageSize);

  const openNew = () => { setEditing(null); setForm(emptyMember); setFormError(''); setDialogOpen(true); };
  const openEdit = (member: Member) => {
    setDrawerMember(null);
    setEditing(member);
    setForm({
      email: member.email,
      full_name: member.full_name,
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
      can_go_alexandria: member.can_go_alexandria,
    });
    setFormError(''); setDialogOpen(true);
  };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setFormError('');

    const trimmedName = sanitizeText(form.full_name.trim());
    const trimmedEmail = form.email.trim().toLowerCase();

    if (!trimmedName || !trimmedEmail) {
      setFormError('الاسم والبريد الإلكتروني حقول إجبارية.');
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setFormError('البريد الإلكتروني غير صالح. يجب أن يحتوي على @ ونطاق صحيح.');
      return;
    }

    const trimmedPhone = (form.phone || '').trim();
    if (trimmedPhone && !isValidEgyptianPhone(trimmedPhone)) {
      setFormError('رقم الهاتف غير صالح. استخدم رقم مصري صحيح: 01xxxxxxxxx أو +20xxxxxxxxxx.');
      return;
    }

    try {
      const cleanedForm = {
        ...form,
        full_name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone || null,
        bio: sanitizeText(form.bio || ''),
      };

      if (editing) await update.mutateAsync({ id: editing.id, ...cleanedForm });
      else await add.mutateAsync(cleanedForm);
      setDialogOpen(false);
      toast.success(editing ? 'تم حفظ بيانات العضو بنجاح.' : 'تم تسجيل العضو الجديد بنجاح.');
    } catch (cause) {
      logError(cause, 'MembersPage.save');
      const error = handleSupabaseError(cause);
      setFormError(error.message);
    }
  };

  // حذف مؤجل 5 ثوانٍ مع تراجع — نفس منطق الحذف الحالي دون تغيير semantics الخادم
  const confirmDelete = () => {
    const target = memberToDelete;
    if (!target) return;
    setMemberToDelete(null);
    if (deleteTimer.current !== null) window.clearTimeout(deleteTimer.current);
    deleteTimer.current = window.setTimeout(() => {
      deleteTimer.current = null;
      void remove.mutateAsync(target.id).then(
        () => toast.success(`تم حذف ${target.full_name} نهائياً.`),
        (cause: unknown) => toast.error(handleSupabaseError(cause).message || 'تعذر حذف العضو.'),
      );
    }, DELETE_UNDO_MS);
    toast.success(`تم حذف ${target.full_name}.`, {
      durationMs: DELETE_UNDO_MS,
      action: {
        label: 'تراجع',
        onClick: () => {
          if (deleteTimer.current !== null) { window.clearTimeout(deleteTimer.current); deleteTimer.current = null; }
          toast.info('تم التراجع عن الحذف.');
        },
      },
    });
  };

  const askDelete = (member: Member) => { setDrawerMember(null); setMemberToDelete(member); };

  return <section className="flex min-w-0 w-full flex-col gap-6" id="page-members" dir="rtl">
    
    {/* Brand Header */}
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 rounded-[var(--radius-lg)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)] border border-[var(--border)]">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-[var(--text)] flex items-center gap-3 m-0">
          <span className="flex items-center justify-center size-12 rounded-[var(--radius)] bg-[var(--primary-soft)] text-[var(--primary)]">
            <Users size={24} />
          </span>
          دليل وجاهزية الأعضاء
        </h1>
        <p className="text-[var(--text-muted)] mt-1">
          سجل الحالة التشغيلية، الأجهزة، وتوفر الكوادر للنزول الميداني. العدد الحالي: <span className="font-bold text-[var(--primary)]">{query.data?.length ?? 0}</span> عضو.
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <MemberExcelActions members={query.data ?? []} />
        <Button onClick={openNew} icon={<UserPlus size={18} aria-hidden="true" />} variant="primary">
          تسجيل عضو جديد
        </Button>
      </div>
    </div>

    {/* Filters Section */}
    <div className="rounded-[var(--radius-lg)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)] border border-[var(--border)]">
      <MemberToolbar workConditions={workConditions} value={filters} onChange={setFilters} resultCount={visibleMembers.length} totalCount={query.data?.length ?? 0} />
    </div>

    {/* Main Content Area */}
    <div className="min-w-0 w-full rounded-[var(--radius-lg)] bg-transparent">
      {query.isLoading ? <div className="py-6"><CardSkeletons count={6} /></div>
        : query.isError ? <div className="py-6"><ErrorState message="تعذر تحميل سجلات الأعضاء." onRetry={() => { void query.refetch(); }} /></div>
          : visibleMembers.length ? <>
            <div className="mb-6">
              <MemberCards members={pageMembers} onView={setDrawerMember} onEdit={openEdit} onDelete={askDelete} />
            </div>
            
            {/* Pagination */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-lg)] bg-[var(--surface)] shadow-[var(--shadow-sm)] border border-[var(--border)] px-6 py-4" aria-label="ترقيم الصفحات">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm font-bold text-[var(--text-muted)]" htmlFor="member-page-size">
                  لكل صفحة
                  <select
                    id="member-page-size"
                    value={pageSize}
                    onChange={(event) => setPageSize(Number(event.target.value))}
                    className="h-[var(--touch)] rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm font-bold text-[var(--text)] outline-none focus-visible:border-[var(--primary)]"
                  >
                    {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
                  </select>
                </label>
                <p className="text-sm font-bold text-[var(--text-muted)] tabular-nums" role="status">
                  عرض {rangeStart}–{rangeEnd} من {visibleMembers.length}
                </p>
              </div>
              <span className="flex items-center gap-3">
                <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage === 0} className="inline-flex size-[var(--touch)] items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-2)] disabled:opacity-50" aria-label="الصفحة السابقة">
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
                <span className="text-sm font-bold text-[var(--text)] tabular-nums" aria-current="page">صفحة {safePage + 1} من {totalPages}</span>
                <button type="button" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={safePage >= totalPages - 1} className="inline-flex size-[var(--touch)] items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-2)] disabled:opacity-50" aria-label="الصفحة التالية">
                  <ChevronLeft size={18} aria-hidden="true" />
                </button>
              </span>
            </div>
          </>
            : <div className="py-12"><EmptyState title="لا يوجد تطابق" description="لم نجد أي عضو يطابق معايير التصفية." /></div>}
    </div>

    <ConfirmDialog
      isOpen={Boolean(memberToDelete)}
      onClose={() => setMemberToDelete(null)}
      onConfirm={confirmDelete}
      title="تأكيد حذف العضو"
      itemName={memberToDelete?.full_name}
      description={memberToDelete ? `سيتم حذف ${memberToDelete.full_name} نهائياً. يمكنك التراجع خلال 5 ثوانٍ من إشعار التأكيد.` : undefined}
      confirmLabel="حذف نهائي"
      isPending={false}
      pendingLabel="جارٍ الحذف..."
    />

    <MemberProfileModal
      isOpen={Boolean(drawerMember)}
      member={drawerMember}
      notes={notesQuery.data ?? []}
      onClose={() => setDrawerMember(null)}
      onEdit={openEdit}
      onDelete={askDelete}
    />

    <MemberEditor isOpen={dialogOpen} isSaving={add.isPending || update.isPending} member={editing} value={form} error={formError} onChange={setForm} onClose={() => setDialogOpen(false)} onSubmit={save} />
  </section>;
}
