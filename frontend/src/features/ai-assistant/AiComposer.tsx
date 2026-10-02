import { useState } from 'react';
import type { FormEvent } from 'react';
import { Send } from 'lucide-react';
import { Button } from '../../components/ui/Button';

const prompts = [
  'لخص جاهزية نزول الإسكندرية والميدان',
  'من هم الأعضاء المتاحون ولديهم لابتوب؟',
  'ما هي المهام المتأخرة حالياً؟',
  'اقترح توزيع مهمة جديدة لتطوير الموقع',
];

export function AiComposer({ isPending, onSend }: { isPending: boolean; onSend: (message: string) => void }) {
  const [value, setValue] = useState('');
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!value.trim()) return;
    onSend(value);
    setValue('');
  };

  return (
    <div className="grid gap-3">
      <div className="flex gap-2 overflow-x-auto pb-1" aria-label="أسئلة مقترحة">{prompts.map((prompt) => <button key={prompt} type="button" onClick={() => onSend(prompt)} disabled={isPending} className="min-h-11 shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-bold text-[var(--text-2)] hover:bg-[var(--primary-soft)] disabled:opacity-50">{prompt}</button>)}</div>
      <form onSubmit={submit} className="flex gap-2">
        <label className="min-w-0 flex-1"><span className="sr-only">اكتب سؤالك للمساعد</span><input value={value} onChange={(event) => setValue(event.target.value)} disabled={isPending} placeholder="اسأل عن الفريق أو اطلب إنشاء مهمة..." className="min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-base" /></label>
        <Button type="submit" disabled={!value.trim() || isPending} icon={<Send size={18} />} className="min-w-14 px-3"><span className="hidden sm:inline">إرسال</span></Button>
      </form>
    </div>
  );
}
