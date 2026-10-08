import { supabase } from '../../lib/supabase/client';

const RAW_BRIDGE_URL = ((import.meta.env.VITE_WHATSAPP_BRIDGE_URL as string | undefined) ?? 'http://localhost:3030').trim();

/**
 * عنوان جسر واتساب — في الإنتاج يُشترط https (باستثناء localhost للتطوير)
 * لمنع Mixed Content وتسريب Bearer token فوق http.
 */
function resolveBridgeUrl(): string {
  const fallback = 'http://localhost:3030';
  let parsed: URL;
  try {
    parsed = new URL(RAW_BRIDGE_URL || fallback);
  } catch {
    if (import.meta.env.PROD) throw new Error('عنوان خدمة واتساب غير مضبوط.');
    return fallback;
  }
  const isLocal = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  if (import.meta.env.PROD && parsed.protocol !== 'https:' && !isLocal) {
    throw new Error('خدمة واتساب غير متاحة فوق اتصال غير مشفّر.');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('عنوان خدمة واتساب غير صالح.');
  }
  return parsed.origin;
}

const bridgeUrl = resolveBridgeUrl();

const ALLOWED_BRIDGE_PATHS = new Set([
  '/v1/status',
  '/qr',
  '/v1/connect',
  '/v1/disconnect',
  '/v1/revoke',
  '/v1/send-task',
  '/v1/diagnostics',
]);

export type ConnectionState = 'disconnected' | 'qr_ready' | 'connecting' | 'connected';

export type WhatsAppStatus = {
  configured: boolean;
  enabled: boolean;
  connected: boolean;
  qr: string | null;
  qrExpiresAt: string | null;
  phone: string | null;
  dryRun: boolean;
  state?: ConnectionState;
  isMock?: boolean;
  disclaimer?: string;
};
export type QRResponse = {
  qr: string;
  expiresAt: string;
  secondsRemaining: number;
  state: ConnectionState;
};
export type WhatsAppSendResult = { accepted: boolean; simulated: boolean; memberName?: string; taskTitle?: string; sent: number; failed: number; errors: string[] };

// --- تشخيص الجسر: فحوصات دقيقة بلا أي قيم سرية ---
export type DiagStatus = 'ok' | 'warn' | 'fail';
export interface DiagCheck {
  id: string;
  category: 'env' | 'network' | 'auth' | 'service' | 'cloud';
  label: string;
  status: DiagStatus;
  detail: string;
  fix?: string;
}
export interface BridgeDiagnostics {
  generatedAt: string;
  mode: string;
  summary: { total: number; fails: number; warns: number };
  checks: DiagCheck[];
}

export const getBridgeUrl = () => bridgeUrl;

export const getBridgeDiagnostics = () => request<BridgeDiagnostics>('/v1/diagnostics');

async function request<T>(path: string, body?: Record<string, unknown>): Promise<T> {
  if (!ALLOWED_BRIDGE_PATHS.has(path)) throw new Error('مسار خدمة واتساب غير مسموح.');
  if (body) {
    const taskId = (body as { taskId?: unknown }).taskId;
    const memberIds = (body as { memberIds?: unknown }).memberIds;
    if (taskId !== undefined && (!Number.isInteger(taskId) || (taskId as number) <= 0)) {
      throw new Error('معرّف المهمة غير صالح.');
    }
    if (memberIds !== undefined) {
      if (!Array.isArray(memberIds) || memberIds.length < 1 || memberIds.length > 50) {
        throw new Error('قائمة الأعضاء غير صالحة (1-50).');
      }
      const ids = memberIds as unknown[];
      if (!ids.every((id) => Number.isInteger(id) && (id as number) > 0) || new Set(ids).size !== ids.length) {
        throw new Error('قائمة الأعضاء تحتوي قيماً غير صالحة أو مكررة.');
      }
      if ('consentConfirmed' in body && (body as { consentConfirmed?: unknown }).consentConfirmed !== true) {
        throw new Error('يلزم تأكيد موافقة الأعضاء قبل الإرسال.');
      }
    }
  }
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('سجّل دخول الإدارة أولًا لفتح إعدادات واتساب.');
  const response = await fetch(`${bridgeUrl}${path}`, {
    method: body ? 'POST' : 'GET',
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(result.error ?? 'تعذر الاتصال بخدمة واتساب.');
  return result;
}

export const getWhatsAppStatus = () => request<WhatsAppStatus>('/v1/status');
export const getWhatsAppQR = () => request<QRResponse>('/qr');
export const connectWhatsApp = () => request<WhatsAppStatus>('/v1/connect', {});
export const simulatePairWhatsApp = () => request<WhatsAppStatus>('/v1/connect', { simulate: true });
export const disconnectWhatsApp = () => request<WhatsAppStatus>('/v1/disconnect', {});
export const revokeWhatsAppSession = () => request<WhatsAppStatus>('/v1/revoke', {});
export const sendWhatsAppTask = (taskId: number, memberIds: number[], consentConfirmed: boolean) =>
  request<WhatsAppSendResult>('/v1/send-task', { taskId, memberIds, consentConfirmed });

// --- Meta Cloud API Functions ---
export type CloudStatus = {
  configured: boolean;
  enabled: boolean;
  templateName: string | null;
};
export type CloudSendResult = {
  sent: number;
  failed: number;
  errors: string[];
};

export async function getCloudStatus(): Promise<CloudStatus> {
  const { data, error } = await supabase.functions.invoke('whatsapp-tasks', {
    body: { action: 'status' },
  });
  if (error) throw new Error(error.message || 'تعذر الاتصال بـ Cloud API');
  if (data?.error) throw new Error(data.error);
  return data as CloudStatus;
}

export async function setCloudEnabled(enabled: boolean): Promise<CloudStatus> {
  const { data, error } = await supabase.functions.invoke('whatsapp-tasks', {
    body: { action: 'set-enabled', enabled },
  });
  if (error) throw new Error(error.message || 'تعذر تعديل حالة البوت');
  if (data?.error) throw new Error(data.error);
  return data as CloudStatus;
}

export async function sendCloudTasks(taskId: number, memberIds: number[], consentConfirmed: boolean): Promise<CloudSendResult> {
  const { data, error } = await supabase.functions.invoke('whatsapp-tasks', {
    body: { action: 'send', taskId, memberIds, consentConfirmed },
  });
  if (error) throw new Error(error.message || 'تعذر الإرسال');
  if (data?.error) throw new Error(data.error);
  return data as CloudSendResult;
}
