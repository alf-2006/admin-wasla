import { useState } from 'react';
import { Plus, Search, StickyNote } from 'lucide-react';
import { useNotes, useDeleteNote } from './api';
import { useMembers } from '../members/api';
import { NotesList } from './NotesList';
import { NoteEditor } from './NoteEditor';

type TargetFilter = 'ALL' | 'GENERAL' | 'MEMBER';

export default function NotesPage() {
  const notesQuery = useNotes();
  const membersQuery = useMembers();
  const deleteNote = useDeleteNote();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [targetFilter, setTargetFilter] = useState<TargetFilter>('ALL');
  const query = searchTerm.toLowerCase();
  const filteredNotes = (notesQuery.data ?? []).filter((note) => {
    const matchSearch = note.text.toLowerCase().includes(query)
      || Boolean(note.target_name?.toLowerCase().includes(query))
      || Boolean(note.author?.toLowerCase().includes(query));
    const matchTarget = targetFilter === 'ALL'
      || (targetFilter === 'GENERAL' && !note.target_team && !note.target_member_id)
      || (targetFilter === 'MEMBER' && Boolean(note.target_member_id));
    return matchSearch && matchTarget;
  });

  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذه الملاحظة؟')) return;
    try {
      await deleteNote.mutateAsync(id);
    } catch (cause) {
      alert(cause instanceof Error ? cause.message : 'تعذر حذف الملاحظة.');
    }
  };

  return (
    <div className="grid gap-5" dir="rtl">
      <section className="grid gap-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="flex items-center gap-2 text-lg font-black"><StickyNote size={21} className="text-[var(--link)]" />سجل الملاحظات والتوجيهات</h2><p className="mt-1 text-sm text-[var(--text-muted)]">{notesQuery.data?.length ?? 0} ملاحظة للفريق والأعضاء.</p></div>
          <button type="button" onClick={() => setIsEditorOpen(true)} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-extrabold text-white hover:bg-[var(--primary-hover)] sm:w-auto"><Plus size={18} />كتابة ملاحظة</button>
        </div>
        <div className="grid gap-3 border-t border-[var(--border)] pt-4 sm:grid-cols-2">
          <label className="relative"><span className="sr-only">البحث في الملاحظات</span><Search size={18} className="absolute inset-inline-end-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" /><input type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="ابحث في الملاحظات" className="min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] pe-10 ps-3 text-sm" /></label>
          <label><span className="sr-only">تصفية حسب الجهة</span><select value={targetFilter} onChange={(event) => setTargetFilter(event.target.value as TargetFilter)} className="min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 text-sm"><option value="ALL">كل الملاحظات</option><option value="GENERAL">عامة للفريق</option><option value="MEMBER">لعضو محدد</option></select></label>
        </div>
      </section>
      <NotesList notes={filteredNotes} isLoading={notesQuery.isLoading} isError={notesQuery.isError} onRetry={() => { void notesQuery.refetch(); }} onDelete={handleDelete} />
      <NoteEditor isOpen={isEditorOpen} members={membersQuery.data ?? []} onClose={() => setIsEditorOpen(false)} />
    </div>
  );
}
