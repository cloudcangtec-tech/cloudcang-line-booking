const BASE_STYLE = `
<style>
  :root { --ink:#16181c; --ink-soft:#55585f; --line:#e4e4e0; --accent:#1f6f5c; --bg-alt:#f6f6f4; --sidebar-w:220px; }
  * { box-sizing: border-box; }
  body { margin:0; font-family:"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif; background:#fafafa; color:var(--ink); }
  a { color:inherit; }
  h1 { font-size:1.35rem; margin:0 0 1.5rem; }
  table { width:100%; border-collapse:collapse; font-size:0.9rem; background:#fff; }
  th, td { text-align:left; padding:0.7rem 0.6rem; border-bottom:1px solid var(--line); }
  th { color:var(--ink-soft); font-weight:600; font-size:0.76rem; text-transform:uppercase; letter-spacing:0.04em; }
  .btn { background:var(--ink); color:#fff; border:none; padding:0.65rem 1.3rem; cursor:pointer; font-size:0.88rem; border-radius:4px; text-decoration:none; display:inline-block; }
  .btn-outline { background:#fff; color:var(--ink); border:1px solid var(--line); padding:0.55rem 1.1rem; cursor:pointer; font-size:0.85rem; border-radius:4px; text-decoration:none; display:inline-block; }
  .error { color:#b3261e; font-size:0.85rem; margin-bottom:1rem; }
  .empty { color:var(--ink-soft); padding:2rem 0; }

  /* login */
  form.login { max-width:360px; margin:4rem auto; padding:2rem; border:1px solid var(--line); background:#fff; border-radius:8px; }
  form.login input { width:100%; padding:0.75rem; margin-bottom:1rem; border:1px solid var(--line); font-size:0.95rem; border-radius:4px; }
  form.login button { width:100%; }

  /* layout */
  .layout { display:flex; min-height:100vh; }
  .sidebar { width:var(--sidebar-w); flex-shrink:0; background:#fff; border-right:1px solid var(--line); display:flex; flex-direction:column; padding:1.5rem 1rem; }
  .sidebar-logo { font-weight:700; font-size:1rem; padding:0 0.6rem 1.5rem; }
  .sidebar-logo span { color:var(--accent); }
  .sidebar-nav { display:flex; flex-direction:column; gap:0.15rem; flex:1; }
  .sidebar-nav a { display:flex; align-items:center; gap:0.6rem; padding:0.6rem 0.7rem; border-radius:6px; text-decoration:none; color:var(--ink-soft); font-size:0.9rem; }
  .sidebar-nav a:hover { background:var(--bg-alt); color:var(--ink); }
  .sidebar-nav a.active { background:var(--ink); color:#fff; }
  .sidebar-divider { border:none; border-top:1px solid var(--line); margin:0.75rem 0.6rem; }
  .sidebar-user { display:flex; align-items:center; justify-content:space-between; padding:0.7rem 0.6rem 0; border-top:1px solid var(--line); margin-top:0.5rem; }
  .sidebar-user span { font-size:0.85rem; color:var(--ink-soft); }
  .sidebar-user button { background:none; border:none; color:var(--ink-soft); font-size:0.8rem; cursor:pointer; text-decoration:underline; padding:0; }
  .content { flex:1; padding:2.25rem 2.5rem; max-width:1180px; }

  /* dashboard */
  .stat-grid { display:grid; grid-template-columns:repeat(4, 1fr); gap:1rem; margin-bottom:2rem; }
  .stat-card { background:#fff; border:1px solid var(--line); border-radius:8px; padding:1.25rem 1.4rem; }
  .stat-card .num { font-size:1.9rem; font-weight:700; line-height:1.2; }
  .stat-card .label { font-size:0.8rem; color:var(--ink-soft); margin-top:0.3rem; }
  .stat-card.warn .num { color:#8a6d00; }
  .dash-grid { display:grid; grid-template-columns:2fr 1fr; gap:1.5rem; align-items:start; }
  .panel { background:#fff; border:1px solid var(--line); border-radius:8px; padding:1.5rem; }
  .panel h2 { font-size:1rem; margin:0 0 1rem; }
  .today-row { display:flex; align-items:center; gap:0.9rem; padding:0.7rem 0; border-bottom:1px solid var(--line); font-size:0.9rem; }
  .today-row:last-child { border-bottom:none; }
  .today-row .time { font-weight:700; width:52px; flex-shrink:0; }
  .today-row .name { flex:1; }
  .quick-actions { display:flex; flex-direction:column; gap:0.6rem; }
  .quick-actions a, .quick-actions button { text-align:left; }
  .pending-row { display:flex; align-items:center; gap:0.9rem; padding:0.8rem 0; border-bottom:1px solid var(--line); font-size:0.9rem; flex-wrap:wrap; }
  .pending-row:last-child { border-bottom:none; }
  .pending-row .meta { flex:1; min-width:200px; }
  .greeting { font-size:1.5rem; font-weight:700; margin-bottom:0.2rem; }
  .greeting-date { color:var(--ink-soft); font-size:0.9rem; margin-bottom:1.75rem; }

  /* badges */
  .badge { display:inline-flex; align-items:center; gap:0.35rem; font-size:0.82rem; white-space:nowrap; }

  /* bookings filters */
  .filter-bar { display:flex; align-items:center; gap:1rem; flex-wrap:wrap; margin-bottom:1.5rem; }
  .tab-group { display:flex; gap:0.3rem; background:var(--bg-alt); padding:0.25rem; border-radius:6px; }
  .tab-group a { padding:0.4rem 0.9rem; font-size:0.85rem; text-decoration:none; color:var(--ink-soft); border-radius:4px; }
  .tab-group a.active { background:#fff; color:var(--ink); box-shadow:0 1px 2px rgba(0,0,0,0.08); }
  .search-box { padding:0.5rem 0.8rem; border:1px solid var(--line); border-radius:6px; font-size:0.85rem; min-width:200px; }
  .status-select-quick { padding:0.4rem 0.5rem; border:1px solid var(--line); border-radius:4px; font-size:0.82rem; }
  .confirm-btn { background:var(--accent); color:#fff; border:none; padding:0.4rem 0.9rem; border-radius:4px; font-size:0.82rem; cursor:pointer; }

  /* slots / calendar */
  .cal-nav { display:flex; align-items:center; justify-content:space-between; margin-bottom:1rem; }
  .cal-nav h2 { margin:0; font-size:1.1rem; }
  .cal-nav a { text-decoration:none; color:var(--ink-soft); font-size:1.1rem; padding:0.2rem 0.6rem; }
  .calendar { width:100%; border-collapse:collapse; background:#fff; border:1px solid var(--line); border-radius:8px; overflow:hidden; margin-bottom:1.5rem; table-layout:fixed; }
  .calendar th { text-align:center; padding:0.5rem; font-size:0.75rem; background:var(--bg-alt); }
  .calendar td { height:70px; vertical-align:top; padding:0; border:1px solid var(--line); font-size:0.8rem; }
  .calendar td.empty-cell { background:#fafafa; }
  .calendar td a.day-link { display:block; width:100%; height:100%; padding:0.35rem; text-decoration:none; color:var(--ink); font-weight:600; box-sizing:border-box; }
  .calendar td a.day-link:hover { background:var(--bg-alt); }
  .calendar td.selected { background:#eef6f3; }
  .calendar td.selected a.day-link:hover { background:#e3efe9; }
  .calendar td.closed-day { background:#fdeeee; }
  .calendar td.closed-day.selected { background:#fbdede; }
  .calendar td.today .day-link { color:var(--accent); }
  .cal-dot { display:inline-block; width:6px; height:6px; border-radius:50%; background:var(--accent); margin-left:3px; }
  .bulk-toolbar { display:flex; align-items:center; gap:1rem; flex-wrap:wrap; margin-bottom:1rem; padding-bottom:1rem; border-bottom:1px solid var(--line); }
  .bulk-toolbar label { font-size:0.85rem; display:flex; align-items:center; gap:0.4rem; }
  .day-slot-row input[type=checkbox] { margin-right:0.6rem; }
  .day-panel { background:#fff; border:1px solid var(--line); border-radius:8px; padding:1.5rem; margin-bottom:1.5rem; }
  .day-panel h2 { margin:0 0 1rem; font-size:1rem; }
  .day-slot-row { display:flex; align-items:center; gap:0.8rem; flex-wrap:wrap; padding:0.6rem 0; border-bottom:1px solid var(--line); font-size:0.88rem; }
  .day-slot-row:last-child { border-bottom:none; }
  .day-slot-row .time { font-weight:700; width:56px; }
  .day-slot-row .cap { color:var(--ink-soft); width:70px; }
  form.mini-add { display:flex; gap:0.6rem; align-items:end; margin-top:1rem; flex-wrap:wrap; }
  form.mini-add label { display:flex; flex-direction:column; font-size:0.76rem; color:var(--ink-soft); gap:0.25rem; }
  form.mini-add input, form.mini-add select { padding:0.5rem; border:1px solid var(--line); font-size:0.85rem; border-radius:4px; }
  .toggle-btn, .delete-btn, .btn-outline { padding:0.55rem 1.1rem; font-size:0.85rem; border-radius:4px; cursor:pointer; text-decoration:none; display:inline-block; line-height:1.2; box-sizing:border-box; }
  .toggle-btn { border:1px solid var(--line); background:#fff; }
  .delete-btn { border:1px solid #f8d7da; color:#842029; background:#fff; }
  .inactive-row { opacity:0.5; }
  .batch-panel { background:#fff; border:1px solid var(--line); border-radius:8px; padding:1.5rem; }
  .batch-panel h2 { margin:0 0 0.4rem; font-size:1rem; }
  .batch-panel .hint { color:var(--ink-soft); font-size:0.82rem; margin-bottom:1rem; }
  .weekday-check { display:flex; gap:1rem; flex-wrap:wrap; margin:0.5rem 0 1rem; }
  .weekday-check label { display:flex; align-items:center; gap:0.35rem; font-size:0.85rem; }
  .batch-grid { display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1rem; }
  .batch-grid label, .batch-panel > form > label { display:flex; flex-direction:column; font-size:0.8rem; color:var(--ink-soft); gap:0.3rem; }
  .batch-panel input, .batch-panel select { padding:0.6rem; border:1px solid var(--line); font-size:0.88rem; border-radius:4px; }
  .success-msg { color:var(--accent); font-size:0.9rem; margin-bottom:1.5rem; }

  /* settings forms */
  .settings-form { max-width:520px; display:flex; flex-direction:column; gap:1.4rem; }
  .settings-form label { display:flex; flex-direction:column; gap:0.4rem; font-size:0.85rem; color:var(--ink-soft); }
  .settings-form input { padding:0.7rem; border:1px solid var(--line); font-size:0.9rem; border-radius:4px; }

  /* 手機版：表格改卡片式，避免橫向擠壓 */
  @media (max-width: 720px) {
    .table-cards thead { display:none; }
    .table-cards, .table-cards tbody { display:block; width:100%; }
    .table-cards tr { display:block; border:1px solid var(--line); border-radius:8px; padding:0.9rem 1rem; margin-bottom:0.9rem; background:#fff; }
    .table-cards td { display:block; border:none; padding:0.4rem 0; }
    .table-cards td::before { content:attr(data-label); display:block; font-size:0.72rem; font-weight:600; color:var(--ink-soft); text-transform:uppercase; letter-spacing:0.03em; margin-bottom:0.15rem; }
    .table-cards td:first-child { font-size:1rem; font-weight:700; padding-top:0; }
    .table-cards td:first-child::before { display:none; }
    .table-cards td.empty { text-align:left; }
  }

  /* 手機版：側邊欄改成收合抽屜 */
  .menu-toggle { display:none; }
  .sidebar-backdrop { display:none; }
  @media (max-width: 860px) {
    .layout { position:relative; overflow-x:hidden; }
    .dash-grid { grid-template-columns:1fr; }
    .stat-grid { grid-template-columns:1fr 1fr; }
    .sidebar {
      position:fixed; top:0; left:0; height:100vh; z-index:50;
      transform:translateX(-100%); transition:transform 0.2s ease;
      box-shadow:2px 0 16px rgba(0,0,0,0.18);
    }
    .sidebar.open { transform:translateX(0); }
    .content { width:100%; padding:1.5rem 1.2rem; }
    .menu-toggle {
      display:flex; align-items:center; justify-content:center;
      width:2.6rem; height:2.6rem; margin-bottom:1.2rem;
      border:1px solid var(--line); border-radius:6px; background:#fff;
      font-size:1.3rem; cursor:pointer; color:var(--ink);
    }
    .sidebar-backdrop.open {
      display:block; position:fixed; inset:0; background:rgba(0,0,0,0.35); z-index:40;
    }

    /* 行事曆頁面 */
    .calendar td { height:44px; font-size:0.68rem; }
    .calendar td a.day-link { padding:0.2rem; }
    .calendar th { padding:0.3rem 0.1rem; font-size:0.62rem; }
    .day-slot-row { flex-direction:column; align-items:flex-start; gap:0.35rem; }
    .day-slot-row .time, .day-slot-row .cap { width:auto; }
    .batch-grid { grid-template-columns:1fr; }
    form.mini-add { flex-direction:column; align-items:stretch; }
    form.mini-add label { width:100%; }
  }
</style>
`;

