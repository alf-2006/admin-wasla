import type { Note } from '../../types/db';
import { CardSkeletons } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { NoteCard } from './NoteCard';

export function NotesList({ notes, isLoading, isError, onRetry, onDelete }: { notes: Note[]; isLoading: boolean; isError: boolean; onRetry: () => void; onDelete: (id: number) => void }) {
  if (isLoading) return <CardSkeletons count={3} />;
  if (isError) return <ErrorState message="تعذر تحميل الملاحظات." onRetry={onRetry} />;
  if (!notes.length) return <EmptyState title="لا توجد ملاحظات مدونة" description="أضف أول توجيه للفريق أو لعضو محدد لمتابعة التحديثات." />;
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{notes.map((note) => <NoteCard key={note.id} note={note} onDelete={onDelete} />)}</div>;
}
