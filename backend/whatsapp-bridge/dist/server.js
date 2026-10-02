import { createServer } from 'node:http';
import { config, isConfigured } from './config.js';
import { requireAdmin } from './adminAuth.js';
import { disableBridge, enableBridge, getStatus, revokeSession, sendText, setDryRun } from './connection.js';
import { resolveTaskMessage } from './taskMessage.js';
const send = (res, status, body, origin = '') => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}) });
    res.end(JSON.stringify(body));
};
async function readBody(req) {
    let raw = '';
    for await (const chunk of req) {
        raw += chunk.toString();
        if (raw.length > 16_384)
            throw new Error('حجم الطلب أكبر من المسموح.');
    }
    return raw ? JSON.parse(raw) : {};
}
async function handle(req, res) {
    const origin = req.headers.origin ?? '';
    if (origin && !config.origins.includes(origin.toLowerCase()))
        return send(res, 403, { error: 'النطاق غير مسموح.' });
    if (req.method === 'OPTIONS') {
        res.writeHead(204, { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'authorization,content-type', Vary: 'Origin' });
        return res.end();
    }
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    if (req.method === 'GET' && url.pathname === '/health')
        return send(res, 200, { ok: true, configured: isConfigured(), dryRun: config.dryRun }, origin);
    try {
        const admin = await requireAdmin(req.headers.authorization);
        if (req.method === 'GET' && url.pathname === '/v1/status')
            return send(res, 200, { configured: isConfigured(), ...getStatus() }, origin);
        if (req.method !== 'POST')
            return send(res, 405, { error: 'الطريقة غير مدعومة.' }, origin);
        if (!isConfigured() && url.pathname !== '/v1/disconnect')
            return send(res, 503, { error: 'أكمل إعداد خدمة الربط ومفتاح تشفير الجلسة أولًا.' }, origin);
        if (url.pathname === '/v1/connect')
            return send(res, 200, { configured: isConfigured(), ...await enableBridge() }, origin);
        if (url.pathname === '/v1/disconnect')
            return send(res, 200, { configured: isConfigured(), ...await disableBridge() }, origin);
        if (url.pathname === '/v1/revoke')
            return send(res, 200, { configured: isConfigured(), ...await revokeSession() }, origin);
        if (url.pathname === '/v1/send-task') {
            const body = await readBody(req);
            if (!Number.isInteger(body.taskId) || !Number.isInteger(body.memberId) || body.consentConfirmed !== true)
                return send(res, 400, { error: 'اختر مهمة وعضوًا واحدًا وأكّد موافقته على واتساب.' }, origin);
            const message = await resolveTaskMessage(admin, Number(body.taskId), Number(body.memberId));
            const result = await sendText(message.phone, message.text);
            return send(res, 200, { ...result, memberName: message.memberName, taskTitle: message.taskTitle }, origin);
        }
        return send(res, 404, { error: 'المسار غير موجود.' }, origin);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'تعذر تنفيذ طلب واتساب.';
        const status = message.includes('جلسة') || message.includes('مخوّل') || message.includes('تسجيل دخول') ? 401 : 400;
        return send(res, status, { error: message }, origin);
    }
}
setDryRun(config.dryRun);
createServer((req, res) => { void handle(req, res); }).listen(config.port, () => {
    console.info(`WhatsApp QR bridge listening on port ${config.port}; dry-run=${config.dryRun}; configured=${isConfigured()}`);
});
