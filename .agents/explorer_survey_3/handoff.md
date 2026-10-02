# Handoff Report: WhatsApp Service & Admin UX Architecture Survey

## 1. Observation

Direct examination of the repository revealed the following specific findings across the frontend, Supabase edge functions, backend bridge, and database:

### 1.1 Existing Cloud API Implementation (Fallback Path)
- **Edge Function**: Located at `backend/supabase/functions/whatsapp-tasks/index.ts` (96 lines).
  - Lines 26–32: Verifies Supabase JWT from `Authorization` header (`supabase.auth.getUser()`) and matches admin email against `WHATSAPP_ADMIN_EMAILS`.
  - Lines 41–52: Implements `action === 'status'` and `action === 'set-enabled'`, storing state in table `whatsapp_settings` (`id = 1`).
  - Lines 53–90: Implements `action === 'send'`, enforcing batch size limits (1 to 50 members), active work status (`member.work_status !== 'inactive'`), non-null phone numbers, and task assignment check. Calls Meta Graph API at `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages` with template `wasla_task_assignment` and language `ar`.
- **Database Schema**: Located at `backend/migrations/0002_whatsapp_settings.sql` (15 lines).
  - Lines 1–6: Table `public.whatsapp_settings` with `(id INTEGER PRIMARY KEY CHECK (id = 1), enabled BOOLEAN NOT NULL DEFAULT false, updated_at TIMESTAMPTZ, updated_by TEXT)`.
  - Lines 12–14: RLS enabled; `REVOKE ALL ON public.whatsapp_settings FROM anon, authenticated; GRANT SELECT, INSERT, UPDATE ON public.whatsapp_settings TO service_role;`.
- **Frontend Cloud API Component**: Located at `frontend/src/features/whatsapp/WhatsAppCloudPage.tsx` (140 lines).
  - Lines 50–77: Displays Cloud API status card with toggle button for bot activation (`setCloudEnabled`).
  - Lines 80–138: Allows selecting tasks, assigned members, recipient consent checkbox, and batch send modal.
- **Documentation**: `backend/WHATSAPP_SETUP.md` details the official Meta Business Platform Cloud API requirements and security guidelines.

### 1.2 Current State of Frontend WhatsApp Routing & Gaps
- **Routing**: `frontend/src/router/index.tsx` line 88 routes `/admin/whatsapp` to `<WhatsAppTasksPage />`.
- **Entry File**: `frontend/src/features/whatsapp/WhatsAppTasksPage.tsx` line 1:
  ```typescript
  export { default } from './WhatsAppQRPage';
  ```
  `WhatsAppTasksPage` strictly re-exports `WhatsAppQRPage`, making `WhatsAppCloudPage` completely inaccessible via the UI navigation, thus hiding the official fallback path from administrators.
- **Frontend API Client**: `frontend/src/features/whatsapp/api.ts` lines 3–29:
  - References `VITE_WHATSAPP_BRIDGE_URL` with fallback `http://localhost:3030`.
  - Sends requests with `Authorization: Bearer <session.access_token>` to endpoints `/v1/status`, `/v1/connect`, `/v1/disconnect`, `/v1/revoke`, `/v1/send-task`.
- **Design Principle Violation in Existing Preview**: `frontend/src/features/whatsapp/WhatsAppDispatch.tsx` line 28 contains:
  ```typescript
  return `مرحباً بك ${member.full_name} 👋،\n\nنود إعلامك بأنه قد تم إسناد تكليف جديد إليك في منظومة وصلة بعنوان:\n📌 *«${task.title}»*${due}\n\nيرجى التكرم بالدخول إلى بوابة وصلة لمراجعة تفاصيل المهمة والبدء في التنفيذ:\n🔗 ${baseUrl}/login\n\nتمنياتنا لك بالتوفيق،\nفريق إدارة وصلة.`;
  ```
  This verbatim code contains 4 emojis (`👋`, `📌`, `📅` on line 27, `🔗` on line 28). This directly violates the project rule: *"Strictly zero emojis anywhere (no emojis in code, UI, labels, icons, or text)"*.

