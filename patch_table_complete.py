import re

with open('C:/Users/aboha/Desktop/adminstrationsystem/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Update filters block
old_filters = """              <select class="filter-select" id="filter-course" onchange="renderMembersTable()">
                <option value="">حالة الكورس</option>
                <option value="Completed">مكتمل</option>
                <option value="In Progress">قيد التنفيذ</option>
                <option value="Not Started">لم يبدأ</option>
              </select>
              <select class="filter-select" id="filter-task" onchange="renderMembersTable()">
                <option value="">حالة المهمة</option>
                <option value="Completed">مكتمل</option>
                <option value="In Progress">قيد التنفيذ</option>
                <option value="Late">متأخر</option>
                <option value="Not Started">لم يبدأ</option>
              </select>"""

new_filters = """              <select class="filter-select" id="filter-device" onchange="renderMembersTable()">
                <option value="">خيار الجهاز</option>
                <option value="لاب توب">لاب توب</option>
                <option value="كمبيوتر فقط">كمبيوتر فقط</option>
                <option value="الاثنان معاً">الاثنان معاً</option>
                <option value="تابلت">تابلت</option>
                <option value="هاتف فقط">هاتف فقط</option>
              </select>
              <select class="filter-select" id="filter-work" onchange="renderMembersTable()">
                <option value="">طبيعة العمل/التفرغ</option>
                <option value="شغال">شغال بشكل دائم</option>
                <option value="مش شغال">متفرغ / غير شغال</option>
              </select>"""

html = html.replace(old_filters, new_filters)

# 2. Update thead
old_thead = """                <thead>
                  <tr>
                    <th onclick="sortTable('fullName')">الاسم <i class="fas fa-sort"></i></th>
                    <th>حالة الكورس</th>
                    <th>حالة المهمة</th>
                    <th onclick="sortTable('deadline')">الموعد النهائي <i class="fas fa-sort"></i></th>
                    <th>تاريخ الإنهاء</th>
                    <th onclick="sortTable('completionRank')">الترتيب <i class="fas fa-sort"></i></th>
                    <th>لاب توب</th>
                    <th>إسكندرية</th>
                    <th id="actions-header">إجراءات</th>
                  </tr>
                </thead>"""

new_thead = """                <thead>
                  <tr>
                    <th onclick="sortTable('fullName')">الاسم <i class="fas fa-sort"></i></th>
                    <th>رقم التليفون</th>
                    <th>الجهاز المتوفر</th>
                    <th onclick="sortTable('canGoAlexandria')">إسكندرية <i class="fas fa-sort"></i></th>
                    <th>السكن</th>
                    <th onclick="sortTable('workStatus')">حالة العمل <i class="fas fa-sort"></i></th>
                    <th onclick="sortTable('totalBonus')">الترتيب/البونص <i class="fas fa-sort"></i></th>
                    <th id="actions-header" style="text-align:center">إجراءات</th>
                  </tr>
                </thead>"""

html = html.replace(old_thead, new_thead)

# 3. Update getFilteredMembers
old_filter_func = """    function getFilteredMembers() {
      let list = [...members];
      const search = document.getElementById("search-input").value.trim().toLowerCase();
      const course = document.getElementById("filter-course").value;
      const task = document.getElementById("filter-task").value;
      if (search) list = list.filter(m => m.fullName.toLowerCase().includes(search));
      if (course) list = list.filter(m => m.courseStatus === course);
      if (task) list = list.filter(m => m.taskStatus === task);"""

new_filter_func = """    function getFilteredMembers() {
      members.forEach(m => {
        if (typeof m.totalBonus === 'undefined') {
           m.totalBonus = (typeof getMemberTotalBonus === 'function') ? getMemberTotalBonus(m.id) : 0;
        }
      });
      let list = [...members];
      const search = document.getElementById("search-input").value.trim().toLowerCase();
      const deviceEl = document.getElementById("filter-device");
      const workEl = document.getElementById("filter-work");
      if (search) list = list.filter(m => m.fullName.toLowerCase().includes(search));
      if (deviceEl && deviceEl.value) list = list.filter(m => m.device === deviceEl.value);
      if (workEl && workEl.value) list = list.filter(m => (m.workStatus === "شغال" ? "شغال" : "مش شغال") === workEl.value);"""

html = html.replace(old_filter_func, new_filter_func)

with open('C:/Users/aboha/Desktop/adminstrationsystem/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Filters and Thead updated.")
