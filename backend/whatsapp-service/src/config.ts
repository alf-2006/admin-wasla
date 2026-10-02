import dotenv from 'dotenv';

dotenv.config();

export interface AppConfig {
  port: number;
  supabaseUrl: string;
  supabaseAnonKey: string;
  adminEmails: string[];
  corsOrigins: string[];
  nodeEnv: string;
  isDev: boolean;
  isMock: boolean;
}

function parseOrigins(raw?: string): string[] {
  if (!raw) return ['http://localhost:5173', 'http://127.0.0.1:5173'];
  return raw
    .split(',')
    .map((origin) => origin.trim().toLowerCase())
    .filter(Boolean);
}

function parseAdminEmails(raw?: string): string[] {
  if (!raw) return ['admin@wasla.local', 'admin@example.com'];
  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export const config: AppConfig = {
  port: Number(process.env.PORT) || 3030,
  supabaseUrl:
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    'https://mukqrnmveydxfphftlaq.supabase.co',
  supabaseAnonKey:
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11a3Fybm12ZXlkeGZwaGZ0bGFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNzk2MDEsImV4cCI6MjEwNDY1NTYwMX0.-Kv6J-vnpBiONn6mpsXMZRdFPOvkjQ-HDQ_iVEpWPaM',
  adminEmails: parseAdminEmails(
    process.env.WHATSAPP_ADMIN_EMAILS || process.env.WHATSAPP_BRIDGE_ADMIN_EMAILS
  ),
  corsOrigins: parseOrigins(
    process.env.CORS_ORIGIN || process.env.WHATSAPP_BRIDGE_ORIGINS
  ),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') !== 'production',
  isMock: true,
};
