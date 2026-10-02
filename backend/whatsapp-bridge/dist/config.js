const splitList = (value) => (value ?? '').split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
export const config = {
    port: Number(process.env.PORT ?? 3030),
    supabaseUrl: process.env.SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? '',
    adminEmails: splitList(process.env.WHATSAPP_BRIDGE_ADMIN_EMAILS),
    encryptionKey: process.env.WHATSAPP_SESSION_ENCRYPTION_KEY ?? '',
    sessionFile: process.env.WHATSAPP_SESSION_FILE ?? './data/session.enc',
    origins: splitList(process.env.WHATSAPP_BRIDGE_ORIGINS),
    dryRun: process.env.WHATSAPP_BRIDGE_DRY_RUN === 'true',
};
export function isConfigured() {
    return Boolean(config.supabaseUrl && config.supabaseAnonKey && config.adminEmails.length && isEncryptionKeyValid());
}
export function isEncryptionKeyValid() {
    try {
        return Buffer.from(config.encryptionKey, 'base64').length === 32;
    }
    catch {
        return false;
    }
}