### 1.3 Legacy Backend Bridge vs New Backend Service Requirements
- **Existing Bridge Directory**: `backend/whatsapp-bridge/` exists:
  - Uses raw Node.js `node:http.createServer` (`src/server.ts`, line 72), not Express.js.
  - Implements endpoints: `/health`, `/v1/status`, `/v1/connect`, `/v1/disconnect`, `/v1/revoke`, `/v1/send-task`.
  - In `src/connection.ts` line 25, it calls `makeWASocket` from `@whiskeysockets/baileys` directly with an encrypted session file `data/session.enc`, gated by `dryRun`.
- **Requested Target Directory**: `backend/whatsapp-service/` does NOT exist yet.
  - `ORIGINAL_REQUEST.md` (R2) mandates: *"Create a standalone Express.js server in `backend/whatsapp-service/` to manage the `@whiskeysockets/baileys` WebSocket connection... Test with mocks only; do not connect a real WhatsApp account or send live messages."*
  - Required endpoints specified in instructions: `GET /status`, `GET /qr`, `POST /disconnect`, `POST /mock-send`.

---

## 2. Logic Chain

From the observations above, the architectural path forward follows a clear, step-by-step reasoning chain:

1. **Dual-Path Strategy (Preserving Official Meta Cloud API as Fallback)**:
   - *Observation Reference*: 1.1 & 1.2 (`backend/supabase/functions/whatsapp-tasks/index.ts`, `WhatsAppCloudPage.tsx`, `WhatsAppTasksPage.tsx`).
   - *Logic*: Because WhatsApp Web automation libraries (such as Baileys) are unofficial and carry account-suspension risks as documented in `WHATSAPP_QR_SETUP.md`, the system must never remove or hide the compliant Meta Cloud API.
   - *Design Decision*: Refactor `frontend/src/features/whatsapp/WhatsAppTasksPage.tsx` into an administrative container featuring tabbed navigation:
     - **Tab 1: الربط التجريبي عبر QR (Mock Baileys Prototype)**: renders `WhatsAppQRPage.tsx`.
     - **Tab 2: الربط السحابي المعتمد (Meta Cloud API)**: renders `WhatsAppCloudPage.tsx`.
     - Default tab: QR Prototype for testing, with an immediate, one-click fallback to Cloud API.

2. **Standalone Isolated Service in `backend/whatsapp-service/`**:
   - *Observation Reference*: 1.3 (`ORIGINAL_REQUEST.md` R2, acceptance criteria line 43: `npm run start in backend/whatsapp-service`).
   - *Logic*: Rather than mutating the existing `backend/whatsapp-bridge/`, an isolated, clean service in `backend/whatsapp-service/` must be constructed using Express.js and TypeScript.
   - *Design Decision*:
     - Scaffold `backend/whatsapp-service/` with its own `package.json`, `tsconfig.json`, and clean modular architecture (`src/index.ts`, `src/config.ts`, `src/middleware/auth.ts`, `src/services/mockBaileysManager.ts`, `src/routes/whatsapp.ts`).
     - Port: Configurable via `PORT` (default `3030` or `3031`), matching `VITE_WHATSAPP_BRIDGE_URL`.
     - Dependency minimization: Express, CORS, Supabase client (for admin auth), TypeScript, TSX.

