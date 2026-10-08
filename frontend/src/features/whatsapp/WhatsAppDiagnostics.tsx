import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, CheckCircle2, AlertTriangle, XCircle, Copy, RefreshCw, PlugZap } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabase/client';
import { toast } from '../../store/toast';
import { getBridgeDiagnostics, getBridgeUrl, BRIDGE_MISCONFIGURED_MESSAGE, type BridgeDiagnostics, type DiagCheck } from './api';

const STATUS_META: Record<DiagCheck['status'], { icon: typeof CheckCircle2; label: string; chip: string }> = {
  ok: { icon: CheckCircle2, label: 'سليم', chip: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
  warn: { icon: AlertTriangle, label: 'تحذير', chip: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  fail: { icon: XCircle, label: 'عطل', chip: 'bg-red-500/10 text-red-700 dark:text-red-300' },
};

const CATEGORY_LABELS: Record<DiagCheck['category'], string> = {
  env: 'إعدادات الخادم',
  network: 'الشبكة',
  auth: 'المصادقة',
  service: 'الخدمة',
  cloud: 'السحابة المعتمدة',
};

function verdict(data: BridgeDiagnostics | undefined): string {
  if (!data) return '';
  const firstFail = data.checks.find((c) => c.status === 'fail');
  if (!firstFail) {
    return data.summary.warns > 0
      ? 'الجسر يعمل — توجد تحذيرات غير حرجة بالأسفل.'
      : 'كل الفحوصات سليمة — الجسر جاهز للربط والإرسال.';
  }
  return `السبب الأرجح للعطل: ${firstFail.label} — ${firstFail.detail}`;
}

export default function WhatsAppDiagnostics() {
  const [sessionOk, setSessionOk] = useState<boolean | null>(null);
  const queryKey = ['whatsapp-diagnostics'];
  const bridgeUrl = getBridgeUrl();
  const diag = useQuery({
    queryKey,
    queryFn: async () => {
      if (!bridgeUrl) throw new Error(BRIDGE_MISCONFIGURED_MESSAGE);
      const { data } = await supabase.auth.getSession();
      setSessionOk(Boolean(data.session?.access_token));
      return getBridgeDiagnostics();
    },
    retry: false,
  });

  const copyReport = async () => {
    if (!diag.data) return;
    const lines = [
      `تقرير تشخيص جسر واتساب — ${new Date(diag.data.generatedAt).toLocaleString('ar-EG')} (وضع ${diag.data.mode})`,
      `الملخص: ${diag.data.summary.total} فحص — أعطال ${diag.data.summary.fails} — تحذيرات ${diag.data.summary.warns}`,
      '',
      ...diag.data.checks.map((c) => `[${c.status === 'ok' ? 'سليم' : c.status === 'warn' ? 'تحذير' : 'عطل'}] ${c.label}: ${c.detail}${c.fix ? ` | الحل: ${c.fix}` : ''}`),
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      toast.success('نُسخ التقرير — لا يحمل أي أسرار.');
    } catch {
      toast.error('تعذر النسخ من المتصفح.');
    }
  };

  return (
    <section className="grid gap-4" dir="rtl">
      <header className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--link)]">
          <Activity />
        </span>
        <div>
          <h2 className="text-[var(--fs-xl)] font-black">التشخيص الدقيق للجسر</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            يفحص كل طبقة (إعدادات، شبكة، مصادقة، خدمة، سحابة) ويحدد السبب بدقة — التقرير لا يحمل أي أسرار.
          </p>
        </div>
      </header>

      <Card className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-2 text-sm font-bold text-[var(--text-2)]">
          <PlugZap size={16} aria-hidden="true" />
          {bridgeUrl
            ? <span dir="ltr">{bridgeUrl}</span>
            : <span className="text-[var(--danger)]">{BRIDGE_MISCONFIGURED_MESSAGE}</span>}
        </span>
        <span className="text-xs text-[var(--text-muted)]">
          جلسة الإدارة: {sessionOk === null ? '…' : sessionOk ? 'موجودة' : 'غائبة — سجّل الدخول'}
        </span>
        <span className="ms-auto flex gap-2">
          <Button variant="secondary" onClick={() => void diag.refetch()} isLoading={diag.isFetching} loadingText="يفحص..." icon={<RefreshCw size={16} />}>
            إعادة الفحص
          </Button>
          <Button variant="secondary" onClick={() => void copyReport()} disabled={!diag.data} icon={<Copy size={16} />}>
            نسخ التقرير
          </Button>
        </span>
      </Card>

      {diag.isPending ? (
        <Card><p className="text-sm text-[var(--text-muted)]" role="status">جارٍ فحص الجسر…</p></Card>
      ) : diag.isError ? (
        <Card>
          <p role="alert" className="flex items-start gap-2 text-sm font-bold text-[var(--danger)]">
            <XCircle size={18} className="mt-0.5 shrink-0" />
            تعذر الوصول للجسر: {diag.error.message}
          </p>
          <ul className="mt-3 grid gap-1.5 text-sm leading-6 text-[var(--text-2)]">
            <li>• إن كانت الرسالة عن اتصال مرفوض: الجسر مطفأ — شغّله على نفس العنوان أعلاه.</li>
            <li>• إن كانت 401: الجسر يعمل لكن بلا مفاتيح تحقق — راجع `.env.local` وأعد تشغيله.</li>
            <li>• إن كانت 403: جلستك صالحة لكن بريدك ليس ضمن مدراء الجسر.</li>
          </ul>
        </Card>
      ) : diag.data ? (
        <>
          <Card className={diag.data.summary.fails > 0 ? 'border-red-300' : 'border-emerald-300'}>
            <p className="text-sm font-black leading-7">{verdict(diag.data)}</p>
          </Card>
          {(Object.keys(CATEGORY_LABELS) as Array<DiagCheck['category']>).map((cat) => {
            const items = diag.data?.checks.filter((c) => c.category === cat) ?? [];
            if (items.length === 0) return null;
            return (
              <Card key={cat} className="grid gap-3">
                <h3 className="font-black text-[var(--text)]">{CATEGORY_LABELS[cat]}</h3>
                <ul className="grid gap-2">
                  {items.map((check) => {
                    const meta = STATUS_META[check.status];
                    const Icon = meta.icon;
                    return (
                      <li key={check.id} className="grid gap-1 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
                        <p className="flex items-center gap-2 font-bold">
                          <Icon size={17} aria-hidden="true" />
                          {check.label}
                          <span className={`ms-auto rounded-full px-2 py-0.5 text-xs font-black ${meta.chip}`}>{meta.label}</span>
                        </p>
                        <p className="text-sm leading-6 text-[var(--text-2)]">{check.detail}</p>
                        {check.fix && <p className="text-sm leading-6 font-bold text-[var(--link)]">الحل: {check.fix}</p>}
                      </li>
                    );
                  })}
                </ul>
              </Card>
            );
          })}
        </>
      ) : null}
    </section>
  );
}
