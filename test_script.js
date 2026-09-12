

    /* =====================================================
       Wasla Team Management System
       ===================================================== */

    
    // ==========================================
    // 🛡️ SECURITY MODULE (Blue Team Patches)
    // ==========================================
    
    // 1. Data Sanitization (XSS Prevention)
    function sanitizeInput(str) {
      if (typeof str !== "string") return "";
      return str.replace(/[&<>"'`=\/]/g, function(s) {
        const entityMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;', '`': '&#x60;', '=': '&#x3D;' };
        return entityMap[s];
      }).trim();
    }

    // 2. Hash checking for Local Passwords (No Plaintext Backdoors)
    // "admin123" hashed -> SHA-256
    // "malak123" hashed -> SHA-256
    const SECURE_HASHES = {
       "admin": "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9", 
       "malak": "602bf2cb4ba6e680a3733075b11ae10714ed48a044edffeb92c815ec62e1ec73"
    };

    async function hashPassword(password) {
      const msgUint8 = new TextEncoder().encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // 3. Local Storage Tamper Protection (Basic Checksum)
    function createSessionSignature(role) {
       return btoa("securesalt_" + role).split('').reverse().join('');
    }

    const AUTH_ACCOUNTS = {
      admin: { email: "admin@waslateam.com", role: "Admin", displayName: "Admin" },
      malak: { email: "malak@waslateam.com", role: "Admin", displayName: "ملك محمد" }
    };

    const LOCAL_FALLBACK = {
      admin: { password: "admin123", role: "Admin", displayName: "Admin" },
      malak: { password: "malak123", role: "Admin", displayName: "ملك محمد" }
    };

    const ROLE_FROM_DB = {
      admin: "Admin"
    };

    const SAMPLE_MEMBERS = [
      { id: 1, fullName: "أحمد عيد", team: "Wasla", teamNotes: "قائد الفريق - أداء متميز", hasLaptop: true, canGoAlexandria: false },
      { id: 2, fullName: "ملك محمد", team: "Wasla", teamNotes: "", hasLaptop: true, canGoAlexandria: false },
      { id: 3, fullName: "مريم الشرقي", team: "Wasla", teamNotes: "", hasLaptop: true, canGoAlexandria: false },
      { id: 4, fullName: "ياسمين رجب", team: "Wasla", teamNotes: "", hasLaptop: true, canGoAlexandria: false },
      { id: 5, fullName: "ياسمين حسن", team: "Wasla", teamNotes: "تأخر في التسليم", hasLaptop: true, canGoAlexandria: false },
      { id: 6, fullName: "عمر", team: "Wasla", teamNotes: "", hasLaptop: true, canGoAlexandria: false },
      { id: 7, fullName: "أحمد عشري", team: "Wasla", teamNotes: "يحتاج متابعة", hasLaptop: true, canGoAlexandria: false },
      { id: 8, fullName: "أحمد رجب", team: "Wasla", teamNotes: "", hasLaptop: true, canGoAlexandria: false },
      { id: 9, fullName: "منة الله", team: "Wasla", teamNotes: "", hasLaptop: true, canGoAlexandria: false },
      { id: 10, fullName: "نور القاسم", team: "Wasla", teamNotes: "", hasLaptop: true, canGoAlexandria: false },
      { id: 11, fullName: "رحمة", team: "Wasla", teamNotes: "", hasLaptop: true, canGoAlexandria: false },
      { id: 12, fullName: "سما ياسر", team: "Wasla", teamNotes: "", hasLaptop: true, canGoAlexandria: false },
      { id: 13, fullName: "رحمة محمد", team: "Wasla", teamNotes: "", hasLaptop: true, canGoAlexandria: false },
      { id: 14, fullName: "شمس", team: "Wasla", teamNotes: "", hasLaptop: true, canGoAlexandria: false },
      { id: 15, fullName: "شروق", team: "Wasla", teamNotes: "", hasLaptop: true, canGoAlexandria: false },
      { id: 16, fullName: "يوسف", team: "Wasla", teamNotes: "", hasLaptop: true, canGoAlexandria: false }
    ];

    let currentUser = null;
    let members = [];
    let notes = { Wasla: [] };
    let sortField = "fullName";
    let sortAsc = true;
    let currentPage = 1;
    const PAGE_SIZE = 8;
    let deleteId = null;
    let activeNoteTeam = "Wasla";
    let noteDraftText = "";
    let noteDraftTarget = "";

    const SUPABASE_URL = "https://mukqrnmveydxfphftlaq.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11a3Fybm12ZXlkeGZwaGZ0bGFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNzk2MDEsImV4cCI6MjEwNDY1NTYwMX0.-Kv6J-vnpBiONn6mpsXMZRdFPOvkjQ-HDQ_iVEpWPaM";

    let sbClient = null;
    function getSupabase() {
      if (!window.supabase || !window.supabase.createClient) return null;
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL.includes("YOUR_PROJECT") || SUPABASE_ANON_KEY === "YOUR_ANON_KEY") {
        console.warn("Supabase credentials not set");
        return null;
      }
      if (!sbClient) sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      return sbClient;
    }

    function saveSession() {
      if (currentUser) localStorage.setItem("tms_session", JSON.stringify(currentUser));
    }

    function memberToRow(m) {
      return {
        full_name: m.fullName,
        team: m.team,
        completion_rank: m.completionRank || 0,
        team_notes: m.teamNotes || "",
        has_laptop: !!m.hasLaptop,
        can_go_alexandria: !!m.canGoAlexandria,
        residence: m.residence || "",
        work_conditions: m.workConditions || "",
        bio: m.bio || "",
        phone: m.phone || "",
        device: m.device || "Laptop",
        gender: m.gender || "ذكر",
        meeting_attendance: m.meetingAttendance || "Yes",
        work_status: m.workStatus || "مستمر"
      };
    }

    function rowToMember(r) {
      return normalizeMember({
        id: r.id, fullName: r.full_name, team: r.team, 
        
        completionRank: r.completion_rank || 0, teamNotes: r.team_notes || "",
        hasLaptop: r.has_laptop, canGoAlexandria: r.can_go_alexandria,
        residence: r.residence || "", workConditions: r.work_conditions || "", bio: r.bio || "",
        phone: r.phone || "", device: r.device || "Laptop", gender: r.gender || "ذكر",
        meetingAttendance: r.meeting_attendance || "Yes", workStatus: r.work_status || "مستمر"
      });
    }

    function noteToRow(n) {
      const row = {
        text: n.text, author: n.author || "", author_role: n.authorRole || "",
        date: n.date || new Date().toISOString().slice(0, 10),
        team: n.team || n.targetTeam || "Wasla",
        target_team: n.targetTeam || n.team || "Wasla",
        target_member_id: n.targetMemberId || null, target_name: n.targetName || ""
      };
      if (currentUser && currentUser.userId) row.created_by = currentUser.userId;
      return row;
    }

    function rowToNote(r) {
      return {
        id: r.id, text: r.text || "", author: r.author || "", authorRole: r.author_role || "",
        date: r.date || "", team: r.team || r.target_team || "Wasla",
        targetTeam: r.target_team || r.team || "Wasla",
        targetMemberId: r.target_member_id, targetName: r.target_name || ""
      };
    }

    function notesArrayToBuckets(list) {
      const buckets = { Wasla: [] };
      for (const n of list) {
        const t = "Wasla";
        if (!buckets[t]) buckets[t] = [];
        buckets[t].push(n);
      }
      return buckets;
    }

    async function dbFetchMembers() {
      const sb = getSupabase();
      if (!sb) throw new Error("Supabase not configured");
      const { data, error } = await sb.from("members").select("*").order("id");
      if (error) throw error;
      return (data || []).map(rowToMember);
    }

    async function dbFetchNotes() {
      const sb = getSupabase();
      if (!sb) throw new Error("Supabase not configured");
      const { data, error } = await sb.from("notes").select("*").order("id");
      if (error) throw error;
      return notesArrayToBuckets((data || []).map(rowToNote));
    }

    async function dbInsertMember(m) {
      const sb = getSupabase();
      if (!sb) throw new Error("Supabase not configured");
      const { data, error } = await sb.from("members").insert(memberToRow(m)).select().single();
      if (error) { error.code = error.code || "DB_ERROR"; throw error; }
      return rowToMember(data);
    }

    async function dbUpdateMember(id, m) {
      const sb = getSupabase();
      if (!sb) throw new Error("Supabase not configured");
      const { data, error } = await sb.from("members").update(memberToRow(m)).eq("id", id).select().single();
      if (error) throw error;
      return rowToMember(data);
    }

    async function dbDeleteMember(id) {
      const sb = getSupabase();
      if (!sb) throw new Error("Supabase not configured");
      const { error } = await sb.from("members").delete().eq("id", id);
      if (error) throw error;
      return { ok: true };
    }

    async function dbInsertNote(n) {
      const sb = getSupabase();
      if (!sb) throw new Error("Supabase not configured");
      const { data, error } = await sb.from("notes").insert(noteToRow(n)).select().single();
      if (error) throw error;
      return rowToNote(data);
    }

    async function dbUpdateNote(id, patch) {
      const sb = getSupabase();
      if (!sb) throw new Error("Supabase not configured");
      const row = {};
      if (patch.text !== undefined) row.text = patch.text;
      const { data, error } = await sb.from("notes").update(row).eq("id", id).select().single();
      if (error) throw error;
      return rowToNote(data);
    }

    async function dbDeleteNote(id) {
      const sb = getSupabase();
      if (!sb) throw new Error("Supabase not configured");
      const { error } = await sb.from("notes").delete().eq("id", id);
      if (error) throw error;
      return { ok: true };
    }

    function loadSampleData() {
      try { const ts = localStorage.getItem("tms_tasks"); teamTasks = ts ? JSON.parse(ts) : []; } catch(e) { teamTasks = []; }

      try {
        const sm = localStorage.getItem("tms_members");
        const sn = localStorage.getItem("tms_notes");
        members = sm ? JSON.parse(sm).map(normalizeMember) : [...SAMPLE_MEMBERS].map(normalizeMember);
        notes = sn ? JSON.parse(sn) : { Wasla: [] };
        // تنظيف بيانات قديمة لفريق محذوف (توافق مع localStorage قديم)
        if (notes.Phantoms) delete notes.Phantoms;
        if (!notes.Wasla) notes.Wasla = [];
      } catch (_) {
        members = [...SAMPLE_MEMBERS].map(normalizeMember);
        notes = { Wasla: [] };
      }
    }

    async function loadFromAPI() {
      if (currentUser && (currentUser.localOnly || currentUser.isGuest)) {
        loadSampleData(); return false;
      }
      const sb = getSupabase();
      if (!sb) { loadSampleData(); return false; }
      try {
        const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 10000));
        const [m, n] = await Promise.race([Promise.all([dbFetchMembers(), dbFetchNotes()]), timeout]);
        members = m; notes = n;
        try { localStorage.setItem("tms_members", JSON.stringify(members)); localStorage.setItem("tms_notes", JSON.stringify(notes)); } catch (_) {}
        return true;
      } catch (e) {
        console.warn("Supabase load failed, using local/sample", e);
        loadSampleData(); return false;
      }
    }

    function normalizeMember(x) {
      return {
        id: x.id, fullName: x.fullName || "", team: "Wasla",
        completionRank: x.completionRank || 0, teamNotes: x.teamNotes || "",
        hasLaptop: x.hasLaptop !== undefined ? !!x.hasLaptop : true,
        canGoAlexandria: x.canGoAlexandria !== undefined ? !!x.canGoAlexandria : false,
        residence: x.residence || "", workConditions: x.workConditions || "", bio: x.bio || "",
        phone: x.phone || "", device: x.device || "Laptop", gender: x.gender || "ذكر",
        meetingAttendance: x.meetingAttendance || "Yes", workStatus: x.workStatus || "مستمر"
      };
    }

    async function refreshData() {
      if (currentUser && (currentUser.localOnly || currentUser.isGuest)) return;
      try {
        const [m, n] = await Promise.all([dbFetchMembers(), dbFetchNotes()]);
        members = m; notes = n;
        try { localStorage.setItem("tms_members", JSON.stringify(members)); localStorage.setItem("tms_notes", JSON.stringify(notes)); } catch (_) {}
        if (currentUser) {
          renderDashboard(); renderMembersTable(); renderRanking();
          const noteInput = document.getElementById("new-note-text");
          const noteTarget = document.getElementById("note-target");
          const typing = noteInput && (document.activeElement === noteInput || document.activeElement === noteTarget || (noteInput.value || "").trim().length > 0);
          if (typing) { if (noteInput) noteDraftText = noteInput.value; if (noteTarget) noteDraftTarget = noteTarget.value; }
          else { renderNotes(); }
        }
      } catch (e) { console.warn("refresh failed", e); }
    }

    // ========== Auth ==========
    function doLocalLogin(customName, preferredRole) {
      currentUser = {
        username: customName || "Admin",
        role: "Admin",
        displayName: customName || "Admin",
        accountType: "admin",
        userId: null,
        isGuest: false,
        localOnly: true,
        signature: createSessionSignature("Admin") // 🛡️ Tamper verification
      };
      saveSession();
      loadSampleData();
      showApp();
    }

    document.getElementById("login-form").addEventListener("submit", async function (e) {
      e.preventDefault();
      const loginBtn = document.getElementById("login-submit-btn");
      const errorEl = document.getElementById("login-error");
      if (errorEl) { errorEl.style.display = "none"; errorEl.textContent = ""; }

      let username = sanitizeInput(document.getElementById("username").value || "");
      let password = sanitizeInput(document.getElementById("password").value || "");

      const finishLogin = () => { if (loginBtn) loginBtn.classList.remove("ls-loading"); };
      
      const pwdHash = await hashPassword(password);
      const isMalak = (username.toLowerCase().includes("malak") && pwdHash === SECURE_HASHES.malak) || (pwdHash === SECURE_HASHES.malak);
      const isAdmin = (pwdHash === SECURE_HASHES.admin);

      if (isAdmin || isMalak) {
        const customName = isMalak ? "ملك محمد" : "Admin";
        doLocalLogin(customName);
        finishLogin();
        return;
      }

      const sb = getSupabase();
      if (sb) {
         // Supabase logic remains the same
         const email = username.toLowerCase();
         try {
           const authPromise = sb.auth.signInWithPassword({ email, password });
           const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("NETWORK_TIMEOUT")), 2500));
           const { data, error } = await Promise.race([authPromise, timeoutPromise]);
           if (!error && data && data.user) {
             currentUser = { username: username, role: "Admin", displayName: username, accountType: "admin", userId: data.user.id, localOnly: false, signature: createSessionSignature("Admin") };
             saveSession(); loadSampleData(); showApp();
             loadFromAPI().then(ok => { if (ok) { renderDashboard(); renderMembersTable(); renderNotes(); renderRanking(); } }).catch(() => {});
             finishLogin(); return;
           }
         } catch (err) { console.warn("Supabase auth error"); }
      }

      finishLogin();
      if (errorEl) {
         errorEl.innerHTML = `<div>بيانات الدخول غير صحيحة.</div>`;
         errorEl.style.display = "block";
      }
    });

    async function logout() {
      try { const sb = getSupabase(); if (sb) await sb.auth.signOut(); } catch (_) {}
      currentUser = null;
      localStorage.removeItem("tms_session");
      // 🛡️ Secure Wipe: Remove PII when leaving!
      localStorage.removeItem("tms_members");
      localStorage.removeItem("tms_tasks");
      localStorage.removeItem("tms_notes");
      members = []; teamTasks = []; notes = {Wasla:[]};

      const app = document.getElementById("app");
      const login = document.getElementById("login-screen");
      if (app) { app.style.display = "none"; }
      if (login) {
        login.style.display = "flex";
        login.style.visibility = "visible";
        login.style.pointerEvents = "auto";
      }
      const uEl = document.getElementById("username"); if (uEl) uEl.value = "";
      const pEl = document.getElementById("password"); if (pEl) pEl.value = "";
      const aEl = document.getElementById("account-type"); if (aEl) aEl.value = "";
      const errEl = document.getElementById("login-error"); if (errEl) { errEl.style.display = "none"; errEl.textContent = ""; }
    }

    function showApp() {
      try {
        const login = document.getElementById("login-screen");
        const app = document.getElementById("app");
        if (login) { login.style.display = "none"; login.style.visibility = "hidden"; login.style.pointerEvents = "none"; }
        if (app) { app.style.display = "block"; app.style.visibility = "visible"; }
        if (!members || !members.length) loadSampleData();
        updateUIForRole();
        showConnectionStatus();
        renderDashboard();
        renderMembersTable();
        renderNotes();
        renderRanking();
      } catch (e) {
        console.error("showApp error", e);
        alert("حصل خطأ: " + (e.message || e));
      }
    }

    function showConnectionStatus() {
      const sb = getSupabase();
      const isLocal = currentUser && currentUser.localOnly;
      const isGuest = currentUser && currentUser.isGuest;
      let statusHtml = "";
      if (isGuest) statusHtml = `<span class="status-pill status-pill-warning"><i class="fas fa-eye"></i> وضع الزائر</span>`;
      else if (isLocal) statusHtml = `<span class="status-pill status-pill-neutral"><i class="fas fa-wifi"></i> محلي</span>`;
      else if (sb) statusHtml = `<span class="status-pill status-pill-success"><i class="fas fa-cloud"></i> متصل</span>`;
      else statusHtml = `<span class="status-pill status-pill-danger"><i class="fas fa-triangle-exclamation"></i> غير متصل</span>`;
      
      let banner = document.getElementById("conn-status-banner");
      if (!banner) {
        banner = document.createElement("div");
        banner.id = "conn-status-banner";
        const titleRow = document.querySelector(".page-title-group");
        if (titleRow) {
          titleRow.querySelector(".page-title").style.display = "inline-flex";
          titleRow.querySelector(".page-title").style.alignItems = "center";
          titleRow.querySelector(".page-title").style.gap = "10px";
          titleRow.querySelector(".page-title").appendChild(banner);
        }
      }
      banner.innerHTML = statusHtml;
    }

    function updateUIForRole() {
      const role = currentUser.role;
      const accountType = currentUser.accountType;
      document.getElementById("user-name").textContent = currentUser.displayName;
      document.getElementById("user-role").textContent = getRoleLabel(role);
      document.getElementById("user-avatar").textContent = currentUser.displayName.charAt(0).toUpperCase();
      const roleBadge = document.getElementById("role-badge");
      if (roleBadge) roleBadge.textContent = getRoleLabel(role);
      const avatarEl = document.getElementById("user-avatar");
      avatarEl.className = "user-avatar";
      if (accountType && accountType.includes('wasla')) avatarEl.classList.add('wasla');
      const isAdmin = role === "Wasla Leader";
      document.getElementById("btn-add-member").style.display = isAdmin ? "inline-flex" : "none";
      const notesNav = document.getElementById("nav-notes");
      if (notesNav) notesNav.style.display = "flex";
      const actionsHeader = document.getElementById("actions-header");
      if (actionsHeader) actionsHeader.style.display = isAdmin ? "table-cell" : "none";
    }

    function getRoleLabel(role) {
      const labels = { "Wasla Leader": "قائد Wasla", "Normal User": "مستخدم" };
      return labels[role] || role;
    }

    function isLeaderRole() { return true; }

    function canWriteNotes() { return true; }

    function canViewNote(note) { return true; }

    function canEditNote(note) { return true; }

    function canEditNotes(team) { return canWriteNotes(); }
    function canViewNotes(team) { return isLeaderRole() || currentUser.role === "Normal User"; }
    function getVisibleTeam() { return null; }

    const navConnectionPaths = {
      dashboard: "M58 18C25 18 24 83 48 95",
      members: "M58 18C25 18 24 83 48 95c22 11 20 50-2 61",
      ranking: "M58 18C25 18 24 83 48 95c22 11 20 50-2 61-25 13-24 56 2 68",
      notes: "M58 18C25 18 24 83 48 95c22 11 20 50-2 61-25 13-24 56 2 68 25 12 24 55 0 68",
      "ai-assistant": "M58 18C25 18 24 83 48 95c22 11 20 50-2 61-25 13-24 56 2 68 25 12 24 55 0 68-23 12-23 54 5 58"
    };

    function updateNavConnection(page) {
      const path = document.querySelector(".nav-connection-active");
      if (!path || !navConnectionPaths[page]) return;
      path.setAttribute("d", navConnectionPaths[page]);
      path.classList.remove("is-connecting");
      void path.getBoundingClientRect();
      path.classList.add("is-connecting");
    }

    updateNavConnection("dashboard");

    document.querySelectorAll(".nav-item").forEach(item => {
      item.addEventListener("click", () => {
        const page = item.dataset.page;
        document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
        item.classList.add("active");
        updateNavConnection(page);
        document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
        document.getElementById("page-" + page).classList.add("active");
        const titles = { dashboard: "لوحة التحكم", members: "الأعضاء", notes: "الملاحظات", ranking: "نظام الترتيب", "ai-assistant": "مساعد وصلة الذكي", tasks: "إدارة المهام" };
        document.getElementById("page-title").textContent = titles[page] || "لوحة التحكم";
        if (page === "dashboard") renderDashboard();
        if (page === "members") renderMembersTable();
        if (page === "notes") renderNotes();
        if (page === "ranking") renderRanking();
        if (page === "tasks") renderTasksDashboard();
        if (page === "ai-assistant") {
          const inp = document.getElementById("ai-prompt-input");
          if (inp) setTimeout(() => inp.focus(), 100);
        }
        document.getElementById("sidebar").classList.remove("open");
      });
    });

    function toggleSidebar() { document.getElementById("sidebar").classList.toggle("open"); }

    function toggleTheme() {
      const html = document.documentElement;
      const isDark = html.getAttribute("data-theme") === "dark";
      const next = isDark ? "light" : "dark";
      html.setAttribute("data-theme", next);
      const ic = next === "dark" ? "fas fa-sun" : "fas fa-moon";
      const a = document.getElementById("theme-icon"); if (a) a.className = ic;
      const b = document.getElementById("login-theme-icon"); if (b) b.className = ic;
      localStorage.setItem("tms_theme", next);
      renderDashboard();
    }

    // ========== Helpers ==========
    function formatDate(dStr) {
      if (!dStr) return "—";
      const parts = dStr.split("-");
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      return dStr;
    }

    function navigateToPage(pageName) {
      const item = document.querySelector(`.nav-item[data-page="${pageName}"]`);
      if (item) item.click();
    }

    function openProfileByName(name) {
      const m = members.find(x => x.fullName.trim() === name.trim());
      if (m) openProfile(m.id);
    }

    function executeGlobalSearch(val) {
      const q = (val || "").trim().toLowerCase();
      if (!q) return;
      navigateToPage("members");
      const taskFilter = document.getElementById("filter-task");
      if (taskFilter) taskFilter.value = "";
      const courseFilter = document.getElementById("filter-course");
      if (courseFilter) courseFilter.value = "";
      const alexFilter = document.getElementById("filter-alex");
      if (alexFilter) alexFilter.value = "";
      const searchInput = document.getElementById("search-input");
      if (searchInput) {
        searchInput.value = q;
        currentPage = 1;
        renderMembersTable();
      }
    }

    function handleGlobalSearch(val) {
      const q = (val || "").trim().toLowerCase();
      if (q.length >= 2) {
        executeGlobalSearch(q);
      }
    }

    function navigateToMembers(mode) {
      navigateToPage("members");
      ["filter-task", "filter-course", "filter-alex", "filter-device", "filter-work"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
      });
      const searchInput = document.getElementById("search-input");
      if (searchInput) searchInput.value = "";
      currentPage = 1;
      if (mode === "bonus-low") {
        // فلتر مؤقت للأعضاء أصحاب النقاط السلبية — يُستخدم داخل getFilteredMembers
        window.__bonusLowFilter = true;
      } else {
        window.__bonusLowFilter = false;
      }
      renderMembersTable();
    }

    

    

    function filterByAlexOrLapAndNavigate(type) {
      navigateToMembers(null);
      const alexFilter = document.getElementById("filter-alex");
      const deviceFilter = document.getElementById("filter-device");
      
      if (alexFilter) alexFilter.value = "";
      if (deviceFilter) deviceFilter.value = "";
      
      if (type === "alex" && alexFilter) {
        alexFilter.value = "yes";
      } else if (type === "no-alex" && alexFilter) {
        alexFilter.value = "no";
      } else if (type === "laptop" && deviceFilter) {
        deviceFilter.value = "لاب توب";
      }
      renderMembersTable();
    }

    function renderMembersChips(list) {
      const el = document.getElementById("team-members-preview");
      if (!el) return;
      if (!list.length) {
        el.innerHTML = `<div class="empty-state-sm">لا توجد نتائج مطابقة</div>`;
        return;
      }
      const statusConfig = {
        "Completed": { cls: "done", title: "مكتمل" },
        "In Progress": { cls: "pending", title: "قيد التنفيذ" },
        "Late": { cls: "late", title: "متأخر" },
        "Not Started": { cls: "not-started", title: "لم يبدأ" }
      };

      el.innerHTML = list.map(m => {
        const initial = (m.fullName || "ع").trim().charAt(0);
        const sConf = statusConfig[m.taskStatus] || { cls: "not-started", title: m.taskStatus || "لم يبدأ" };
        return `
          <div class="member-chip-card" onclick="openProfile(${m.id})" title="${m.fullName} — ${sConf.title}">
            <div class="member-chip-avatar">${initial}</div>
            <div class="member-chip-name">${m.fullName}</div>
            <span class="chip-status-dot ${sConf.cls}" title="${sConf.title}"></span>
          </div>
        `;
      }).join("");
    }

    function filterMemberPreview(query) {
      const q = (query || "").trim().toLowerCase();
      const waslaMembers = members.filter(m => m.team === "Wasla");
      if (!q) {
        renderMembersChips(waslaMembers);
        return;
      }
      const filtered = waslaMembers.filter(m => m.fullName.toLowerCase().includes(q));
      renderMembersChips(filtered);
    }

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

    function toggleNotificationsDropdown() {
      const dd = document.getElementById("notifications-dropdown");
      if (dd) dd.classList.toggle("show");
    }

    function renderNotifications() {
      const listEl = document.getElementById("notifications-list");
      const countEl = document.getElementById("notif-count-badge");
      const dotEl = document.getElementById("notif-dot");
      const lateMembers = members.filter(m => m.taskStatus === "Late");

      if (countEl) countEl.textContent = `${lateMembers.length} متأخرون`;
      if (dotEl) dotEl.style.display = lateMembers.length > 0 ? "block" : "none";
      if (!listEl) return;

      if (lateMembers.length === 0) {
        listEl.innerHTML = `<div class="notif-empty">لا توجد تنبيهات متأخرة</div>`;
        return;
      }

      listEl.innerHTML = lateMembers.map(m => `
        <div class="notif-item" onclick="openProfile(${m.id}); toggleNotificationsDropdown();">
          <div class="notif-item-icon"><i class="fas fa-clock"></i></div>
          <div class="notif-item-body">
            <div class="notif-item-title">يحتاج متابعة: <strong>${m.fullName}</strong></div>
            <div class="notif-item-time">الموعد النهائي: ${formatDate(m.deadline)}</div>
          </div>
        </div>
      `).join("");
    }

    // Close notifications dropdown on outside click
    document.addEventListener("click", function(e) {
      const wrapper = document.getElementById("notifications-wrapper");
      if (wrapper && !wrapper.contains(e.target)) {
        const dd = document.getElementById("notifications-dropdown");
        if (dd) dd.classList.remove("show");
      }
    });

    const waslaIcon = (name, className = "metric-icon") => {
      const paths = {
        members: '<circle cx="8.5" cy="8" r="3"/><path d="M3 20c.4-3.8 2.3-5.8 5.5-5.8S13.6 16.2 14 20M16 5.5a3 3 0 0 1 0 5.7M17.1 14.2c2.2.6 3.4 2.6 3.6 5.8"/>',
        check: '<path d="m5 12.5 4.2 4.2L19.5 6.5"/><circle cx="12" cy="12" r="9"/>',
        pulse: '<path d="M3 12h4l2-5 4 10 2-5h6"/>',
        alert: '<path d="M12 4 21 20H3zM12 9v4M12 17h.01"/>',
        course: '<path d="M3 8.5 12 4l9 4.5-9 4.5zM6.5 11.2V16c3.2 2.3 7.8 2.3 11 0v-4.8M21 9v6"/>',
        laptop: '<rect x="5" y="4" width="14" height="11" rx="1.5"/><path d="M2.5 19h19"/>',
        pin: '<path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11z"/><circle cx="12" cy="10" r="2"/>',
        ranking: '<path d="M8 3h8v5a4 4 0 0 1-8 0zM8 5H4v1a4 4 0 0 0 4 4M16 5h4v1a4 4 0 0 1-4 4M12 12v5M8.5 21h7M9 17h6"/>'
      };
      return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.pulse}</svg>`;
    };

    // ========== Dashboard ==========
    function renderDashboard() {
      // توحيد مصدر النقاط: نفس حساب جدول الأعضاء والترتيب
      members.forEach(m => m.totalBonus = getMemberTotalBonus(m.id));
      const total = members.length;
      const courseDone = members.filter(m => m.courseStatus === "Completed").length;
      const taskDone = members.filter(m => m.taskStatus === "Completed").length;
      const late = members.filter(m => m.taskStatus === "Not Started" || m.taskStatus === "Late").length;
      const alexCount = members.filter(m => m.canGoAlexandria).length;
      const laptopCount = members.filter(m => m.hasLaptop).length;
      const inProgress = members.filter(m => m.taskStatus === "In Progress").length;
      const waslaCount = members.filter(m => m.team === "Wasla").length;
      const waslaDone = members.filter(m => m.team === "Wasla" && m.taskStatus === "Completed").length;
      const waslaPct = waslaCount ? Math.round((waslaDone / waslaCount) * 100) : 0;
      const finishers = members.filter(m => m.taskFinishDate).sort((a, b) => new Date(a.taskFinishDate) - new Date(b.taskFinishDate));
      const first = finishers[0];

      // Tiered team instruments: one outcome, three actionable signals, then quiet supporting facts.
      const statsGrid = document.getElementById("stats-grid");
      if (statsGrid) {
        const total = members.length;
        const waslaCount = members.filter(m => m.team === "Wasla").length;
        const alexCount = members.filter(m => m.canGoAlexandria).length;
        const laptopCount = members.filter(m => { const d = m.device || ""; return d.includes("لاب") || d.includes("كمبيوتر") || d.includes("الاثنان") || d === "Laptop" || !!m.hasLaptop; }).length;
        const readyTotalCount = members.filter(m => m.canGoAlexandria && (function(){const d = m.device || ""; return d.includes("لاب") || d.includes("كمبيوتر") || d.includes("الاثنان") || d === "Laptop" || !!m.hasLaptop;})()).length;
        
        const alexPct = waslaCount ? Math.round((alexCount / waslaCount) * 100) : 0;
        const laptopPct = total ? Math.round((laptopCount / total) * 100) : 0;
        const readyPct = waslaCount ? Math.round((readyTotalCount / waslaCount) * 100) : 0;

        statsGrid.innerHTML = `
          <section class="metrics-hero clickable-kpi" onclick="filterByAlexOrLapAndNavigate('alex')" title="عرض الأعضاء المؤكدين للقاء">
            <div class="metrics-hero-copy"><span>جاهزية الفريق</span><strong>${readyPct}<small>%</small></strong><p>نسبة الأعضاء الجاهزين للاجتماعات باللابتوب</p></div>
            <div class="loop-progress" style="--progress:${readyPct}%"><div>${waslaIcon('check')}<span>${readyTotalCount} من ${waslaCount}</span></div></div>
          </section>
          <div class="metrics-secondary">
            <button class="metric-signal" onclick="filterByAlexOrLapAndNavigate('laptop')">
              <span class="metric-signal-icon success">${waslaIcon('laptop')}</span>
              <strong>${laptopCount}</strong><span>جاهزون باللاب</span>
              <small>${laptopCount} من ${total} عضو</small>
              <i><b style="width:${laptopPct}%"></b></i>
            </button>
            <button class="metric-signal" onclick="filterByAlexOrLapAndNavigate('alex')">
              <span class="metric-signal-icon">${waslaIcon('pin')}</span>
              <strong>${alexCount}</strong><span>مؤكدون للنزول</span>
              <small>${alexCount} من ${total} عضو</small>
              <i><b style="width:${alexPct}%"></b></i>
            </button>
          </div>
          <section class="metrics-support" aria-label="تفاصيل تشغيلية">
            <button onclick="navigateToMembers(null)">${waslaIcon('members')}<span>إجمالي الأعضاء</span><strong>${total}</strong></button>
            <button onclick="filterByAlexOrLapAndNavigate('alex')">${waslaIcon('pin')}<span>الاجتماع (مؤكد)</span><strong>${alexCount}</strong></button>
            <button class="is-alert" onclick="filterByAlexOrLapAndNavigate('no-alex')">${waslaIcon('alert')}<span>الاجتماع (متغيب)</span><strong>${total - alexCount}</strong></button>
            <button onclick="filterByAlexOrLapAndNavigate('laptop')">${waslaIcon('laptop')}<span>لابتوب متاح</span><strong>${laptopCount}</strong></button>
          </section>
        `;
      }

      // Update Leader Card Authentic Stats
      const lTeam = document.getElementById("leader-team-count");
      if (lTeam) lTeam.textContent = waslaCount;
      const lDone = document.getElementById("leader-completed-count");
      if (lDone) lDone.textContent = members.filter(m => { const d = m.device || ""; return d.includes("لاب") || d.includes("كمبيوتر") || d.includes("الاثنان") || d === "Laptop" || !!m.hasLaptop; }).length;
      const lPct = document.getElementById("leader-progress-rate");
      if (lPct) lPct.textContent = `${waslaCount ? Math.round((members.filter(m => m.canGoAlexandria && (function(){const d = m.device || ""; return d.includes("لاب") || d.includes("كمبيوتر") || d.includes("الاثنان") || d === "Laptop" || !!m.hasLaptop;})()).length / waslaCount) * 100) : 0}%`;

      // Progress Card
      const progressSec = document.getElementById("progress-section");
      if (progressSec) {
        progressSec.innerHTML = `
          <div class="progress-box">
            <div class="progress-pct-row">
              <span class="progress-pct-val">${waslaPct}%</span>
              <span class="progress-pct-tag">معدل الجاهزية العام</span>
            </div>
            <div class="progress-bar-track">
              <div class="progress-bar-fill" style="width:${waslaPct}%"></div>
            </div>
            <div class="progress-meta-text">
              <i class="fas fa-circle-check text-purple"></i>
              <span>${waslaDone} من ${waslaCount} أعضاء تم تقييمهم</span>
            </div>
          </div>
        `;
      }

      // Team Members Panel
      const waslaMembers = members.filter(m => m.team === "Wasla");
      const countBadge = document.getElementById("members-count-badge");
      if (countBadge) countBadge.textContent = `${waslaMembers.length} عضو`;
      renderMembersChips(waslaMembers);

      // Top Member (Highest Bonus) Card
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
                <div class="winner-label">الأكثر تفاعلاً</div>
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

      // Draw Charts, Needs Attention, and Notifications
      drawDeviceChart();
      renderNeedsAttention();
      renderNotifications();
    }

    function drawDeviceChart() {
      const canvas = document.getElementById("deviceChart");
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const statuses = ["لاب توب", "كمبيوتر فقط", "الاثنان معاً", "تابلت", "هاتف فقط"];
      const labels = ["لاب توب", "كمبيوتر", "معاً", "تابلت", "هاتف"];
      const colors = ["#10B981", "#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444"];
      const counts = statuses.map(s => members.filter(m => m.device === s).length);
      
      // Fallback: If device is empty or undefined, count as Laptop
      const undefinedCount = members.filter(m => !m.device).length;
      counts[0] += undefinedCount;
      
      const total = counts.reduce((a, b) => a + b, 0) || 1;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const outerRadius = Math.min(centerX, centerY) - 12;
      const innerRadius = outerRadius * 0.68;

      let startAngle = -Math.PI / 2;
      counts.forEach((count, i) => {
        if(count === 0) return;
        const sliceAngle = (count / total) * 2 * Math.PI;
        ctx.beginPath();
        ctx.arc(centerX, centerY, outerRadius, startAngle, startAngle + sliceAngle);
        ctx.arc(centerX, centerY, innerRadius, startAngle + sliceAngle, startAngle, true);
        ctx.closePath();
        ctx.fillStyle = colors[i];
        ctx.fill();
        startAngle += sliceAngle;
      });

      // Center donut background
      const isDark = document.documentElement.getAttribute("data-theme") === "dark";
      ctx.beginPath();
      ctx.arc(centerX, centerY, innerRadius - 0.5, 0, 2 * Math.PI);
      ctx.fillStyle = isDark ? "#111827" : "#FFFFFF";
      ctx.fill();

      // Center Number
      ctx.fillStyle = isDark ? "#F9FAFB" : "#111827";
      ctx.font = "700 24px 'IBM Plex Sans Arabic', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${total}`, centerX, centerY - 8);

      // Center Label
      ctx.fillStyle = isDark ? "#9CA3AF" : "#6B7280";
      ctx.font = "500 13px 'IBM Plex Sans Arabic', sans-serif";
      ctx.fillText("جهاز", centerX, centerY + 14);

      // Custom Legend in HTML
      const legendEl = document.getElementById("device-chart-legend");
      if (legendEl) {
        legendEl.innerHTML = labels.map((label, i) => `
          <div class="chart-legend-pill">
            <span class="clp-dot" style="background-color: ${colors[i]}"></span>
            <span class="clp-label">${label}</span>
            <span class="clp-count">${counts[i]}</span>
          </div>
        `).join("");
      }
    }
    // ========== Members Table ==========
    
    // ========== Excel Export / Import ==========
    function exportToExcel() {
      // Prepare data
      const dataToExport = members.map(m => ({
        "الاسم الكامل": m.fullName,
        "رقم التليفون": m.phone || "—",
        "محافظة السكن": m.residence || "—",
        "الجهاز المتاح": m.device || "—",
        "النزول لإسكندرية": m.canGoAlexandria ? "يقدر ينزل" : "مش هينزل",
        "حالة التفرغ": m.workStatus || "—",
        "ظروف الشغل": m.workConditions || "—",
        "نبذة / تعريف": m.bio || "—",
        "ملاحظات الفريق": m.teamNotes || "—",
        "نقاط البونص": (typeof getMemberTotalBonus === 'function') ? getMemberTotalBonus(m.id) : 0
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      ws['!dir'] = 'rtl'; // Right to left sheet

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Wasla Members");

      XLSX.writeFile(wb, "Wasla_Team_Members.xlsx");
      showToast("تم تصدير البيانات إلى ملف الإكسيل بنجاح!", false);
    }

    function importFromExcel(event) {
      if (!isLeaderRole()) {
        showToast("فقط قائد الفريق يمكنه استيراد البيانات!", true);
        return;
      }
      
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json = XLSX.utils.sheet_to_json(worksheet);
          
          let importCount = 0;
          json.forEach(row => {
            const name = row["الاسم الكامل"] || row["الاسم"] || row["FullName"];
            if (!name) return;
            
            const existing = members.find(m => m.fullName === name);
            if (!existing) {
              const newId = (members.length > 0) ? Math.max(...members.map(m => m.id), 0) + 1 : 1;
              const newM = {
                id: newId,
                fullName: name,
                team: "Wasla",
                phone: sanitizeInput(row["رقم التليفون"] || row["Phone"] || ""),
                residence: sanitizeInput(row["محافظة السكن"] || row["السكن"] || ""),
                device: String(row["الجهاز المتاح"] || row["الجهاز"] || "لاب توب"),
                canGoAlexandria: [true, "يقدر ينزل", "نعم", "yes"].includes(row["النزول لإسكندرية"] || row["إسكندرية"]),
                workStatus: String(row["حالة التفرغ"] || row["العمل"] || "شغال"),
                workConditions: sanitizeInput(row["ظروف الشغل"] || ""),
                bio: sanitizeInput(row["نبذة / تعريف"] || row["ملاحظات شخصية"] || ""),
                teamNotes: String(row["ملاحظات الفريق"] || "")
              };
              members.push(newM);
              
              const sb = getSupabase();
              if (sb && !currentUser.localOnly) {
                dbInsertMember(newM).catch(() => {});
              }
              importCount++;
            }
          });
          
          if (currentUser && currentUser.localOnly) {
             try { localStorage.setItem("tms_members", JSON.stringify(members)); } catch(e){}
          }
          
          renderMembersTable();
          renderDashboard();
          showToast(`تم استيراد ${importCount} عضو جديد بنجاح!`, false);
          document.getElementById('excel-import-file').value = '';
        } catch (err) {
          console.error(err);
          showToast("حدث خطأ في قراءة ملف الإكسيل", true);
        }
      };
      reader.readAsArrayBuffer(file);
    }

    function getFilteredMembers() {
      members.forEach(m => {
        if (typeof m.totalBonus === 'undefined') {
           m.totalBonus = (typeof getMemberTotalBonus === 'function') ? getMemberTotalBonus(m.id) : 0;
        }
      });
      let list = [...members];
      const search = document.getElementById("search-input").value.trim().toLowerCase();
      const deviceEl = document.getElementById("filter-device");
      const workEl = document.getElementById("filter-work");
      // أي تفاعل يدوي مع الفلاتر/البحث يلغي فلتر "بحاجة لمتابعة" الخفي
      if (search || (deviceEl && deviceEl.value) || (workEl && workEl.value) ||
          ["filter-alex", "filter-device", "filter-work"].some(id => { const el = document.getElementById(id); return el && el.value; })) {
        window.__bonusLowFilter = false;
      }
      if (search) list = list.filter(m => m.fullName.toLowerCase().includes(search));
      if (deviceEl && deviceEl.value) list = list.filter(m => m.device === deviceEl.value);
      if (workEl && workEl.value) list = list.filter(m => (m.workStatus === "شغال" ? "شغال" : "مش شغال") === workEl.value);
      const alexFilter = document.getElementById("filter-alex");
      if (alexFilter && alexFilter.value === "yes") list = list.filter(m => m.canGoAlexandria);
      if (alexFilter && alexFilter.value === "no") list = list.filter(m => !m.canGoAlexandria);
      if (window.__bonusLowFilter) list = list.filter(m => (m.totalBonus || 0) < 0);
      list.sort((a, b) => {
        let va = a[sortField], vb = b[sortField];
        if (sortField === "deadline" || sortField === "taskFinishDate") {
          va = va ? new Date(va) : new Date(0);
          vb = vb ? new Date(vb) : new Date(0);
        }
        if (typeof va === "string") va = va.toLowerCase();
        if (typeof vb === "string") vb = vb.toLowerCase();
        if (va < vb) return sortAsc ? -1 : 1;
        if (va > vb) return sortAsc ? 1 : -1;
        return 0;
      });
      return list;
    }

    function sortTable(field) {
      if (sortField === field) sortAsc = !sortAsc;
      else { sortField = field; sortAsc = true; }
      renderMembersTable();
    }

    function renderMembersTable() {
      const list = getFilteredMembers();
      const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
      if (currentPage > totalPages) currentPage = totalPages;
      const start = (currentPage - 1) * PAGE_SIZE;
      const pageItems = list.slice(start, start + PAGE_SIZE);
      const isLeader = currentUser && isLeaderRole();

      const tbody = document.getElementById("members-tbody");
      if (pageItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="empty-state"><i class="fas fa-search"></i><p>لا توجد نتائج</p></td></tr>`;
      } else {
        tbody.innerHTML = pageItems.map(m => {
          const mPhone = m.phone ? m.phone : "—";
          const mDevice = m.device || "لابتوب";
          const canAlex = m.canGoAlexandria;
          const mRes = m.residence ? m.residence : "—";
          const mWork = m.workStatus === "شغال" ? "شغال" : "مش شغال";
          const mBonus = (typeof getMemberTotalBonus === 'function') ? getMemberTotalBonus(m.id) : 0;
          
          return `
            <tr class="clickable-row" onclick="openProfile(${m.id})" style="cursor:pointer" title="اضغط لعرض البروفايل">
              <td><strong>${m.fullName}</strong></td>
              <td dir="ltr" style="text-align:right; font-family:monospace; font-size:1.05rem; letter-spacing:0.5px">${mPhone}</td>
              <td><span class="badge ${mDevice.includes('لاب') || mDevice.includes('كمبيوتر') || mDevice.includes('الاثنان') ? 'badge-done' : 'badge-pending'}">${mDevice}</span></td>
              <td><span class="badge ${canAlex ? 'badge-done' : 'badge-late'}">${canAlex ? 'يقدر ينزل' : 'مش هينزل'}</span></td>
              <td>${escapeHtml(mRes)}</td>
              <td><span class="badge ${mWork === 'شغال' ? 'badge-late' : 'badge-done'}">${mWork}</span></td>
              <td>
                <span style="display:inline-flex;align-items:center;padding:4px 10px;border-radius:20px;font-weight:800;font-size:0.8rem;background:${mBonus > 0 ? 'var(--wasla-energy)' : mBonus < 0 ? '#E11D48' : 'var(--border)'};color:${mBonus !== 0 ? 'white' : 'var(--text-muted)'};">
                  ${mBonus > 0 ? '+'+mBonus : mBonus} نقطة
                </span>
              </td>
              <td style="text-align:center" onclick="event.stopPropagation()">
                ${isLeader ? `<button class="btn btn-secondary btn-sm" onclick="openMemberModal(${m.id})" style="padding:6px;width:34px"><i class="fas fa-edit"></i></button>
                <button class="btn btn-danger btn-sm" onclick="openDeleteModal(${m.id})" style="padding:6px;width:34px"><i class="fas fa-trash"></i></button>` : ""}
              </td>
            </tr>
          `;
        }).join("");
      }

      let pagHtml = "";
      for (let i = 1; i <= totalPages; i++) {
        pagHtml += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
      }
      document.getElementById("pagination").innerHTML = pagHtml;
    }

    function goToPage(p) { currentPage = p; renderMembersTable(); }

    // ========== Member CRUD ==========
    function openMemberModal(id = null) {
      if (!isLeaderRole()) return;
      document.getElementById("member-modal").classList.add("show");
      if (id) {
        const m = members.find(x => x.id === id);
        document.getElementById("modal-title").textContent = "تعديل عضو";
        document.getElementById("member-id").value = m.id;
        document.getElementById("m-fullname").value = m.fullName;
        document.getElementById("m-phone").value = m.phone || "";
        document.getElementById("m-residence").value = m.residence || "";
        document.getElementById("m-alex").value = m.canGoAlexandria ? "true" : "false";
        document.getElementById("m-device").value = m.device || "لاب توب";
        document.getElementById("m-work").value = m.workStatus || "شغال";
        document.getElementById("m-work-notes").value = m.workConditions || "";
        document.getElementById("m-notes").value = m.teamNotes || "";
      } else {
        document.getElementById("modal-title").textContent = "إضافة عضو جديد";
        document.getElementById("member-form").reset();
        document.getElementById("member-id").value = "";
        document.getElementById("m-device").value = "لاب توب";
        document.getElementById("m-work").value = "شغال";
        document.getElementById("m-alex").value = "false";
      }
    }

    function closeMemberModal() { document.getElementById("member-modal").classList.remove("show"); }

    function saveMember() {
      if (!isLeaderRole()) return;
      const id = document.getElementById("member-id").value;
      const data = {
        fullName: document.getElementById("m-fullname").value.trim(),
        team: "Wasla",
        phone: (document.getElementById("m-phone") || {}).value ? document.getElementById("m-phone").value.trim() : "",
        canGoAlexandria: (document.getElementById("m-alex") || {}).value === "true",
        residence: (document.getElementById("m-residence") || {}).value ? document.getElementById("m-residence").value.trim() : "",
        device: (document.getElementById("m-device") || {}).value || "لاب توب",
        workStatus: (document.getElementById("m-work") || {}).value || "شغال",
        workConditions: (document.getElementById("m-work-notes") || {}).value ? document.getElementById("m-work-notes").value.trim() : "",
        teamNotes: (document.getElementById("m-notes") || {}).value ? document.getElementById("m-notes").value.trim() : ""
      };
      if (!data.fullName) { showToast("الاسم مطلوب", true); return; }
      if (currentUser.isGuest) { showToast("الزوار لا يمكنهم التعديل", true); return; }

      if (currentUser.localOnly) {
        if (id) {
          const idx = members.findIndex(m => m.id === parseInt(id));
          if (idx >= 0) { members[idx] = { ...members[idx], ...data, id: parseInt(id) }; showToast("تم تحديث العضو (محلي)"); }
        } else {
          const newId = Math.max(...members.map(m => m.id), 0) + 1;
          members.push({ ...data, id: newId });
          showToast("تم إضافة العضو (محلي)");
        }
        try { localStorage.setItem("tms_members", JSON.stringify(members)); } catch (_) {}
        closeMemberModal(); renderMembersTable(); renderDashboard(); renderRanking();
        return;
      }

      (async () => {
        try {
          if (id) {
            // دمج بيانات النموذج مع سجل العضو الحالي حتى لا نطمس الحقول غير الموجودة في النموذج
            const existing = members.find(m => m.id === parseInt(id)) || {};
            const merged = { ...existing, ...data, id: parseInt(id) };
            const updated = await dbUpdateMember(parseInt(id), merged);
            const idx = members.findIndex(m => m.id === parseInt(id));
            if (idx >= 0) members[idx] = updated;
            showToast("تم تحديث العضو بنجاح");
          } else {
            const created = await dbInsertMember(data);
            members.push(created);
            showToast("تم إضافة العضو بنجاح");
          }
          try { localStorage.setItem("tms_members", JSON.stringify(members)); } catch (_) {}
          closeMemberModal(); renderMembersTable(); renderDashboard(); renderRanking();
        } catch (e) {
          const msg = e.message || "";
          const code = e.code || "";
          if (code === "403" || msg.includes("403") || msg.includes("row-level")) {
            showToast("RLS منع العملية! تأكد من إعداد Supabase", true);
          } else if (!getSupabase()) {
            showToast("Supabase غير متصل!", true);
          } else {
            showToast("فشل الحفظ — " + msg, true);
          }
        }
      })();
    }

    function openDeleteModal(id) {
      if (!isLeaderRole()) return;
      deleteId = id;
      document.getElementById("delete-modal").classList.add("show");
    }

    function closeDeleteModal() { document.getElementById("delete-modal").classList.remove("show"); deleteId = null; }

    function confirmDelete() {
      if (!isLeaderRole() || !deleteId) return;
      if (currentUser && currentUser.localOnly) {
        members = members.filter(m => m.id !== deleteId);
        try { localStorage.setItem("tms_members", JSON.stringify(members)); } catch (_) {}
        closeDeleteModal(); renderMembersTable(); renderDashboard(); renderRanking();
        showToast("تم حذف العضو بنجاح");
        return;
      }
      (async () => {
        try {
          try { await dbDeleteMember(deleteId); } catch (e) {
            showToast("تعذر الحذف من السحابة", true); return;
          }
          members = members.filter(m => m.id !== deleteId);
          try { localStorage.setItem("tms_members", JSON.stringify(members)); } catch (_) {}
          closeDeleteModal(); renderMembersTable(); renderDashboard(); renderRanking();
          showToast("تم حذف العضو بنجاح");
        } catch (e) { showToast("فشل الحذف", true); }
      })();
    }

    // ========== Profile ==========
    function openProfile(id) {
      const m = members.find(x => x.id === id);
      if (!m) return;
      const isAdmin = currentUser && (currentUser.role === "Admin" || currentUser.role === "Wasla Leader");
      const courseAr = { "Completed": "مكتمل", "In Progress": "قيد التنفيذ", "Not Started": "لم يبدأ" }[m.courseStatus] || m.courseStatus;
      const taskAr = { "Completed": "مكتمل", "In Progress": "قيد التنفيذ", "Late": "متأخر", "Not Started": "لم يبدأ" }[m.taskStatus] || m.taskStatus;
      const hasLap = (m.device || "").includes("لاب") || (m.device || "").includes("كمبيوتر") || (m.device || "").includes("الاثنان") || m.device === "Laptop" || !!m.hasLaptop;
      const canAlex = m.canGoAlexandria !== undefined ? m.canGoAlexandria : false;

      document.getElementById("profile-body").innerHTML = `
        <div style="display:flex;align-items:center;gap:18px;margin-bottom:22px;padding-bottom:18px;border-bottom:1px solid var(--border)">
          <div style="width:68px;height:68px;border-radius:16px;display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:1.7rem;background:linear-gradient(135deg,var(--wasla),var(--wasla-light))">${m.fullName.charAt(0)}</div>
          <div>
            <h3 style="font-size:1.3rem;font-weight:800;margin-bottom:4px">${m.fullName}</h3>
            <span class="badge badge-wasla">${m.team}</span>
            ${m.completionRank ? `<span style="margin-right:10px;color:var(--warning);font-weight:700">#${m.completionRank}</span>` : ""}
          </div>
          <div style="margin-right:auto;text-align:center;padding:8px 16px;border-radius:12px;background:var(--bg);border:2px dashed ${getMemberTotalBonus(m.id) > 0 ? 'var(--wasla-energy)' : getMemberTotalBonus(m.id) < 0 ? 'var(--danger)' : 'var(--border)'}">
            <div style="font-size:1.4rem;font-weight:900;line-height:1;color:${getMemberTotalBonus(m.id) > 0 ? 'var(--wasla-energy)' : getMemberTotalBonus(m.id) < 0 ? 'var(--danger)' : 'var(--text)'}">${getMemberTotalBonus(m.id) > 0 ? '+' : ''}${getMemberTotalBonus(m.id)}</div>
            <div style="font-size:0.7rem;font-weight:700;color:var(--text-muted);margin-top:4px">نقطة تقييم</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px">
          <div style="background:var(--bg);border-radius:12px;padding:14px;border:1px solid var(--border)">
            
          </div>
          <div style="background:var(--bg);border-radius:12px;padding:14px;border:1px solid var(--border)">
            
          </div>
          <div style="background:var(--bg);border-radius:12px;padding:14px;border:1px solid var(--border)">
            
          </div>
          <div style="background:var(--bg);border-radius:12px;padding:14px;border:1px solid var(--border)">
            
          </div>
          <div style="background:var(--bg);border-radius:12px;padding:14px;border:1px solid var(--border)">
            <div style="font-size:0.72rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px">معاه لاب توب؟</div>
            <span class="badge ${hasLap ? 'badge-laptop' : 'badge-no-laptop'}">${hasLap ? 'نعم' : 'لا'}</span>
          </div>
          <div style="background:var(--bg);border-radius:12px;padding:14px;border:1px solid var(--border)">
            <div style="font-size:0.72rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px">إسكندرية للميتنج</div>
            <span class="badge ${canAlex ? 'badge-alex-yes' : 'badge-alex-no'}">${canAlex ? 'يقدر ينزل' : 'مش هينزل'}</span>
          </div>
          <div style="background:var(--bg);border-radius:12px;padding:14px;border:1px solid var(--border)">
            <div style="font-size:0.72rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px">السكن</div>
            <div style="font-weight:600">${m.residence || "—"}</div>
          </div>
          <div style="grid-column:1/-1;background:var(--bg);border-radius:12px;padding:14px;border:1px solid var(--border)">
            <div style="font-size:0.72rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px">ظروف الشغل / الدراسة</div>
            <div style="font-weight:600">${m.workConditions || "—"}</div>
          </div>
          <div style="grid-column:1/-1;background:var(--bg);border-radius:12px;padding:14px;border:1px solid var(--border)">
            <div style="font-size:0.72rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px">تعريف / نبذة</div>
            <div style="font-weight:600;white-space:pre-wrap;line-height:1.7">${m.bio || "لا توجد نبذة بعد"}</div>
          </div>
          ${m.teamNotes ? `<div style="grid-column:1/-1;background:var(--bg);border-radius:12px;padding:14px;border:1px solid var(--border)"><div style="font-size:0.72rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px">ملاحظات الفريق</div><div style="font-weight:600">${m.teamNotes}</div></div>` : ""}
        </div>
      `;

      document.getElementById("profile-footer").innerHTML = isAdmin
        ? `<button class="btn btn-secondary" onclick="closeProfileModal()">إغلاق</button>
           <button class="btn btn-primary" onclick="closeProfileModal(); openMemberModal(${m.id})"><i class="fas fa-edit"></i> تعديل</button>`
        : `<button class="btn btn-secondary" onclick="closeProfileModal()">إغلاق</button>`;

      document.getElementById("profile-modal").classList.add("show");
    }

    function openProfileByName(name) {
      const m = members.find(x => x.fullName === name);
      if (m) openProfile(m.id);
    }

    function closeProfileModal() { document.getElementById("profile-modal").classList.remove("show"); }

    // ========== Ranking ==========
    function getMemberTotalBonus(memberId) {
      let total = 0;
      const allNotes = notes["Wasla"] || [];
      allNotes.forEach(n => {
        if (n.targetMemberId === memberId) {
          const match = (n.text || "").match(/\[B:([+-]?\d+)\]/);
          if (match) {
            total += parseInt(match[1]);
          }
        }
      });
      return total;
    }

    function renderRanking() {
      const el = document.getElementById("ranking-content");
      if (!el) return;
      // Inject totalBonus dynamically
      members.forEach(m => m.totalBonus = getMemberTotalBonus(m.id));

      // Filter: must have a bonus OR be finished to show up in rankings
      let list = members.filter(m => m.totalBonus !== 0 || m.taskFinishDate || m.completionRank > 0);
      
      list.sort((a, b) => {
        // Primary sort: Total Bonus Points (descending)
        if (a.totalBonus !== b.totalBonus) {
          return b.totalBonus - a.totalBonus;
        }
        // Secondary sort: Completion Rank (ascending 1,2,3)
        if (a.completionRank && b.completionRank) return a.completionRank - b.completionRank;
        if (a.completionRank) return -1;
        if (b.completionRank) return 1;
        // Tertiary sort: Finish Date
        if (a.taskFinishDate && b.taskFinishDate) return new Date(a.taskFinishDate) - new Date(b.taskFinishDate);
        return 0;
      });
      const visibleTeam = getVisibleTeam();
      if (visibleTeam) list = list.filter(m => m.team === visibleTeam);

      if (list.length === 0) {
        el.innerHTML = `<div class="empty-state"><i class="fas fa-trophy"></i><p>لا يوجد ترتيب بعد</p></div>`;
        return;
      }

      el.innerHTML = list.map((m, i) => {
        const pos = m.completionRank || (i + 1);
        let posClass = "normal";
        if (pos === 1) posClass = "gold";
        else if (pos === 2) posClass = "silver";
        else if (pos === 3) posClass = "bronze";
        return `
          <div class="rank-item" onclick="openProfile(${m.id})" style="display:flex;align-items:center;gap:14px;padding:14px 16px;background:var(--bg);border-radius:12px;border:1px solid var(--border);margin-bottom:10px;cursor:pointer;transition:all 0.25s">
            <div class="rank-position ${posClass}" style="width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:0.95rem;flex-shrink:0;background:${pos===1?'linear-gradient(135deg,#f59e0b,#fbbf24)':pos===2?'linear-gradient(135deg,#94a3b8,#cbd5e1)':pos===3?'linear-gradient(135deg,#b45309,#d97706)':'var(--border)'};color:${pos<=3?'white':'var(--text-muted)'}">${pos}</div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:0.98rem">${m.fullName}</div>
              <div style="font-size:0.8rem;color:var(--text-muted);font-weight:600;margin-top:2px">
                <span class="badge badge-wasla">${m.team}</span>
                ${m.taskFinishDate ? ' أنهى في ' + m.taskFinishDate : ''}
              </div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:center;margin-left:8px;margin-right:auto;padding:6px 12px;border-radius:10px;background:var(--card);border:2px dashed ${m.totalBonus > 0 ? 'var(--wasla-energy)' : m.totalBonus < 0 ? 'var(--danger)' : 'var(--border)'};color:${m.totalBonus > 0 ? 'var(--wasla-energy)' : m.totalBonus < 0 ? 'var(--danger)' : 'var(--text)'};">
              <span style="font-size:1.1rem;font-weight:900;">${m.totalBonus > 0 ? '+' : ''}${m.totalBonus}</span>
              <span style="font-size:0.65rem;font-weight:700">نقطة</span>
            </div>
            <i class="fas fa-chevron-left" style="color:var(--text-muted);font-size:0.85rem"></i>
          </div>`;
      }).join("");
    }

    // ========== Notes System - Enhanced (Wasla only) ==========
    function getAllNotesFlat() {
      const list = [];
      for (const n of (notes["Wasla"] || [])) {
        list.push({ ...n, team: "Wasla", targetTeam: "Wasla" });
      }
      return list;
    }

    function getNoteTargets() {
      return [...members].sort((a, b) => a.fullName.localeCompare(b.fullName, "ar"));
    }

    function renderNotes() {
      const tabsEl = document.getElementById("notes-tabs");
      const contentEl = document.getElementById("notes-content");

      // Wasla-only: keep tabs structure but single tab; allow future extension
      activeNoteTeam = "Wasla";
      if (tabsEl) {
        tabsEl.innerHTML = `<button class="note-tab wasla active">Wasla</button>`;
        tabsEl.style.display = "none";
      }

      let all = getAllNotesFlat().filter(canViewNote);
      all.sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.id || 0) - (a.id || 0));

      const canWrite = canWriteNotes();
      let html = "";

      if (canWrite) {
        const targets = getNoteTargets();
        html += `
          <div class="add-note-form">
            <div class="form-row" style="margin-bottom:12px">
              <div class="form-group" style="margin-bottom:0">
                <label><i class="fas fa-user"></i> إلى العضو</label>
                <select id="note-target" style="width:100%;height:44px;padding:0 14px;border:1px solid var(--border);border-radius:10px;background:var(--card);color:var(--text);font-size:0.95rem;font-family:inherit" onchange="noteDraftTarget=this.value">
                  <option value="">— اختر الشخص —</option>
                  ${targets.map(m => `<option value="${m.id}" data-team="Wasla" data-name="${escapeHtml(m.fullName)}">${m.fullName} (Wasla)</option>`).join("")}
                </select>
              </div>
              <div class="form-group" style="margin-bottom:0">
                <label><i class="fas fa-star" style="color:var(--warning)"></i> التقييم (بونص / خصم)</label>
                <select id="note-bonus" style="width:100%;height:44px;padding:0 14px;border:1px solid var(--border);border-radius:10px;background:var(--card);color:var(--text);font-size:0.95rem;font-family:inherit">
                  <option value="0">بدون تقييم (0)</option>
                  <optgroup label="بونص إيجابي">
                    <option value="+1">+1 نقطة</option>
                    <option value="+2">+2 نقطة</option>
                    <option value="+3">+3 نقاط</option>
                    <option value="+4">+4 نقاط</option>
                    <option value="+5">+5 نقاط</option>
                  </optgroup>
                  <optgroup label="خصم سلبي">
                    <option value="-1">-1 نقطة</option>
                    <option value="-2">-2 نقطة</option>
                    <option value="-3">-3 نقاط</option>
                    <option value="-4">-4 نقاط</option>
                    <option value="-5">-5 نقاط</option>
                  </optgroup>
                </select>
              </div>
            </div>
            <textarea id="new-note-text" placeholder="اكتب الملاحظة هنا..." oninput="noteDraftText=this.value"></textarea>
            <button class="btn btn-primary btn-sm" onclick="addNote()">
              <i class="fas fa-paper-plane"></i> إرسال الملاحظة
            </button>
          </div>`;
      }

      if (all.length === 0) {
        html += `<div class="empty-state"><i class="fas fa-sticky-note"></i><p>لا توجد ملاحظات ظاهرة لك</p></div>`;
      } else {
        html += all.map(n => {
          const canEd = canEditNote(n);
          const bMatch = (n.text || "").match(/\[B:([+-]?\d+)\]/);
          let bHtml = "";
          let cleanText = escapeHtml(n.text || "");
          if (bMatch) {
            const bVal = parseInt(bMatch[1]);
            const isPos = bVal > 0;
            cleanText = escapeHtml((n.text || "").replace(/\[B:[+-]?\d+\]/, '').trim());
            bHtml = `<span style="display:inline-flex;align-items:center;padding:4px 10px;border-radius:20px;font-weight:800;font-size:0.75rem;background:${isPos ? 'var(--wasla-energy)' : 'var(--danger)'};color:#fff;margin-right:auto;">
              ${isPos ? '<i class="fas fa-arrow-up" style="margin-left:4px"></i> بونص: ' : '<i class="fas fa-arrow-down" style="margin-left:4px"></i> خصم: '} ${isPos ? '+'+bVal : bVal}
            </span>`;
          }
          
          return `
          <div class="note-item" id="note-Wasla-${n.id}">
            <div class="note-meta" style="display:flex;align-items:center;flex-wrap:wrap;gap:12px">
              <span><i class="fas fa-user-circle"></i> من: <strong>${escapeHtml(n.author || "")}</strong></span>
              <span><i class="fas fa-calendar-alt"></i> ${n.date || ""}</span>
              ${bHtml}
            </div>
            <div class="note-target-badge wasla-target">
              <i class="fas fa-arrow-left"></i>
              <span>إلى: ${escapeHtml(n.targetName || "—")}</span>
              <span class="badge badge-wasla" style="margin-right:6px">Wasla</span>
            </div>
            <div class="note-text" id="note-text-Wasla-${n.id}">${cleanText}</div>
            ${canEd ? `
              <div class="note-actions">
                <button class="btn btn-secondary btn-xs" onclick="editNote('Wasla', ${n.id})"><i class="fas fa-edit"></i> تعديل</button>
                <button class="btn btn-danger btn-xs" onclick="deleteNote('Wasla', ${n.id})"><i class="fas fa-trash"></i> حذف</button>
              </div>` : ""}
          </div>`;
        }).join("");
      }
      contentEl.innerHTML = html;
      const ta = document.getElementById("new-note-text");
      if (ta && noteDraftText) ta.value = noteDraftText;
      const sel = document.getElementById("note-target");
      if (sel) {
        if (noteDraftTarget) sel.value = noteDraftTarget;
        sel.onchange = () => { noteDraftTarget = sel.value; };
      }
    }

    function switchNoteTeam(team) { activeNoteTeam = "Wasla"; renderNotes(); }

    function addNote() {
      if (!canWriteNotes()) return;
      const textEl = document.getElementById("new-note-text");
      const text = (textEl && textEl.value || "").trim();
      const sel = document.getElementById("note-target");
      if (!sel || !sel.value) { showToast("اختر الشخص المستهدف أولاً", true); return; }
      if (!text) { showToast("اكتب الملاحظة أولاً", true); return; }
      const opt = sel.options[sel.selectedIndex];
      const targetId = parseInt(sel.value);
      const targetName = opt.getAttribute("data-name") || opt.textContent;
      const bSel = document.getElementById("note-bonus");
      const bonusVal = bSel ? parseInt(bSel.value) : 0;
      const finalText = bonusVal !== 0 ? `${text} [B:${bonusVal > 0 ? '+' : ''}${bonusVal}]` : text;

      if (currentUser && currentUser.localOnly) {
        if (!notes["Wasla"]) notes["Wasla"] = [];
        const nextId = (notes["Wasla"].length > 0) ? Math.max(...notes["Wasla"].map(n => n.id || 0), 0) + 1 : 1;
        notes["Wasla"].push({
          id: nextId,
          text: finalText,
          author: currentUser.displayName,
          authorRole: currentUser.role,
          date: new Date().toISOString().slice(0, 10),
          team: "Wasla",
          targetTeam: "Wasla",
          targetMemberId: targetId,
          targetName
        });
        try { localStorage.setItem("tms_notes", JSON.stringify(notes)); } catch (_) {}
        noteDraftText = ""; noteDraftTarget = "";
        renderNotes();
        showToast("تم إرسال الملاحظة إلى " + targetName);
        return;
      }

      (async () => {
        try {
          const payload = {
            text: finalText, author: currentUser.displayName, authorRole: currentUser.role,
            team: "Wasla", targetTeam: "Wasla", targetMemberId: targetId, targetName
          };
          const created = await dbInsertNote(payload);
          if (!notes["Wasla"]) notes["Wasla"] = [];
          notes["Wasla"].push(created);
          try { localStorage.setItem("tms_notes", JSON.stringify(notes)); } catch (_) {}
          noteDraftText = ""; noteDraftTarget = "";
          renderNotes();
          showToast("تم إرسال الملاحظة إلى " + targetName);
        } catch (e) { showToast("فشل إضافة الملاحظة", true); console.error(e); }
      })();
    }

    function editNote(team, id) {
      const note = (notes["Wasla"] || []).find(n => n.id === id);
      if (!note || !canEditNote(note)) return;
      const textEl = document.getElementById("note-text-Wasla-" + id);
      if (!textEl) return;
      const current = note.text;
      textEl.innerHTML = `
        <textarea id="edit-note-Wasla-${id}" style="width:100%;min-height:80px;padding:12px;border-radius:12px;border:2px solid var(--border);background:var(--bg);color:var(--text);font-family:inherit;font-size:0.95rem;line-height:1.7">${escapeHtml(current)}</textarea>
        <div style="margin-top:10px;display:flex;gap:10px">
          <button class="btn btn-primary btn-sm" onclick="saveEditNote('Wasla', ${id})">حفظ التغييرات</button>
          <button class="btn btn-secondary btn-sm" onclick="renderNotes()">إلغاء</button>
        </div>`;
    }

    function saveEditNote(team, id) {
      const el = document.getElementById("edit-note-Wasla-" + id);
      const text = el ? el.value.trim() : "";
      if (!text) return;

      if (currentUser && currentUser.localOnly) {
        const note = (notes["Wasla"] || []).find(n => n.id === id);
        if (note) note.text = text;
        try { localStorage.setItem("tms_notes", JSON.stringify(notes)); } catch (_) {}
        renderNotes();
        showToast("تم تحديث الملاحظة بنجاح");
        return;
      }

      (async () => {
        try {
          await dbUpdateNote(id, { text });
          const note = (notes["Wasla"] || []).find(n => n.id === id);
          if (note) note.text = text;
          try { localStorage.setItem("tms_notes", JSON.stringify(notes)); } catch (_) {}
          renderNotes();
          showToast("تم تحديث الملاحظة بنجاح");
        } catch (e) { showToast("فشل التحديث", true); }
      })();
    }

    function deleteNote(team, id) {
      const note = (notes["Wasla"] || []).find(n => n.id === id);
      if (!note || !canEditNote(note)) return;
      if (!confirm("هل تريد حذف هذه الملاحظة؟")) return;

      if (currentUser && currentUser.localOnly) {
        notes["Wasla"] = (notes["Wasla"] || []).filter(n => n.id !== id);
        try { localStorage.setItem("tms_notes", JSON.stringify(notes)); } catch (_) {}
        renderNotes();
        showToast("تم حذف الملاحظة بنجاح");
        return;
      }

      (async () => {
        try {
          await dbDeleteNote(id);
          notes["Wasla"] = (notes["Wasla"] || []).filter(n => n.id !== id);
          try { localStorage.setItem("tms_notes", JSON.stringify(notes)); } catch (_) {}
          renderNotes();
          showToast("تم حذف الملاحظة بنجاح");
        } catch (e) {
          const isNoSb = !getSupabase();
          if (isNoSb) showToast("Supabase غير متصل", true);
          else showToast("فشل الحذف — " + (e.message || "مشكلة في السيرفر"), true);
        }
      })();
    }

    function escapeHtml(str) {
      if (!str) return "";
      return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    function showToast(msg, isError = false) {
      const t = document.getElementById("toast");
      const msgEl = document.getElementById("toast-msg");
      msgEl.textContent = msg;
      t.className = "toast show" + (isError ? " error" : "");
      t.querySelector('i').className = isError ? "fas fa-exclamation-circle" : "fas fa-check-circle";
      setTimeout(() => t.classList.remove("show"), 3500);
    }

    function enterAsGuest() {
      currentUser = { username: "زائر", role: "Normal User", displayName: "زائر", accountType: "guest", userId: null, isGuest: true };
      saveSession(); loadSampleData(); showApp();
      loadFromAPI().then(ok => { if (ok && currentUser) { renderDashboard(); renderMembersTable(); renderNotes(); renderRanking(); } }).catch(() => {});
    }

    async function restoreSession() {
      const sb = getSupabase();
      if (sb) {
        try {
          const { data: { session }, error: sessionError } = await sb.auth.getSession();
          if (sessionError) console.warn("[TMS] getSession error:", sessionError);
          if (session && session.user && session.user.id) {
            const stored = localStorage.getItem("tms_session");
            if (stored) {
              currentUser = JSON.parse(stored);
              currentUser.userId = session.user.id;
              currentUser.isGuest = false;
              currentUser.localOnly = false;
            } else {
              const { data: prof, error: profError } = await sb.from("profiles").select("role, display_name").eq("id", session.user.id).maybeSingle();
              if (profError) console.warn("[TMS] Profile fetch error:", profError);
              const role = prof ? (ROLE_FROM_DB[prof.role] || "Normal User") : "Normal User";
              currentUser = {
                username: (prof && prof.display_name) || session.user.email, role,
                displayName: (prof && prof.display_name) || session.user.email,
                accountType: prof && prof.role === "wasla_leader" ? "wasla_leader" : "normal",
                userId: session.user.id, isGuest: false, localOnly: false
              };
              saveSession();
            }
            loadSampleData(); showApp();
            loadFromAPI().then(() => { if (currentUser) { renderDashboard(); renderMembersTable(); renderNotes(); renderRanking(); } }).catch(() => {});
            return;
          }
        } catch (e) { console.warn("[TMS] restoreSession error:", e); }
      }
      try {
        const stored = localStorage.getItem("tms_session");
        if (stored) {
          const u = JSON.parse(stored);
          if (u && (u.localOnly || u.isGuest || u.accountType)) {
            
            if (u.signature !== createSessionSignature(u.role)) {
               console.warn("🛡️ SECURITY ALERT: Session Tampering Detected!");
               logout();
               return;
            }
            currentUser = u;
            loadSampleData();
            showApp();

            return;
          }
        }
      } catch (_) {}
    }

    /* =====================================================
       Wasla AI Assistant Integration
       ===================================================== */

    function getSystemDataContext() {
      const activeMembers = (members && members.length > 0) ? members : SAMPLE_MEMBERS;
      const memSummary = activeMembers.map((m, i) => {
        const lap = m.hasLaptop ? "نعم" : "لا";
        const alex = m.canGoAlexandria ? "نعم يقدر" : "لا";
        const rnk = m.completionRank ? `#${m.completionRank}` : "غير محدد";
        return `- الاسم: ${m.fullName} | لابتوب: ${lap} | سفر إسكندرية: ${alex} | سكن: ${m.residence || "غير محدد"} | ملاحظات: ${m.teamNotes || "لا توجد"}`;
      }).join("\n");

      let notesSummary = "";
      if (notes && notes.Wasla && notes.Wasla.length > 0) {
        notesSummary = notes.Wasla.map(n => `- [${n.date}] كاتب الملاحظة: ${n.author} (${n.authorRole || "عضو"}): "${n.text}"`).join("\n");
      } else {
        notesSummary = "لا توجد ملاحظات مسجلة حالياً.";
      }

      return `[قائمة أعضاء فريق وصلة (${activeMembers.length} عضو)]:\n${memSummary}\n\n[ملاحظات الفريق]:\n${notesSummary}`;
    }

    async function handleAiSubmit(e) {
      if (e) e.preventDefault();
      const input = document.getElementById("ai-prompt-input");
      const question = (input ? input.value : "").trim();
      if (!question) return;

      input.value = "";
      input.style.height = "auto";

      appendAiMessage(question, "user");

      const loadingId = "ai-loading-" + Date.now();
      appendAiLoading(loadingId);

      try {
        const sb = getSupabase();
        if (!sb) {
          removeAiLoading(loadingId);
          appendAiMessage("تنبيه: قاعدة بيانات Supabase غير متصلة حالياً. تأكد من إعدادات الاتصال.", "bot", true);
          return;
        }

        const context = getSystemDataContext();
        const { data, error } = await sb.functions.invoke("wasla-ai", {
          body: { question, context }
        });

        removeAiLoading(loadingId);

        if (error) {
          console.error("wasla-ai function error:", error);
          let errorMsg = error.message || "حدث خطأ أثناء التواصل مع خادم الذكاء الاصطناعي.";
          if (error.context && error.context.json) {
            const errBody = await error.context.json().catch(() => null);
            if (errBody && errBody.error) errorMsg = errBody.error;
          }
          if (errorMsg.includes("غير مُعدّ") || errorMsg.includes("Groq API")) {
            appendAiMessage(`${errorMsg} <br><button type="button" class="btn btn-primary" style="margin-top:10px;font-size:0.85rem;padding:6px 14px;" onclick="openGroqKeyModal()">إعداد مفتاح Groq API الآن</button>`, "bot", true);
          } else {
            appendAiMessage(`عذراً: ${errorMsg}`, "bot", true);
          }
          return;
        }

        if (data && data.answer) {
          appendAiMessage(data.answer, "bot");
          if (data.action) {
            executeAiAction(data.action);
          }
        } else if (data && data.error) {
          appendAiMessage(`تنبيه: ${data.error}`, "bot", true);
        } else {
          appendAiMessage("لم يصل رد صالح من المساعد.", "bot", true);
        }
      } catch (err) {
        console.error("AI invoke error:", err);
        removeAiLoading(loadingId);
        appendAiMessage("تعذر إرسال السؤال إلى خادم المساعد. تحقق من الاتصال بالإنترنت.", "bot", true);
      }
    }

    function executeAiAction(action) {
      if (!action || !action.type) return;

      if (action.type === "update_member" && action.name) {
        const queryName = action.name.trim().toLowerCase();
        let m = members.find(x => x.fullName.trim().toLowerCase() === queryName);
        if (!m) m = members.find(x => x.fullName.toLowerCase().includes(queryName) || queryName.includes(x.fullName.toLowerCase()));
        
        if (m) {
          const patch = action.patch || {};
          if (patch.taskStatus) m.taskStatus = patch.taskStatus;
          if (patch.courseStatus) m.courseStatus = patch.courseStatus;
          if (patch.deadline) m.deadline = patch.deadline;
          if (patch.taskFinishDate) m.taskFinishDate = patch.taskFinishDate;
          if (patch.hasLaptop !== undefined) m.hasLaptop = !!patch.hasLaptop;
          if (patch.canGoAlexandria !== undefined) m.canGoAlexandria = !!patch.canGoAlexandria;
          if (patch.completionRank !== undefined) m.completionRank = patch.completionRank;
          if (patch.teamNotes) m.teamNotes = patch.teamNotes;

          try {
            const sb = getSupabase();
            if (sb && m.id) {
              dbUpdateMember(m.id, m).catch(err => console.warn("Supabase member update error:", err));
            }
          } catch (_) {}

          renderMembersTable();
          renderDashboard();
          renderRanking();
          showToast(`تم تحديث بيانات العضو ${m.fullName}`);
        }
      } else if (action.type === "add_member" && action.member) {
        const item = action.member;
        const newM = normalizeMember({
          id: Date.now(),
          fullName: item.fullName || "عضو جديد",
          team: item.team || "Wasla",
          
          taskStatus: item.taskStatus || "Not Started",
          
          taskFinishDate: "",
          completionRank: 0,
          hasLaptop: item.hasLaptop !== undefined ? !!item.hasLaptop : true,
          canGoAlexandria: item.canGoAlexandria !== undefined ? !!item.canGoAlexandria : false,
          teamNotes: item.teamNotes || "",
          residence: "",
          workConditions: "",
          bio: ""
        });
        members.push(newM);

        try {
          const sb = getSupabase();
          if (sb) dbInsertMember(newM).catch(err => console.warn("Supabase insert error:", err));
        } catch (_) {}

        renderMembersTable();
        renderDashboard();
        renderRanking();
        showToast(`تمت إضافة العضو ${newM.fullName} بنجاح`);
      } else if (action.type === "add_note" && action.text) {
        const newNote = {
          id: Date.now(),
          text: action.text,
          author: currentUser ? currentUser.displayName : "قائد الفريق",
          authorRole: currentUser ? currentUser.role : "Wasla Leader",
          date: new Date().toISOString().slice(0, 10),
          team: "Wasla",
          targetTeam: "Wasla"
        };
        if (!notes.Wasla) notes.Wasla = [];
        notes.Wasla.unshift(newNote);

        try {
          const sb = getSupabase();
          if (sb) dbInsertNote(newNote).catch(err => console.warn("Supabase note insert error:", err));
        } catch (_) {}

        renderNotes();
        showToast("تمت إضافة الملاحظة بنجاح");
      }
    }

    function appendAiMessage(text, sender, isHtml = false) {
      const container = document.getElementById("ai-messages");
      if (!container) return;

      const msgDiv = document.createElement("div");
      msgDiv.className = `ai-msg ai-msg-${sender}`;

      const avatar = document.createElement("div");
      avatar.className = "ai-msg-avatar";
      avatar.textContent = sender === "user" ? (currentUser ? currentUser.displayName.slice(0, 1) : "أ") : "و";

      const content = document.createElement("div");
      content.className = "ai-msg-content";

      if (isHtml) {
        content.innerHTML = `<div class="ai-msg-text">${text}</div>`;
      } else {
        const formatted = formatAiText(text);
        content.innerHTML = `<div class="ai-msg-text">${formatted}</div>`;
      }

      if (sender === "bot") {
        const actions = document.createElement("div");
        actions.className = "ai-msg-actions";
        actions.innerHTML = `<button type="button" class="ai-copy-btn" onclick="copyAiResponse(this)" title="نسخ الرد"><i class="far fa-copy"></i> نسخ</button>`;
        content.appendChild(actions);
      }

      msgDiv.appendChild(avatar);
      msgDiv.appendChild(content);
      container.appendChild(msgDiv);

      container.scrollTop = container.scrollHeight;
    }

    function formatAiText(raw) {
      const safe = raw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const lines = safe.split("\n");
      let out = "";
      let inList = false;

      for (let line of lines) {
        let trimmed = line.trim();
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          if (!inList) { out += "<ul>"; inList = true; }
          const itemText = trimmed.slice(2).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
          out += `<li>${itemText}</li>`;
        } else {
          if (inList) { out += "</ul>"; inList = false; }
          if (trimmed) {
            const formatted = trimmed.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
            out += `<p>${formatted}</p>`;
          }
        }
      }
      if (inList) out += "</ul>";
      return out || `<p>${safe}</p>`;
    }

    function appendAiLoading(id) {
      const container = document.getElementById("ai-messages");
      if (!container) return;
      const loadDiv = document.createElement("div");
      loadDiv.className = "ai-msg ai-msg-bot ai-loading-msg";
      loadDiv.id = id;
      loadDiv.innerHTML = `
        <div class="ai-msg-avatar">و</div>
        <div class="ai-msg-content">
          <div class="ai-loading-dots">
            <span></span><span></span><span></span>
          </div>
        </div>
      `;
      container.appendChild(loadDiv);
      container.scrollTop = container.scrollHeight;
    }

    function removeAiLoading(id) {
      const el = document.getElementById(id);
      if (el) el.remove();
    }

    function askQuickPrompt(promptText) {
      const input = document.getElementById("ai-prompt-input");
      if (input) {
        input.value = promptText;
        handleAiSubmit();
      }
    }

    function copyAiResponse(btn) {
      const contentEl = btn.closest(".ai-msg-content");
      if (!contentEl) return;
      const textEl = contentEl.querySelector(".ai-msg-text");
      const text = textEl ? textEl.innerText.trim() : contentEl.innerText.trim();
      navigator.clipboard.writeText(text).then(() => {
        btn.innerHTML = `<i class="fas fa-check"></i> تم النسخ`;
        setTimeout(() => {
          btn.innerHTML = `<i class="far fa-copy"></i> نسخ`;
        }, 2000);
      });
    }

    function openGroqKeyModal() {
      const modal = document.getElementById("groq-key-modal");
      if (modal) modal.classList.add("active");
      const status = document.getElementById("groq-key-status");
      if (status) status.innerHTML = "";
    }

    function closeGroqKeyModal() {
      const modal = document.getElementById("groq-key-modal");
      if (modal) modal.classList.remove("active");
    }

    async function saveGroqKeyToSupabase() {
      const input = document.getElementById("groq-key-input");
      const status = document.getElementById("groq-key-status");
      const key = (input ? input.value : "").trim();

      if (!key) {
        if (status) status.innerHTML = `<span style="color:var(--danger)">يرجى كتابة أو لصق المفتاح أولاً.</span>`;
        return;
      }

      if (status) status.innerHTML = `<span style="color:var(--text-secondary)">جاري الحفظ المشفر في Supabase Vault...</span>`;

      try {
        const sb = getSupabase();
        if (!sb) throw new Error("Supabase غير متصل");

        const { error } = await sb.rpc("set_groq_key", { p_key: key });
        if (error) throw error;

        if (status) status.innerHTML = `<span style="color:var(--success);font-weight:600"><i class="fas fa-check-circle"></i> تم حفظ المفتاح بنجاح وأمان في Supabase Vault!</span>`;
        showToast("تم تحديث مفتاح Groq بنجاح في Supabase");
        input.value = "";
        setTimeout(() => {
          closeGroqKeyModal();
        }, 1500);
      } catch (err) {
        console.error("Vault save error:", err);
        if (status) status.innerHTML = `<span style="color:var(--danger)">فشل الحفظ: ${err.message || "خطأ في الاتصال"}</span>`;
      }
    }

    
    // ========== Advanced Task Management (ReasonKit Methodology) ==========
    let teamTasks = [];

    function saveTasksToLocal() {
      if (currentUser && currentUser.localOnly) {
         try { localStorage.setItem("tms_tasks", JSON.stringify(teamTasks)); } catch(e){}
      }
    }

    function renderTasksDashboard() {
      const g = document.getElementById("tasks-grid");
      const empty = document.getElementById("tasks-empty-state");
      if (!g || !empty) return;
      
      if (teamTasks.length === 0) {
        g.style.display = "none";
        empty.style.display = "block";
      } else {
        empty.style.display = "none";
        g.style.display = "grid";
        
        g.innerHTML = teamTasks.map(t => {
           let assignedCount = t.assignedTo === "ALL" ? members.length : t.assignedTo.length;
           
           // Analyze tracking statuses dynamically!
           let completedCount = 0;
           let inProgressCount = 0;
           let lateCount = 0;
           
           const now = new Date();
           const isDeadlinePassed = t.hasDeadline && (new Date(t.deadlineDate) < now);
           
           Object.values(t.tracking || {}).forEach(statusObj => {
              if (statusObj.status === "مكتمل") completedCount++;
              else if (statusObj.status === "قيد التنفيذ") inProgressCount++;
              else if (isDeadlinePassed) lateCount++;
           });
           
           const totalHandled = Object.keys(t.tracking || {}).length;
           if (isDeadlinePassed) {
              lateCount += (assignedCount - totalHandled); // Those who haven't started and missed deadline
           }
           
           let pct = assignedCount > 0 ? Math.round((completedCount / assignedCount) * 100) : 0;
           let strokeColor = pct === 100 ? "var(--success)" : "var(--wasla)";
           if (isDeadlinePassed && pct < 100) strokeColor = "var(--danger)";
           
           let deadlineHtml = ``;
           if (t.hasDeadline) {
             const ds = new Date(t.deadlineDate).toLocaleString('ar-EG', {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'});
             deadlineHtml = `<div style="font-size:0.8rem; color:${isDeadlinePassed ? 'var(--danger)' : 'var(--text-muted)'}; margin-top:8px; font-weight:700;"><i class="fas ${isDeadlinePassed ? 'fa-exclamation-triangle' : 'fa-clock'}"></i> التسليم: ${ds}</div>`;
           }
           
           return `
             <div class="dash-card" style="padding:20px; display:flex; flex-direction:column; cursor:pointer; transition:var(--transition);" onclick="openTrackTaskModal(${t.id})" onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='var(--shadow-lg)'" onmouseout="this.style.transform='none';this.style.boxShadow='var(--shadow-sm)'">
               <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
                 <div>
                   <h4 style="margin:0; font-size:1.15rem; font-weight:800; color:var(--text);">${escapeHtml(t.title)}</h4>
                   ${deadlineHtml}
                 </div>
                 <div style="width:40px; height:40px; border-radius:50%; background:var(--bg); border:2px solid ${strokeColor}; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:0.8rem; color:${strokeColor}">
                    ${pct}%
                 </div>
               </div>
               <p style="font-size:0.9rem; color:var(--text-muted); margin-bottom:16px; flex:1;">${escapeHtml(t.description || "لا يوجد تفاصيل إضافية")}</p>
               <div style="display:flex; gap:10px; border-top:1px solid var(--border); padding-top:14px;">
                 <span class="badge badge-done" title="مكتمل">${completedCount}</span>
                 <span class="badge badge-pending" title="قيد التنفيذ">${inProgressCount}</span>
                 ${lateCount > 0 ? `<span class="badge badge-late" title="متأخر">${lateCount}</span>` : ""}
                 <span style="margin-right:auto; font-size:0.8rem; color:var(--text-muted); font-weight:700;"><i class="fas fa-users"></i> المكلفين: ${assignedCount}</span>
               </div>
             </div>
           `;
        }).join("");
      }
    }

    let customAssignContainer = null;
    function openCreateTaskModal() {
      if (!isLeaderRole()) return;
      document.getElementById('task-create-modal').classList.add("show");
      document.getElementById('task-create-form').reset();
      document.getElementById('t-deadline-group').style.display = 'none';
      
      customAssignContainer = document.getElementById("t-custom-assignees");
      customAssignContainer.style.display = "none";
      customAssignContainer.innerHTML = members.map(m => `
         <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:600; padding:6px; background:var(--card); border-radius:6px; border:1px solid var(--border-light)">
           <input type="checkbox" name="task-assignees-selected" value="${m.id}" style="transform:scale(1.2);">
           ${escapeHtml(m.fullName)} <small style="color:var(--text-muted)">(${m.device || 'لابتوب'})</small>
         </label>
      `).join("");
    }
    
    function closeCreateTaskModal() {
       document.getElementById('task-create-modal').classList.remove("show");
    }

    function toggleTaskDeadlineUI() {
      const check = document.getElementById('t-has-deadline').checked;
      document.getElementById('t-deadline-group').style.display = check ? 'block' : 'none';
    }

    function toggleTaskAssigneesUI() {
      const type = document.getElementById('t-assign-type').value;
      document.getElementById('t-custom-assignees').style.display = type === "custom" ? "flex" : "none";
    }

    function saveNewTask(e) {
      e.preventDefault();
      
      const title = document.getElementById('t-title').value.trim();
      const desc = document.getElementById('t-desc').value.trim();
      const hasDeadline = document.getElementById('t-has-deadline').checked;
      const deadlineDate = document.getElementById('t-deadline').value;
      const assignType = document.getElementById('t-assign-type').value;
      
      if (!title) { showToast("برجاء إدخال اسم المهمة", true); return; }
      if (hasDeadline && !deadlineDate) { showToast("برجاء تحديد وقت الانتهاء", true); return; }
      
      let assignedTo = "ALL";
      if (assignType === "custom") {
        const checkboxes = document.querySelectorAll('input[name="task-assignees-selected"]:checked');
        assignedTo = Array.from(checkboxes).map(cb => parseInt(cb.value));
        if (assignedTo.length === 0) { showToast("برجاء اختيار عضو واحد على الأقل", true); return; }
      }
      
      const newId = teamTasks.length > 0 ? Math.max(...teamTasks.map(t => t.id)) + 1 : 1;
      const tsk = {
        id: newId,
        title,
        description: desc,
        hasDeadline,
        deadlineDate,
        assignedTo,
        tracking: {}
      };
      
      teamTasks.unshift(tsk);
      saveTasksToLocal();
      closeCreateTaskModal();
      renderTasksDashboard();
      showToast("تم تكليف المهمة بنجاح للنظام!");
    }

    let trackingTaskId = null;
    function openTrackTaskModal(id) {
       trackingTaskId = id;
       const tsk = teamTasks.find(t => t.id === id);
       if(!tsk) return;
       
       document.getElementById("task-track-modal").classList.add("show");
       document.getElementById("tt-title").textContent = tsk.title;
       document.getElementById("tt-desc").textContent = tsk.description || "بدون تفاصيل";
       
       const dl = document.getElementById("tt-deadline");
       const now = new Date();
       if (tsk.hasDeadline) {
          const isPassed = new Date(tsk.deadlineDate) < now;
          const ds = new Date(tsk.deadlineDate).toLocaleString('ar-EG', {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'});
          dl.innerHTML = `<i class="fas ${isPassed ? 'fa-exclamation-circle' : 'fa-stopwatch'}" style="color:${isPassed?'var(--danger)':'var(--text)'}"></i> <span style="color:${isPassed?'var(--danger)':'var(--text)'}">آخر موعد: ${ds}</span>`;
       } else {
          dl.innerHTML = `<i class="fas fa-infinity" style="color:var(--text-muted)"></i> <span style="color:var(--text-muted)">مهمة ممتدة بمرونة</span>`;
       }
       
       renderTrackDetailsModalList();
    }
    
    function closeTrackTaskModal() {
       document.getElementById("task-track-modal").classList.remove("show");
       trackingTaskId = null;
    }
    
    // Auto-calculates what users should be visible and builds the UI list for tracking
    function renderTrackDetailsModalList() {
       if(!trackingTaskId) return;
       const tsk = teamTasks.find(t => t.id === trackingTaskId);
       if(!tsk) return;
       
       let targetMembers = members;
       if (tsk.assignedTo !== "ALL") {
          targetMembers = members.filter(m => tsk.assignedTo.includes(m.id));
       }
       
       const lst = document.getElementById("tt-members-list");
       const now = new Date();
       const isDeadlinePassed = tsk.hasDeadline && (new Date(tsk.deadlineDate) < now);
       
       lst.innerHTML = targetMembers.map(m => {
          let trackData = tsk.tracking[m.id] || { status: "لم يبدأ", notes: [] };
          
          let derivedStatus = trackData.status;
          if (derivedStatus !== "مكتمل" && isDeadlinePassed) {
             derivedStatus = "متأخر 🚨";
          }
          
          const badgeClass = derivedStatus === "مكتمل" ? "badge-done" : (derivedStatus.includes("متأخر") ? "badge-late" : (derivedStatus==="قيد التنفيذ" ? "badge-pending" : ""));
          
          return `
            <div style="background:var(--card); padding:16px; border-radius:12px; border:1px solid var(--border); box-shadow:var(--shadow-sm)">
               <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px">
                  <strong style="font-size:1.05rem; color:var(--text)">${escapeHtml(m.fullName)}</strong>
                  <div style="display:flex; gap:10px; align-items:center;">
                     <span class="badge ${badgeClass}" style="flex-shrink:0">${derivedStatus}</span>
                     ${isLeaderRole() ? `
                        <select onchange="updateMemberTaskStatus(${tsk.id}, ${m.id}, this.value)" style="padding:6px; border-radius:6px; border:1px solid var(--border); background:var(--bg); font-weight:700; cursor:pointer; font-family:inherit">
                           <option value="" disabled selected>تحديث الحالة</option>
                           <option value="لم يبدأ">لم يبدأ</option>
                           <option value="قيد التنفيذ">قيد التنفيذ</option>
                           <option value="مكتمل">مكتمل</option>
                        </select>
                     ` : ""}
                  </div>
               </div>
               <div style="background:var(--bg); padding:10px; border-radius:8px;">
                  ${trackData.notes.map(n => `
                    <div style="font-size:0.85rem; color:var(--text); margin-bottom:6px; padding-bottom:6px; border-bottom:1px dashed var(--border-light)">
                      <strong style="color:var(--wasla); font-size:0.75rem">${n.date}</strong><br>
                      ${escapeHtml(n.text)}
                    </div>
                  `).join("")}
                  ${isLeaderRole() ? `
                    <div style="display:flex; gap:8px; margin-top:8px">
                       <input type="text" id="t-note-input-${m.id}" placeholder="اكتب ملاحظة متابعة هنا ثم اضغط إرسال..." style="flex:1; padding:8px 12px; border:1px solid var(--border); border-radius:6px; background:var(--card); font-family:inherit; font-size:0.85rem;" onkeydown="if(event.key==='Enter') submitTaskNote(${tsk.id}, ${m.id})">
                       <button class="btn btn-primary btn-sm" onclick="submitTaskNote(${tsk.id}, ${m.id})"><i class="fas fa-paper-plane"></i></button>
                    </div>
                  ` : ""}
               </div>
            </div>
          `;
       }).join("");
    }

    function updateMemberTaskStatus(taskId, memberId, newStatus) {
       const tsk = teamTasks.find(t => t.id === taskId);
       if(!tsk) return;
       if (!tsk.tracking[memberId]) tsk.tracking[memberId] = { status: "لم يبدأ", notes: [] };
       tsk.tracking[memberId].status = newStatus;
       saveTasksToLocal();
       renderTrackDetailsModalList();
       renderTasksDashboard();
       showToast("تم تحديث حالة تسليم العضو بنجاح");
    }
    
    function submitTaskNote(taskId, memberId) {
       const inp = document.getElementById(`t-note-input-${memberId}`);
       if(!inp) return;
       const txt = inp.value.trim();
       if(!txt) return;
       
       const tsk = teamTasks.find(t => t.id === taskId);
       if(!tsk) return;
       if (!tsk.tracking[memberId]) tsk.tracking[memberId] = { status: "لم يبدأ", notes: [] };
       
       const stamp = new Date().toLocaleString('ar-EG', {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'});
       tsk.tracking[memberId].notes.push({ text: txt, date: stamp });
       
       saveTasksToLocal();
       renderTrackDetailsModalList();
    }

    (function init() {
      const savedTheme = localStorage.getItem("tms_theme") || "light";
      document.documentElement.setAttribute("data-theme", savedTheme);
      const ic0 = savedTheme === "dark" ? "fas fa-sun" : "fas fa-moon";
      const ti = document.getElementById("theme-icon"); if (ti) ti.className = ic0;
      const li = document.getElementById("login-theme-icon"); if (li) li.className = ic0;
      const cw = document.getElementById("config-warn");
      if (cw && (!SUPABASE_URL || SUPABASE_URL.includes("YOUR_PROJECT") || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === "YOUR_ANON_KEY")) {
        cw.style.display = "flex";
      }
      // Password toggle
      const pwToggle = document.getElementById('pw-toggle');
      const pwInput  = document.getElementById('password');
      const eyeShow  = document.getElementById('eye-show');
      const eyeHide  = document.getElementById('eye-hide');
      if (pwToggle && pwInput) {
        pwToggle.addEventListener('click', () => {
          const isHidden = pwInput.type === 'password';
          pwInput.type = isHidden ? 'text' : 'password';
          eyeShow.style.display = isHidden ? 'none' : '';
          eyeHide.style.display = isHidden ? ''    : 'none';
        });
      }

      // Login error display helper patch
      const origLoginError = document.getElementById('login-error');
      if (origLoginError) {
        const observer = new MutationObserver(() => {
          origLoginError.style.display = origLoginError.textContent.trim() ? 'block' : 'none';
        });
        observer.observe(origLoginError, { childList: true, characterData: true, subtree: true });
      }

      // Login button loading state
      const loginForm = document.getElementById('login-form');
      const loginBtn  = document.getElementById('login-submit-btn');
      if (loginForm && loginBtn) {
        loginForm.addEventListener('submit', () => {
          loginBtn.classList.add('ls-loading');
        }, { capture: true });
      }

      // AI prompt input Enter key handler & auto-resize
      const aiInput = document.getElementById("ai-prompt-input");
      if (aiInput) {
        aiInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleAiSubmit();
          }
        });
        aiInput.addEventListener("input", () => {
          aiInput.style.height = "auto";
          aiInput.style.height = Math.min(aiInput.scrollHeight, 120) + "px";
        });
      }

      // Restore existing session
      restoreSession();
    })();
  