3. **Mock Baileys WebSocket Connection Manager State Machine**:
   - *Observation Reference*: User instructions section 2 and `ORIGINAL_REQUEST.md` line 30.
   - *Logic*: Live WhatsApp Web sockets connect to Meta WhatsApp multi-device servers and attempt network handshakes. Connecting real accounts in development or running automated bots without Meta consent violates platform terms and can ban phone numbers. Therefore, the connection manager must be a self-contained in-memory mock state machine.
   - *State Machine Specifications*:
     - States: `disconnected` (initial) -> `qr_ready` -> `connecting` -> `connected`.
     - `disconnected`: Initial state. `qr = null`, `phone = null`, `connected = false`.
     - `GET /qr` or `POST /connect`: Transitions state to `qr_ready`. Generates a synthetic Baileys-compatible QR string:
       `2@MOCK_BAILEYS_${randomBytes}_${Date.now()},mockPublicKey,mockPairingRef`
       Sets `qrExpiresAt = Date.now() + 60_000` (60-second validity window). Starts a 60-second timer to reset back to `disconnected` upon expiry.
     - Simulated Scan / Pair Trigger (`POST /connect` or simulated test hook):
       Transitions `qr_ready` -> `connecting` (1500ms delay) -> `connected`. Sets `phone = "+20 10 •••• 1234"`, `connected = true`, clears `qr = null`.
     - `POST /disconnect`:
       Immediately transitions any state back to `disconnected`, cancels active timers, clears credentials.
     - `POST /mock-send`:
       Requires state to be `connected` (or returns 400 with message "يجب ربط واتساب أولاً"). Verifies admin consent and task parameters, returns simulated delivery report without dispatching real network packets.

4. **REST API Contract**:
   - *Endpoints*:
     - `GET /status`: Returns `{ state: "disconnected" | "qr_ready" | "connecting" | "connected", connected: boolean, phone: string | null, qrExpiresAt: string | null, isMock: true, disclaimer: string }`.
     - `GET /qr`: Returns `{ qr: string, expiresAt: string, secondsRemaining: number, state: "qr_ready" }`.
     - `POST /disconnect`: Returns `{ success: true, state: "disconnected" }`.
     - `POST /mock-send`: Accepts `{ taskId: number, memberIds: number[], consentConfirmed: boolean }`. Returns `{ success: true, simulated: true, sentCount: number, failedCount: number, details: Array<{ memberId: number, memberName: string, phone: string, status: "simulated" }> }`.
   - *Backward Compatibility*: Support legacy route aliases (`/v1/status`, `/v1/connect`, `/v1/disconnect`, `/v1/send-task`) so existing frontend hooks in `api.ts` function seamlessly without regressions.

5. **Security & Guardrails**:
   - *Observation Reference*: GEMINI.md security guardrails and `backend/WHATSAPP_SETUP.md`.
   - *Auth Middleware*:
     - Extracts `Authorization: Bearer <token>`.
     - Validates token against Supabase Auth (`supabase.auth.getUser(token)`).
     - Checks user email against `WHATSAPP_ADMIN_EMAILS` whitelist.
     - Blocks unauthorized or non-admin requests with 401/403.
   - *Frontend Secret Isolation*: Zero Supabase `service_role` keys or WhatsApp session secrets exposed to the browser.
   - *CORS Restriction*: Whitelists frontend origin (`http://localhost:5173`, `http://127.0.0.1:5173`).
   - *Account-Ban Warning Banners*: Embedded prominently in API status responses and displayed on the UI.

6. **Frontend Admin UX Enhancements & Zero-Emoji Enforcement**:
   - *Observation Reference*: 1.2 (`WhatsAppDispatch.tsx` line 28 emojis).
   - *Fixing Emojis*: Strip `👋`, `📌`, `📅`, `🔗`. Replace with structured Arabic typography using IBM Plex Sans Arabic:
     ```text
     السلام عليكم {اسم العضو}،
     نود إعلامك بأنه قد تم إسناد تكليف جديد إليك في منظومة وصلة:
     المهمة: «{عنوان المهمة}»
     الموعد النهائي: {التاريخ بالعربية أو غير محدد}
     يرجى الدخول إلى بوابة وصلة لمراجعة تفاصيل المهمة:
     {رابط البوابة}/login
     فريق إدارة وصلة.
     ```
   - *QR Expiry & Refresh Controls*:
     - Dynamic countdown: computes `Math.max(0, Math.floor((expiresAt - now) / 1000))`.
     - When `secondsRemaining <= 0`, display warning "انتهت صلاحية الرمز" with an instant "تحديث الرمز" button calling `GET /qr`.
     - Include manual refresh button with Lucide `RefreshCw` icon.
   - *Consent & Confirmation Flow*:
     - Multi-selection for eligible task members.
     - Mandatory explicit checkbox:
       `"أؤكد أن الأعضاء المحددين وافقوا مسبقاً وبشكل صريح على استلام إشعارات المهام عبر واتساب، وأن المحتوى يخص مهام مسندة إليهم حصراً."`
     - Preview section rendering real member message preview.
     - "استمرار ومراجعة الإرسال" opens accessible Modal dialog (`components/ui/Modal`).
     - Modal displays recipient count, task title, rendered preview, consent confirmation, and "تأكيد وبدء الإرسال التجريبي" button.

