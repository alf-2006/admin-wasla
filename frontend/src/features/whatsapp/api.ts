import { supabase } from '../../lib/supabase/client';

const bridgeUrl = (import.meta.env.VITE_WHATSAPP_BRIDGE_URL as string | undefined) ?? 'http://localhost:3030';

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

async function request<T>(path: string, body?: Record<string, unknown>): Promise<T> {
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
