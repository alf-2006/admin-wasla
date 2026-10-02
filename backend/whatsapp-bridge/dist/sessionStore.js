import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { BufferJSON, initAuthCreds } from '@whiskeysockets/baileys';
import { config } from './config.js';
function keyBytes() {
    const key = Buffer.from(config.encryptionKey, 'base64');
    if (key.length !== 32)
        throw new Error('WHATSAPP_SESSION_ENCRYPTION_KEY must decode to exactly 32 bytes.');
    return key;
}
async function readSession() {
    try {
        const envelope = JSON.parse(await readFile(config.sessionFile, 'utf8'));
        const decipher = createDecipheriv('aes-256-gcm', keyBytes(), Buffer.from(envelope.iv, 'base64'));
        decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
        const json = Buffer.concat([decipher.update(Buffer.from(envelope.data, 'base64')), decipher.final()]).toString('utf8');
        return JSON.parse(json, BufferJSON.reviver);
    }
    catch (error) {
        if (error.code === 'ENOENT')
            return { creds: initAuthCreds(), keys: {} };
        throw new Error('Unable to decrypt WhatsApp session. Check the configured encryption key.');
    }
}
async function writeSession(payload) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', keyBytes(), iv);
    const json = Buffer.from(JSON.stringify(payload, BufferJSON.replacer));
    const data = Buffer.concat([cipher.update(json), cipher.final()]);
    const envelope = { iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') };
    const target = config.sessionFile;
    const temporary = `${target}.tmp`;
    await mkdir(dirname(target), { recursive: true, mode: 0o700 });
    await writeFile(temporary, JSON.stringify(envelope), { mode: 0o600 });
    await rename(temporary, target);
}
export async function createEncryptedAuthState() {
    const payload = await readSession();
    let pending = Promise.resolve();
    const persist = () => {
        pending = pending.then(() => writeSession(payload));
        return pending;
    };
    const keys = {
        async get(type, ids) {
            const values = payload.keys[type];
            const output = {};
            for (const id of ids) {
                const value = values?.[id];
                if (value !== undefined)
                    output[id] = value;
            }
            return output;
        },
        async set(data) {
            for (const [type, entries] of Object.entries(data)) {
                const bucket = (payload.keys[type] ??= {});
                for (const [id, value] of Object.entries(entries ?? {})) {
                    if (value === null)
                        delete bucket[id];
                    else
                        bucket[id] = value;
                }
            }
            await persist();
        },
    };
    return {
        state: { creds: payload.creds, keys },
        saveCreds: async () => persist(),
        clear: async () => {
            payload.keys = {};
            payload.creds = initAuthCreds();
            await persist();
        },
    };
}
