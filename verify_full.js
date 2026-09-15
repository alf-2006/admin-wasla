// اختبار شامل لنظام إدارة فريق وصلة — تسجيل دخول → لوحة القياس → KPIs → الجدول → النموذج
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push('CONSOLE: ' + msg.text()); });

  const results = [];
  const check = (name, ok, extra = '') => { results.push(`${ok ? '✓' : '✗'} ${name}${extra ? ' — ' + extra : ''}`); };

  // 1) تحميل الصفحة
  await page.goto('file:///C:/Users/aboha/Desktop/adminstrationsystem/index.html');
  await page.waitForTimeout(800);

  const loginVisible = await page.locator('#login-screen').isVisible().catch(() => false);
  check('صفحة تسجيل الدخول ظاهرة', loginVisible);

  // 2) تسجيل دخول محلي كقائد
  await page.fill('#username', 'leader');
  await page.fill('#password', 'wasla123');
  const accountType = page.locator('#account-type');
  if (await accountType.count()) await accountType.selectOption('wasla_leader').catch(() => {});
  await page.click('#login-submit-btn');
  await page.waitForTimeout(1200);

  const appVisible = await page.locator('#app').isVisible().catch(() => false);
  check('تسجيل الدخول نجح — التطبيق ظاهر', appVisible);

  // 3) لوحة القياس: عناصر KPI
  const statsGrid = await page.locator('#stats-grid').count();
  check('شبكة الإحصائيات موجودة', statsGrid > 0);
  await page.screenshot({ path: 'verify_dashboard.png', fullPage: false });

  // كرت "بحاجة لمتابعة" (badge)
  const badgeText = await page.locator('#attention-count-badge').textContent().catch(() => null);
  check('شارة عدد المتابعة تعرض قيمة', !!badgeText, `النص: ${badgeText}`);

  // 4) النقر على زر "بحاجة لمتابعة" في metrics-support → ينتقل للجدول بفلتر النقاط السلبية
  const alertBtn = page.locator('.metrics-support .is-alert').first();
  if (await alertBtn.count()) {
    await alertBtn.click();
    await page.waitForTimeout(600);
    const membersVisible = await page.locator('#page-members').isVisible().catch(() => false);
    check('النقر على "بحاجة لمتابعة" ينتقل لصفحة الأعضاء', membersVisible);
    const hiddenFilter = await page.evaluate(() => window.__bonusLowFilter);
    check('فلتر النقاط السلبية مفعّل', hiddenFilter === true, `__bonusLowFilter=${hiddenFilter}`);
    // صفوف الجدول يجب أن تكون أصحاب النقاط السلبية فقط
    const rowCount = await page.locator('#members-tbody tr').count();
    const bonusVals = await page.evaluate(() => {
      const m = (window.members || []).filter(x => (x.totalBonus || 0) < 0);
      return m.length;
    });
    check('عدد صفوف الفلتر يطابق الأعضاء ذوي النقاط السلبية', rowCount === bonusVals, `صفوف=${rowCount}, متوقع=${bonusVals}`);
    await page.screenshot({ path: 'verify_bonuslow_table.png', fullPage: false });
  } else {
    check('زر بحاجة لمتابعة موجود في metrics-support', false);
  }

  // 5) تصفير الفلتر الخفي عند لمس فلتر آخر
  const deviceFilter = page.locator('#filter-device');
  if (await deviceFilter.count()) {
    await deviceFilter.selectOption('لاب توب');
    await page.waitForTimeout(400);
    const hiddenFilter = await page.evaluate(() => window.__bonusLowFilter);
    check('تغيير فلتر الجهاز يلغي الفلتر الخفي', hiddenFilter === false, `__bonusLowFilter=${hiddenFilter}`);
    await deviceFilter.selectOption('');
  }

  // 6) زر "عرض في الجدول" من كرت المتابعة في داشبورد
  await page.evaluate(() => navigateToPage('dashboard'));
  await page.waitForTimeout(300);
  const viewBtn = page.locator('.attention-card .btn-text-action').first();
  if (await viewBtn.count()) {
    await viewBtn.click();
    await page.waitForTimeout(400);
    const hiddenFilter = await page.evaluate(() => window.__bonusLowFilter);
    check('زر "عرض في الجدول" يفعّل فلتر النقاط السلبية', hiddenFilter === true);
  }

  // 7) فتح مودال تعديل عضو (قائد فقط) — يجب ألا ينهار
  await page.evaluate(() => window.__bonusLowFilter = false);
  await page.evaluate(() => navigateToMembers(null));
  await page.waitForTimeout(300);
  const editBtns = page.locator('button .fa-edit');
  const editCount = await editBtns.count();
  if (editCount > 0) {
    await editBtns.first().click();
    await page.waitForTimeout(500);
    const modalVisible = await page.locator('#member-modal.show').isVisible().catch(() => false);
    check('مودال تعديل العضو يفتح دون انهيار', modalVisible);
    if (modalVisible) {
      await page.screenshot({ path: 'verify_member_modal.png', fullPage: false });
      // الحقول الجديدة معبأة
      const nameVal = await page.locator('#m-fullname').inputValue();
      check('حقل الاسم معبأ في وضع التعديل', !!nameVal, `الاسم: ${nameVal}`);
    }
    await page.evaluate(() => closeMemberModal());
  } else {
    check('أزرار تعديل ظاهرة للقائد', false, 'قد يكون الجدول مفلتراً أو الجلسة ليست قائد');
  }

  // 8) كرت نجم الفريق
  await page.evaluate(() => navigateToPage('dashboard'));
  await page.waitForTimeout(500);
  const starName = await page.locator('#first-finisher .winner-name').textContent().catch(() => null);
  const starLabel = await page.locator('#first-finisher').textContent().catch(() => '');
  check('كرت نجم الفريق يعرض محتوى', starLabel.includes('نقاط') || starLabel.includes('إنجازاً') || starLabel.includes('بعد'), starName ? `النجم: ${starName}` : 'لا نجم — حالة فارغة');

  // النتائج
  console.log('\n========== نتائج الاختبار ==========');
  results.forEach(r => console.log(r));
  const failed = results.filter(r => r.startsWith('✗')).length;
  console.log(`\nالمجموع: ${results.length} | ناجح: ${results.length - failed} | فاشل: ${failed}`);
  if (errors.length) {
    console.log('\n---------- أخطاء JS ----------');
    [...new Set(errors)].slice(0, 15).forEach(e => console.log(e));
  } else {
    console.log('\nلا أخطاء JS في الكونسول ✓');
  }
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
})();
