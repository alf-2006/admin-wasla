import { CalendarDays, Megaphone, Trash2, UserRound } from 'lucide-react';
import type { Note } from '../../types/db';

export function NoteCard({ note, onDelete }: { note: Note; onDelete: (id: number) => void }) {
  const Icon = note.target_name ? UserRound : Megaphone;
  const audience = note.target_name ? `إلى ${note.target_name}` : 'ملاحظة عامة';
  return (
    <article className="grid content-between gap-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)] sm:p-5">
      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-3"><span className="inline-flex min-h-8 items-center gap-2 rounded-full bg-[var(--primary-soft)] px-3 text-sm font-bold text-[var(--primary-ink)] dark:text-[var(--link)]"><Icon size={16} aria-hidden="true" />{audience}</span><button type="button" onClick={() => onDelete(note.id)} className="grid size-11 shrink-0 place-items-center rounded-xl text-[var(--text-muted)] hover:bg-red-50 hover:text-red-800 dark:hover:bg-red-950/40" aria-label={`حذف ملاحظة ${note.author || ''}`}><Trash2 size={18} /></button></div>
        <p className="whitespace-pre-line text-sm leading-6">{note.text}</p>
      </div>
      <footer className="flex items-center justify-between gap-3 border-t border-[var(--border)] pt-3 text-sm text-[var(--text-muted)]"><strong className="text-[var(--text-2)]">{note.author || 'الإدارة'}</strong><span className="flex items-center gap-1.5"><CalendarDays size={15} />{note.date || note.created_at?.slice(0, 10)}</span></footer>
    </article>
  );
}