const NAV_ITEMS = [
  { key: "dashboard", href: "/admin", icon: "◧", label: "總覽", staff: true },
  { key: "bookings", href: "/admin/bookings", icon: "▤", label: "預約管理", staff: true },
  { key: "slots", href: "/admin/slots", icon: "▦", label: "行事曆", staff: true },
  { key: "customers", href: "/admin/customers", icon: "◑", label: "顧客", staff: true },
  { key: "stylists", href: "/admin/stylists", icon: "▧", label: "服務人員", staff: true },
  { key: "services", href: "/admin/services", icon: "◈", label: "服務項目" },
  { key: "closedDates", href: "/admin/closed-dates", icon: "✕", label: "公休日" },
  { key: "reports", href: "/admin/reports", icon: "▥", label: "報表" },
];
const NAV_ITEMS_BOTTOM = [
  { key: "settings", href: "/admin/settings", icon: "⚙", label: "第三方串接" },
  { key: "messages", href: "/admin/messages", icon: "✉", label: "訊息範本" },
  { key: "audit", href: "/admin/audit-log", icon: "☰", label: "操作紀錄" },
  { key: "loginHistory", href: "/admin/login-history", icon: "◫", label: "登入紀錄" },
  { key: "lineMessages", href: "/admin/line-messages", icon: "✎", label: "LINE 通知紀錄" },
  { key: "accounts", href: "/admin/accounts", icon: "◍", label: "帳號管理" },
  { key: "account", href: "/admin/account", icon: "⚙", label: "系統設定", staff: true },
];
export const STAFF_ALLOWED_NAV_KEYS = [...NAV_ITEMS, ...NAV_ITEMS_BOTTOM].filter((n) => n.staff).map((n) => n.key);

export const APP_NAME = "預約系統";

function sidebar(active, username, role) {
  const isStaff = role && role !== "admin";
  const item = (n) => `<a href="${n.href}" class="${active === n.key ? "active" : ""}"><span>${n.icon}</span>${n.label}</a>`;
  const navItems = isStaff ? NAV_ITEMS.filter((n) => n.staff) : NAV_ITEMS;
  const navItemsBottom = isStaff ? NAV_ITEMS_BOTTOM.filter((n) => n.staff) : NAV_ITEMS_BOTTOM;
  return `
  <aside class="sidebar">
    <div class="sidebar-logo"><span>${APP_NAME}</span></div>
    <nav class="sidebar-nav">
      ${navItems.map(item).join("")}
      <hr class="sidebar-divider">
      ${navItemsBottom.map(item).join("")}
    </nav>
    <div class="sidebar-user">
      <span>${escapeHtml(username)}</span>
      <form method="POST" action="/admin/logout" style="margin:0;">
        <button type="submit">登出</button>
      </form>
    </div>
  </aside>`;
}

export function adminLayout(title, username, bodyHtml, active = "dashboard", role = "admin") {
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}｜${APP_NAME}後台</title>${BASE_STYLE}</head>
  <body>
    <div class="layout">
      <div class="sidebar-backdrop" id="sidebarBackdrop"></div>
      ${sidebar(active, username, role)}
      <main class="content">
        <button type="button" class="menu-toggle" id="menuToggle" aria-label="開啟選單">☰</button>
        ${bodyHtml}
      </main>
    </div>
    <script>
      (function() {
        var sidebar = document.querySelector('.sidebar');
        var toggle = document.getElementById('menuToggle');
        var backdrop = document.getElementById('sidebarBackdrop');
        if (!sidebar || !toggle || !backdrop) return;
        function open() { sidebar.classList.add('open'); backdrop.classList.add('open'); }
        function close() { sidebar.classList.remove('open'); backdrop.classList.remove('open'); }
        toggle.addEventListener('click', open);
        backdrop.addEventListener('click', close);
      })();
    </script>
  </body></html>`;
}

export function loginPage(error, turnstileSiteKey, loginPostPath) {
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>後台登入｜${APP_NAME}</title>${BASE_STYLE}${turnstileSiteKey ? `<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>` : ""}</head>
  <body style="background:#fafafa;">
    <form class="login" method="POST" action="${escapeHtml(loginPostPath || "/admin/login")}">
      <h1>後台登入</h1>
      ${error ? `<p class="error">${error}</p>` : ""}
      <input type="text" name="username" placeholder="帳號" required autofocus>
      <input type="password" name="password" placeholder="密碼" required>
      ${turnstileSiteKey ? `<div class="cf-turnstile" data-sitekey="${escapeHtml(turnstileSiteKey)}" style="margin-bottom:1rem;"></div>` : ""}
      <button type="submit" class="btn">登入</button>
    </form>
  </body></html>`;
}

const SETUP_STYLE = `
<style>
  body { margin:0; font-family:"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif; background:#fafafa; color:#16181c; }
  .setup-wrap { max-width:560px; margin:3rem auto 5rem; padding:0 1.5rem; }
  .setup-header { text-align:center; margin-bottom:2rem; }
  .setup-header .brand { font-size:0.85rem; letter-spacing:0.08em; text-transform:uppercase; color:#1f6f5c; margin-bottom:0.6rem; }
  .setup-header h1 { font-size:1.5rem; margin:0 0 0.5rem; }
  .setup-header p { color:#55585f; font-size:0.92rem; margin:0; }
  .setup-step { background:#fff; border:1px solid #e4e4e0; border-radius:8px; padding:1.4rem 1.6rem; margin-bottom:1.2rem; }
  .setup-step h2 { font-size:1rem; margin:0 0 0.3rem; display:flex; align-items:center; gap:0.6rem; }
  .setup-step h2 .n { display:inline-flex; align-items:center; justify-content:center; width:24px; height:24px; border-radius:50%; background:#e7f1ee; color:#1f6f5c; font-size:0.8rem; font-weight:700; flex-shrink:0; }
  .setup-step .hint { color:#55585f; font-size:0.82rem; margin:0 0 1rem 2.2rem; }
  .setup-step .optional-tag { font-size:0.72rem; color:#8b93a1; font-weight:400; }
  .setup-step label { display:block; font-size:0.85rem; color:#55585f; margin:0.8rem 0 0.35rem; }
  .setup-step input { width:100%; padding:0.65rem 0.75rem; border:1px solid #e4e4e0; border-radius:4px; font-size:0.92rem; box-sizing:border-box; }
  .setup-errors { background:#fbeaea; color:#9c3b3b; border-radius:6px; padding:0.9rem 1.1rem; margin-bottom:1.2rem; font-size:0.85rem; }
  .setup-errors ul { margin:0; padding-left:1.2rem; }
  .setup-submit { width:100%; padding:0.85rem; background:#16181c; color:#fff; border:none; border-radius:6px; font-size:0.95rem; cursor:pointer; }
  .setup-done { max-width:420px; margin:6rem auto; text-align:center; padding:0 1.5rem; }
  .setup-done h1 { font-size:1.3rem; }
  .setup-done p { color:#55585f; }
</style>`;

export function setupPage(errors, values) {
  const v = values || {};
  const esc = (s) => escapeHtml(s || "");
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>系統初始化設定</title>${SETUP_STYLE}</head>
  <body>
    <div class="setup-wrap">
      <div class="setup-header">
        <div class="brand">開箱設定</div>
        <h1>歡迎使用預約系統</h1>
        <p>第一次啟動需要完成以下設定，才能開始使用。完成後這個頁面就會關閉，不能重複執行。</p>
      </div>

      ${errors && errors.length ? `<div class="setup-errors"><ul>${errors.map((e) => `<li>${escapeHtml(e)}</li>`).join("")}</ul></div>` : ""}

      <form method="POST" action="/setup">
        <div class="setup-step">
          <h2><span class="n">1</span> 系統基本設定</h2>
          <p class="hint">網站與後台會顯示的名稱。</p>
          <label>站名</label>
          <input type="text" name="siteName" placeholder="例如：某某工作室預約系統" value="${esc(v.siteName)}" required>
        </div>

        <div class="setup-step">
          <h2><span class="n">2</span> 建立管理員帳號</h2>
          <p class="hint">用來登入後台，之後可以在「帳號管理」新增更多帳號。</p>
          <label>帳號</label>
          <input type="text" name="username" placeholder="admin" value="${esc(v.username)}" required autocomplete="off">
          <label>密碼</label>
          <input type="password" name="password" placeholder="至少 8 碼，需同時包含英文字母與數字" required autocomplete="new-password">
        </div>

        <div class="setup-step">
          <h2><span class="n">3</span> LINE 串接 <span class="optional-tag">（選填，之後也可以在後台補上）</span></h2>
          <p class="hint">沒有的話可以先跳過，之後在「第三方串接」頁面補上即可。</p>
          <label>Channel Secret</label>
          <input type="text" name="lineChannelSecret" value="${esc(v.lineChannelSecret)}" autocomplete="off">
          <label>Channel Access Token</label>
          <input type="text" name="lineAccessToken" value="${esc(v.lineAccessToken)}" autocomplete="off">
          <label>LIFF ID</label>
          <input type="text" name="liffId" value="${esc(v.liffId)}" autocomplete="off">
        </div>

        <div class="setup-step">
          <h2><span class="n">4</span> 建立第一個服務</h2>
          <p class="hint">之後可以在「服務項目」頁面新增更多。</p>
          <label>服務名稱</label>
          <input type="text" name="serviceName" placeholder="例如：諮詢預約" value="${esc(v.serviceName)}" required>
          <label>服務時長（分鐘）</label>
          <input type="number" name="serviceDuration" min="1" placeholder="例如：60" value="${esc(v.serviceDuration)}" required>
        </div>

        <div class="setup-step">
          <h2><span class="n">5</span> 建立服務人員 <span class="optional-tag">（選填，之後也可以在後台新增）</span></h2>
          <p class="hint">沒有服務人員也能運作，管理員可以直接手動建立時段與預約。</p>
          <label>服務人員名稱</label>
          <input type="text" name="stylistName" value="${esc(v.stylistName)}" autocomplete="off">
        </div>

        <button type="submit" class="setup-submit">開始設定</button>
      </form>
    </div>
  </body></html>`;
}

export function setupSuccessPage(username) {
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>設定完成</title>${SETUP_STYLE}</head>
  <body>
    <div class="setup-done">
      <h1>🎉 初始化完成</h1>
      <p>已經建立好帳號「${escapeHtml(username)}」與基本設定，這個頁面之後不能再重複執行。</p>
      <a class="setup-submit" style="display:block; text-decoration:none; box-sizing:border-box;" href="/admin">前往後台登入</a>
    </div>
  </body></html>`;
}

