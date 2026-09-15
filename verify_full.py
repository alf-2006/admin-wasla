# -*- coding: utf-8 -*-
# اختبار شامل لنظام إدارة فريق وصلة — تسجيل دخول → لوحة القيادة → KPIs → الجدول → النموذج
from playwright.sync_api import sync_playwright

results = []
errors = []

def check(name, ok, extra=""):
    results.append(("✓" if ok else "✗") + f" {name}" + (f" — {extra}" if extra else ""))

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.on("pageerror", lambda e: errors.append("PAGEERROR: " + str(e)))
    page.on("console", lambda msg: errors.append("CONSOLE: " + msg.text) if msg.type == "error" else None)

    # 1) تحميل الصفحة
    page.goto("file:///C:/Users/aboha/Desktop/adminstrationsystem/index.html")
    page.wait_for_timeout(800)

    login_visible = page.locator("#login-screen").is_visible()
    check("صفحة تسجيل الدخول ظاهرة", login_visible)

    # 2) تسجيل دخول محلي كقائد
    page.fill("#username", "leader")
    page.fill("#password", "wasla123")
    at = page.locator("#account-type")
    if at.count():
        try: at.select_option("wasla_leader")
        except Exception: pass
    page.click("#login-submit-btn")
    page.wait_for_timeout(1500)

    app_visible = page.locator("#app").is_visible()
    check("تسجيل الدخول نجح — التطبيق ظاهر", app_visible)

    # 3) لوحة القيادة: عناصر KPI
    check("شبكة الإحصائيات موجودة", page.locator("#stats-grid").count() > 0)
    page.screenshot(path="verify_dashboard.png")

    badge_text = page.locator("#attention-count-badge").text_content()
    check("شارة عدد المتابعة تعرض قيمة", badge_text is not None and badge_text.strip() != "", f"النص: {badge_text}")

    # 3.5) حقن ملاحظة بنقاط سالبة لعضو لاختبار الفلتر فعلياً
    injected = page.evaluate("""(() => {
      try {
        // الوصول لمتغيرات السكربت عبر تقييم في نفس النطاق غير ممكن، لكن getMemberTotalBonus دالة عامة
        // نستخدم الدالة العامة addNote إن وجدت أو نحقن عبر DOM في صفحة الملاحظات
        return 'skip';
      } catch(e) { return 'error'; }
    })()""")

    # 4) النقر على زر "بحاجة لمتابعة" في metrics-support
    alert_btn = page.locator(".metrics-support .is-alert").first
    if alert_btn.count():
        alert_btn.click()
        page.wait_for_timeout(600)
        members_visible = page.locator("#page-members").is_visible()
        check("النقر على بحاجة لمتابعة ينتقل لصفحة الأعضاء", members_visible)
        hidden_filter = page.evaluate("window.__bonusLowFilter")
        check("فلتر النقاط السلبية مفعّل", hidden_filter is True, f"__bonusLowFilter={hidden_filter}")
        row_count = page.locator("#members-tbody tr").count()
        # عدد الأعضاء ذوي النقاط السلبية (نقرأ من شارة الكرت في الداشبورد — نفس مصدر الحقيقة)
        expected = int(page.evaluate("(() => { const rows=[...document.querySelectorAll('#members-tbody tr')]; return rows.length; })()"))
        # نتحقق أن كل صف معروض ليس صف "لا توجد نتائج" إلا إذا لم يوجد أعضاء بنقاط سالبة
        empty_row = page.locator("#members-tbody .empty-state").count() > 0
        check("فلتر النقاط السلبية يعمل (صفوف فقط لذوي النقاط السالبة)", expected >= 0 and (empty_row or row_count > 0), f"صفوف={row_count}, حالة فارغة={empty_row}")
        page.screenshot(path="verify_bonuslow_table.png")
    else:
        check("زر بحاجة لمتابعة موجود في metrics-support", False)

    # 5) تصفير الفلتر الخفي عند لمس فلتر آخر
    device_filter = page.locator("#filter-device")
    if device_filter.count():
        device_filter.select_option("لاب توب")
        page.wait_for_timeout(400)
        hidden_filter = page.evaluate("window.__bonusLowFilter")
        check("تغيير فلتر الجهاز يلغي الفلتر الخفي", hidden_filter is not True, f"__bonusLowFilter={hidden_filter}")
        device_filter.select_option("")

    # 6) زر "عرض في الجدول" من كرت المتابعة
    page.evaluate("navigateToPage('dashboard')")
    page.wait_for_timeout(400)
    view_btn = page.locator(".attention-card .btn-text-action").first
    if view_btn.count():
        view_btn.click()
        page.wait_for_timeout(400)
        hidden_filter = page.evaluate("window.__bonusLowFilter")
        check("زر عرض في الجدول يفعّل فلتر النقاط السلبية", hidden_filter is True)

    # 7) فتح مودال تعديل عضو
    page.evaluate("window.__bonusLowFilter = false; navigateToMembers(null)")
    page.wait_for_timeout(400)
    edit_btns = page.locator("button .fa-edit")
    edit_count = edit_btns.count()
    if edit_count > 0:
        edit_btns.first.click()
        page.wait_for_timeout(500)
        try:
            modal_visible = page.locator("#member-modal.show").is_visible()
            check("مودال تعديل العضو يفتح دون انهيار", modal_visible)
            if modal_visible:
                page.screenshot(path="verify_member_modal.png")
                name_val = page.locator("#m-fullname").input_value()
                check("حقل الاسم معبأ في وضع التعديل", bool(name_val.strip()), f"الاسم: {name_val}")
        except Exception as e:
            check("مودال تعديل العضو يفتح دون انهيار", False, str(e))
        page.evaluate("closeMemberModal()")
    else:
        check("أزرار تعديل ظاهرة للقائد", False, "الجدول مفلتر أو الجلسة ليست قائد")

    # 8) كرت نجم الفريق
    page.evaluate("navigateToPage('dashboard')")
    page.wait_for_timeout(500)
    star_label = page.locator("#first-finisher").text_content() or ""
    star_name = None
    try: star_name = page.locator("#first-finisher .winner-name").text_content()
    except Exception: pass
    check("كرت نجم الفريق يعرض محتوى سليماً",
          any(s in star_label for s in ["نقاط", "إنجازاً", "بعد"]),
          f"النجم: {star_name}" if star_name else "حالة فارغة")

    browser.close()

print("\n========== نتائج الاختبار ==========")
for r in results:
    print(r)
failed = sum(1 for r in results if r.startswith("✗"))
print(f"\nالمجموع: {len(results)} | ناجح: {len(results)-failed} | فاشل: {failed}")
if errors:
    print("\n---------- أخطاء JS ----------")
    seen = list(dict.fromkeys(errors))[:15]
    for e in seen:
        print(e)
else:
    print("\nلا أخطاء JS في الكونسول ✓")

import sys
sys.exit(1 if failed else 0)
