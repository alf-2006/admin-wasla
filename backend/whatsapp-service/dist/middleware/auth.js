import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';
export async function authMiddleware(req, res, next) {
    // Allow OPTIONS preflight through
    if (req.method === 'OPTIONS') {
        return next();
    }
    const authHeader = req.headers.authorization;
    const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
    // Dev fallback: in development mode, allow requests without token or with mock tokens
    if (config.isDev && (!token || token === 'dev-token' || token === 'mock-admin-token')) {
        req.user = {
            id: 'mock-admin-id',
            email: config.adminEmails[0] || 'admin@wasla.local',
            role: 'admin',
        };
        return next();
    }
    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'يلزم تسجيل دخول الإدارة (Authorization token missing).',
        });
    }
    try {
        const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
            auth: { persistSession: false },
            global: { headers: { Authorization: `Bearer ${token}` } },
        });
        const { data, error } = await supabase.auth.getUser(token);
        const email = data.user?.email?.toLowerCase();
        if (error || !email) {
            if (config.isDev) {
                req.user = {
                    id: 'dev-fallback-id',
                    email: config.adminEmails[0] || 'admin@wasla.local',
                    role: 'admin',
                };
                return next();
            }
            return res.status(401).json({
                success: false,
                error: 'جلسة الإدارة غير صالحة أو منتهية الصلاحية.',
            });
        }
        if (config.adminEmails.length > 0 && !config.adminEmails.includes(email)) {
            return res.status(403).json({
                success: false,
                error: 'هذا الحساب غير مخوّل لإدارة خدمة واتساب.',
            });
        }
        req.user = {
            id: data.user?.id,
            email,
            role: 'admin',
        };
        return next();
    }
    catch (_err) {
        if (config.isDev) {
            req.user = {
                id: 'dev-fallback-id',
                email: config.adminEmails[0] || 'admin@wasla.local',
                role: 'admin',
            };
            return next();
        }
        return res.status(500).json({
            success: false,
            error: 'فشل التحقق من صلاحيات الإدارة.',
        });
    }
}
