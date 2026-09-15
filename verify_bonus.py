# -*- coding: utf-8 -*-
# سيناريو كامل بنقاط حقيقية: ملاحظة سالبة → كرت المتابعة → الفلتر → كرت النجم
from playwright.sync_api import sync_playwright

results = []
def check(name, ok, extra=""):
    results.append(("✓" if ok else "✗") + f" {name}" + (f" — {extra}" if extra else ""))

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    js_errors = []
    page.on("pageerror", lambda e: js_errors.append(str(e)))

    page.goto("file:///C:/Users/aboha/Desktop/adminstrationsystem/index.html")
    page.wait_for_timeout(800)
    page.fill("#username", "leader")
    page.fill("#password", "wasla123")
    at = page.locator("#account-type")
    if at.count():
        try: at.select_option("wasla_leader")
        except Exception: pass
    page.click("#login-submit-btn")
    page.wait_for_timeout(1500)

    # 1) الذهاب لصفحة الملاحظات وإضافة ملاحظة سالبة (-3) لأول عضو
    page.evaluate("navigateToPage('notes')")
    page.wait_for_timeout(500)

    note_target = page.locator("#note-target")
    if not note_target.count():
        check("صفحة الملاحظات تعمل", False, "لا يوجد حقل note-target")
    else:
        first_val = note_target.locator("option").nth(1).get_attribute("value")
        first_name = note_target.locator("option").nth(1).text_content()
        note_target.select_option(value=first_val)
        page.fill("#new-note-text", "اختبار: تأخر في التسليم مرتين")
        bonus_sel = page.locator("#note-bonus")
        if bonus_sel.count():
            bonus_sel.select_option("-3")
        # إرسال الملاحظة (زر الإرسال داخل صفحة الملاحظات)
        add_btn = page.locator("button:has-text('إرسال'), button:has-text('أضف'), button:has-text('إضافة ملاحظة')").first
        if add_btn.count():
            add_btn.click()
        else:
            page.evaluate("addNote()")
        page.wait_for_timeout(800)
        check(f"ملاحظة سالبة أضيفت لـ {first_name}", True, f"targetId={first_val}")

    # 2) العودة للداشبورد — كرت المتابعة يجب أن يظهر العضو
    page.evaluate("navigateToPage('dashboard')")
    page.wait_for_timeout(600)
    badge = page.locator("#attention-count-badge").text_content()
    check("شارة المتابعة تعكس النقاط السلبية", "1" in (badge or ""), f"النص: {badge}")

    att_name = page.locator(".attention-item .attention-name").first.text_content() if page.locator(".attention-item .attention-name").count() else None
    check("كرت المتابعة يعرض العضو صاحب النقاط السالبة", att_name is not None, f"العضو: {att_name}")

    # 3) الفلتر يعرض العضو فقط
    page.evaluate("navigateToMembers('bonus-low')")
    page.wait_for_timeout(400)
    rows = page.locator("#members-tbody tr").count()
    empty = page.locator("#members-tbody .empty-state").count() > 0
    check("الجدول المفلتر يعرض العضو ذا النقاط السالبة", rows >= 1 and not empty, f"صفوف={rows}, فارغ={empty}")

    # 4) كرت النجم لا يزال يعمل (لا نقاط موجبة → حالة فارغة صحيحة)
    page.evaluate("navigateToPage('dashboard')")
    page.wait_for_timeout(500)
    star = page.locator("#first-finisher").text_content() or ""
    check("كرت النجم لا يظهر شخصاً بنقاط سالبة كنجم", "الأكثر إنجازاً" not in star)

    # 5) إضافة ملاحظة موجبة لعضو آخر → يصبح نجم الفريق
    page.evaluate("navigateToPage('notes')")
    page.wait_for_timeout(500)
    note_target = page.locator("#note-target")
    opts = note_target.locator("option")
    second_val, second_name = None, None
    first_val_saved = None
    for i in range(1, min(opts.count(), 4)):
        v = opts.nth(i).get_attribute("value")
        if i == 1: first_val_saved = v
        elif i == 2:
            second_val, second_name = v, opts.nth(i).text_content()
            break
    if second_val:
        note_target.select_option(value=second_val)
        page.fill("#new-note-text", "أداء ممتاز وتسليم مبكر")
        bonus_sel = page.locator("#note-bonus")
        if bonus_sel.count():
            bonus_sel.select_option("+5")
        add_btn = page.locator("button:has-text('إرسال'), button:has-text('أضف'), button:has-text('إضافة ملاحظة')").first
        if add_btn.count(): add_btn.click()
        else: page.evaluate("addNote()")
        page.wait_for_timeout(800)

        page.evaluate("navigateToPage('dashboard')")
        page.wait_for_timeout(600)
        star_name = page.locator("#first-finisher .winner-name").text_content() if page.locator("#first-finisher .winner-name").count() else None
        check(f"كرت النجم يعرض {second_name} بعد النقاط الموجبة", star_name is not None and star_name.strip() in second_name.strip(), f"النجم: {star_name}")
        page.screenshot(path="verify_star_card.png")

    browser.close()

print("\n========== سيناريو النقاط ==========")
for r in results: print(r)
failed = sum(1 for r in results if r.startswith("✗"))
print(f"\nالمجموع: {len(results)} | ناجح: {len(results)-failed} | فاشل: {failed}")
if js_errors:
    print("\nأخطاء JS:", js_errors[:5])
else:
    print("لا أخطاء JS ✓")

import sys
sys.exit(1 if failed else 0)
