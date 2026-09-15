import re

with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

new_render_needs_attention = """    function renderNeedsAttention() {
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
    }"""

text = re.sub(
    r'function renderNeedsAttention\(\) \{.*?\}(?=\s*function toggleNotificationsDropdown)',
    new_render_needs_attention,
    text,
    flags=re.DOTALL
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated renderNeedsAttention")
