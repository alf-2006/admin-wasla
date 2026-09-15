import re

with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

# 1. Update the Needs Attention badge/text in the HTML header
html = re.sub(
    r'<span class="count-pill badge-late-pill" id="late-count-badge">.*?</span>',
    r'<span class="count-pill badge-late-pill" id="attention-count-badge">0</span>',
    html
)

html = html.replace("filterByTaskAndNavigate('Late')", "navigateToMembers('bonus-low')")

html = html.replace('<span>أسبقية الإنجاز الأول</span>', '<span>نجم الفريق</span>')

# Replace `renderNeedsAttention` function
new_render_needs_attention = """
    function renderNeedsAttention() {
      const el = document.getElementById("needs-attention-content");
      const badge = document.getElementById("attention-count-badge");
      if (!el) return;
      const attentionList = members.filter(m => (m.totalBonus || 0) < 0).sort((a,b) => (a.totalBonus || 0) - (b.totalBonus || 0));
      if (badge) badge.textContent = `${attentionList.length} بحاجة لمتابعة`;

      if (attentionList.length === 0) {
        el.innerHTML = `
          <div class="empty-state-sm">
            <i class="fas fa-check-circle text-green" style="font-size:1.4rem;margin-bottom:6px"></i>
            <p>لا يوجد أعضاء بتقييم سلبي حالياً</p>
          </div>
        `;
        return;
      }

      el.innerHTML = `
        <div class="attention-list">
          ${attentionList.map(m => `
            <div class="attention-item">
              <div class="attention-info">
                <div class="attention-avatar" ${m.gender==='أنثى'?'style="background:#fce7f3;color:#be185d"':''}>${m.fullName.charAt(0)}</div>
                <div class="attention-texts">
                  <span class="attention-name">${m.fullName}</span>
                  <span class="attention-deadline" style="color:var(--danger)">
                    <i class="fas fa-arrow-trend-down"></i> نقاط: ${m.totalBonus || 0}
                  </span>
                </div>
              </div>
              <button class="btn-attention-action" onclick="openProfile(${m.id})">
                <i class="fas fa-arrow-left"></i>
              </button>
            </div>
          `).join("")}
        </div>
      `;
    }
"""

html = re.sub(r'function renderNeedsAttention\(\) \{.*?\}(?=\s*function renderMembersChips)', new_render_needs_attention.strip(), html, flags=re.DOTALL)

# Now for renderDashboard where it finds first finisher
render_dashboard_part = """      // Featured Achievement / Top Completion Card
      const firstFinisherEl = document.getElementById("first-finisher");
      if (firstFinisherEl) {
        if (first) {
          const dateFormatted = formatDate(first.taskFinishDate);"""

new_render_dashboard_part = """      // Top Member (Highest Bonus) Card
      const firstFinisherEl = document.getElementById("first-finisher");
      if (firstFinisherEl) {
        const sortedMembers = [...members].sort((a,b) => (b.totalBonus || 0) - (a.totalBonus || 0));
        const topMember = sortedMembers.length > 0 && (sortedMembers[0].totalBonus || 0) > 0 ? sortedMembers[0] : null;
        if (topMember) {
          firstFinisherEl.innerHTML = `
            <div class="achievement-winner-card" onclick="openProfile(${topMember.id})" title="عرض الملف الشخصي">
              <div class="winner-trophy-badge">
                <i class="fas fa-star" style="color:#f59e0b"></i>
              </div>
              <div class="winner-body">
                <div class="winner-label">الأكثر إنجازاً</div>
                <div class="winner-name">${topMember.fullName}</div>
                <div class="winner-date">
                  <i class="fas fa-coins text-amber"></i> إجمالي النقاط: <strong>${topMember.totalBonus || 0}</strong>
                </div>
              </div>
            </div>
          `;
        } else {
          firstFinisherEl.innerHTML = `
            <div class="empty-state-sm">
              <i class="fas fa-medal"></i>
              <p>لم يتم تسجيل نقاط إيجابية بعد</p>
            </div>
          `;
        }
      }

      // Hide the rest of the old first block inside this if block
      if(false) {"""

html = html.replace(render_dashboard_part, new_render_dashboard_part)

# Also close the false block
html = html.replace("""          firstFinisherEl.innerHTML = `
            <div class="empty-state-sm">
              <i class="fas fa-trophy"></i>
              <p>لا يوجد من أنهى المهمة بعد</p>
            </div>
          `;
        }
      }
    }""", """          firstFinisherEl.innerHTML = `
            <div class="empty-state-sm">
              <i class="fas fa-trophy"></i>
              <p>لا يوجد من أنهى المهمة بعد</p>
            </div>
          `;
        }
      }
    }
    }""")

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)

print("Patched dashboard cards!")