7. **Wasla Identity & Design Rules Compliance**:
   - Arabic RTL (`dir="rtl"`).
   - Color tokens: Primary Wasla Purple (`--primary: #6d28d9`), soft purple (`--primary-soft: #f3e8ff`), ink (`--primary-ink: #4c1d95`).
   - Strictly NO purple/violet gradients (solid background tokens only).
   - Strictly NO glassmorphism, floating blur cards, or 3-column feature cards.
   - Strictly zero emojis anywhere.
   - Touch targets >= 44px (`min-height: var(--touch)`).

---

## 3. Detailed Architecture Specifications

### 3.1 Backend Service Directory Structure (`backend/whatsapp-service/`)
```
backend/whatsapp-service/
├── package.json
├── tsconfig.json
├── .env.example
└── src/
    ├── index.ts               # Express application setup, HTTP listener, graceful shutdown
    ├── config.ts              # Strongly-typed environment variables & validation
    ├── middleware/
    │   ├── auth.ts            # Supabase JWT authentication & admin email authorization
    │   └── errorHandler.ts    # Centralized HTTP error handling
    ├── services/
    │   └── mockBaileysManager.ts # Mock connection manager, QR generator, state transitions
    └── routes/
        └── whatsapp.ts        # GET /status, GET /qr, POST /disconnect, POST /mock-send (+ legacy aliases)
```

#### Detailed File Blueprint: `package.json`
```json
{
  "name": "wasla-whatsapp-service",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "node --test dist/**/*.test.js"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.117.2",
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "express": "^4.21.2"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^24.13.3",
    "tsx": "^4.21.0",
    "typescript": "^5.8.2"
  }
}
```