export function setupDonePage() {
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>系統已完成初始化</title>${SETUP_STYLE}</head>
  <body>
    <div class="setup-done">
      <h1>系統已完成初始化</h1>
      <p>這個網站已經設定過了，初始化精靈不能重複執行。如果需要新增帳號或調整設定，請到後台的「帳號管理」／「第三方串接」頁面操作。</p>
      <a class="setup-submit" style="display:block; text-decoration:none; box-sizing:border-box;" href="/admin">前往後台登入</a>
    </div>
  </body></html>`;
}

export function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

const STATUS_LABEL = { pending: "待確認", confirmed: "已確認", completed: "已完成", cancelled: "已取消" };
const STATUS_DOT = { pending: "🟡", confirmed: "🟢", completed: "🔵", cancelled: "🔴" };

export function statusBadge(status) {
  return `<span class="badge">${STATUS_DOT[status] || ""} ${STATUS_LABEL[status] || status}</span>`;
}

export function lineIdentityCell(lineUserId, lineDisplayName) {
  if (!lineUserId) return `<span style="color:var(--ink-soft);">-</span>`;
  const name = lineDisplayName ? escapeHtml(lineDisplayName) : "（未取得名稱）";
  return `<span title="${escapeHtml(lineUserId)}">🟢 ${name}</span>`;
}

function quickStatusForm(booking, redirectTo) {
  const opts = ["pending", "confirmed", "completed", "cancelled"]
    .map((s) => `<option value="${s}" ${booking.status === s ? "selected" : ""}>${STATUS_DOT[s]} ${STATUS_LABEL[s]}</option>`)
    .join("");
  return `
    <form method="POST" action="/admin/bookings/${booking.id}/status" style="margin:0; display:flex; gap:0.4rem; align-items:center;">
      <input type="hidden" name="redirect" value="${escapeHtml(redirectTo || "")}">
      <select name="status" class="status-select-quick" onchange="this.form.requestSubmit()">${opts}</select>
      ${booking.status === "pending" ? `<button type="submit" name="quickConfirm" value="1" class="confirm-btn">確認預約</button>` : ""}
    </form>`;
}

// ---------- Dashboard ----------
export function dashboardPage({ todayCount, pendingTodayCount, weekCount, remainingToday, todayBookings, pendingBookings, greetingDate, recentLineMessages, failedLineMessagesCount }) {
  const todayRows = todayBookings.length
    ? todayBookings.map((b) => `
      <div class="today-row">
        <span class="time">${b.slot_time}</span>
        <span class="name">${escapeHtml(b.customer_name)}・${escapeHtml(b.service_name)}</span>
        ${statusBadge(b.status)}
      </div>`).join("")
    : `<p class="empty">今天還沒有任何預約。</p>`;

  const pendingRows = pendingBookings.length
    ? pendingBookings.map((b) => `
      <div class="pending-row">
        <span class="meta">${b.slot_date} ${b.slot_time}　${escapeHtml(b.customer_name)}　${escapeHtml(b.service_name)}</span>
        ${quickStatusForm(b, "/admin")}
      </div>`).join("")
    : `<p class="empty">目前沒有待確認的預約，做得好！</p>`;

  const lineRows = (recentLineMessages || []).length ? recentLineMessages.map((l) => `
    <div class="today-row">
      <span class="time">${l.created_at.slice(5, 16).replace("T", " ")}</span>
      <span class="name">${l.success ? "🟢" : "🔴"} ${escapeHtml(l.purpose)}${l.recipient_name ? `・${escapeHtml(l.recipient_name)}` : ""}${!l.success && l.error_message ? ` <span style="color:#b3261e; font-size:0.8rem;">（${escapeHtml(l.error_message.slice(0, 40))}）</span>` : ""}</span>
    </div>`).join("") : `<p class="empty">目前還沒有任何 LINE 通知紀錄。</p>`;

  return `
    <div class="greeting">早安 👋</div>
    <div class="greeting-date">${greetingDate}</div>
    <div class="stat-grid">
      <div class="stat-card"><div class="num">${todayCount}</div><div class="label">今日預約</div></div>
      <div class="stat-card ${pendingTodayCount > 0 ? "warn" : ""}"><div class="num">${pendingTodayCount}</div><div class="label">待確認</div></div>
      <div class="stat-card"><div class="num">${weekCount}</div><div class="label">本週預約</div></div>
      <div class="stat-card"><div class="num">${remainingToday}</div><div class="label">今日剩餘名額</div></div>
    </div>
    <div class="dash-grid">
      <div>
        <div class="panel" style="margin-bottom:1.5rem;">
          <h2>今日預約</h2>
          ${todayRows}
        </div>
        <div class="panel">
          <h2>待確認預約</h2>
          ${pendingRows}
        </div>
      </div>
      <div class="panel">
        <h2>快速操作</h2>
        <div class="quick-actions">
          <a href="/admin/bookings/new" class="btn-outline">＋ 新增預約</a>
          <a href="/admin/slots" class="btn-outline">＋ 新增時段</a>
          <form method="POST" action="/admin/quick/close-today" style="margin:0;" onsubmit="return confirm('確定要關閉今天所有時段嗎？今天將不再開放新預約。');">
            <button type="submit" class="btn-outline" style="width:100%;">□ 關閉今日預約</button>
          </form>
        </div>
      </div>
    </div>
    <div class="panel" style="margin-top:1.5rem;">
      <h2>LINE 通知${failedLineMessagesCount > 0 ? ` <span style="color:#b3261e; font-size:0.85rem; font-weight:normal;">⚠️ 過去 24 小時有 ${failedLineMessagesCount} 筆發送失敗</span>` : ""}</h2>
      ${lineRows}
      <p style="margin-top:1rem;"><a href="/admin/line-messages" class="btn-outline">查看完整紀錄</a></p>
    </div>
  `;
}

// ---------- Bookings ----------
export function bookingsPage(bookings, filters) {
  const range = filters.range || "all";
  const status = filters.status || "all";
  const q = filters.q || "";
  const today = new Date().toISOString().slice(0, 10);
  const dateFrom = filters.dateFrom || today;
  const dateTo = filters.dateTo || today;

  const tab = (key, label) => {
    const params = new URLSearchParams({ range: key, status, q });
    return `<a href="/admin/bookings?${params}" class="${range === key ? "active" : ""}">${label}</a>`;
  };

  const statusOptions = ["all", "pending", "confirmed", "completed", "cancelled"]
    .map((s) => `<option value="${s}" ${status === s ? "selected" : ""}>${s === "all" ? "全部狀態" : STATUS_DOT[s] + " " + STATUS_LABEL[s]}</option>`)
    .join("");

  const rows = bookings.length ? bookings.map((b) => `
    <tr>
      <td data-label="時段">${b.slot_date} ${b.slot_time}</td>
      <td data-label="姓名">${escapeHtml(b.customer_name)} ${customerTagBadge(b.customer_tag)}${(b.dup_count > 0 && (b.status === "pending" || b.status === "confirmed")) ? ` <span class="badge" style="background:#fdecea; color:#b3261e;" title="這個人／這支電話還有其他待確認或已確認的預約">⚠ 重複預約</span>` : ""}</td>
      <td data-label="電話">${escapeHtml(b.customer_phone)}</td>
      <td data-label="服務項目">${escapeHtml(b.service_name)}${b.stylist_name ? ` <span style="color:var(--ink-soft); font-size:0.82rem;">✂ ${escapeHtml(b.stylist_name)}</span>` : ""}</td>
      <td data-label="LINE">${lineIdentityCell(b.line_user_id, b.line_display_name)}</td>
      <td data-label="備註">${escapeHtml(b.note || "-")}</td>
      <td data-label="狀態">${quickStatusForm(b, `/admin/bookings?range=${range}&status=${status}&q=${encodeURIComponent(q)}&dateFrom=${dateFrom}&dateTo=${dateTo}`)}</td>
    </tr>`).join("") : `<tr><td colspan="7" class="empty">沒有符合條件的預約紀錄。</td></tr>`;

  return `
    <h1>預約管理</h1>
    <div class="filter-bar">
      <div class="tab-group">
        ${tab("today", "今天")}
        ${tab("tomorrow", "明天")}
        ${tab("week", "本週")}
        ${tab("all", "全部")}
      </div>
      <form method="GET" action="/admin/bookings" style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
        <input type="hidden" name="status" value="${status}">
        <input type="hidden" name="q" value="${escapeHtml(q)}">
        <input type="hidden" name="range" value="custom">
        <input type="date" name="dateFrom" value="${dateFrom}" class="search-box">
        <span style="color:var(--ink-soft);">至</span>
        <input type="date" name="dateTo" value="${dateTo}" class="search-box">
        <button type="submit" class="${range === "custom" ? "btn" : "btn-outline"}" style="white-space:nowrap;">查詢區間</button>
      </form>
      <form method="GET" action="/admin/bookings" style="display:flex; gap:0.6rem;">
        <input type="hidden" name="range" value="${range}">
        <input type="hidden" name="dateFrom" value="${dateFrom}">
        <input type="hidden" name="dateTo" value="${dateTo}">
        <input type="text" name="q" class="search-box" placeholder="搜尋姓名 / 電話" value="${escapeHtml(q)}">
        <select name="status" class="search-box" onchange="this.form.requestSubmit()">${statusOptions}</select>
      </form>
    </div>
    <p style="margin-bottom:1rem;"><a href="/admin/bookings/export.csv?range=${range}&status=${status}&q=${encodeURIComponent(q)}&dateFrom=${dateFrom}&dateTo=${dateTo}" class="btn-outline">⬇ 匯出目前篩選結果 CSV</a></p>
    <table class="table-cards">
      <thead><tr><th>時段</th><th>姓名</th><th>電話</th><th>服務項目</th><th>LINE</th><th>備註</th><th>狀態</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

export function newBookingPage(slots, error) {
  const options = slots.length
    ? slots.map((s) => `<option value="${s.id}">${s.slot_date} ${s.slot_time}（${escapeHtml(s.service_name)}${s.stylist_name ? `・✂${escapeHtml(s.stylist_name)}` : ""}，剩 ${s.capacity - s.booked_count} 位）</option>`).join("")
    : `<option value="">目前沒有可預約的開放時段</option>`;
  return `
    <h1>新增預約</h1>
    ${error ? `<p class="error">${escapeHtml(error)}</p>` : ""}
    <form method="POST" action="/admin/bookings/new" style="max-width:460px; display:flex; flex-direction:column; gap:1rem;">
      <label style="display:flex; flex-direction:column; gap:0.4rem; font-size:0.85rem; color:var(--ink-soft);">
        選擇時段
        <select name="slotId" required style="padding:0.7rem; border:1px solid var(--line); border-radius:4px;">${options}</select>
      </label>
      <label style="display:flex; flex-direction:column; gap:0.4rem; font-size:0.85rem; color:var(--ink-soft);">
        姓名
        <input type="text" name="name" required style="padding:0.7rem; border:1px solid var(--line); border-radius:4px;">
      </label>
      <label style="display:flex; flex-direction:column; gap:0.4rem; font-size:0.85rem; color:var(--ink-soft);">
        電話
        <input type="tel" name="phone" required style="padding:0.7rem; border:1px solid var(--line); border-radius:4px;">
      </label>
      <label style="display:flex; flex-direction:column; gap:0.4rem; font-size:0.85rem; color:var(--ink-soft);">
        Email（選填）
        <input type="email" name="email" style="padding:0.7rem; border:1px solid var(--line); border-radius:4px;">
      </label>
      <label style="display:flex; flex-direction:column; gap:0.4rem; font-size:0.85rem; color:var(--ink-soft);">
        備註（選填）
        <textarea name="note" rows="3" style="padding:0.7rem; border:1px solid var(--line); border-radius:4px;"></textarea>
      </label>
      <button type="submit" class="btn" style="align-self:start;">建立預約（自動標記為已確認）</button>
    </form>
  `;
}

// ---------- Customers ----------
const CUSTOMER_TAG_LABELS = { vip: "⭐ VIP", regular: "🔁 常客", caution: "⚠️ 需特別注意", blocked: "🚫 黑名單（禁止預約）" };

export function customerTagBadge(tag) {
  if (!tag || !CUSTOMER_TAG_LABELS[tag]) return "";
  const style = tag === "blocked" ? ` style="background:#b3261e; color:#fff;"` : "";
  return `<span class="badge"${style}>${CUSTOMER_TAG_LABELS[tag]}</span>`;
}

const CUSTOMER_SORT_LABELS = {
  last_desc: "最近預約（新到舊）",
  last_asc: "最近預約（舊到新）",
  name_asc: "姓名（A→Z）",
  name_desc: "姓名（Z→A）",
  bookings_desc: "總預約次數（多到少）",
  bookings_asc: "總預約次數（少到多）",
  tag_asc: "有標記優先",
};

export function customersPage(customers, sort, importMsg, importError) {
  const tagOptions = (current) => ["", "vip", "regular", "caution", "blocked"]
    .map((v) => `<option value="${v}" ${current === v ? "selected" : ""}>${v ? CUSTOMER_TAG_LABELS[v] : "（無標記）"}</option>`)
    .join("");

  const sortOptions = Object.entries(CUSTOMER_SORT_LABELS)
    .map(([v, label]) => `<option value="${v}" ${sort === v ? "selected" : ""}>${label}</option>`)
    .join("");

  const rows = customers.length ? customers.map((c) => `
    <tr>
      <td data-label="姓名">${escapeHtml(c.customer_name)}</td>
      <td data-label="電話">${escapeHtml(c.customer_phone)}</td>
      <td data-label="Email">${escapeHtml(c.customer_email || "-")}</td>
      <td data-label="LINE">${lineIdentityCell(c.line_user_id, c.line_display_name)}</td>
      <td data-label="總預約次數">${c.total_bookings}</td>
      <td data-label="最近預約">${c.last_booking}</td>
      <td data-label="標記／備註">
        <form method="POST" action="/admin/customers/${encodeURIComponent(c.customer_phone)}/note" style="display:flex; flex-direction:column; gap:0.4rem; min-width:180px;">
          <select name="tag" style="padding:0.4rem; border:1px solid var(--line); border-radius:4px; font-size:0.85rem;">${tagOptions(c.tag || "")}</select>
          <input type="text" name="note" value="${escapeHtml(c.note || "")}" placeholder="備註（選填）" style="padding:0.4rem; border:1px solid var(--line); border-radius:4px; font-size:0.85rem;">
          <button type="submit" class="btn-outline" style="font-size:0.8rem;">儲存標記</button>
        </form>
      </td>
      <td data-label="操作"><a href="/admin/bookings?range=all&status=all&q=${encodeURIComponent(c.customer_phone)}" class="btn-outline">查看預約紀錄</a></td>
    </tr>`).join("") : `<tr><td colspan="8" class="empty">目前還沒有任何顧客資料。</td></tr>`;
  return `
    <h1>顧客</h1>
    ${importMsg ? `<p class="success-msg">匯入完成：更新 ${importMsg.updated} 筆${importMsg.skipped ? `，略過 ${importMsg.skipped} 筆（電話空白）` : ""}。</p>` : ""}
    ${importError ? `<p class="error">${escapeHtml(importError)}</p>` : ""}
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.2rem; flex-wrap:wrap; gap:0.8rem;">
      <div style="display:flex; align-items:center; gap:0.8rem; flex-wrap:wrap;">
        <a href="/admin/customers/export.csv" class="btn-outline">⬇ 匯出顧客名單 CSV</a>
        <form method="POST" action="/admin/customers/import" enctype="multipart/form-data" style="display:flex; align-items:center; gap:0.5rem;">
          <input type="file" name="file" accept=".csv" required style="font-size:0.82rem;">
          <button type="submit" class="btn-outline">⬆ 匯入標記／備註</button>
        </form>
      </div>
      <form method="GET" action="/admin/customers" style="display:flex; align-items:center; gap:0.5rem;">
        <label style="font-size:0.85rem; color:var(--ink-soft);">排序方式</label>
        <select name="sort" class="search-box" onchange="this.form.requestSubmit()">${sortOptions}</select>
      </form>
    </div>
    <p style="color:var(--ink-soft); font-size:0.82rem; margin-top:-0.6rem; margin-bottom:1.2rem; max-width:60ch;">
      匯入會依「電話」比對現有顧客，覆蓋對應的「標記」與「備註」欄位；姓名、總預約次數等資料是自動統計的，不會被匯入內容影響。請使用「匯出顧客名單 CSV」下載的檔案格式來編輯後再匯入。
    </p>
    <table class="table-cards">
      <thead><tr><th>姓名</th><th>電話</th><th>Email</th><th>LINE</th><th>總預約次數</th><th>最近預約</th><th>標記／備註</th><th>操作</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

// ---------- Service types ----------
const WEEKDAY_LABEL = { "0": "日", "1": "一", "2": "二", "3": "三", "4": "四", "5": "五", "6": "六" };

export function reportsPage({ year, month, totalCount, statusCounts, topTimes, topServices, topWeekdays }) {
  const monthLabel = `${year} 年 ${month} 月`;
  const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };

  const getCount = (status) => statusCounts.find((s) => s.status === status)?.cnt || 0;
  const pct = (n) => (totalCount ? Math.round((n / totalCount) * 100) : 0);

  const cancelledCount = getCount("cancelled");
  const completedCount = getCount("completed");
  const confirmedCount = getCount("confirmed");
  const pendingCount = getCount("pending");

  const rankTable = (rows, labelKey, emptyText) => rows.length ? `
    <table>
      <thead><tr><th>排名</th><th>項目</th><th>預約數</th></tr></thead>
      <tbody>
        ${rows.map((r, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(String(r[labelKey]))}</td><td>${r.cnt}</td></tr>`).join("")}
      </tbody>
    </table>
  ` : `<p class="empty">${emptyText}</p>`;

  const topWeekdaysMapped = topWeekdays.map((r) => ({ label: WEEKDAY_LABEL[r.wd] || r.wd, cnt: r.cnt }));

  return `
    <h1>營運報表</h1>
    <div class="cal-nav">
      <a href="/admin/reports?year=${prev.y}&month=${prev.m}">‹</a>
      <h2>${monthLabel}</h2>
      <a href="/admin/reports?year=${next.y}&month=${next.m}">›</a>
    </div>

    <div class="stat-grid">
      <div class="stat-card"><div class="num">${totalCount}</div><div class="label">本月總預約數</div></div>
      <div class="stat-card"><div class="num">${pct(cancelledCount)}%</div><div class="label">取消率（${cancelledCount} 筆）</div></div>
      <div class="stat-card"><div class="num">${pct(completedCount)}%</div><div class="label">完成率（${completedCount} 筆）</div></div>
      <div class="stat-card"><div class="num">${pendingCount + confirmedCount}</div><div class="label">目前待處理／已確認</div></div>
    </div>

    <div class="dash-grid">
      <div class="panel">
        <h2>熱門時段 Top 5</h2>
        ${rankTable(topTimes, "slot_time", "本月還沒有任何預約資料。")}
      </div>
      <div class="panel">
        <h2>熱門服務項目</h2>
        ${rankTable(topServices, "name", "本月還沒有任何預約資料。")}
      </div>
    </div>
    <div style="height:1.5rem;"></div>
    <div class="panel">
      <h2>熱門星期</h2>
      ${rankTable(topWeekdaysMapped, "label", "本月還沒有任何預約資料。")}
    </div>
  `;
}

export function closedDatesPage(closedDates, addedWarning) {
  const rows = closedDates.length ? closedDates.map((c) => `
    <tr>
      <td data-label="日期">${c.closed_date}</td>
      <td data-label="原因">${escapeHtml(c.reason || "-")}</td>
      <td data-label="操作">
        <form method="POST" action="/admin/closed-dates/${c.closed_date}/delete" style="margin:0;" onsubmit="return confirm('確定要取消這個公休日設定嗎？（不會影響已經被關閉的時段，需要另外去行事曆手動開放）');">
          <button type="submit" class="delete-btn">刪除</button>
        </form>
      </td>
    </tr>`).join("") : `<tr><td colspan="3" class="empty">目前沒有設定任何公休日。</td></tr>`;

  return `
    <h1>公休日設定</h1>
    <p style="color:var(--ink-soft); font-size:0.88rem; max-width:70ch; margin-bottom:1.5rem;">
      設定公休日後，客人在「線上預約」頁面將看不到該日期的任何時段；批次建立時段時也會自動跳過這些日期。
      設定當天會自動把該日期既有的時段關閉，但不會取消已經被預約走的紀錄，請自行到「預約管理」處理。
    </p>
    ${addedWarning ? `<p class="notice" style="background:#fff3cd; color:#8a6d00; padding:0.8rem 1rem; border-radius:4px; margin-bottom:1.5rem;">${addedWarning}</p>` : ""}
    <form method="POST" action="/admin/closed-dates" class="inline-add" style="margin-bottom:2rem;">
      <label>日期<input type="date" name="date" required></label>
      <label>原因（選填）<input type="text" name="reason" placeholder="例如：農曆春節"></label>
      <button type="submit" class="btn">新增公休日</button>
    </form>
    <table class="table-cards">
      <thead><tr><th>日期</th><th>原因</th><th>操作</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

export function servicesPage(services, error) {
  const rows = services.length ? services.map((s) => {
    const hasUsage = s.usage_count > 0;
    return `
    <tr class="${s.active ? "" : "inactive-row"}">
      <td data-label="名稱">${escapeHtml(s.name)}</td>
      <td data-label="時長">${s.duration_minutes} 分鐘</td>
      <td data-label="狀態">${s.active ? "使用中" : "已停用"}</td>
      <td data-label="操作" style="display:flex; gap:0.5rem; flex-wrap:wrap;">
        <form method="POST" action="/admin/services/${s.id}/toggle" style="margin:0;">
          <button type="submit" class="toggle-btn">${s.active ? "停用" : "啟用"}</button>
        </form>
        ${hasUsage ? `
        <form method="POST" action="/admin/services/${s.id}/delete" style="margin:0;" onsubmit="return confirm('「${escapeHtml(s.name)}」已經有 ${s.usage_count} 筆時段紀錄。\\n\\n強制刪除會把這些時段以及相關的預約紀錄「永久刪除」，預約管理、CSV 匯出、報表都會少這些資料，無法復原！\\n\\n確定要強制刪除嗎？');">
          <input type="hidden" name="confirmCascade" value="1">
          <button type="submit" class="delete-btn">強制刪除</button>
        </form>` : `
        <form method="POST" action="/admin/services/${s.id}/delete" style="margin:0;" onsubmit="return confirm('確定要刪除「${escapeHtml(s.name)}」嗎？');">
          <button type="submit" class="delete-btn">刪除</button>
        </form>`}
      </td>
    </tr>`;
  }).join("") : `<tr><td colspan="4" class="empty">尚未設定任何服務項目。</td></tr>`;
  return `
    <h1>服務項目</h1>
    ${error ? `<p class="error">${escapeHtml(error)}</p>` : ""}
    <form method="POST" action="/admin/services" class="mini-add" style="background:#fff; border:1px solid var(--line); border-radius:8px; padding:1.25rem;">
      <label>名稱<input type="text" name="name" required></label>
      <label>預估時長（分鐘）<input type="number" name="duration" min="5" value="60" required></label>
      <button type="submit" class="btn">新增服務項目</button>
    </form>
    <div style="height:1.5rem;"></div>
    <table class="table-cards">
      <thead><tr><th>名稱</th><th>時長</th><th>狀態</th><th>操作</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="color:#8a6d00; font-size:0.82rem; margin-top:1rem; background:#fff3cd; padding:0.7rem 1rem; border-radius:4px;">⚠️ 注意：已經有時段紀錄的服務項目，資料庫結構上無法只「解除關聯」再刪除，只能整批把相關的時段跟預約紀錄一起「永久刪除」（會顯示「強制刪除」按鈕），從預約管理、CSV 匯出、報表中一併消失且無法復原。如果想保留歷史資料，請改用「停用」。</p>
  `;
}

export function stylistsPage(stylists, error) {
  const rows = stylists.length ? stylists.map((s) => `
    <tr class="${s.active ? "" : "inactive-row"}">
      <td data-label="姓名">${escapeHtml(s.name)}</td>
      <td data-label="排程模式">${s.auto_schedule ? "🟢 自動排程" : "手動時段"}</td>
      <td data-label="狀態">${s.active ? "使用中" : "已停用"}</td>
      <td data-label="操作" style="display:flex; gap:0.5rem; flex-wrap:wrap;">
        <a href="/admin/stylists/${s.id}/schedule" class="btn-outline">設定班表</a>
        <form method="POST" action="/admin/stylists/${s.id}/toggle" style="margin:0;">
          <button type="submit" class="toggle-btn">${s.active ? "停用" : "啟用"}</button>
        </form>
        <form method="POST" action="/admin/stylists/${s.id}/delete" style="margin:0;" onsubmit="return confirm('確定要刪除「${escapeHtml(s.name)}」嗎？如果這位服務人員已經有時段紀錄，那些預約之後會顯示不出服務人員名稱，且無法復原。');">
          <button type="submit" class="delete-btn">刪除</button>
        </form>
      </td>
    </tr>`).join("") : `<tr><td colspan="4" class="empty">尚未設定任何服務人員。</td></tr>`;
  return `
    <h1>服務人員</h1>
    <p style="color:var(--ink-soft); font-size:0.88rem; max-width:60ch; margin-bottom:1.5rem;">
      新增服務人員後，去「行事曆」建立時段時可以指定給某位服務人員，系統會自動防止同一位服務人員的時段重疊（依服務項目的時長計算）。<br>
      也可以點「設定班表」改成**自動排程模式**：設定上班時間、午休、緩衝時間後，系統會依照服務項目時長跟已有的預約，自動算出還能約的時間，不用再手動一筆一筆建時段。
    </p>
    ${error ? `<p class="error">${escapeHtml(error)}</p>` : ""}
    <form method="POST" action="/admin/stylists" class="mini-add" style="background:#fff; border:1px solid var(--line); border-radius:8px; padding:1.25rem;">
      <label>姓名<input type="text" name="name" required></label>
      <button type="submit" class="btn">新增服務人員</button>
    </form>
    <div style="height:1.5rem;"></div>
    <table class="table-cards">
      <thead><tr><th>姓名</th><th>排程模式</th><th>狀態</th><th>操作</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="color:#8a6d00; font-size:0.82rem; margin-top:1rem; background:#fff3cd; padding:0.7rem 1rem; border-radius:4px;">⚠️ 注意：如果服務人員已經有時段紀錄，刪除後那些預約仍會保留在「預約管理」與「報表」中，但會顯示不出是哪位服務人員（欄位會變空白），且無法復原。如果想保留歷史資料，可以考慮改用「停用」。</p>
  `;
}

export function stylistSchedulePage({ stylist, workByWeekday, breakByWeekday, allServices, offeredServiceIds, error, saved }) {
  const weekdayRows = [1, 2, 3, 4, 5, 6, 7].map((wd) => {
    const label = { 1: "一", 2: "二", 3: "三", 4: "四", 5: "五", 6: "六", 7: "日" }[wd];
    const work = workByWeekday[wd];
    const brk = breakByWeekday[wd];
    return `
      <tr>
        <td style="font-weight:600;">星期${label}</td>
        <td><input type="time" name="workStart_${wd}" value="${work ? work.start_time : ""}" style="width:100%;"></td>
        <td><input type="time" name="workEnd_${wd}" value="${work ? work.end_time : ""}" style="width:100%;"></td>
        <td><input type="time" name="breakStart_${wd}" value="${brk ? brk.start_time : ""}" style="width:100%;"></td>
        <td><input type="time" name="breakEnd_${wd}" value="${brk ? brk.end_time : ""}" style="width:100%;"></td>
      </tr>`;
  }).join("");

  const serviceCheckboxes = allServices.map((s) => `
    <label style="display:flex; align-items:center; gap:0.4rem; font-weight:400;">
      <input type="checkbox" name="serviceIds" value="${s.id}" ${offeredServiceIds.has(s.id) ? "checked" : ""}> ${escapeHtml(s.name)}
    </label>`).join("");

  return `
    <h1>服務人員班表：${escapeHtml(stylist.name)}</h1>
    <p style="color:var(--ink-soft); font-size:0.88rem; max-width:70ch; margin-bottom:1.5rem;">
      開啟「自動排程」後，系統會依照下面設定的上班時間、午休、緩衝時間，加上已有的預約，即時算出客人還能預約的時間，不需要再手動建立時段。<br>
      關閉「自動排程」則維持原本手動建立時段的方式，這裡的設定會保留但不會生效。
    </p>
    ${saved ? `<p class="success-msg">已儲存。</p>` : ""}
    ${error ? `<p class="error">${error}</p>` : ""}
    <form method="POST" action="/admin/stylists/${stylist.id}/schedule">
      <label style="display:flex; align-items:center; gap:0.5rem; font-size:0.95rem; font-weight:600; margin-bottom:1.2rem;">
        <input type="checkbox" name="autoSchedule" ${stylist.auto_schedule ? "checked" : ""}> 開啟自動排程
      </label>

      <table style="margin-bottom:1.5rem;">
        <thead><tr><th>星期</th><th>上班開始</th><th>上班結束</th><th>午休開始（選填）</th><th>午休結束（選填）</th></tr></thead>
        <tbody>${weekdayRows}</tbody>
      </table>

      <div class="batch-grid" style="max-width:520px;">
        <label>服務間緩衝時間（分鐘）<input type="number" name="bufferMinutes" min="0" value="${stylist.buffer_minutes || 0}"></label>
        <label>可預約時間間隔（分鐘）<input type="number" name="slotStepMinutes" min="5" value="${stylist.slot_step_minutes || 15}"></label>
      </div>
      <div class="batch-grid" style="max-width:520px;">
        <label>最多開放預約到幾天後（例如 60 = 只能約未來 60 天內）<input type="number" name="maxAdvanceDays" min="1" max="365" value="${stylist.max_advance_days || 60}"></label>
      </div>

      <label style="display:block; font-size:0.85rem; color:var(--ink-soft); margin:1.2rem 0 0.5rem; font-weight:600;">這位服務人員提供哪些服務項目</label>
      <div style="display:flex; flex-direction:column; gap:0.5rem; margin-bottom:1.5rem;">
        ${serviceCheckboxes}
      </div>

      <div style="display:flex; gap:0.8rem;">
        <button type="submit" class="btn">儲存班表設定</button>
        <a href="/admin/stylists" class="btn-outline" style="align-self:center;">返回</a>
      </div>
    </form>
  `;
}

// ---------- Calendar / slots ----------
export function slotsPage({ year, month, weeks, todayStr, selectedDate, daySlots, serviceTypes, stylists, batchCreated, batchConflict, slotError, closedDateSet, selectedDateClosedReason }) {
  const monthLabel = `${year} 年 ${month} 月`;
  const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };

  const weekRows = weeks.map((week) => `
    <tr>
      ${week.map((day) => {
        if (!day) return `<td class="empty-cell"></td>`;
        const classes = [];
        if (day.dateStr === todayStr) classes.push("today");
        if (day.dateStr === selectedDate) classes.push("selected");
        const isClosed = closedDateSet && closedDateSet.has(day.dateStr);
        if (isClosed) classes.push("closed-day");
        return `<td class="${classes.join(" ")}">
          <a class="day-link" href="/admin/slots?year=${year}&month=${month}&day=${day.dateStr}">${day.day}${day.hasSlots ? '<span class="cal-dot"></span>' : ""}${isClosed ? '<span style="color:#b3261e; font-size:0.7rem; display:block;">公休</span>' : ""}</a>
        </td>`;
      }).join("")}
    </tr>`).join("");

  const serviceOptions = serviceTypes.map((s) => `<option value="${s.id}" data-duration="${s.duration_minutes}">${escapeHtml(s.name)}</option>`).join("");
  const stylistOptions = (stylists || []).map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join("");

  const dayRows = daySlots.length ? daySlots.map((s) => `
    <div class="day-slot-row ${s.active ? "" : "inactive-row"}">
      <input type="checkbox" name="slotIds" value="${s.id}">
      <span class="time">${s.slot_time}</span>
      <span class="cap">${s.booked_count} / ${s.capacity}</span>
      <span style="flex:1;">${escapeHtml(s.service_name)}${s.stylist_name ? ` ・ ✂ ${escapeHtml(s.stylist_name)}` : ""}</span>
      <span>${s.active ? "🟢 開放" : "⚪ 關閉"}</span>
      <button type="submit" formaction="/admin/slots/${s.id}/toggle" class="toggle-btn">${s.active ? "關閉" : "開放"}</button>
      <button type="submit" formaction="/admin/slots/${s.id}/delete" class="delete-btn" onclick="return confirm('確定要刪除這個時段嗎？');">刪除</button>
    </div>`).join("") : `<p class="empty">這天還沒有設定時段。</p>`;

  return `
    <h1>行事曆</h1>
    ${batchCreated ? `<p class="success-msg">已建立 ${batchCreated} 個時段。${batchConflict && Number(batchConflict) > 0 ? `（另有 ${batchConflict} 個時段因為與該服務人員的其他時段重疊而跳過）` : ""}</p>` : ""}
    ${slotError ? `<p class="error">${escapeHtml(slotError)}</p>` : ""}
    <div class="cal-nav">
      <a href="/admin/slots?year=${prev.y}&month=${prev.m}">‹</a>
      <h2>${monthLabel}</h2>
      <a href="/admin/slots?year=${next.y}&month=${next.m}">›</a>
    </div>
    <table class="calendar">
      <thead><tr><th>一</th><th>二</th><th>三</th><th>四</th><th>五</th><th>六</th><th>日</th></tr></thead>
      <tbody>${weekRows}</tbody>
    </table>

    <div class="day-panel">
      <h2>${selectedDate}${selectedDateClosedReason !== undefined ? ` <span style="color:#b3261e; font-size:0.85rem; font-weight:400;">（公休${selectedDateClosedReason ? "：" + escapeHtml(selectedDateClosedReason) : ""}）</span>` : ""}</h2>
      <form method="POST" action="/admin/slots/bulk">
        <input type="hidden" name="year" value="${year}">
        <input type="hidden" name="month" value="${month}">
        <input type="hidden" name="day" value="${selectedDate}">
        ${daySlots.length ? `
        <div class="bulk-toolbar">
          <label><input type="checkbox" onclick="this.form.querySelectorAll('input[name=slotIds]').forEach(c=>c.checked=this.checked)"> 全選</label>
          <button type="submit" name="action" value="deactivate" class="toggle-btn">批次關閉</button>
          <button type="submit" name="action" value="activate" class="toggle-btn">批次開放</button>
          <button type="submit" name="action" value="delete" class="delete-btn" onclick="return confirm('確定要刪除選取的時段嗎？');">批次刪除</button>
        </div>` : ""}
        ${dayRows}
      </form>
      ${selectedDateClosedReason !== undefined ? `
        <p class="empty" style="margin-top:1rem;">這天已設定為公休日，如需在這天開放時段，請先到「公休日」頁面移除設定。</p>
      ` : `
      <form class="mini-add" method="POST" action="/admin/slots">
        <input type="hidden" name="date" value="${selectedDate}">
        <label>服務項目<select name="serviceTypeId" required>${serviceOptions}</select></label>
        <label>服務人員（選填）<select name="stylistId"><option value="">不指定</option>${stylistOptions}</select></label>
        <label>時間<input type="time" name="time" required></label>
        <label>可容納組數<input type="number" name="capacity" min="1" value="1" required></label>
        <button type="submit" class="btn">＋ 新增時段</button>
      </form>
      `}
    </div>

    <div class="batch-panel">
      <h2>批次建立時段</h2>
      <p class="hint">依日期範圍、星期，加上「時間清單」或「時間區段＋間隔」兩種方式擇一，一次建立多個時段。</p>
      <form method="POST" action="/admin/slots/batch">
        <div class="batch-grid">
          <label>開始日期<input type="date" name="dateStart" required></label>
          <label>結束日期<input type="date" name="dateEnd" required></label>
        </div>
        <label style="display:block; font-size:0.8rem; color:var(--ink-soft); margin-bottom:0.3rem;">星期</label>
        <div class="weekday-check">
          <label><input type="checkbox" name="weekday" value="1" checked> 一</label>
          <label><input type="checkbox" name="weekday" value="2" checked> 二</label>
          <label><input type="checkbox" name="weekday" value="3" checked> 三</label>
          <label><input type="checkbox" name="weekday" value="4" checked> 四</label>
          <label><input type="checkbox" name="weekday" value="5" checked> 五</label>
          <label><input type="checkbox" name="weekday" value="6"> 六</label>
          <label><input type="checkbox" name="weekday" value="7"> 日</label>
        </div>

        <label style="display:block; font-size:0.8rem; color:var(--ink-soft); margin:1rem 0 0.4rem;">方式一：指定時間清單</label>
        <div class="batch-grid">
          <label>時間清單（用逗號分隔，例如 10:00,14:00,16:00）<input type="text" name="times" placeholder="10:00,14:00,16:00"></label>
        </div>

        <label style="display:block; font-size:0.8rem; color:var(--ink-soft); margin:1rem 0 0.4rem;">方式二：時間區段 ＋ 間隔（兩種擇一填寫，時間清單有值會優先使用）</label>
        <div class="batch-grid">
          <label>開始時間<input type="time" name="rangeStart" placeholder="12:00"></label>
          <label>結束時間<input type="time" name="rangeEnd" placeholder="22:00"></label>
        </div>
        <div class="batch-grid">
          <label>間隔（分鐘，選好服務項目後會自動帶入該服務的時長，可自行調整）<input type="number" id="batchIntervalInput" name="intervalMinutes" min="5" placeholder="60"></label>
        </div>

        <div class="batch-grid">
          <label>服務項目<select name="serviceTypeId" id="batchServiceSelect" required>${serviceOptions}</select></label>
          <label>服務人員（選填，指定後會自動略過與該服務人員重疊的時段）<select name="stylistId"><option value="">不指定</option>${stylistOptions}</select></label>
        </div>
        <div class="batch-grid">
          <label>每時段可容納組數（有指定服務人員時固定為 1）<input type="number" name="capacity" min="1" value="1" required></label>
        </div>
        <button type="submit" class="btn">批次建立時段</button>
      </form>
    </div>
    <script>
      (function() {
        var serviceSelect = document.getElementById('batchServiceSelect');
        var intervalInput = document.getElementById('batchIntervalInput');
        if (!serviceSelect || !intervalInput) return;
        function applyDuration() {
          var opt = serviceSelect.options[serviceSelect.selectedIndex];
          var duration = opt ? opt.getAttribute('data-duration') : null;
          if (duration) intervalInput.value = duration;
        }
        serviceSelect.addEventListener('change', applyDuration);
        applyDuration();
      })();
    </script>
  `;
}

export function messagesPage(templates, labels, saved) {
  const availableVars = {
    booking_prompt: "{{liff_url}}",
    booking_received: "{{customer_name}} {{slot_date}} {{slot_time}} {{manage_url}}",
    status_confirmed: "{{customer_name}} {{slot_date}} {{slot_time}}",
    status_cancelled: "{{customer_name}} {{slot_date}} {{slot_time}}",
    status_completed: "{{customer_name}} {{slot_date}} {{slot_time}}",
    reminder: "{{customer_name}} {{slot_date}} {{slot_time}} {{service_name}}",
  };

  const sections = templates.map((t) => {
    const hasImage = !!t.image_url;
    const cacheBust = t.updated_at ? new Date(t.updated_at + "Z").getTime() : Date.now();
    return `
    <div class="panel" style="margin-bottom:1.5rem;">
      <h2>${labels[t.template_key] || t.template_key}</h2>
      <p style="color:var(--ink-soft); font-size:0.8rem; margin:-0.5rem 0 1rem;">可用變數：${availableVars[t.template_key] || ""}</p>

      <label style="display:block; font-size:0.85rem; color:var(--ink-soft); margin-bottom:0.5rem;">圖片（選填，留空則不顯示圖片）</label>
      ${hasImage ? `
        <div style="display:flex; align-items:center; gap:1rem; margin-bottom:1rem;">
          <img src="${escapeHtml(t.image_url)}?v=${cacheBust}" alt="" style="width:120px; height:120px; object-fit:cover; border:1px solid var(--line); border-radius:4px;">
          <form method="POST" action="/admin/messages/${t.template_key}/image/delete" onsubmit="return confirm('確定要刪除這張圖片嗎？');">
            <button type="submit" class="delete-btn">刪除圖片</button>
          </form>
        </div>
      ` : ""}
      <form method="POST" action="/admin/messages/${t.template_key}/image" enctype="multipart/form-data" style="display:flex; gap:0.6rem; align-items:center; margin-bottom:1.5rem;">
        <input type="file" name="image" accept="image/png,image/jpeg,image/webp" required>
        <button type="submit" class="btn-outline">${hasImage ? "更換圖片" : "上傳圖片"}</button>
      </form>

      <form method="POST" action="/admin/messages/${t.template_key}" style="display:flex; flex-direction:column; gap:1rem; max-width:560px;">
        <label style="display:flex; flex-direction:column; gap:0.4rem; font-size:0.85rem; color:var(--ink-soft);">
          標題（選填，最多 40 字，設定後會顯示為卡片式訊息）
          <input type="text" name="title" value="${escapeHtml(t.title || "")}" maxlength="40" style="padding:0.6rem; border:1px solid var(--line); border-radius:4px;">
        </label>
        <label style="display:flex; flex-direction:column; gap:0.4rem; font-size:0.85rem; color:var(--ink-soft);">
          內文
          <textarea name="bodyText" rows="3" style="padding:0.6rem; border:1px solid var(--line); border-radius:4px;">${escapeHtml(t.body_text || "")}</textarea>
        </label>
        <div class="batch-grid">
          <label>按鈕文字（選填）<input type="text" name="buttonText" value="${escapeHtml(t.button_text || "")}" maxlength="20"></label>
          <label>按鈕連結（選填，可用 {{liff_url}}）<input type="text" name="buttonUrl" value="${escapeHtml(t.button_url || "")}"></label>
        </div>
        <button type="submit" class="btn" style="align-self:start;">儲存</button>
      </form>
    </div>
  `;
  }).join("");

  return `
    <h1>訊息範本</h1>
    ${saved ? `<p class="success-msg">已儲存。</p>` : ""}
    <p style="color:var(--ink-soft); font-size:0.88rem; max-width:70ch; margin-bottom:1.5rem;">
      設定 LINE 自動通知的內容。有填圖片網址或標題時，會自動變成圖文卡片＋按鈕的樣式；都留空則維持純文字訊息。
    </p>
    ${sections}
  `;
}

export function settingsPage(masked, saved, error) {
  return `
    <h1>第三方串接設定</h1>
    ${saved ? `<p class="success-msg">已儲存，設定立即生效。</p>` : ""}
    ${error ? `<p class="error">${error}</p>` : ""}
    <p style="color:var(--ink-soft); font-size:0.88rem; max-width:60ch; margin-bottom:2rem;">
      這裡設定的是跟 LINE 官方帳號串接用的金鑰。欄位空白 = 保留目前的值不變，只有實際輸入新內容才會覆蓋更新。
      目前的值只顯示部分字元（開頭/結尾），避免完整金鑰暴露在畫面上。
    </p>
    <form method="POST" action="/admin/settings" class="settings-form">
      <label>Channel Secret（目前：${masked.LINE_CHANNEL_SECRET || "尚未設定"}）
        <input type="text" name="LINE_CHANNEL_SECRET" placeholder="留空表示不變更" autocomplete="off">
      </label>
      <label>Channel Access Token（目前：${masked.LINE_CHANNEL_ACCESS_TOKEN || "尚未設定"}）
        <input type="text" name="LINE_CHANNEL_ACCESS_TOKEN" placeholder="留空表示不變更" autocomplete="off">
      </label>
      <label>LIFF ID（目前：${masked.LIFF_ID || "尚未設定"}）
        <input type="text" name="LIFF_ID" placeholder="留空表示不變更" autocomplete="off">
      </label>
      <button type="submit" class="btn" style="align-self:start;">儲存設定</button>
    </form>
    <h1 style="margin-top:2.5rem;">安全通知</h1>
    <p style="color:var(--ink-soft); font-size:0.88rem; max-width:60ch; margin-bottom:1.5rem;">
      設定你自己的 LINE 使用者 ID，當有帳號從不常見的地區登入時，會用 LINE 官方帳號推播訊息通知你。
      要取得自己的 LINE 使用者 ID，可以先加官方帳號好友後傳一則訊息，再從「操作紀錄」或 LINE Developers 的 Webhook 記錄中查詢。
    </p>
    <form method="POST" action="/admin/settings" class="settings-form">
      <label>管理員 LINE 使用者 ID（目前：${masked.ADMIN_NOTIFY_LINE_USER_ID || "尚未設定"}）
        <input type="text" name="ADMIN_NOTIFY_LINE_USER_ID" placeholder="留空表示不變更" autocomplete="off">
      </label>
      <button type="submit" class="btn" style="align-self:start;">儲存設定</button>
    </form>
    <h1 style="margin-top:2.5rem;">機器人防護（Cloudflare Turnstile）</h1>
    <p style="color:var(--ink-soft); font-size:0.88rem; max-width:60ch; margin-bottom:1.5rem;">
      同時保護後台登入頁與客人線上預約頁，防止程式自動狂猜密碼或灌爆預約時段。設定後兩個頁面都會自動出現驗證元件；清空並儲存則會關閉此功能。
    </p>
    <form method="POST" action="/admin/settings" class="settings-form">
      <label>Site Key（目前：${masked.TURNSTILE_SITE_KEY || "尚未設定"}）
        <input type="text" name="TURNSTILE_SITE_KEY" placeholder="留空表示不變更" autocomplete="off">
      </label>
      <label>Secret Key（目前：${masked.TURNSTILE_SECRET_KEY || "尚未設定"}）
        <input type="text" name="TURNSTILE_SECRET_KEY" placeholder="留空表示不變更" autocomplete="off">
      </label>
      <button type="submit" class="btn" style="align-self:start;">儲存設定</button>
    </form>
    <h1 style="margin-top:2.5rem;">自訂後台登入路徑</h1>
    <p style="color:var(--ink-soft); font-size:0.88rem; max-width:60ch; margin-bottom:1.5rem;">
      把後台登入頁從預設的 <code>/admin</code> 換成一個只有你知道的路徑，防止被掃描工具找到登入頁。設定後，預設的 <code>/admin</code> 網址會直接顯示「找不到頁面」，只有新路徑能進去登入。<br>
      <strong>務必記住新路徑，忘記的話沒辦法用一般方式登入。</strong>路徑只能是英文字母、數字、連字號（-），例如 <code>/staff-portal-2026</code>。
    </p>
    ${masked.ADMIN_LOGIN_PATH ? `<p class="notice" style="background:#fff3cd; color:#8a6d00; padding:0.8rem 1rem; border-radius:4px; margin-bottom:1.2rem;">目前登入路徑：<strong>${escapeHtml(masked.ADMIN_LOGIN_PATH)}</strong>（預設的 /admin 已隱藏）</p>` : `<p style="color:var(--ink-soft); font-size:0.88rem; margin-bottom:1.2rem;">目前使用預設路徑 /admin，尚未自訂。</p>`}
    <form method="POST" action="/admin/settings" class="settings-form">
      <label>自訂路徑
        <input type="text" name="ADMIN_LOGIN_PATH" placeholder="例如 /staff-portal-2026，留空表示不變更" autocomplete="off">
      </label>
      <button type="submit" class="btn" style="align-self:start;">儲存並套用新路徑</button>
    </form>
    ${masked.ADMIN_LOGIN_PATH ? `
    <form method="POST" action="/admin/settings/reset-admin-path" style="margin-top:0.8rem;" onsubmit="return confirm('確定要恢復使用預設的 /admin 登入路徑嗎？');">
      <button type="submit" class="btn-outline">恢復使用預設路徑 /admin</button>
    </form>` : ""}
    <h1 style="margin-top:2.5rem;">預約規則設定</h1>
    <p style="color:var(--ink-soft); font-size:0.88rem; max-width:60ch; margin-bottom:1.5rem;">
      設定客人最晚可以在時段前多久預約／取消／改期，單位是小時。留空表示不變更，設為 0 表示不限制。
    </p>
    <form method="POST" action="/admin/settings" class="settings-form">
      <label>最晚多久前可以預約（目前：${masked.MIN_BOOKING_HOURS || "0"} 小時）
        <input type="number" name="MIN_BOOKING_HOURS" min="0" placeholder="例如 2，留空表示不變更" autocomplete="off">
      </label>
      <label>最晚多久前可以取消（目前：${masked.MIN_CANCEL_HOURS || "0"} 小時）
        <input type="number" name="MIN_CANCEL_HOURS" min="0" placeholder="例如 6，留空表示不變更" autocomplete="off">
      </label>
      <label>最晚多久前可以改期（目前：${masked.MIN_RESCHEDULE_HOURS || "0"} 小時）
        <input type="number" name="MIN_RESCHEDULE_HOURS" min="0" placeholder="例如 6，留空表示不變更" autocomplete="off">
      </label>
      <button type="submit" class="btn" style="align-self:start;">儲存設定</button>
    </form>
  `;
}

export const AUDIT_ACTION_LABELS = {
  login: "登入後台",
  update_booking_status: "更新預約狀態",
  create_slot: "新增時段",
  toggle_slot: "開關時段",
  delete_slot: "刪除時段",
  bulk_activate_slots: "批次開放時段",
  bulk_deactivate_slots: "批次關閉時段",
  bulk_delete_slots: "批次刪除時段",
  batch_create_slots: "批次建立時段",
  create_service: "新增服務項目",
  toggle_service: "啟用/停用服務項目",
  create_booking_manual: "手動建立預約",
  update_line_settings: "更新 LINE API 設定",
  update_message_template: "更新訊息範本",
  upload_template_image: "上傳範本圖片",
  delete_template_image: "刪除範本圖片",
  change_password: "修改密碼",
  close_today: "關閉今日預約",
  customer_cancel_booking: "客人自行取消預約",
  customer_reschedule_booking: "客人自行更改時段",
  create_account: "新增帳號",
  delete_account: "刪除帳號",
  reset_account_password: "重設帳號密碼",
  update_customer_note: "更新顧客標記／備註",
  create_stylist: "新增服務人員",
  toggle_stylist: "啟用/停用服務人員",
  delete_stylist: "刪除服務人員",
  update_stylist_schedule: "更新服務人員班表",
  delete_service: "刪除服務項目",
  export_customers_csv: "匯出顧客名單 CSV",
  import_customers_csv: "匯入顧客標記／備註 CSV",
  setup_completed: "完成系統初始化",
  export_bookings_csv: "匯出預約紀錄 CSV",
};

export function auditLogPage(logs, q) {
  const rows = logs.length ? logs.map((l) => `
    <tr>
      <td data-label="時間">${l.created_at}</td>
      <td data-label="操作者">${escapeHtml(l.actor)}</td>
      <td data-label="動作">${AUDIT_ACTION_LABELS[l.action] || escapeHtml(l.action)}</td>
      <td data-label="對象">${escapeHtml(l.target || "-")}</td>
      <td data-label="詳情">${escapeHtml(l.detail || "-")}</td>
    </tr>`).join("") : `<tr><td colspan="5" class="empty">沒有符合條件的紀錄。</td></tr>`;

  return `
    <h1>操作紀錄</h1>
    <form method="GET" action="/admin/audit-log" style="margin-bottom:1.5rem;">
      <input type="text" name="q" class="search-box" placeholder="搜尋操作者 / 動作 / 對象" value="${escapeHtml(q || "")}" style="width:280px;">
      <button type="submit" class="btn-outline">搜尋</button>
    </form>
    <table class="table-cards">
      <thead><tr><th>時間</th><th>操作者</th><th>動作</th><th>對象</th><th>詳情</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="color:var(--ink-soft); font-size:0.8rem; margin-top:1rem;">僅顯示最新 200 筆紀錄。</p>
  `;
}

export function loginHistoryPage(logs, q) {
  const rows = logs.length ? logs.map((l) => {
    const isAnomaly = l.success && l.is_first_from_country;
    return `
    <tr class="${l.success ? "" : "inactive-row"}">
      <td data-label="時間">${l.created_at}</td>
      <td data-label="帳號">${escapeHtml(l.username)}</td>
      <td data-label="IP">${escapeHtml(l.ip)}</td>
      <td data-label="地區">${l.country ? escapeHtml(l.country) : "-"}</td>
      <td data-label="結果">${l.success ? "🟢 成功" : "🔴 失敗"}${isAnomaly ? ` <span style="color:#b3261e;">⚠️ 新地區</span>` : ""}</td>
    </tr>`;
  }).join("") : `<tr><td colspan="5" class="empty">沒有符合條件的紀錄。</td></tr>`;

  return `
    <h1>登入紀錄</h1>
    <p style="color:var(--ink-soft); font-size:0.88rem; max-width:70ch; margin-bottom:1.5rem;">
      顯示所有後台帳號的登入嘗試（成功與失敗），可用來稽核是否有異常存取。「新地區」代表這個帳號第一次從這個地區成功登入。
    </p>
    <form method="GET" action="/admin/login-history" style="margin-bottom:1.5rem;">
      <input type="text" name="q" class="search-box" placeholder="搜尋帳號" value="${escapeHtml(q || "")}" style="width:280px;">
      <button type="submit" class="btn-outline">搜尋</button>
    </form>
    <table class="table-cards">
      <thead><tr><th>時間</th><th>帳號</th><th>IP</th><th>地區</th><th>結果</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="color:var(--ink-soft); font-size:0.8rem; margin-top:1rem;">僅顯示最新 200 筆紀錄。</p>
  `;
}

export function lineMessageLogPage(logs, q, result) {
  const rows = logs.length ? logs.map((l) => `
    <tr class="${l.success ? "" : "inactive-row"}">
      <td data-label="時間">${l.created_at}</td>
      <td data-label="類型">${l.direction === "push" ? "推播" : "回覆"}</td>
      <td data-label="用途">${escapeHtml(l.purpose)}</td>
      <td data-label="對象">${escapeHtml(l.recipient_name || "-")}</td>
      <td data-label="結果">${l.success ? "🟢 成功" : "🔴 失敗"}</td>
      <td data-label="失敗原因">${l.error_message ? escapeHtml(l.error_message) : "-"}</td>
    </tr>`).join("") : `<tr><td colspan="6" class="empty">沒有符合條件的紀錄。</td></tr>`;

  const resultOptions = [["all", "全部結果"], ["success", "只看成功"], ["failed", "只看失敗"]]
    .map(([v, label]) => `<option value="${v}" ${result === v ? "selected" : ""}>${label}</option>`)
    .join("");

  return `
    <h1>LINE 通知紀錄</h1>
    <p style="color:var(--ink-soft); font-size:0.88rem; max-width:70ch; margin-bottom:1.5rem;">
      記錄系統透過 LINE 官方帳號發送過的所有通知（預約成立、狀態變更、預約提醒、異常登入警示、聊天自動回覆），包含發送失敗的原因，方便排查客人「說沒收到通知」的狀況。
    </p>
    <form method="GET" action="/admin/line-messages" style="margin-bottom:1.5rem; display:flex; gap:0.6rem; flex-wrap:wrap;">
      <input type="text" name="q" class="search-box" placeholder="搜尋對象 / 用途" value="${escapeHtml(q || "")}" style="width:240px;">
      <select name="result" class="search-box" onchange="this.form.requestSubmit()">${resultOptions}</select>
      <button type="submit" class="btn-outline">搜尋</button>
    </form>
    <table class="table-cards">
      <thead><tr><th>時間</th><th>類型</th><th>用途</th><th>對象</th><th>結果</th><th>失敗原因</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="color:var(--ink-soft); font-size:0.8rem; margin-top:1rem;">僅顯示最新 200 筆紀錄。</p>
  `;
}

export function accountsPage(accounts, currentUserId, error, added) {
  const rows = accounts.length ? accounts.map((a) => `
    <tr>
      <td data-label="帳號">${escapeHtml(a.username)}</td>
      <td data-label="角色">${a.role === "admin" ? "管理員" : "員工（僅預約相關）"}</td>
      <td data-label="建立時間">${a.created_at}</td>
      <td data-label="操作" style="display:flex; gap:0.6rem; align-items:center; flex-wrap:wrap;">
        ${a.id === currentUserId
          ? `<span style="color:var(--ink-soft);">目前登入中</span>`
          : `<a href="/admin/accounts/${a.id}/password" class="btn-outline">重設密碼</a>
            <form method="POST" action="/admin/accounts/${a.id}/delete" style="margin:0;" onsubmit="return confirm('確定要刪除帳號「${escapeHtml(a.username)}」嗎？');">
              <button type="submit" class="delete-btn">刪除</button>
            </form>`}
      </td>
    </tr>`).join("") : `<tr><td colspan="4" class="empty">目前沒有其他帳號。</td></tr>`;

  return `
    <h1>帳號管理</h1>
    <p style="color:var(--ink-soft); font-size:0.88rem; max-width:70ch; margin-bottom:1.5rem;">
      新增其他人可以登入後台的帳號（例如員工、合作夥伴）。每個帳號各自登入、各自的操作都會記錄在「操作紀錄」中。<br>
      「員工」權限只能使用總覽、預約管理、行事曆（時段開關）、顧客、以及自己的密碼設定；看不到服務項目、公休日、報表、第三方串接、訊息範本、操作紀錄、帳號管理等後台設定。
    </p>
    ${added ? `<p class="success-msg">帳號已新增。</p>` : ""}
    ${error ? `<p class="error">${error}</p>` : ""}
    <form method="POST" action="/admin/accounts" class="inline-add" style="margin-bottom:2rem;">
      <label>帳號<input type="text" name="username" required minlength="3" maxlength="40" autocomplete="off"></label>
      <label>密碼（至少 8 碼，需同時包含英文與數字）<input type="password" name="password" required minlength="8" autocomplete="new-password" oninput="this.setCustomValidity((this.value.length>=8 &amp;&amp; /[A-Za-z]/.test(this.value) &amp;&amp; /[0-9]/.test(this.value)) ? '' : '密碼至少需要 8 碼，且需同時包含英文字母與數字。')"></label>
      <label>權限<select name="role">
        <option value="staff" selected>員工（僅預約相關）</option>
        <option value="admin">管理員（完整權限）</option>
      </select></label>
      <button type="submit" class="btn">新增帳號</button>
    </form>
    <table class="table-cards">
      <thead><tr><th>帳號</th><th>角色</th><th>建立時間</th><th>操作</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

export function resetAccountPasswordPage(account, error) {
  return `
    <h1>重設密碼</h1>
    <p style="color:var(--ink-soft); font-size:0.88rem; margin-bottom:1.5rem;">
      正在為帳號「${escapeHtml(account.username)}」設定新密碼。設定後該帳號目前登入中的 session 會全部登出，需要用新密碼重新登入。
    </p>
    ${error ? `<p class="error">${error}</p>` : ""}
    <form method="POST" action="/admin/accounts/${account.id}/password" class="settings-form" style="max-width:420px;">
      <label>新密碼（至少 8 碼，需同時包含英文與數字）
        <input type="password" name="newPassword" required minlength="8" autocomplete="new-password" oninput="this.setCustomValidity((this.value.length>=8 &amp;&amp; /[A-Za-z]/.test(this.value) &amp;&amp; /[0-9]/.test(this.value)) ? '' : '密碼至少需要 8 碼，且需同時包含英文字母與數字。')">
      </label>
      <label>確認新密碼
        <input type="password" name="confirmPassword" required minlength="8" autocomplete="new-password">
      </label>
      <div style="display:flex; gap:0.8rem;">
        <button type="submit" class="btn" style="align-self:start;">更新密碼</button>
        <a href="/admin/accounts" class="btn-outline" style="align-self:center;">取消</a>
      </div>
    </form>
  `;
}

export function accountPage(username, error, saved) {
  return `
    <h1>系統設定</h1>
    ${saved ? `<p class="success-msg">密碼已更新，下次登入請使用新密碼。</p>` : ""}
    ${error ? `<p class="error">${error}</p>` : ""}
    <form method="POST" action="/admin/account/password" class="settings-form" style="max-width:420px;">
      <label>帳號
        <input type="text" value="${escapeHtml(username)}" disabled style="background:var(--bg-alt); color:var(--ink-soft);">
      </label>
      <label>目前密碼
        <input type="password" name="currentPassword" required autocomplete="current-password">
      </label>
      <label>新密碼（至少 8 碼，需同時包含英文與數字）
        <input type="password" name="newPassword" required minlength="8" autocomplete="new-password" oninput="this.setCustomValidity((this.value.length>=8 &amp;&amp; /[A-Za-z]/.test(this.value) &amp;&amp; /[0-9]/.test(this.value)) ? '' : '密碼至少需要 8 碼，且需同時包含英文字母與數字。')">
      </label>
      <label>確認新密碼
        <input type="password" name="confirmPassword" required minlength="8" autocomplete="new-password">
      </label>
      <button type="submit" class="btn" style="align-self:start;">更新密碼</button>
    </form>
  `;
}

const MSG_TEXT = {
  cancelled: "您的預約已取消。",
  rescheduled: "已為您更改預約時間，新的時段待確認。",
  already: "這筆預約目前狀態無法再取消或更改。",
  cannot_change: "這筆預約目前狀態無法再取消或更改。",
  invalid_slot: "選擇的時段無效，請重新選擇。",
  slot_full: "很抱歉，這個時段剛好被約滿了，請選擇其他時段。",
  too_late_to_cancel: "已經太接近預約時間，無法再取消，請直接與我們聯繫。",
  too_late_to_reschedule: "已經太接近預約時間，無法再更改時段，請直接與我們聯繫。",
};

const PAGE_BASE_STYLE = `
<style>
  body { margin:0; font-family:"Noto Sans TC","PingFang TC",sans-serif; background:#fff; color:#16181c; padding:1.5rem; max-width:480px; }
  h1 { font-size:1.2rem; margin-bottom:1.2rem; }
  .info-row { display:flex; justify-content:space-between; padding:0.7rem 0; border-bottom:1px solid #e4e4e0; font-size:0.92rem; }
  .info-row .k { color:#55585f; }
  .notice { padding:0.8rem 1rem; background:#f6f6f4; border-radius:4px; font-size:0.88rem; margin-bottom:1.2rem; }
  .btn { display:inline-block; width:100%; box-sizing:border-box; text-align:center; padding:0.85rem; background:#16181c; color:#fff; border:none; font-size:0.92rem; text-decoration:none; margin-top:0.8rem; cursor:pointer; }
  .btn-danger { background:#fff; color:#b3261e; border:1px solid #b3261e; }
  select { width:100%; padding:0.7rem; border:1px solid #e4e4e0; font-size:0.92rem; margin-top:0.6rem; }
  .empty { color:#55585f; font-size:0.88rem; }
</style>
`;

export function myBookingPage(booking, availableSlots, msgKey, token) {
  if (!booking) {
    return `<!doctype html><html lang="zh-Hant"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>找不到預約｜${APP_NAME}</title>${PAGE_BASE_STYLE}</head>
    <body><h1>找不到這筆預約</h1><p class="empty">連結可能有誤或已失效，請透過官方帳號重新確認。</p></body></html>`;
  }

  const canModify = booking.status === "pending" || booking.status === "confirmed";
  const slotOptions = availableSlots.map((s) =>
    `<option value="${s.id}">${s.slot_date} ${s.slot_time}（剩 ${s.capacity - s.booked_count} 位）</option>`
  ).join("");

  return `<!doctype html><html lang="zh-Hant"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>我的預約｜${APP_NAME}</title>${PAGE_BASE_STYLE}</head>
  <body>
    <h1>我的預約</h1>
    ${msgKey && MSG_TEXT[msgKey] ? `<div class="notice">${MSG_TEXT[msgKey]}</div>` : ""}
    <div class="info-row"><span class="k">服務項目</span><span>${escapeHtml(booking.service_name)}</span></div>
    <div class="info-row"><span class="k">時段</span><span>${booking.slot_date} ${booking.slot_time}</span></div>
    <div class="info-row"><span class="k">姓名</span><span>${escapeHtml(booking.customer_name)}</span></div>
    <div class="info-row"><span class="k">狀態</span><span>${statusBadge(booking.status)}</span></div>

    ${canModify ? `
      <form method="POST" action="/my-booking/reschedule?token=${token}" style="margin-top:1.5rem;">
        <label style="font-size:0.85rem; color:#55585f;">更改時段</label>
        ${slotOptions ? `
          <select name="newSlotId" required>${slotOptions}</select>
          <button type="submit" class="btn">確認更改時段</button>
        ` : `<p class="empty">目前沒有其他可預約的時段。</p>`}
      </form>
      <form method="POST" action="/my-booking/cancel?token=${token}" onsubmit="return confirm('確定要取消這筆預約嗎？');">
        <button type="submit" class="btn btn-danger">取消這筆預約</button>
      </form>
    ` : `<p class="empty" style="margin-top:1.5rem;">這筆預約目前狀態無法再取消或更改時段。</p>`}
  </body></html>`;
}

export function liffBookingPage(liffId, turnstileSiteKey) {
  return `<!doctype html><html lang="zh-Hant"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>線上預約｜${APP_NAME}</title>
  <style>
    body { margin:0; font-family:"Noto Sans TC","PingFang TC",sans-serif; background:#fff; color:#16181c; padding:1.5rem; }
    h1 { font-size:1.2rem; margin-bottom:1rem; }
    label { display:block; font-size:0.85rem; color:#55585f; margin:1rem 0 0.4rem; }
    input, select, textarea { width:100%; padding:0.7rem; border:1px solid #e4e4e0; font-size:0.95rem; box-sizing:border-box; line-height:1.4; -webkit-appearance:none; appearance:none; border-radius:0; background-color:#fff; }
    input[type=date], input[type=time] { min-height:2.9rem; }
    select { background-image:url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2355585f' stroke-width='2'%3e%3cpolyline points='6 9 12 15 18 9'/%3e%3c/svg%3e"); background-repeat:no-repeat; background-position:right 0.7rem center; background-size:1rem; padding-right:2.2rem; }
    button { width:100%; margin-top:1.5rem; padding:0.9rem; background:#16181c; color:#fff; border:none; font-size:0.95rem; }
    #status { margin-top:1rem; font-size:0.88rem; }
    .slot-empty { color:#55585f; font-size:0.88rem; }
  </style>
  <script src="https://static.line-scdn.net/liff/edge/2/sdk.js"></script>
  ${turnstileSiteKey ? `<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>` : ""}
  </head>
  <body>
    <h1>線上預約諮詢</h1>
    <form id="bookingForm">
      <label>選擇預約項目</label>
      <select name="serviceTypeId" id="serviceSelect" required><option value="">載入中...</option></select>
      <label id="stylistLabel" style="display:none;">選擇服務人員</label>
      <select name="stylistId" id="stylistSelect" style="display:none;" disabled><option value="">請先選擇預約項目</option></select>
      <label>選擇日期</label>
      <input type="date" name="date" id="dateInput" required disabled>
      <label>選擇時段</label>
      <select name="slotId" id="slotSelect" required disabled><option value="">請先選擇預約項目與日期</option></select>
      <label>姓名</label>
      <input type="text" name="name" required>
      <label>聯絡電話</label>
      <input type="tel" name="phone" required>
      <label>Email（選填）</label>
      <input type="email" name="email">
      <label>備註需求（選填）</label>
      <textarea name="note" rows="3"></textarea>
      ${turnstileSiteKey ? `<div class="cf-turnstile" data-sitekey="${escapeHtml(turnstileSiteKey)}" style="margin-top:1rem;"></div>` : ""}
      <button type="submit">送出預約</button>
      <div id="status"></div>
    </form>
    <script>
      const LIFF_ID = ${JSON.stringify(liffId || "")};
      let lineUserId = "";
      let lineDisplayName = "";
      async function initLiff() {
        if (!LIFF_ID) return;
        try {
          await liff.init({ liffId: LIFF_ID });
          if (liff.isLoggedIn()) {
            const profile = await liff.getProfile();
            lineUserId = profile.userId;
            lineDisplayName = profile.displayName || "";
          }
        } catch (e) { console.warn("LIFF init skipped", e); }
      }
      initLiff();

      const serviceSelect = document.getElementById('serviceSelect');
      const stylistLabel = document.getElementById('stylistLabel');
      const stylistSelect = document.getElementById('stylistSelect');
      const dateInput = document.getElementById('dateInput');
      const slotSelect = document.getElementById('slotSelect');

      async function loadServices() {
        try {
          const res = await fetch('/api/services');
          const data = await res.json();
          if (!data.services || !data.services.length) {
            serviceSelect.innerHTML = '<option value="">目前沒有可預約的項目</option>';
            return;
          }
          serviceSelect.innerHTML = '<option value="">請選擇預約項目</option>' +
            data.services.map(s => '<option value="' + s.id + '">' + s.name + '</option>').join('');
        } catch {
          serviceSelect.innerHTML = '<option value="">載入失敗，請重新整理</option>';
        }
      }
      loadServices();

      function resetDateAndSlot(keepDate) {
        if (!keepDate) dateInput.value = '';
        dateInput.disabled = true;
        slotSelect.disabled = true;
        slotSelect.innerHTML = '<option value="">請先選擇日期</option>';
      }

      async function loadSlotsForCurrentDate() {
        if (!dateInput.value || !serviceSelect.value) return;
        slotSelect.disabled = true;
        slotSelect.innerHTML = '<option value="">載入中...</option>';
        let url = '/api/booking/slots?date=' + dateInput.value + '&serviceTypeId=' + serviceSelect.value;
        if (stylistSelect.value) url += '&stylistId=' + stylistSelect.value;
        const res = await fetch(url);
        const data = await res.json();
        if (!data.slots || !data.slots.length) {
          slotSelect.innerHTML = '<option value="">這天沒有可預約時段</option>';
          return;
        }
        slotSelect.disabled = false;
        slotSelect.innerHTML = data.slots.map(s =>
          '<option value="' + s.id + '">' + s.slot_time + (s.stylist_name ? '・' + s.stylist_name : '') + '（剩 ' + (s.capacity - s.booked_count) + ' 位）</option>'
        ).join('');
      }

      let stylistsById = {};

      function maxDateStr(daysAhead) {
        const d = new Date();
        d.setDate(d.getDate() + daysAhead);
        return d.toISOString().slice(0, 10);
      }

      function applyDateMax() {
        const s = stylistsById[stylistSelect.value];
        if (s && s.max_advance_days) {
          dateInput.max = maxDateStr(s.max_advance_days);
        } else {
          dateInput.removeAttribute('max');
        }
      }

      serviceSelect.addEventListener('change', async () => {
        const keptDate = dateInput.value;
        resetDateAndSlot(true);
        dateInput.removeAttribute('max');
        stylistLabel.style.display = 'none';
        stylistSelect.style.display = 'none';
        stylistSelect.value = '';
        stylistsById = {};
        if (!serviceSelect.value) { dateInput.value = ''; return; }

        stylistSelect.disabled = true;
        stylistSelect.innerHTML = '<option value="">載入中...</option>';
        try {
          const res = await fetch('/api/stylists?serviceTypeId=' + serviceSelect.value);
          const data = await res.json();
          if (data.stylists && data.stylists.length) {
            data.stylists.forEach(s => { stylistsById[s.id] = s; });
            stylistLabel.style.display = '';
            stylistSelect.style.display = '';
            stylistSelect.disabled = false;
            stylistSelect.innerHTML = '<option value="">不指定（任何服務人員皆可）</option>' +
              data.stylists.map(s => '<option value="' + s.id + '">' + s.name + '</option>').join('');
          } else {
            dateInput.disabled = false;
          }
        } catch {
          dateInput.disabled = false;
        }

        applyDateMax();
        if (keptDate && (!dateInput.max || keptDate <= dateInput.max)) {
          dateInput.value = keptDate;
          await loadSlotsForCurrentDate();
        }
      });

      stylistSelect.addEventListener('change', async () => {
        dateInput.disabled = false;
        applyDateMax();
        if (dateInput.value && (!dateInput.max || dateInput.value <= dateInput.max)) {
          await loadSlotsForCurrentDate();
        }
      });

      dateInput.addEventListener('change', loadSlotsForCurrentDate);

      document.getElementById('bookingForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const statusEl = document.getElementById('status');
        statusEl.textContent = '送出中...';
        const turnstileToken = (document.querySelector('[name="cf-turnstile-response"]') || {}).value || '';
        const payload = {
          slotId: form.slotId.value,
          name: form.name.value,
          phone: form.phone.value,
          email: form.email.value,
          note: form.note.value,
          lineUserId,
          lineDisplayName,
          turnstileToken,
        };
        try {
          const res = await fetch('/api/booking', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const result = await res.json();
          if (res.ok && result.ok) {
            statusEl.innerHTML = '預約成功！我們會盡快與您聯繫確認。' +
              (result.manageUrl ? '<br><a href="' + result.manageUrl + '" target="_blank" style="color:#1f6f5c;">點此查看／取消／更改我的預約</a>' : '');
            form.reset();
            if (window.turnstile) turnstile.reset();
          } else {
            const errMsg = {
              slot_full: '很抱歉，這個時段剛好被約滿了，請選擇其他時段。',
              too_late_to_book: '這個時段已經太接近，無法預約，請選擇較晚的時段。',
              slot_not_found: '選擇的時段無效，請重新選擇。',
              missing_fields: '請完整填寫必填欄位。',
              turnstile_failed: '機器人驗證未完成或已過期，請重新勾選驗證後再送出。',
              invalid_phone: '電話號碼格式看起來不正確，請確認後再試一次。',
              blocked: '很抱歉，目前無法為此帳號受理線上預約，請直接與我們聯繫。',
            }[result.error] || result.error || '請稍後再試';
            statusEl.textContent = '預約失敗：' + errMsg;
            if (window.turnstile) turnstile.reset();
          }
        } catch {
          statusEl.textContent = '預約失敗，請稍後再試。';
        }
      });
    </script>
  </body></html>`;
}
