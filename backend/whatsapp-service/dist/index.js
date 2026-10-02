import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { whatsappRouter } from './routes/whatsapp.js';
export const app = express();
// CORS Middleware
app.use(cors({
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        if (config.isDev || config.corsOrigins.includes(origin.toLowerCase())) {
            return callback(null, true);
        }
        return callback(new Error('CORS origin not allowed'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'Accept'],
}));
// JSON body parser with size limit
app.use(express.json({ limit: '1mb' }));
// Health check endpoint (public, unauthenticated)
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        service: 'wasla-whatsapp-service',
        isMock: true,
        configured: true,
        port: config.port,
        timestamp: new Date().toISOString(),
    });
});
// Auth middleware protecting all WhatsApp routes
app.use(authMiddleware);
// Mount WhatsApp router at root
app.use(whatsappRouter);
// Central error handler
app.use(errorHandler);
// Listen on configured port when running directly
let server = null;
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const isDirectRun = Boolean(process.argv[1]) &&
    path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);
if (isDirectRun) {
    server = app.listen(config.port, () => {
        console.info(`[WhatsApp Service] Server listening on port ${config.port} (mode: ${config.nodeEnv}, mock: ${config.isMock})`);
    });
}
export { server };