#### Detailed File Blueprint: `src/services/mockBaileysManager.ts`
```typescript
import { randomBytes } from 'node:crypto';

export type ConnectionState = 'disconnected' | 'qr_ready' | 'connecting' | 'connected';

export interface ServiceStatus {
  state: ConnectionState;
  connected: boolean;
  phone: string | null;
  qrExpiresAt: string | null;
  isMock: true;
  disclaimer: string;
}

export interface QRResult {
  qr: string;
  expiresAt: string;
  secondsRemaining: number;
  state: ConnectionState;
}

class MockBaileysManager {
  private state: ConnectionState = 'disconnected';
  private currentQr: string | null = null;
  private qrExpiresAt: number | null = null;
  private connectedPhone: string | null = null;
  private expiryTimer: NodeJS.Timeout | null = null;
  private connectTimer: NodeJS.Timeout | null = null;

  public getStatus(): ServiceStatus {
    this.checkExpiry();
    return {
      state: this.state,
      connected: this.state === 'connected',
      phone: this.connectedPhone ? `+20 10 •••• ${this.connectedPhone.slice(-4)}` : null,
      qrExpiresAt: this.qrExpiresAt ? new Date(this.qrExpiresAt).toISOString() : null,
      isMock: true,
      disclaimer: 'خدمة تجريبية معزولة تعتمد على محاكاة Baileys للأغراض الإدارية الداخلية فقط دون اتصال حقيقي بخوادم واتساب.',
    };
  }

  public generateQR(): QRResult {
    this.clearTimers();
    const token = randomBytes(16).toString('hex');
    const timestamp = Date.now();
    this.currentQr = `2@MOCK_BAILEYS_${token}_${timestamp},mockKeyReference,mockEndpoint`;
    this.qrExpiresAt = timestamp + 60_000;
    this.state = 'qr_ready';
    this.connectedPhone = null;

    this.expiryTimer = setTimeout(() => {
      if (this.state === 'qr_ready') {
        this.state = 'disconnected';
        this.currentQr = null;
        this.qrExpiresAt = null;
      }
    }, 60_000);

    return {
      qr: this.currentQr,
      expiresAt: new Date(this.qrExpiresAt).toISOString(),
      secondsRemaining: 60,
      state: this.state,
    };
  }

  public simulateConnect(phoneNumber = '201012345678'): Promise<ServiceStatus> {
    this.clearTimers();
    this.state = 'connecting';
    return new Promise((resolve) => {
      this.connectTimer = setTimeout(() => {
        this.state = 'connected';
        this.currentQr = null;
        this.qrExpiresAt = null;
        this.connectedPhone = phoneNumber;
        resolve(this.getStatus());
      }, 1500);
    });
  }

  public disconnect(): ServiceStatus {
    this.clearTimers();
    this.state = 'disconnected';
    this.currentQr = null;
    this.qrExpiresAt = null;
    this.connectedPhone = null;
    return this.getStatus();
  }

  public mockSend(taskId: number, memberIds: number[], consentConfirmed: boolean) {
    if (!consentConfirmed) {
      throw new Error('يلزم تأكيد موافقة الأعضاء الصريحة على تلقي رسائل واتساب.');
    }
    if (this.state !== 'connected') {
      throw new Error('رقم واتساب غير متصل. اربط الرقم عبر QR أولاً.');
    }
    return {
      success: true,
      simulated: true,
      sentCount: memberIds.length,
      failedCount: 0,
      details: memberIds.map((id) => ({
        memberId: id,
        status: 'simulated' as const,
        deliveredAt: new Date().toISOString(),
      })),
    };
  }

  private checkExpiry() {
    if (this.state === 'qr_ready' && this.qrExpiresAt && Date.now() > this.qrExpiresAt) {
      this.state = 'disconnected';
      this.currentQr = null;
      this.qrExpiresAt = null;
    }
  }

  private clearTimers() {
    if (this.expiryTimer) clearTimeout(this.expiryTimer);
    if (this.connectTimer) clearTimeout(this.connectTimer);
    this.expiryTimer = null;
    this.connectTimer = null;
  }
}

export const mockBaileysManager = new MockBaileysManager();
```

#### Detailed File Blueprint: `src/routes/whatsapp.ts`
```typescript
import { Router } from 'express';
import { mockBaileysManager } from '../services/mockBaileysManager.js';

export const whatsappRouter = Router();

whatsappRouter.get('/status', (_req, res) => {
  res.json(mockBaileysManager.getStatus());
});

whatsappRouter.get('/qr', (_req, res) => {
  res.json(mockBaileysManager.generateQR());
});

whatsappRouter.post('/connect', async (_req, res) => {
  const result = await mockBaileysManager.simulateConnect();
  res.json(result);
});

whatsappRouter.post('/disconnect', (_req, res) => {
  res.json(mockBaileysManager.disconnect());
});

whatsappRouter.post('/revoke', (_req, res) => {
  res.json(mockBaileysManager.disconnect());
});

whatsappRouter.post('/mock-send', (req, res) => {
  try {
    const { taskId, memberIds, consentConfirmed } = req.body;
    if (!Number.isInteger(taskId) || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ error: 'بيانات المهمة أو قائمة الأعضاء غير مكتملة.' });
    }
    const result = mockBaileysManager.mockSend(Number(taskId), memberIds, Boolean(consentConfirmed));
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});

// Backward compatibility alias for existing frontend code
whatsappRouter.post('/send-task', (req, res) => {
  try {
    const { taskId, memberIds, consentConfirmed } = req.body;
    const result = mockBaileysManager.mockSend(Number(taskId), memberIds, Boolean(consentConfirmed));
    return res.json({
      accepted: true,
      simulated: true,
      sent: result.sentCount,
      failed: result.failedCount,
      errors: [],
    });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});
```

---

### 3.2 Frontend Architecture & Component Structure

#### 1. Dual-Path Layout in `WhatsAppTasksPage.tsx`
```tsx
import { useState } from 'react';
import { QrCode, Cloud, ShieldAlert } from 'lucide-react';
import WhatsAppQRPage from './WhatsAppQRPage';
import WhatsAppCloudPage from './WhatsAppCloudPage';

export default function WhatsAppTasksPage() {
  const [activeTab, setActiveTab] = useState<'qr' | 'cloud'>('qr');

  return (
    <div className="grid gap-6" dir="rtl">
      {/* Policy & Safety Disclaimer Banner */}
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" size={18} />
          <div>
            <p className="font-bold">تنبيه سياسات واتساب والأمان:</p>
            <p className="mt-1 leading-6">
              طريقة ربط QR عبر Baileys هي طريقة غير رسمية وتعمل كنموذج تجريبي معزول للأغراض الإدارية فقط دون إرسال فعلي. في حال الحاجة لإرسال إنتاجي رسمي ومعتمد، يُرجى التبديل إلى تبويب <b>Meta Cloud API</b>.
            </p>
          </div>
        </div>
      </div>

      {/* Segmented Tab Navigation */}
      <div className="flex border-b border-[var(--border)] gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('qr')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors ${
            activeTab === 'qr'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
          }`}
        >
          <QrCode size={18} />
          <span>الربط التجريبي عبر QR (Baileys Mock)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('cloud')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors ${
            activeTab === 'cloud'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
          }`}
        >
          <Cloud size={18} />
          <span>الربط السحابي الرسمي (Meta Cloud API)</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'qr' ? <WhatsAppQRPage /> : <WhatsAppCloudPage />}
    </div>
  );
}
```

#### 2. Clean, Emoji-Free Preview in `WhatsAppDispatch.tsx`
```typescript
function buildTaskMessageText(task: Task, member: Member, baseUrl: string): string {
  const formatArabicDate = (iso: string) => {
    try {
      return new Intl.DateTimeFormat('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  const deadline = task.has_deadline && task.deadline_date
    ? `\nالموعد النهائي المخطط للإنجاز: ${formatArabicDate(task.deadline_date)}`
    : '';

  return `السلام عليكم ${member.full_name}،\n\nنود إعلامك بأنه قد تم إسناد تكليف جديد إليك في منظومة وصلة.\nعنوان المهمة: «${task.title}»${deadline}\n\nيرجى الدخول إلى بوابة وصلة لمراجعة تفاصيل المهمة والبدء في التنفيذ:\n${baseUrl}/login\n\nمع تحيات فريق إدارة وصلة.`;
}
```

#### 3. Mock QR Countdown and Refresh Lifecycle in `WhatsAppQRPage.tsx`
- **Countdown state**:
  ```typescript
  const [secondsRemaining, setSecondsRemaining] = useState<number>(60);
  useEffect(() => {
    if (!status.data?.qrExpiresAt || status.data.connected) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((new Date(status.data.qrExpiresAt!).getTime() - Date.now()) / 1000));
      setSecondsRemaining(remaining);
      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [status.data?.qrExpiresAt, status.data?.connected]);
  ```
- **Expired State UI**:
  - If `secondsRemaining === 0`: render grayed-out overlay with message: "انتهت صلاحية الرمز (60 ثانية)" and button "تحديث الرمز" calling `connect.mutate()`.
  - If `secondsRemaining > 0`: display active countdown badge: `ينتهي الرمز بعد ${secondsRemaining} ثانية`.

---

## 4. Caveats

1. **Baileys Protocol Volatility**: Baileys relies on reverse-engineering WhatsApp Web WebSocket protocols. Protocol updates by WhatsApp / Meta can cause breaking changes without warning. The decision to keep this service strictly as a mock prototype (`isMock: true`, zero live sockets) protects Wasla from service disruption and phone number suspensions.
2. **Persistence Assumption**: In production, if persistent session files were ever enabled, they would require AES-256-GCM encryption at rest with an external key (`WHATSAPP_SESSION_ENCRYPTION_KEY`). In this prototype survey, the mock manager is kept in-memory for instant, reliable testing.
3. **Dual Service Coexistence**: The existing `backend/whatsapp-bridge/` was built earlier as a preliminary experiment. The new `backend/whatsapp-service/` will coexist independently as the canonical Express-based mock service per `ORIGINAL_REQUEST.md`.

---

## 5. Conclusion

1. **Existing Implementation Status**: The official Meta Cloud API path (`backend/supabase/functions/whatsapp-tasks/` and `frontend/src/features/whatsapp/WhatsAppCloudPage.tsx`) is fully functional, secure, and production-ready. However, it is currently obscured in the UI because `WhatsAppTasksPage.tsx` only renders `WhatsAppQRPage.tsx`.
2. **Backend Service Specification**: A standalone Express.js service in `backend/whatsapp-service/` with TypeScript, in-memory mock Baileys connection manager (`disconnected` -> `qr_ready` -> `connecting` -> `connected`), 60s QR expiration, Supabase JWT admin authentication, and mock dispatch endpoints (`GET /status`, `GET /qr`, `POST /disconnect`, `POST /mock-send`) fulfills all criteria safely and without real network connectivity to WhatsApp.
3. **Frontend Admin UX Specification**: The Admin UI requires a dual-tab container in `WhatsAppTasksPage.tsx` (QR Mock vs Cloud API), a dynamic QR expiration countdown, instant refresh, explicit recipient consent validation, an emoji-free task preview, and a pre-send confirmation modal.
4. **Design Rules Compliance**: All emojis (`👋`, `📌`, `📅`, `🔗`) will be completely eliminated. Wasla's solid purple branding (`#6d28d9`), IBM Plex Sans Arabic font, Arabic RTL layout, and accessible touch targets (>= 44px) are strictly enforced.

---

## 6. Verification Method

To independently verify the architecture and readiness for implementation:

### 6.1 Inspect Existing Cloud API & UI Code
1. Inspect Cloud API function:
   ```bash
   type backend\supabase\functions\whatsapp-tasks\index.ts
   ```
   *Verify*: JWT authorization on line 29, admin email check on line 32, Meta Graph API template call on line 81.
2. Inspect Emojis in existing preview:
   ```bash
   type frontend\src\features\whatsapp\WhatsAppDispatch.tsx
   ```
   *Verify*: Emojis present on lines 27 and 28 that must be removed.

### 6.2 Implementation Verification Commands (Post-Scaffolding)
1. **Backend Service Build & Start**:
   ```powershell
   cd backend\whatsapp-service
   npm install
   npm run build
   npm run start
   ```
   *Expected Result*: Server starts on port 3030 without crashing and logs `WhatsApp Mock Service listening on port 3030`.
2. **API Endpoint Testing**:
   ```powershell
   # Status check
   curl -s http://localhost:3030/status
   # Expected: {"state":"disconnected","connected":false,"isMock":true,...}

   # QR retrieval
   curl -s http://localhost:3030/qr
   # Expected: {"qr":"2@MOCK_BAILEYS_...","expiresAt":"...","secondsRemaining":60,"state":"qr_ready"}

   # Disconnect
   curl -s -X POST http://localhost:3030/disconnect
   # Expected: {"state":"disconnected","connected":false,...}
   ```
3. **Frontend Build & Lint**:
   ```powershell
   cd frontend
   npm run build
   npm run lint
   ```
   *Expected Result*: Zero TypeScript compilation errors, zero lint errors.
