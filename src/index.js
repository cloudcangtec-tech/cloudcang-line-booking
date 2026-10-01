import { hashPassword, verifyPassword, newSessionId, parseCookies, getAuthedAdmin, sessionCookie, clearSessionCookie } from "./auth.js";
import { verifyLineSignature, replyMessage, pushMessage } from "./line.js";
import {
  loginPage, adminLayout, dashboardPage, bookingsPage, newBookingPage,
  customersPage, servicesPage, addonsPage, slotsPage, stylistsPage, stylistSchedulePage, settingsPage, accountPage, accountsPage, resetAccountPasswordPage,
  loginHistoryPage, lineMessageLogPage, setupPage, setupDonePage, setupSuccessPage,
  messagesPage, liffBookingPage, myBookingPage, auditLogPage, AUDIT_ACTION_LABELS,
  closedDatesPage, reportsPage, escapeHtml, shopProfilePage, lineRichMenuPage,
} from "./templates.js";
import { getLineSetting, getAllLineSettings, setLineSetting, maskSecret, LINE_SETTING_KEYS } from "./settings.js";
import {
  getTemplate, getAllTemplates, saveTemplate, buildLineMessage, TEMPLATE_KEYS, TEMPLATE_LABELS,
  saveTemplateImage, deleteTemplateImage, getTemplateImage,
} from "./messages.js";
import {
  MAX_BANNERS, getLogo, hasLogo, saveLogo, deleteLogo,
  listBanners, getBannerImage, saveBanner, deleteBanner, moveBanner,
  listPortfolio, getPortfolioImage, savePortfolioImage, deletePortfolioImage, movePortfolioImage,
} from "./shop.js";

const SESSION_MAX_AGE = 60 * 60 * 8; // 8 小時
const LOGIN_WINDOW_MINUTES = 15;
const LOGIN_MAX_ATTEMPTS = 5;

// ---------- 小工具 ----------
function isStaffAllowedPath(path) {
  if (path === "/admin") return true;
  if (path === "/admin/quick/close-today") return true;
  if (path === "/admin/account" || path === "/admin/account/password") return true;
  if (path === "/admin/bookings" || path.startsWith("/admin/bookings/")) return true;
  if (path === "/admin/slots" || path.startsWith("/admin/slots/")) return true;
  if (path === "/admin/stylists" || path.startsWith("/admin/stylists/")) return true;
  if (path === "/admin/customers" || path.startsWith("/admin/customers/")) return true;
  return false;
}

function pad2(n) { return String(n).padStart(2, "0"); }
function dstr(y, m, d) { return `${y}-${pad2(m)}-${pad2(d)}`; }
function daysInMonth(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
function firstWeekdayMon0(y, m) {
  const jsDay = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(); // 0=Sun..6=Sat
  return (jsDay + 6) % 7; // 0=Mon..6=Sun
}
function taipeiNow() {
  return new Date(Date.now() + 8 * 3600 * 1000);
}
function taipeiTodayStr() {
  const now = taipeiNow();
  return dstr(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate());
}
function taipeiTodayParts() {
  const now = taipeiNow();
  return { y: now.getUTCFullYear(), m: now.getUTCMonth() + 1, d: now.getUTCDate() };
}
function hoursUntilSlot(slotDate, slotTime) {
  const [y, m, d] = slotDate.split("-").map(Number);
  const [hh, mm] = slotTime.split(":").map(Number);
  const slotUtcMs = Date.UTC(y, m - 1, d, hh, mm) - 8 * 3600 * 1000;
  return (slotUtcMs - Date.now()) / 3600000;
}
function addDaysToDateStr(dateStr, days) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dstr(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}
function weekdayMon1(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const jsDay = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun..6=Sat
  return jsDay === 0 ? 7 : jsDay; // 1=Mon..7=Sun
}

function isSameOrigin(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  const url = new URL(request.url);
  return origin === url.origin;
}

async function recordLoginAttempt(env, username, ip, success, country) {
  await env.DB.prepare(
    `INSERT INTO login_attempts (username, ip, success, country) VALUES (?, ?, ?, ?)`
  ).bind(username, ip, success ? 1 : 0, country || null).run();
}

function isPasswordComplexEnough(password) {
  if (password.length < 8) return false;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  return hasLetter && hasDigit;
}

function isValidPhone(phone) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return false;
  if (/^(\d)\1+$/.test(digits)) return false; // 全部同一個數字，例如 0000000000
  return true;
}

async function isCustomerBlocked(env, phone, lineUserId) {
  const direct = await env.DB.prepare(`SELECT tag FROM customer_notes WHERE phone = ?`).bind(phone).first();
  if (direct && direct.tag === "blocked") return true;
  if (!lineUserId) return false;

  const { results } = await env.DB.prepare(
    `SELECT DISTINCT cn.tag FROM bookings b
     JOIN customer_notes cn ON cn.phone = b.customer_phone
     WHERE b.line_user_id = ? AND cn.tag = 'blocked'`
  ).bind(lineUserId).all();
  return results.length > 0;
}

// ---------- LINE 訊息發送紀錄 ----------
async function sendLineAndLog(env, { direction, purpose, to, name, replyToken, messages, accessToken }) {
  let result;
  try {
    result = direction === "push"
      ? await pushMessage(to, messages, accessToken)
      : await replyMessage(replyToken, messages, accessToken);
  } catch (e) {
    result = { ok: false, error: String((e && e.message) || e).slice(0, 300) };
  }
  try {
    await env.DB.prepare(
      `INSERT INTO line_message_log (direction, purpose, recipient_line_user_id, recipient_name, success, error_message)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(direction, purpose, to || null, name || null, result.ok ? 1 : 0, result.ok ? null : (result.error || "未知錯誤")).run();
  } catch (e) { /* 紀錄本身失敗不應該讓通知流程整個中斷 */ }
  return result;
}

// ---------- 首次啟動精靈 ----------
async function isSetupCompleted(env) {
  const row = await env.DB.prepare(`SELECT value FROM settings WHERE key = 'SETUP_COMPLETED'`).first();
  return !!(row && row.value === "1");
}

async function handleSetupPage(request, env) {
  if (await isSetupCompleted(env)) {
    return new Response(setupDonePage(), { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
  return new Response(setupPage(null), { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

async function handleSetupSubmit(request, env) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  if (await isSetupCompleted(env)) {
    return new Response(setupDonePage(), { status: 403, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  const form = await request.formData();
  const siteName = String(form.get("siteName") || "").trim().slice(0, 50);
  const username = String(form.get("username") || "").trim().slice(0, 50);
  const password = String(form.get("password") || "");
  const lineChannelSecret = String(form.get("lineChannelSecret") || "").trim();
  const lineAccessToken = String(form.get("lineAccessToken") || "").trim();
  const liffId = String(form.get("liffId") || "").trim();
  const serviceName = String(form.get("serviceName") || "").trim().slice(0, 50);
  const serviceDuration = parseInt(form.get("serviceDuration"), 10);
  const stylistName = String(form.get("stylistName") || "").trim().slice(0, 50);

  const values = { siteName, username, lineChannelSecret, lineAccessToken, liffId, serviceName, serviceDuration: form.get("serviceDuration") || "", stylistName };

  const errors = [];
  if (!siteName) errors.push("請填寫站名。");
  if (!username) errors.push("請填寫管理員帳號。");
  if (!isPasswordComplexEnough(password)) errors.push("管理員密碼至少需要 8 碼，且需同時包含英文字母與數字。");
  if (!serviceName) errors.push("請至少建立一個服務項目（名稱）。");
  if (!serviceDuration || serviceDuration <= 0) errors.push("服務時長需為正整數（分鐘）。");

  if (errors.length) {
    return new Response(setupPage(errors, values), { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  const existingUser = await env.DB.prepare(`SELECT id FROM admin_users WHERE username = ?`).bind(username).first();
  if (existingUser) {
    return new Response(setupPage(["這個帳號名稱已經被使用，請換一個。"], values), { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  // 再檢查一次是否已經被別的請求搶先完成（避免極端情況下重複初始化）
  if (await isSetupCompleted(env)) {
    return new Response(setupDonePage(), { status: 403, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  const { hash, salt } = await hashPassword(password);
  await env.DB.prepare(
    `INSERT INTO admin_users (username, password_hash, password_salt, role) VALUES (?, ?, ?, 'admin')`
  ).bind(username, hash, salt).run();

  await env.DB.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES ('SITE_NAME', ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).bind(siteName).run();

  if (lineChannelSecret) await setLineSetting(env, "LINE_CHANNEL_SECRET", lineChannelSecret);
  if (lineAccessToken) await setLineSetting(env, "LINE_CHANNEL_ACCESS_TOKEN", lineAccessToken);
  if (liffId) await setLineSetting(env, "LIFF_ID", liffId);

  await env.DB.prepare(
    `INSERT INTO service_types (name, duration_minutes, active) VALUES (?, ?, 1)`
  ).bind(serviceName, serviceDuration).run();

  if (stylistName) {
    await env.DB.prepare(`INSERT INTO stylists (name, active) VALUES (?, 1)`).bind(stylistName).run();
  }

  await env.DB.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES ('SETUP_COMPLETED', '1', datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).run();

  await writeAuditLog(env, username, "setup_completed", null, `site=${siteName}`);

  return new Response(setupSuccessPage(username), { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

async function checkAndNotifyUnusualLogin(env, username, country) {
  if (!country || country === "unknown") return;
  const seen = await env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM login_attempts WHERE username = ? AND success = 1 AND country = ?`
  ).bind(username, country).first();
  if (seen.cnt > 0) return; // 這個地區之前成功登入過，不算異常

  const priorSuccess = await env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM login_attempts WHERE username = ? AND success = 1`
  ).bind(username).first();
  if (priorSuccess.cnt === 0) return; // 第一次登入，還沒有任何歷史紀錄可比對，不算異常

  const notifyUserId = await getLineSetting(env, "ADMIN_NOTIFY_LINE_USER_ID");
  const accessToken = await getLineSetting(env, "LINE_CHANNEL_ACCESS_TOKEN");
  if (!notifyUserId || !accessToken) return;

  const text = `⚠️ 異常登入警示\n帳號「${username}」剛從不常見的地區（${country}）成功登入後台。\n如果不是你本人操作，請盡快到「帳號管理」重設密碼。`;
  await sendLineAndLog(env, {
    direction: "push", purpose: "異常登入警示", to: notifyUserId, name: "管理員",
    messages: [{ type: "text", text }], accessToken,
  });
}

async function isLoginLocked(env, username, ip) {
  const row = await env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM login_attempts
     WHERE username = ? AND ip = ? AND success = 0
     AND created_at > datetime('now', '-${LOGIN_WINDOW_MINUTES} minutes')`
  ).bind(username, ip).first();
  return row.cnt >= LOGIN_MAX_ATTEMPTS;
}

async function writeAuditLog(env, actor, action, target, detail) {
  await env.DB.prepare(
    `INSERT INTO audit_log (actor, action, target, detail) VALUES (?, ?, ?, ?)`
  ).bind(actor, action, target || null, detail || null).run();
}

function redirectTo(location) {
  return new Response(null, { status: 302, headers: { Location: location } });
}

// ---------- 登入 / 登出 ----------
async function verifyTurnstileToken(secretKey, token, ip) {
  if (!secretKey) return true; // 尚未設定 Turnstile，視為不啟用此檢查
  if (!token) return false;
  const body = new URLSearchParams({ secret: secretKey, response: token });
  if (ip && ip !== "unknown") body.append("remoteip", ip);
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const result = await res.json();
  return result.success === true;
}

async function handleAdminLogin(request, env, loginEntryPath) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const loginPostPath = `${loginEntryPath || "/admin"}/login`;
  const form = await request.formData();
  const username = String(form.get("username") || "").trim();
  const password = String(form.get("password") || "");
  const turnstileToken = String(form.get("cf-turnstile-response") || "");
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const country = (request.cf && request.cf.country) || "unknown";
  const turnstileSiteKey = await getLineSetting(env, "TURNSTILE_SITE_KEY");
  const turnstileSecretKey = await getLineSetting(env, "TURNSTILE_SECRET_KEY");

  if (await isLoginLocked(env, username, ip)) {
    return new Response(loginPage("嘗試次數過多，請 15 分鐘後再試。", turnstileSiteKey, loginPostPath), {
      status: 429, headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const turnstileOk = await verifyTurnstileToken(turnstileSecretKey, turnstileToken, ip);
  if (!turnstileOk) {
    return new Response(loginPage("請完成機器人驗證後再試一次。", turnstileSiteKey, loginPostPath), {
      status: 400, headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const user = await env.DB.prepare(`SELECT * FROM admin_users WHERE username = ?`).bind(username).first();
  const valid = user ? await verifyPassword(password, user.password_hash, user.password_salt) : false;

  // 必須在寫入這次登入紀錄「之前」比對歷史地區，不然這次登入自己也會被算進去
  if (valid) await checkAndNotifyUnusualLogin(env, username, country);
  await recordLoginAttempt(env, username, ip, valid, country);

  if (!valid) {
    return new Response(loginPage("帳號或密碼錯誤。", turnstileSiteKey, loginPostPath), {
      status: 401, headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const sid = newSessionId();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000).toISOString().replace("Z", "");
  await env.DB.prepare(`INSERT INTO sessions (id, admin_user_id, expires_at) VALUES (?, ?, ?)`).bind(sid, user.id, expiresAt).run();
  await writeAuditLog(env, username, "login", null, `ip=${ip}`);

  return new Response(null, {
    status: 302,
    headers: { Location: "/admin", "Set-Cookie": sessionCookie(sid, SESSION_MAX_AGE) },
  });
}

async function handleAdminLogout(request, env, loginEntryPath) {
  const cookies = parseCookies(request);
  const sid = cookies["admin_session"];
  if (sid) await env.DB.prepare(`DELETE FROM sessions WHERE id = ?`).bind(sid).run();
  return new Response(null, { status: 302, headers: { Location: loginEntryPath || "/admin", "Set-Cookie": clearSessionCookie() } });
}

// ---------- Dashboard ----------
async function handleAdminDashboard(request, env, admin) {
  const today = taipeiTodayStr();
  const weekEnd = addDaysToDateStr(today, 6);

  const todayBookingsRes = await env.DB.prepare(
    `SELECT b.id, b.customer_name, b.status, t.slot_time, s.name as service_name
     FROM bookings b JOIN time_slots t ON t.id = b.time_slot_id JOIN service_types s ON s.id = t.service_type_id
     WHERE t.slot_date = ? AND b.status != 'cancelled'
     ORDER BY t.slot_time ASC`
  ).bind(today).all();
  const todayBookings = todayBookingsRes.results;

  const pendingTodayCount = todayBookings.filter((b) => b.status === "pending").length;

  const weekCountRow = await env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM bookings b JOIN time_slots t ON t.id = b.time_slot_id
     WHERE t.slot_date BETWEEN ? AND ? AND b.status != 'cancelled'`
  ).bind(today, weekEnd).first();

  const remainingRow = await env.DB.prepare(
    `SELECT COALESCE(SUM(capacity - booked_count), 0) as remaining FROM time_slots
     WHERE slot_date = ? AND active = 1`
  ).bind(today).first();

  const pendingBookingsRes = await env.DB.prepare(
    `SELECT b.id, b.customer_name, b.status, t.slot_date, t.slot_time, s.name as service_name
     FROM bookings b JOIN time_slots t ON t.id = b.time_slot_id JOIN service_types s ON s.id = t.service_type_id
     WHERE b.status = 'pending'
     ORDER BY t.slot_date ASC, t.slot_time ASC
     LIMIT 15`
  ).all();

  const now = taipeiNow();
  const greetingDate = `${now.getUTCFullYear()} 年 ${now.getUTCMonth() + 1} 月 ${now.getUTCDate()} 日`;

  const recentLineMessages = (await env.DB.prepare(
    `SELECT * FROM line_message_log ORDER BY id DESC LIMIT 8`
  ).all()).results;
  const failedTodayRow = await env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM line_message_log WHERE success = 0 AND created_at >= datetime('now', '-1 day')`
  ).first();

  const body = dashboardPage({
    todayCount: todayBookings.length,
    pendingTodayCount,
    weekCount: weekCountRow.cnt,
    remainingToday: remainingRow.remaining,
    todayBookings,
    pendingBookings: pendingBookingsRes.results,
    greetingDate,
    recentLineMessages,
    failedLineMessagesCount: failedTodayRow.cnt,
  });
  return new Response(adminLayout("總覽", escapeHtml(admin.username), body, "dashboard", admin.role), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

async function handleQuickCloseToday(request, env, admin) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const today = taipeiTodayStr();
  await env.DB.prepare(`UPDATE time_slots SET active = 0 WHERE slot_date = ?`).bind(today).run();
  await writeAuditLog(env, admin.username, "close_today", today, null);
  return redirectTo("/admin");
}

// ---------- 預約管理 ----------
function buildBookingsWhere(range, status, q, today, weekEnd, dateFrom, dateTo) {
  const clauses = [];
  const binds = [];
  if (range === "today") { clauses.push("t.slot_date = ?"); binds.push(today); }
  else if (range === "tomorrow") { clauses.push("t.slot_date = ?"); binds.push(addDaysToDateStr(today, 1)); }
  else if (range === "week") { clauses.push("t.slot_date BETWEEN ? AND ?"); binds.push(today, weekEnd); }
  else if (range === "custom" && /^\d{4}-\d{2}-\d{2}$/.test(dateFrom) && /^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
    clauses.push("t.slot_date BETWEEN ? AND ?");
    binds.push(dateFrom, dateTo);
  }

  if (status && status !== "all") { clauses.push("b.status = ?"); binds.push(status); }
  if (q) {
    clauses.push("(b.customer_name LIKE ? OR b.customer_phone LIKE ?)");
    binds.push(`%${q}%`, `%${q}%`);
  }
  return { where: clauses.length ? "WHERE " + clauses.join(" AND ") : "", binds };
}

async function handleAdminBookings(request, env, admin, url) {
  const range = url.searchParams.get("range") || "all";
  const status = url.searchParams.get("status") || "all";
  const q = url.searchParams.get("q") || "";
  const today = taipeiTodayStr();
  const weekEnd = addDaysToDateStr(today, 6);
  const dateFrom = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get("dateFrom") || "") ? url.searchParams.get("dateFrom") : today;
  const dateTo = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get("dateTo") || "") ? url.searchParams.get("dateTo") : today;

  const { where, binds } = buildBookingsWhere(range, status, q, today, weekEnd, dateFrom, dateTo);
  // 「今天/明天/本週/自訂區間」是排班檢視，由早到晚比較好用；「全部」是查詢/日誌檢視，最新的排前面比較好用
  const orderBy = (range === "today" || range === "tomorrow" || range === "week" || range === "custom")
    ? "t.slot_date ASC, t.slot_time ASC"
    : "t.slot_date DESC, t.slot_time DESC";
  const { results } = await env.DB.prepare(
    `SELECT b.id, b.customer_name, b.customer_phone, b.customer_email, b.note, b.status,
            b.line_user_id, b.line_display_name, cn.tag as customer_tag,
            t.slot_date, t.slot_time, s.name as service_name, st.name as stylist_name,
            (SELECT COUNT(*) FROM bookings b2 WHERE b2.id != b.id AND b2.status IN ('pending','confirmed')
               AND (b2.customer_phone = b.customer_phone OR (b.line_user_id IS NOT NULL AND b2.line_user_id = b.line_user_id))
            ) as dup_count,
            (SELECT GROUP_CONCAT(name_snapshot, '、') FROM booking_addons ba WHERE ba.booking_id = b.id) as addon_names,
            (SELECT COALESCE(SUM(price_snapshot), 0) FROM booking_addons ba WHERE ba.booking_id = b.id) as addon_total
     FROM bookings b
     JOIN time_slots t ON t.id = b.time_slot_id
     JOIN service_types s ON s.id = t.service_type_id
     LEFT JOIN customer_notes cn ON cn.phone = b.customer_phone
     LEFT JOIN stylists st ON st.id = t.stylist_id
     ${where}
     ORDER BY ${orderBy}`
  ).bind(...binds).all();

  const statsRow = await env.DB.prepare(
    `SELECT
       SUM(CASE WHEN t.slot_date = ? AND b.status IN ('pending','confirmed') THEN 1 ELSE 0 END) as today_total,
       SUM(CASE WHEN t.slot_date = ? AND b.status = 'pending' THEN 1 ELSE 0 END) as today_pending,
       SUM(CASE WHEN t.slot_date = ? AND b.status = 'confirmed' THEN 1 ELSE 0 END) as today_confirmed,
       SUM(CASE WHEN t.slot_date BETWEEN ? AND ? AND b.status IN ('pending','confirmed') THEN 1 ELSE 0 END) as week_total
     FROM bookings b JOIN time_slots t ON t.id = b.time_slot_id`
  ).bind(today, today, today, today, weekEnd).first();

  const body = bookingsPage(results, { range, status, q, dateFrom, dateTo, stats: statsRow });
  return new Response(adminLayout("預約管理", escapeHtml(admin.username), body, "bookings", admin.role), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

const STATUS_TEMPLATE_KEY = {
  confirmed: "status_confirmed",
  cancelled: "status_cancelled",
  completed: "status_completed",
};

const STATUS_NOTIFY_PURPOSE = {
  confirmed: "預約狀態通知（已確認）",
  cancelled: "預約狀態通知（已取消）",
  completed: "預約狀態通知（已完成）",
};

async function notifyCustomerStatusChange(env, booking, newStatus) {
  const templateKey = STATUS_TEMPLATE_KEY[newStatus];
  if (!templateKey) return; // pending 狀態不主動通知
  if (!booking.line_user_id) return;
  const accessToken = await getLineSetting(env, "LINE_CHANNEL_ACCESS_TOKEN");
  if (!accessToken) return;
  try {
    const template = await getTemplate(env, templateKey);
    const message = buildLineMessage(template, {
      customer_name: booking.customer_name,
      slot_date: booking.slot_date,
      slot_time: booking.slot_time,
    });
    await sendLineAndLog(env, {
      direction: "push", purpose: STATUS_NOTIFY_PURPOSE[newStatus], to: booking.line_user_id, name: booking.customer_name,
      messages: [message], accessToken,
    });
  } catch (e) {
    // 推播失敗不影響狀態更新本身
  }
}

async function handleUpdateBookingStatus(request, env, admin, bookingId) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const form = await request.formData();
  const status = form.get("quickConfirm") ? "confirmed" : String(form.get("status") || "");
  const redirect = String(form.get("redirect") || "") || "/admin/bookings";
  const allowed = ["pending", "confirmed", "completed", "cancelled"];
  if (!allowed.includes(status)) return new Response("Invalid status", { status: 400 });

  const booking = await env.DB.prepare(
    `SELECT b.status, b.time_slot_id, b.customer_name, b.line_user_id, t.slot_date, t.slot_time
     FROM bookings b JOIN time_slots t ON t.id = b.time_slot_id
     WHERE b.id = ?`
  ).bind(bookingId).first();
  if (!booking) return new Response("Not Found", { status: 404 });

  await env.DB.prepare(`UPDATE bookings SET status = ? WHERE id = ?`).bind(status, bookingId).run();

  // 取消預約時把名額還給時段；從取消狀態改回其他狀態時，把名額重新佔回去
  if (booking.status !== "cancelled" && status === "cancelled") {
    await env.DB.prepare(
      `UPDATE time_slots SET booked_count = MAX(booked_count - 1, 0) WHERE id = ?`
    ).bind(booking.time_slot_id).run();
  } else if (booking.status === "cancelled" && status !== "cancelled") {
    await env.DB.prepare(
      `UPDATE time_slots SET booked_count = booked_count + 1 WHERE id = ?`
    ).bind(booking.time_slot_id).run();
  }

  await writeAuditLog(env, admin.username, "update_booking_status", `booking:${bookingId}`, status);

  if (booking.line_user_id && status !== booking.status) {
    await notifyCustomerStatusChange(env, booking, status);
  }

  return redirectTo(redirect);
}

async function handleNewBookingPage(request, env, admin, error) {
  const { results: slots } = await env.DB.prepare(
    `SELECT t.id, t.slot_date, t.slot_time, t.capacity, t.booked_count, s.name as service_name, st.name as stylist_name
     FROM time_slots t
     JOIN service_types s ON s.id = t.service_type_id
     LEFT JOIN stylists st ON st.id = t.stylist_id
     WHERE t.active = 1 AND t.booked_count < t.capacity AND t.slot_date >= ?
     ORDER BY t.slot_date ASC, t.slot_time ASC
     LIMIT 100`
  ).bind(taipeiTodayStr()).all();
  const body = newBookingPage(slots, error);
  return new Response(adminLayout("新增預約", escapeHtml(admin.username), body, "bookings", admin.role), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

async function handleAdminCreateBooking(request, env, admin) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const form = await request.formData();
  const slotId = parseInt(form.get("slotId"), 10);
  const name = String(form.get("name") || "").trim().slice(0, 100);
  const phone = String(form.get("phone") || "").trim().slice(0, 30);
  const email = String(form.get("email") || "").trim().slice(0, 200);
  const note = String(form.get("note") || "").trim().slice(0, 1000);

  if (!slotId || !name || !phone) {
    return handleNewBookingPage(request, env, admin, "請填寫姓名、電話並選擇時段。");
  }

  const updateResult = await env.DB.prepare(
    `UPDATE time_slots SET booked_count = booked_count + 1 WHERE id = ? AND booked_count < capacity`
  ).bind(slotId).run();
  if (!updateResult.meta.changes) {
    return handleNewBookingPage(request, env, admin, "這個時段名額已滿，請選擇其他時段。");
  }

  await env.DB.prepare(
    `INSERT INTO bookings (time_slot_id, customer_name, customer_phone, customer_email, note, status)
     VALUES (?, ?, ?, ?, ?, 'confirmed')`
  ).bind(slotId, name, phone, email || null, note || null).run();

  await writeAuditLog(env, admin.username, "create_booking_manual", `slot:${slotId}`, name);
  return redirectTo("/admin/bookings");
}

// ---------- 顧客 ----------
const CUSTOMER_SORT_OPTIONS = {
  last_desc: "last_booking DESC",
  last_asc: "last_booking ASC",
  name_asc: "b.customer_name COLLATE NOCASE ASC",
  name_desc: "b.customer_name COLLATE NOCASE DESC",
  bookings_desc: "total_bookings DESC",
  bookings_asc: "total_bookings ASC",
  tag_asc: "(tag IS NULL) ASC, tag ASC",
};

async function handleAdminCustomers(request, env, admin, url) {
  const sort = CUSTOMER_SORT_OPTIONS[url.searchParams.get("sort")] ? url.searchParams.get("sort") : "last_desc";
  const { results } = await env.DB.prepare(
    `SELECT b.customer_name, b.customer_phone, b.customer_email,
            COUNT(*) as total_bookings,
            MAX(t.slot_date || ' ' || t.slot_time) as last_booking,
            (SELECT b2.line_user_id FROM bookings b2 WHERE b2.customer_phone = b.customer_phone AND b2.line_user_id IS NOT NULL ORDER BY b2.id DESC LIMIT 1) as line_user_id,
            (SELECT b2.line_display_name FROM bookings b2 WHERE b2.customer_phone = b.customer_phone AND b2.line_user_id IS NOT NULL ORDER BY b2.id DESC LIMIT 1) as line_display_name,
            cn.tag as tag, cn.note as note
     FROM bookings b
     JOIN time_slots t ON t.id = b.time_slot_id
     LEFT JOIN customer_notes cn ON cn.phone = b.customer_phone
     GROUP BY b.customer_phone
     ORDER BY ${CUSTOMER_SORT_OPTIONS[sort]}`
  ).all();
  const importMsg = url.searchParams.has("imported")
    ? { updated: parseInt(url.searchParams.get("imported"), 10) || 0, skipped: parseInt(url.searchParams.get("importSkipped"), 10) || 0 }
    : null;
  const importError = url.searchParams.get("importError") || null;
  const body = customersPage(results, sort, importMsg, importError);
  return new Response(adminLayout("顧客", escapeHtml(admin.username), body, "customers", admin.role), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

async function handleUpdateCustomerNote(request, env, admin, phone) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const form = await request.formData();
  const tag = String(form.get("tag") || "").trim();
  const note = String(form.get("note") || "").trim().slice(0, 200);
  const validTags = ["", "vip", "regular", "caution", "blocked"];
  if (!validTags.includes(tag)) return new Response("Invalid tag", { status: 400 });

  await env.DB.prepare(
    `INSERT INTO customer_notes (phone, tag, note, updated_at) VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(phone) DO UPDATE SET tag = excluded.tag, note = excluded.note, updated_at = excluded.updated_at`
  ).bind(phone, tag || null, note || null).run();

  await writeAuditLog(env, admin.username, "update_customer_note", phone, tag || "(清除標記)");
  return redirectTo("/admin/customers");
}

const CUSTOMER_TAG_LABEL_TO_KEY = { "VIP": "vip", "常客": "regular", "需特別注意": "caution", "黑名單": "blocked" };

async function handleImportCustomersCsv(request, env, admin) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const form = await request.formData();
  const file = form.get("file");
  if (!file || typeof file === "string") {
    return redirectTo("/admin/customers?importError=" + encodeURIComponent("請選擇要匯入的 CSV 檔案"));
  }

  const text = await file.text();
  const rows = parseCsv(text);
  if (!rows.length) {
    return redirectTo("/admin/customers?importError=" + encodeURIComponent("檔案是空的或格式無法辨識"));
  }

  const header = rows[0].map((h) => h.trim());
  const phoneIdx = header.indexOf("電話");
  const tagIdx = header.indexOf("標記");
  const noteIdx = header.indexOf("備註");
  if (phoneIdx === -1) {
    return redirectTo("/admin/customers?importError=" + encodeURIComponent("找不到「電話」欄位，請使用「匯出顧客名單 CSV」的格式"));
  }

  let updated = 0, skipped = 0;
  for (const r of rows.slice(1)) {
    const phone = String(r[phoneIdx] || "").trim();
    if (!phone) { skipped++; continue; }
    const tagLabel = tagIdx !== -1 ? String(r[tagIdx] || "").trim() : "";
    const tag = CUSTOMER_TAG_LABEL_TO_KEY[tagLabel] || "";
    const note = noteIdx !== -1 ? String(r[noteIdx] || "").trim().slice(0, 200) : "";

    await env.DB.prepare(
      `INSERT INTO customer_notes (phone, tag, note, updated_at) VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(phone) DO UPDATE SET tag = excluded.tag, note = excluded.note, updated_at = excluded.updated_at`
    ).bind(phone, tag || null, note || null).run();
    updated++;
  }

  await writeAuditLog(env, admin.username, "import_customers_csv", null, `updated=${updated}, skipped=${skipped}`);
  return redirectTo(`/admin/customers?imported=${updated}&importSkipped=${skipped}`);
}

function csvEscape(value) {
  const str = value == null ? "" : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function toCsv(headers, rows) {
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) lines.push(row.map(csvEscape).join(","));
  return "﻿" + lines.join("\r\n");
}

function parseCsv(text) {
  const clean = text.replace(/^﻿/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field); field = "";
    } else if (ch === "\n") {
      row.push(field); field = "";
      rows.push(row); row = [];
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

async function handleExportCustomersCsv(request, env, admin) {
  const { results } = await env.DB.prepare(
    `SELECT b.customer_name, b.customer_phone, b.customer_email,
            COUNT(*) as total_bookings,
            MAX(t.slot_date || ' ' || t.slot_time) as last_booking,
            (SELECT b2.line_user_id FROM bookings b2 WHERE b2.customer_phone = b.customer_phone AND b2.line_user_id IS NOT NULL ORDER BY b2.id DESC LIMIT 1) as line_user_id,
            (SELECT b2.line_display_name FROM bookings b2 WHERE b2.customer_phone = b.customer_phone AND b2.line_user_id IS NOT NULL ORDER BY b2.id DESC LIMIT 1) as line_display_name,
            cn.tag as tag, cn.note as note
     FROM bookings b
     JOIN time_slots t ON t.id = b.time_slot_id
     LEFT JOIN customer_notes cn ON cn.phone = b.customer_phone
     GROUP BY b.customer_phone
     ORDER BY last_booking DESC`
  ).all();
  const tagLabels = { vip: "VIP", regular: "常客", caution: "需特別注意", blocked: "黑名單" };
  const csv = toCsv(
    ["姓名", "電話", "Email", "LINE", "總預約次數", "最近預約", "標記", "備註"],
    results.map((c) => [
      c.customer_name, c.customer_phone, c.customer_email || "",
      c.line_user_id ? (c.line_display_name || "已加好友") : "未加好友",
      c.total_bookings, c.last_booking, tagLabels[c.tag] || "", c.note || "",
    ])
  );
  await writeAuditLog(env, admin.username, "export_customers_csv", null, null);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="customers-${taipeiTodayStr()}.csv"`,
    },
  });
}

async function handleExportBookingsCsv(request, env, admin, url) {
  const range = url.searchParams.get("range") || "all";
  const status = url.searchParams.get("status") || "all";
  const q = url.searchParams.get("q") || "";
  const today = taipeiTodayStr();
  const weekEnd = addDaysToDateStr(today, 6);
  const dateFrom = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get("dateFrom") || "") ? url.searchParams.get("dateFrom") : today;
  const dateTo = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get("dateTo") || "") ? url.searchParams.get("dateTo") : today;
  const { where, binds } = buildBookingsWhere(range, status, q, today, weekEnd, dateFrom, dateTo);
  const { results } = await env.DB.prepare(
    `SELECT b.customer_name, b.customer_phone, b.customer_email, b.note, b.status,
            t.slot_date, t.slot_time, s.name as service_name
     FROM bookings b
     JOIN time_slots t ON t.id = b.time_slot_id
     JOIN service_types s ON s.id = t.service_type_id
     ${where}
     ORDER BY t.slot_date DESC, t.slot_time DESC`
  ).bind(...binds).all();
  const statusLabels = { pending: "待確認", confirmed: "已確認", completed: "已完成", cancelled: "已取消" };
  const csv = toCsv(
    ["日期", "時間", "姓名", "電話", "Email", "服務項目", "狀態", "備註"],
    results.map((b) => [b.slot_date, b.slot_time, b.customer_name, b.customer_phone, b.customer_email || "", b.service_name, statusLabels[b.status] || b.status, b.note || ""])
  );
  await writeAuditLog(env, admin.username, "export_bookings_csv", null, `range=${range},status=${status},q=${q}`);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bookings-${today}.csv"`,
    },
  });
}

// ---------- 服務項目 ----------
// ---------- 公休日 ----------
async function handleClosedDatesPage(request, env, admin, addedWarning) {
  const { results } = await env.DB.prepare(
    `SELECT * FROM closed_dates ORDER BY closed_date ASC`
  ).all();
  const body = closedDatesPage(results, addedWarning);
  return new Response(adminLayout("公休日設定", escapeHtml(admin.username), body, "closedDates", admin.role), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

async function handleCreateClosedDate(request, env, admin) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const form = await request.formData();
  const date = String(form.get("date") || "");
  const reason = String(form.get("reason") || "").trim().slice(0, 200);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return new Response("Invalid date", { status: 400 });

  await env.DB.prepare(
    `INSERT INTO closed_dates (closed_date, reason) VALUES (?, ?)
     ON CONFLICT(closed_date) DO UPDATE SET reason = excluded.reason`
  ).bind(date, reason || null).run();

  // 自動關閉當天既有時段，避免客人繼續預約到公休日
  await env.DB.prepare(`UPDATE time_slots SET active = 0 WHERE slot_date = ?`).bind(date).run();

  const affected = await env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM bookings b JOIN time_slots t ON t.id = b.time_slot_id
     WHERE t.slot_date = ? AND b.status IN ('pending', 'confirmed')`
  ).bind(date).first();

  await writeAuditLog(env, admin.username, "create_closed_date", date, reason || null);

  const warning = affected.cnt > 0
    ? `注意：${date} 這天已經有 ${affected.cnt} 筆待確認/已確認的預約，系統不會自動取消，請自行到「預約管理」處理。`
    : null;

  return handleClosedDatesPage(request, env, admin, warning);
}

async function handleDeleteClosedDate(request, env, admin, date) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  await env.DB.prepare(`DELETE FROM closed_dates WHERE closed_date = ?`).bind(date).run();
  await writeAuditLog(env, admin.username, "delete_closed_date", date, null);
  return redirectTo("/admin/closed-dates");
}

// ---------- 營運報表 ----------
async function handleReportsPage(request, env, admin, url) {
  const todayParts = taipeiTodayParts();
  const year = parseInt(url.searchParams.get("year"), 10) || todayParts.y;
  const month = parseInt(url.searchParams.get("month"), 10) || todayParts.m;
  const monthStart = dstr(year, month, 1);
  const monthEnd = dstr(year, month, daysInMonth(year, month));

  const baseFrom = `FROM bookings b JOIN time_slots t ON t.id = b.time_slot_id WHERE t.slot_date BETWEEN ? AND ?`;

  const totalRow = await env.DB.prepare(`SELECT COUNT(*) as cnt ${baseFrom}`).bind(monthStart, monthEnd).first();
  const statusCounts = (await env.DB.prepare(
    `SELECT b.status, COUNT(*) as cnt ${baseFrom} GROUP BY b.status`
  ).bind(monthStart, monthEnd).all()).results;

  const topTimes = (await env.DB.prepare(
    `SELECT t.slot_time, COUNT(*) as cnt ${baseFrom} GROUP BY t.slot_time ORDER BY cnt DESC LIMIT 5`
  ).bind(monthStart, monthEnd).all()).results;

  const topServices = (await env.DB.prepare(
    `SELECT s.name, COUNT(*) as cnt FROM bookings b
     JOIN time_slots t ON t.id = b.time_slot_id
     JOIN service_types s ON s.id = t.service_type_id
     WHERE t.slot_date BETWEEN ? AND ?
     GROUP BY s.name ORDER BY cnt DESC LIMIT 5`
  ).bind(monthStart, monthEnd).all()).results;

  const topWeekdays = (await env.DB.prepare(
    `SELECT strftime('%w', t.slot_date) as wd, COUNT(*) as cnt ${baseFrom} GROUP BY wd ORDER BY cnt DESC`
  ).bind(monthStart, monthEnd).all()).results;

  const body = reportsPage({
    year, month,
    totalCount: totalRow.cnt,
    statusCounts, topTimes, topServices, topWeekdays,
  });
  return new Response(adminLayout("營運報表", escapeHtml(admin.username), body, "reports", admin.role), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

async function handleAdminServices(request, env, admin, error) {
  const { results } = await env.DB.prepare(
    `SELECT s.*, (SELECT COUNT(*) FROM time_slots t WHERE t.service_type_id = s.id) as usage_count
     FROM service_types s ORDER BY s.id ASC`
  ).all();
  const body = servicesPage(results, error);
  return new Response(adminLayout("服務項目", escapeHtml(admin.username), body, "services", admin.role), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

async function handleCreateService(request, env, admin) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const form = await request.formData();
  const name = String(form.get("name") || "").trim().slice(0, 100);
  const duration = parseInt(form.get("duration"), 10);
  if (!name || !duration || duration < 5) return new Response("Invalid input", { status: 400 });
  const rawPrice = String(form.get("price") || "").trim();
  const price = rawPrice ? parseInt(rawPrice, 10) : null;
  const description = String(form.get("description") || "").trim().slice(0, 500);
  await env.DB.prepare(`INSERT INTO service_types (name, duration_minutes, price, description) VALUES (?, ?, ?, ?)`).bind(name, duration, price, description || null).run();
  await writeAuditLog(env, admin.username, "create_service", name, `duration=${duration}`);
  return redirectTo("/admin/services");
}

async function handleUpdateService(request, env, admin, serviceId) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const form = await request.formData();
  const rawPrice = String(form.get("price") || "").trim();
  const price = rawPrice ? parseInt(rawPrice, 10) : null;
  const description = String(form.get("description") || "").trim().slice(0, 500);
  await env.DB.prepare(`UPDATE service_types SET price = ?, description = ? WHERE id = ?`).bind(price, description || null, serviceId).run();
  await writeAuditLog(env, admin.username, "update_service", `service:${serviceId}`, null);
  return redirectTo("/admin/services");
}

async function handleToggleService(request, env, admin, serviceId) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  await env.DB.prepare(`UPDATE service_types SET active = NOT active WHERE id = ?`).bind(serviceId).run();
  await writeAuditLog(env, admin.username, "toggle_service", `service:${serviceId}`, null);
  return redirectTo("/admin/services");
}

async function handleDeleteService(request, env, admin, serviceId) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  // service_type_id 在 time_slots 是 NOT NULL 外鍵，無法比照服務人員「解除關聯後刪除」，
  // 只能整批連同時段／預約一起刪，屬於不可逆的資料損失，所以先徵得使用者同意才會走這條路（見 confirmCascade）。
  const usage = await env.DB.prepare(`SELECT COUNT(*) as cnt FROM time_slots WHERE service_type_id = ?`).bind(serviceId).first();
  const form = await request.formData();
  const confirmCascade = form.get("confirmCascade") === "1";
  if (usage.cnt > 0 && !confirmCascade) {
    return handleAdminServices(request, env, admin, "這個服務項目已經有時段紀錄。直接刪除會把相關的時段與預約紀錄一起永久刪除，且無法復原；如果要繼續，請改用下方「強制刪除」按鈕，或考慮改為停用。");
  }
  const service = await env.DB.prepare(`SELECT name FROM service_types WHERE id = ?`).bind(serviceId).first();
  if (usage.cnt > 0) {
    const { results: slotIds } = await env.DB.prepare(`SELECT id FROM time_slots WHERE service_type_id = ?`).bind(serviceId).all();
    const ids = slotIds.map((r) => r.id);
    for (const id of ids) {
      await env.DB.prepare(`DELETE FROM bookings WHERE time_slot_id = ?`).bind(id).run();
    }
    await env.DB.prepare(`DELETE FROM time_slots WHERE service_type_id = ?`).bind(serviceId).run();
  }
  await env.DB.prepare(`DELETE FROM service_types WHERE id = ?`).bind(serviceId).run();
  await writeAuditLog(env, admin.username, "delete_service", service ? service.name : `service:${serviceId}`, usage.cnt > 0 ? `cascade_deleted_slots_and_bookings=${usage.cnt}` : null);
  return redirectTo("/admin/services");
}

// ---------- 加購項目 ----------
async function handleAdminAddons(request, env, admin, error) {
  const { results } = await env.DB.prepare(`SELECT * FROM service_addons ORDER BY sort_order ASC, id ASC`).all();
  const body = addonsPage(results, error);
  return new Response(adminLayout("加購項目", escapeHtml(admin.username), body, "addons", admin.role), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

async function handleCreateAddon(request, env, admin) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const form = await request.formData();
  const name = String(form.get("name") || "").trim().slice(0, 100);
  const price = parseInt(form.get("price"), 10);
  const category = String(form.get("category") || "").trim().slice(0, 60);
  if (!name || isNaN(price) || price < 0) return new Response("Invalid input", { status: 400 });
  const maxOrder = await env.DB.prepare(`SELECT MAX(sort_order) as m FROM service_addons`).first();
  await env.DB.prepare(`INSERT INTO service_addons (name, price, category, sort_order) VALUES (?, ?, ?, ?)`)
    .bind(name, price, category || null, (maxOrder.m ?? -1) + 1).run();
  await writeAuditLog(env, admin.username, "create_addon", name, `price=${price}`);
  return redirectTo("/admin/addons");
}

async function handleUpdateAddon(request, env, admin, addonId) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const form = await request.formData();
  const price = parseInt(form.get("price"), 10);
  const category = String(form.get("category") || "").trim().slice(0, 60);
  if (isNaN(price) || price < 0) return new Response("Invalid input", { status: 400 });
  await env.DB.prepare(`UPDATE service_addons SET price = ?, category = ? WHERE id = ?`).bind(price, category || null, addonId).run();
  await writeAuditLog(env, admin.username, "update_addon", `addon:${addonId}`, null);
  return redirectTo("/admin/addons");
}

async function handleToggleAddon(request, env, admin, addonId) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  await env.DB.prepare(`UPDATE service_addons SET active = NOT active WHERE id = ?`).bind(addonId).run();
  await writeAuditLog(env, admin.username, "toggle_addon", `addon:${addonId}`, null);
  return redirectTo("/admin/addons");
}

async function handleDeleteAddon(request, env, admin, addonId) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const addon = await env.DB.prepare(`SELECT name FROM service_addons WHERE id = ?`).bind(addonId).first();
  await env.DB.prepare(`DELETE FROM service_addons WHERE id = ?`).bind(addonId).run();
  await writeAuditLog(env, admin.username, "delete_addon", addon ? addon.name : `addon:${addonId}`, null);
  return redirectTo("/admin/addons");
}

async function handlePublicAddons(request, env) {
  const { results } = await env.DB.prepare(
    `SELECT id, name, price, category FROM service_addons WHERE active = 1 ORDER BY sort_order ASC, id ASC`
  ).all();
  return Response.json({ ok: true, addons: results });
}

// ---------- 服務人員 ----------
async function handleAdminStylists(request, env, admin, error) {
  const { results } = await env.DB.prepare(`SELECT * FROM stylists ORDER BY id ASC`).all();
  const body = stylistsPage(results, error);
  return new Response(adminLayout("服務人員", escapeHtml(admin.username), body, "stylists", admin.role), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

async function handleCreateStylist(request, env, admin) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const form = await request.formData();
  const name = String(form.get("name") || "").trim().slice(0, 100);
  if (!name) return new Response("Invalid input", { status: 400 });
  await env.DB.prepare(`INSERT INTO stylists (name) VALUES (?)`).bind(name).run();
  await writeAuditLog(env, admin.username, "create_stylist", name, null);
  return redirectTo("/admin/stylists");
}

async function handleToggleStylist(request, env, admin, stylistId) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  await env.DB.prepare(`UPDATE stylists SET active = NOT active WHERE id = ?`).bind(stylistId).run();
  await writeAuditLog(env, admin.username, "toggle_stylist", `stylist:${stylistId}`, null);
  return redirectTo("/admin/stylists");
}

async function handleDeleteStylist(request, env, admin, stylistId) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const stylist = await env.DB.prepare(`SELECT name FROM stylists WHERE id = ?`).bind(stylistId).first();
  const usage = await env.DB.prepare(`SELECT COUNT(*) as cnt FROM time_slots WHERE stylist_id = ?`).bind(stylistId).first();
  // time_slots.stylist_id 允許 NULL，刪除前先解除關聯，這樣舊時段/預約紀錄還在，只是查不到是哪位服務人員
  await env.DB.prepare(`UPDATE time_slots SET stylist_id = NULL WHERE stylist_id = ?`).bind(stylistId).run();
  await env.DB.prepare(`DELETE FROM stylists WHERE id = ?`).bind(stylistId).run();
  await env.DB.prepare(`DELETE FROM stylist_schedule_rules WHERE stylist_id = ?`).bind(stylistId).run();
  await env.DB.prepare(`DELETE FROM stylist_services WHERE stylist_id = ?`).bind(stylistId).run();
  await writeAuditLog(env, admin.username, "delete_stylist", stylist ? stylist.name : `stylist:${stylistId}`, usage.cnt > 0 ? `has_history=${usage.cnt}` : null);
  return redirectTo("/admin/stylists");
}

const WEEKDAY_LABELS_1_7 = { 1: "一", 2: "二", 3: "三", 4: "四", 5: "五", 6: "六", 7: "日" };

async function handleStylistSchedulePage(request, env, admin, stylistId, error, saved) {
  const stylist = await env.DB.prepare(
    `SELECT id, name, active, created_at, auto_schedule, buffer_minutes, slot_step_minutes, max_advance_days, bio,
     CASE WHEN photo_data IS NOT NULL THEN 1 ELSE 0 END as has_photo
     FROM stylists WHERE id = ?`
  ).bind(stylistId).first();
  if (!stylist) return new Response("Not Found", { status: 404 });

  const { results: rules } = await env.DB.prepare(
    `SELECT * FROM stylist_schedule_rules WHERE stylist_id = ? ORDER BY weekday ASC`
  ).bind(stylistId).all();
  const workByWeekday = {};
  const breakByWeekday = {};
  for (const r of rules) {
    if (r.rule_type === "work") workByWeekday[r.weekday] = r;
    else if (r.rule_type === "break") breakByWeekday[r.weekday] = r;
  }

  const { results: allServices } = await env.DB.prepare(`SELECT id, name FROM service_types WHERE active = 1 ORDER BY id ASC`).all();
  const { results: offeredRows } = await env.DB.prepare(`SELECT service_type_id FROM stylist_services WHERE stylist_id = ?`).bind(stylistId).all();
  const offeredServiceIds = new Set(offeredRows.map((r) => r.service_type_id));

  const body = stylistSchedulePage({ stylist, workByWeekday, breakByWeekday, allServices, offeredServiceIds, error, saved });
  return new Response(adminLayout("服務人員班表", escapeHtml(admin.username), body, "stylists", admin.role), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

async function handleUpdateStylistSchedule(request, env, admin, stylistId) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const stylist = await env.DB.prepare(`SELECT * FROM stylists WHERE id = ?`).bind(stylistId).first();
  if (!stylist) return new Response("Not Found", { status: 404 });

  const form = await request.formData();
  const autoSchedule = form.get("autoSchedule") ? 1 : 0;
  const bufferMinutes = parseInt(form.get("bufferMinutes"), 10) || 0;
  const slotStepMinutes = parseInt(form.get("slotStepMinutes"), 10) || 15;
  const maxAdvanceDays = parseInt(form.get("maxAdvanceDays"), 10) || 60;
  const serviceIds = form.getAll("serviceIds").map((v) => parseInt(v, 10)).filter(Boolean);

  const renderError = (msg) => handleStylistSchedulePage(request, env, admin, stylistId, msg, false);

  if (bufferMinutes < 0 || slotStepMinutes < 5) {
    return renderError("緩衝時間不能為負數，間隔至少要 5 分鐘。");
  }
  if (maxAdvanceDays < 1 || maxAdvanceDays > 365) {
    return renderError("最多可預約天數請填 1~365 之間的數字。");
  }

  const workRows = [];
  const breakRows = [];
  for (let wd = 1; wd <= 7; wd++) {
    const workStart = String(form.get(`workStart_${wd}`) || "").trim();
    const workEnd = String(form.get(`workEnd_${wd}`) || "").trim();
    const breakStart = String(form.get(`breakStart_${wd}`) || "").trim();
    const breakEnd = String(form.get(`breakEnd_${wd}`) || "").trim();

    if (workStart && workEnd) {
      if (!/^\d{2}:\d{2}$/.test(workStart) || !/^\d{2}:\d{2}$/.test(workEnd) || timeToMinutes(workStart) >= timeToMinutes(workEnd)) {
        return renderError(`${WEEKDAY_LABELS_1_7[wd]}的上班時間不正確（開始時間必須早於結束時間）。`);
      }
      workRows.push({ weekday: wd, start: workStart, end: workEnd });

      if (breakStart && breakEnd) {
        if (!/^\d{2}:\d{2}$/.test(breakStart) || !/^\d{2}:\d{2}$/.test(breakEnd) || timeToMinutes(breakStart) >= timeToMinutes(breakEnd)) {
          return renderError(`${WEEKDAY_LABELS_1_7[wd]}的休息時間不正確（開始時間必須早於結束時間）。`);
        }
        if (timeToMinutes(breakStart) < timeToMinutes(workStart) || timeToMinutes(breakEnd) > timeToMinutes(workEnd)) {
          return renderError(`${WEEKDAY_LABELS_1_7[wd]}的休息時間必須在上班時間範圍內。`);
        }
        breakRows.push({ weekday: wd, start: breakStart, end: breakEnd });
      }
    }
  }

  await env.DB.prepare(`UPDATE stylists SET auto_schedule = ?, buffer_minutes = ?, slot_step_minutes = ?, max_advance_days = ? WHERE id = ?`)
    .bind(autoSchedule, bufferMinutes, slotStepMinutes, maxAdvanceDays, stylistId).run();

  await env.DB.prepare(`DELETE FROM stylist_schedule_rules WHERE stylist_id = ?`).bind(stylistId).run();
  for (const w of workRows) {
    await env.DB.prepare(`INSERT INTO stylist_schedule_rules (stylist_id, weekday, rule_type, start_time, end_time) VALUES (?, ?, 'work', ?, ?)`)
      .bind(stylistId, w.weekday, w.start, w.end).run();
  }
  for (const b of breakRows) {
    await env.DB.prepare(`INSERT INTO stylist_schedule_rules (stylist_id, weekday, rule_type, start_time, end_time) VALUES (?, ?, 'break', ?, ?)`)
      .bind(stylistId, b.weekday, b.start, b.end).run();
  }

  await env.DB.prepare(`DELETE FROM stylist_services WHERE stylist_id = ?`).bind(stylistId).run();
  for (const sid of serviceIds) {
    await env.DB.prepare(`INSERT OR IGNORE INTO stylist_services (stylist_id, service_type_id) VALUES (?, ?)`).bind(stylistId, sid).run();
  }

  await writeAuditLog(env, admin.username, "update_stylist_schedule", stylist.name, `auto=${autoSchedule}`);
  return redirectTo(`/admin/stylists/${stylistId}/schedule?saved=1`);
}

async function handleUpdateStylistProfile(request, env, admin, stylistId) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const form = await request.formData();
  const bio = String(form.get("bio") || "").trim().slice(0, 500);
  await env.DB.prepare(`UPDATE stylists SET bio = ? WHERE id = ?`).bind(bio || null, stylistId).run();
  await writeAuditLog(env, admin.username, "update_stylist_profile", `stylist:${stylistId}`, null);
  return redirectTo(`/admin/stylists/${stylistId}/schedule?saved=1`);
}

const STYLIST_PHOTO_MAX_BYTES = 1.5 * 1024 * 1024;
const STYLIST_PHOTO_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

async function handleUploadStylistPhoto(request, env, admin, stylistId) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const form = await request.formData();
  const file = form.get("image");
  if (!file || typeof file === "string") return redirectTo(`/admin/stylists/${stylistId}/schedule`);
  if (!STYLIST_PHOTO_ALLOWED_TYPES.includes(file.type)) {
    return handleStylistSchedulePage(request, env, admin, stylistId, "只支援 JPG / PNG / WebP 格式的圖片。", false);
  }
  const buffer = await file.arrayBuffer();
  if (buffer.byteLength > STYLIST_PHOTO_MAX_BYTES) {
    return handleStylistSchedulePage(request, env, admin, stylistId, "圖片檔案太大，請壓縮到 1.5MB 以內再上傳。", false);
  }
  await env.DB.prepare(`UPDATE stylists SET photo_data = ?, photo_content_type = ? WHERE id = ?`)
    .bind(new Uint8Array(buffer), file.type, stylistId).run();
  await writeAuditLog(env, admin.username, "upload_stylist_photo", `stylist:${stylistId}`, null);
  return redirectTo(`/admin/stylists/${stylistId}/schedule?saved=1`);
}

async function handleDeleteStylistPhoto(request, env, admin, stylistId) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  await env.DB.prepare(`UPDATE stylists SET photo_data = NULL, photo_content_type = NULL WHERE id = ?`).bind(stylistId).run();
  await writeAuditLog(env, admin.username, "delete_stylist_photo", `stylist:${stylistId}`, null);
  return redirectTo(`/admin/stylists/${stylistId}/schedule?saved=1`);
}

async function handleServeStylistPhoto(request, env, id) {
  const row = await env.DB.prepare(`SELECT photo_data, photo_content_type FROM stylists WHERE id = ?`).bind(id).first();
  if (!row || !row.photo_data) return new Response("Not Found", { status: 404 });
  const bytes = new Uint8Array(row.photo_data);
  return new Response(bytes, {
    headers: { "Content-Type": row.photo_content_type || "image/jpeg", "Cache-Control": "public, max-age=600", "Content-Length": String(bytes.byteLength) },
  });
}

// 計算某位「自動排程」服務人員在指定日期、指定服務項目下，還能預約的起始時間清單
function daysBetweenDateStrings(fromStr, toStr) {
  const [fy, fm, fd] = fromStr.split("-").map(Number);
  const [ty, tm, td] = toStr.split("-").map(Number);
  const fromUtc = Date.UTC(fy, fm - 1, fd);
  const toUtc = Date.UTC(ty, tm - 1, td);
  return Math.round((toUtc - fromUtc) / 86400000);
}

async function computeAutoAvailability(env, stylist, serviceTypeId, date) {
  const maxAdvanceDays = stylist.max_advance_days != null ? stylist.max_advance_days : 60;
  const daysAhead = daysBetweenDateStrings(taipeiTodayStr(), date);
  if (daysAhead < 0 || daysAhead > maxAdvanceDays) return [];

  const service = await env.DB.prepare(`SELECT duration_minutes FROM service_types WHERE id = ?`).bind(serviceTypeId).first();
  if (!service) return [];
  const durationMinutes = service.duration_minutes;

  const closed = await env.DB.prepare(`SELECT 1 FROM closed_dates WHERE closed_date = ?`).bind(date).first();
  if (closed) return [];

  const [y, m, d] = date.split("-").map(Number);
  const weekday = weekdayMon1(date);

  const { results: rules } = await env.DB.prepare(
    `SELECT * FROM stylist_schedule_rules WHERE stylist_id = ? AND weekday = ?`
  ).bind(stylist.id, weekday).all();
  const workWindows = rules.filter((r) => r.rule_type === "work").map((r) => [timeToMinutes(r.start_time), timeToMinutes(r.end_time)]);
  if (!workWindows.length) return [];
  const breakWindows = rules.filter((r) => r.rule_type === "break").map((r) => [timeToMinutes(r.start_time), timeToMinutes(r.end_time)]);

  const { results: busySlots } = await env.DB.prepare(
    `SELECT t.slot_time, s.duration_minutes FROM time_slots t
     JOIN service_types s ON s.id = t.service_type_id
     WHERE t.stylist_id = ? AND t.slot_date = ? AND t.active = 1 AND t.booked_count > 0`
  ).bind(stylist.id, date).all();
  const buffer = stylist.buffer_minutes || 0;
  const busyWindows = busySlots.map((b) => {
    const start = timeToMinutes(b.slot_time);
    const end = start + (b.duration_minutes || 60);
    return [start - buffer, end + buffer];
  });

  const step = stylist.slot_step_minutes || 15;
  const today = taipeiTodayStr();
  const nowMinutes = date === today ? (() => {
    const nowTaipei = taipeiNow();
    return nowTaipei.getUTCHours() * 60 + nowTaipei.getUTCMinutes();
  })() : -1;

  const candidates = [];
  for (const [winStart, winEnd] of workWindows) {
    for (let t = winStart; t + durationMinutes <= winEnd; t += step) {
      if (date === today && t <= nowMinutes) continue;
      const candEnd = t + durationMinutes;
      const overlapsBreak = breakWindows.some(([bs, be]) => t < be && bs < candEnd);
      if (overlapsBreak) continue;
      const overlapsBusy = busyWindows.some(([bs, be]) => t < be && bs < candEnd);
      if (overlapsBusy) continue;
      candidates.push(`${pad2(Math.floor(t / 60))}:${pad2(t % 60)}`);
    }
  }
  return candidates;
}

// 檢查某位設計師在指定日期的 [startMinutes, endMinutes) 時間範圍內，是否已有其他有效時段重疊
// （用時段的服務項目時長換算結束時間；excludeSlotId 用於「編輯／重建」時排除自己）
async function findStylistConflict(env, stylistId, date, startMinutes, endMinutes, excludeSlotId) {
  if (!stylistId) return null;
  const { results } = await env.DB.prepare(
    `SELECT t.id, t.slot_time, s.duration_minutes, s.name as service_name
     FROM time_slots t JOIN service_types s ON s.id = t.service_type_id
     WHERE t.stylist_id = ? AND t.slot_date = ? AND t.active = 1`
  ).bind(stylistId, date).all();

  for (const row of results) {
    if (excludeSlotId && row.id === excludeSlotId) continue;
    const [hh, mm] = row.slot_time.split(":").map(Number);
    const existingStart = hh * 60 + mm;
    const existingEnd = existingStart + (row.duration_minutes || 60);
    if (startMinutes < existingEnd && existingStart < endMinutes) {
      return row; // 有重疊
    }
  }
  return null;
}

function timeToMinutes(time) {
  const [hh, mm] = time.split(":").map(Number);
  return hh * 60 + mm;
}

// ---------- 行事曆 / 時段 ----------
async function handleAdminSlots(request, env, admin, url) {
  const todayParts = taipeiTodayParts();
  const year = parseInt(url.searchParams.get("year"), 10) || todayParts.y;
  const month = parseInt(url.searchParams.get("month"), 10) || todayParts.m;
  const todayStr = dstr(todayParts.y, todayParts.m, todayParts.d);
  const selectedDate = url.searchParams.get("day") || (year === todayParts.y && month === todayParts.m ? todayStr : dstr(year, month, 1));
  const batchCreated = url.searchParams.get("batchCreated");
  const batchConflict = url.searchParams.get("batchConflict");
  const slotError = url.searchParams.get("slotError");

  const monthStart = dstr(year, month, 1);
  const monthEnd = dstr(year, month, daysInMonth(year, month));

  const { results: monthSlots } = await env.DB.prepare(
    `SELECT DISTINCT slot_date FROM time_slots WHERE slot_date BETWEEN ? AND ?`
  ).bind(monthStart, monthEnd).all();
  const slotDateSet = new Set(monthSlots.map((r) => r.slot_date));

  const { results: monthClosed } = await env.DB.prepare(
    `SELECT closed_date, reason FROM closed_dates WHERE closed_date BETWEEN ? AND ?`
  ).bind(monthStart, monthEnd).all();
  const closedDateSet = new Set(monthClosed.map((r) => r.closed_date));
  const closedReasonMap = {};
  for (const r of monthClosed) closedReasonMap[r.closed_date] = r.reason;
  const selectedDateClosedReason = closedDateSet.has(selectedDate) ? (closedReasonMap[selectedDate] || "") : undefined;

  const totalDays = daysInMonth(year, month);
  const startOffset = firstWeekdayMon0(year, month);
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) {
    const ds = dstr(year, month, d);
    cells.push({ day: d, dateStr: ds, hasSlots: slotDateSet.has(ds) });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const { results: daySlots } = await env.DB.prepare(
    `SELECT t.id, t.slot_time, t.capacity, t.booked_count, t.active, t.stylist_id, s.name as service_name, st.name as stylist_name,
            (SELECT COUNT(*) FROM bookings b WHERE b.time_slot_id = t.id AND b.status = 'cancelled') as cancelled_count
     FROM time_slots t
     JOIN service_types s ON s.id = t.service_type_id
     LEFT JOIN stylists st ON st.id = t.stylist_id
     WHERE t.slot_date = ?
     ORDER BY t.slot_time ASC`
  ).bind(selectedDate).all();

  const { results: stylists } = await env.DB.prepare(
    `SELECT id, name FROM stylists WHERE active = 1 ORDER BY id ASC`
  ).all();

  const { results: serviceTypes } = await env.DB.prepare(
    `SELECT id, name, duration_minutes FROM service_types WHERE active = 1 ORDER BY id ASC`
  ).all();

  const body = slotsPage({ year, month, weeks, todayStr, selectedDate, daySlots, serviceTypes, stylists, batchCreated, batchConflict, slotError, closedDateSet, selectedDateClosedReason });
  return new Response(adminLayout("行事曆", escapeHtml(admin.username), body, "slots", admin.role), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function slotsErrorRedirect(dateForFallback, message) {
  const today = taipeiTodayStr();
  const dateStr = dateForFallback && /^\d{4}-\d{2}-\d{2}$/.test(dateForFallback) ? dateForFallback : today;
  const [y, m] = dateStr.split("-");
  return redirectTo(`/admin/slots?year=${y}&month=${parseInt(m, 10)}&day=${dateStr}&slotError=${encodeURIComponent(message)}`);
}

async function handleCreateSlot(request, env, admin) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const form = await request.formData();
  const serviceTypeId = parseInt(form.get("serviceTypeId"), 10);
  const date = String(form.get("date") || "");
  const time = String(form.get("time") || "");
  const stylistId = parseInt(form.get("stylistId"), 10) || null;
  let capacity = parseInt(form.get("capacity"), 10);

  const problems = [];
  if (!serviceTypeId) problems.push("請選擇服務項目");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) problems.push("日期未填寫或格式不正確");
  if (!/^\d{2}:\d{2}$/.test(time)) problems.push("時間未填寫或格式不正確");
  if (!capacity || capacity < 1) problems.push("可容納組數需為 1 以上");
  if (problems.length) {
    return slotsErrorRedirect(date, `無法新增時段，請修正以下問題：${problems.join("；")}。`);
  }

  const closed = await env.DB.prepare(`SELECT 1 FROM closed_dates WHERE closed_date = ?`).bind(date).first();
  if (closed) {
    return slotsErrorRedirect(date, "這天已設定為公休日，無法新增時段。");
  }

  if (stylistId) {
    capacity = 1; // 一位服務人員同時間只能服務一位客人
    const service = await env.DB.prepare(`SELECT duration_minutes FROM service_types WHERE id = ?`).bind(serviceTypeId).first();
    const startMinutes = timeToMinutes(time);
    const endMinutes = startMinutes + (service ? service.duration_minutes : 60);
    const conflict = await findStylistConflict(env, stylistId, date, startMinutes, endMinutes, null);
    if (conflict) {
      return slotsErrorRedirect(date, `這位服務人員在 ${conflict.slot_time}（${conflict.service_name}）已經有時段，時間會重疊，請換一個時間。`);
    }
  }

  await env.DB.prepare(
    `INSERT INTO time_slots (service_type_id, slot_date, slot_time, capacity, stylist_id) VALUES (?, ?, ?, ?, ?)`
  ).bind(serviceTypeId, date, time, capacity, stylistId).run();
  await writeAuditLog(env, admin.username, "create_slot", `${date} ${time}`, `capacity=${capacity}`);

  const [y, m] = date.split("-");
  return redirectTo(`/admin/slots?year=${y}&month=${parseInt(m, 10)}&day=${date}`);
}

async function handleToggleSlot(request, env, admin, slotId) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const slot = await env.DB.prepare(`SELECT slot_date FROM time_slots WHERE id = ?`).bind(slotId).first();
  await env.DB.prepare(`UPDATE time_slots SET active = NOT active WHERE id = ?`).bind(slotId).run();
  await writeAuditLog(env, admin.username, "toggle_slot", `slot:${slotId}`, null);
  if (slot) {
    const [y, m] = slot.slot_date.split("-");
    return redirectTo(`/admin/slots?year=${y}&month=${parseInt(m, 10)}&day=${slot.slot_date}`);
  }
  return redirectTo("/admin/slots");
}

async function handleDeleteSlot(request, env, admin, slotId) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const slot = await env.DB.prepare(`SELECT slot_date FROM time_slots WHERE id = ?`).bind(slotId).first();
  const bookingCount = await env.DB.prepare(`SELECT COUNT(*) as cnt FROM bookings WHERE time_slot_id = ?`).bind(slotId).first();
  if (bookingCount.cnt > 0) {
    await env.DB.prepare(`UPDATE time_slots SET active = 0 WHERE id = ?`).bind(slotId).run();
  } else {
    await env.DB.prepare(`DELETE FROM time_slots WHERE id = ?`).bind(slotId).run();
  }
  await writeAuditLog(env, admin.username, "delete_slot", `slot:${slotId}`, null);
  if (slot) {
    const [y, m] = slot.slot_date.split("-");
    return redirectTo(`/admin/slots?year=${y}&month=${parseInt(m, 10)}&day=${slot.slot_date}`);
  }
  return redirectTo("/admin/slots");
}

async function handleBulkSlots(request, env, admin) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const form = await request.formData();
  const action = String(form.get("action") || "");
  const ids = form.getAll("slotIds").map((v) => parseInt(v, 10)).filter(Boolean);
  const year = form.get("year");
  const month = form.get("month");
  const day = form.get("day");
  const redirectUrl = `/admin/slots?year=${year}&month=${month}&day=${day}`;

  if (!ids.length || !["activate", "deactivate", "delete"].includes(action)) {
    return redirectTo(redirectUrl);
  }

  for (const id of ids) {
    if (action === "activate") {
      await env.DB.prepare(`UPDATE time_slots SET active = 1 WHERE id = ?`).bind(id).run();
    } else if (action === "deactivate") {
      await env.DB.prepare(`UPDATE time_slots SET active = 0 WHERE id = ?`).bind(id).run();
    } else if (action === "delete") {
      const bookingCount = await env.DB.prepare(`SELECT COUNT(*) as cnt FROM bookings WHERE time_slot_id = ?`).bind(id).first();
      if (bookingCount.cnt > 0) {
        await env.DB.prepare(`UPDATE time_slots SET active = 0 WHERE id = ?`).bind(id).run();
      } else {
        await env.DB.prepare(`DELETE FROM time_slots WHERE id = ?`).bind(id).run();
      }
    }
  }

  await writeAuditLog(env, admin.username, `bulk_${action}_slots`, ids.join(","), null);
  return redirectTo(redirectUrl);
}

function generateTimesFromRange(rangeStart, rangeEnd, intervalMinutes) {
  if (!/^\d{2}:\d{2}$/.test(rangeStart) || !/^\d{2}:\d{2}$/.test(rangeEnd) || !intervalMinutes || intervalMinutes < 1) {
    return [];
  }
  const [sh, sm] = rangeStart.split(":").map(Number);
  const [eh, em] = rangeEnd.split(":").map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  const times = [];
  let guard = 0;
  for (let t = startMin; t <= endMin && guard < 200; t += intervalMinutes) {
    guard++;
    times.push(`${pad2(Math.floor(t / 60))}:${pad2(t % 60)}`);
  }
  return times;
}

async function handleBatchCreateSlots(request, env, admin) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const form = await request.formData();
  const dateStart = String(form.get("dateStart") || "");
  const dateEnd = String(form.get("dateEnd") || "");
  const weekdays = new Set(form.getAll("weekday").map((v) => parseInt(v, 10)));
  const explicitTimes = String(form.get("times") || "").split(",").map((t) => t.trim()).filter(Boolean);
  const rangeStart = String(form.get("rangeStart") || "");
  const rangeEnd = String(form.get("rangeEnd") || "");
  const intervalMinutes = parseInt(form.get("intervalMinutes"), 10);
  const times = explicitTimes.length ? explicitTimes : generateTimesFromRange(rangeStart, rangeEnd, intervalMinutes);
  const serviceTypeId = parseInt(form.get("serviceTypeId"), 10);
  const stylistId = parseInt(form.get("stylistId"), 10) || null;
  let capacity = parseInt(form.get("capacity"), 10);
  if (stylistId) capacity = 1; // 一位設計師同時間只能服務一位客人

  const problems = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStart)) problems.push("開始日期格式不正確或未填寫");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateEnd)) problems.push("結束日期格式不正確或未填寫");
  if (!weekdays.size) problems.push("請至少勾選一個星期");
  if (!times.length) problems.push("請填寫「時間清單」，或改填「時間區段＋間隔」");
  if (!serviceTypeId) problems.push("請選擇服務項目");
  if (!capacity || capacity < 1) problems.push("每時段可容納組數需為 1 以上");
  if (problems.length) {
    return slotsErrorRedirect(dateStart, `無法建立時段，請修正以下問題：${problems.join("；")}。`);
  }

  const { results: closedInRange } = await env.DB.prepare(
    `SELECT closed_date FROM closed_dates WHERE closed_date BETWEEN ? AND ?`
  ).bind(dateStart, dateEnd).all();
  const closedSet = new Set(closedInRange.map((r) => r.closed_date));

  const service = await env.DB.prepare(`SELECT duration_minutes FROM service_types WHERE id = ?`).bind(serviceTypeId).first();
  const durationMinutes = service ? service.duration_minutes : 60;

  let created = 0;
  let skippedClosed = 0;
  let skippedConflict = 0;
  let cursor = dateStart;
  let guard = 0;
  while (cursor <= dateEnd && guard < 366) {
    guard++;
    if (closedSet.has(cursor)) {
      skippedClosed++;
    } else if (weekdays.has(weekdayMon1(cursor))) {
      for (const time of times) {
        if (!/^\d{2}:\d{2}$/.test(time)) continue;
        const existing = await env.DB.prepare(
          `SELECT id FROM time_slots WHERE service_type_id = ? AND slot_date = ? AND slot_time = ? AND stylist_id IS ?`
        ).bind(serviceTypeId, cursor, time, stylistId).first();
        if (existing) continue;

        if (stylistId) {
          const startMinutes = timeToMinutes(time);
          const conflict = await findStylistConflict(env, stylistId, cursor, startMinutes, startMinutes + durationMinutes, null);
          if (conflict) { skippedConflict++; continue; }
        }

        await env.DB.prepare(
          `INSERT INTO time_slots (service_type_id, slot_date, slot_time, capacity, stylist_id) VALUES (?, ?, ?, ?, ?)`
        ).bind(serviceTypeId, cursor, time, capacity, stylistId).run();
        created++;
      }
    }
    cursor = addDaysToDateStr(cursor, 1);
  }

  await writeAuditLog(env, admin.username, "batch_create_slots", `${dateStart}~${dateEnd}`, `created=${created}, skipped_closed=${skippedClosed}, skipped_conflict=${skippedConflict}`);
  const [y, m] = dateStart.split("-");
  return redirectTo(`/admin/slots?year=${y}&month=${parseInt(m, 10)}&day=${dateStart}&batchCreated=${created}&batchConflict=${skippedConflict}`);
}

// ---------- LINE API 設定 ----------
async function handleAdminSettingsPage(request, env, admin, saved) {
  const values = await getAllLineSettings(env);
  const masked = {
    LINE_CHANNEL_SECRET: maskSecret(values.LINE_CHANNEL_SECRET),
    LINE_CHANNEL_ACCESS_TOKEN: maskSecret(values.LINE_CHANNEL_ACCESS_TOKEN),
    LIFF_ID: values.LIFF_ID,
    ADMIN_NOTIFY_LINE_USER_ID: values.ADMIN_NOTIFY_LINE_USER_ID,
    TURNSTILE_SITE_KEY: values.TURNSTILE_SITE_KEY,
    TURNSTILE_SECRET_KEY: maskSecret(values.TURNSTILE_SECRET_KEY),
    ADMIN_LOGIN_PATH: values.ADMIN_LOGIN_PATH,
    MIN_BOOKING_HOURS: values.MIN_BOOKING_HOURS,
    MIN_CANCEL_HOURS: values.MIN_CANCEL_HOURS,
    MIN_RESCHEDULE_HOURS: values.MIN_RESCHEDULE_HOURS,
  };
  const body = settingsPage(masked, saved);
  return new Response(adminLayout("第三方串接設定", escapeHtml(admin.username), body, "settings", admin.role), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

async function handleMessagesPage(request, env, admin, saved) {
  const templates = await getAllTemplates(env);
  const body = messagesPage(templates, TEMPLATE_LABELS, saved);
  return new Response(adminLayout("訊息範本", escapeHtml(admin.username), body, "messages", admin.role), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

async function handleUpdateMessage(request, env, admin, key) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  if (!TEMPLATE_KEYS.includes(key)) return new Response("Not Found", { status: 404 });
  const form = await request.formData();
  await saveTemplate(env, key, {
    title: String(form.get("title") || "").trim(),
    bodyText: String(form.get("bodyText") || "").trim(),
    buttonText: String(form.get("buttonText") || "").trim(),
    buttonUrl: String(form.get("buttonUrl") || "").trim(),
  });
  await writeAuditLog(env, admin.username, "update_message_template", key, null);
  return redirectTo("/admin/messages?saved=1");
}

async function handleUploadTemplateImage(request, env, admin, key) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  if (!TEMPLATE_KEYS.includes(key)) return new Response("Not Found", { status: 404 });
  const form = await request.formData();
  const file = form.get("image");
  if (!file || typeof file === "string") {
    return redirectTo("/admin/messages");
  }
  const result = await saveTemplateImage(env, key, file, new URL(request.url).origin);
  if (!result.ok) {
    const templates = await getAllTemplates(env);
    const body = messagesPage(templates, TEMPLATE_LABELS, false) + `<p class="error">${escapeHtml(result.error)}</p>`;
    return new Response(adminLayout("訊息範本", escapeHtml(admin.username), body, "messages", admin.role), {
      status: 400, headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
  await writeAuditLog(env, admin.username, "upload_template_image", key, null);
  return redirectTo("/admin/messages?saved=1");
}

async function handleDeleteTemplateImage(request, env, admin, key) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  if (!TEMPLATE_KEYS.includes(key)) return new Response("Not Found", { status: 404 });
  await deleteTemplateImage(env, key);
  await writeAuditLog(env, admin.username, "delete_template_image", key, null);
  return redirectTo("/admin/messages?saved=1");
}

async function handleServeTemplateImage(request, env, key) {
  if (!TEMPLATE_KEYS.includes(key)) return new Response("Not Found", { status: 404 });
  const row = await getTemplateImage(env, key);
  if (!row || !row.image_data) return new Response("Not Found", { status: 404 });
  // D1 有時把 BLOB 讀回成一般數字陣列而非 ArrayBuffer，統一轉成 Uint8Array 才能正確當成二進位回傳
  const bytes = new Uint8Array(row.image_data);
  return new Response(bytes, {
    headers: {
      "Content-Type": row.image_content_type || "image/jpeg",
      "Cache-Control": "public, max-age=600",
      "Content-Length": String(bytes.byteLength),
    },
  });
}

async function handleShopProfilePage(request, env, admin, saved, error) {
  const values = await getAllLineSettings(env);
  const profile = {
    SHOP_TAGLINE: values.SHOP_TAGLINE,
    SHOP_ABOUT: values.SHOP_ABOUT,
    SHOP_ANNOUNCEMENT: values.SHOP_ANNOUNCEMENT,
    SHOP_THEME_COLOR: values.SHOP_THEME_COLOR,
    SHOP_SOCIAL_LINKS: values.SHOP_SOCIAL_LINKS,
    SHOP_HOURS: values.SHOP_HOURS,
    SHOP_PHONE: values.SHOP_PHONE,
  };
  const banners = await listBanners(env);
  const portfolio = await listPortfolio(env);
  const logoExists = await hasLogo(env);
  const body = shopProfilePage({ profile, banners, portfolio, saved, error, maxBanners: MAX_BANNERS, hasLogo: logoExists });
  return new Response(adminLayout("店面設計", escapeHtml(admin.username), body, "shop", admin.role), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

async function handleLineRichMenuPage(request, env, admin) {
  const liffId = await getLineSetting(env, "LIFF_ID");
  const body = lineRichMenuPage({ liffId });
  return new Response(adminLayout("圖文選單", escapeHtml(admin.username), body, "richmenu", admin.role), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

async function handleUpdateShopProfile(request, env, admin) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const form = await request.formData();
  await setLineSetting(env, "SHOP_TAGLINE", String(form.get("tagline") || "").trim());
  await setLineSetting(env, "SHOP_ANNOUNCEMENT", String(form.get("announcement") || "").trim());
  await setLineSetting(env, "SHOP_THEME_COLOR", String(form.get("themeColor") || "").trim());
  await setLineSetting(env, "SHOP_ABOUT", String(form.get("about") || "").trim());
  await setLineSetting(env, "SHOP_HOURS", String(form.get("hours") || "").trim());
  await setLineSetting(env, "SHOP_PHONE", String(form.get("phone") || "").trim());
  const social = {
    line: String(form.get("socialLine") || "").trim(),
    ig: String(form.get("socialIg") || "").trim(),
    fb: String(form.get("socialFb") || "").trim(),
  };
  await setLineSetting(env, "SHOP_SOCIAL_LINKS", JSON.stringify(social));
  await writeAuditLog(env, admin.username, "update_shop_profile", null, null);
  return redirectTo("/admin/shop?saved=1");
}

async function handleUploadBanner(request, env, admin) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const form = await request.formData();
  const file = form.get("image");
  if (!file || typeof file === "string") return redirectTo("/admin/shop");
  const result = await saveBanner(env, file);
  if (!result.ok) {
    return handleShopProfilePage(request, env, admin, false, result.error);
  }
  await writeAuditLog(env, admin.username, "upload_shop_banner", null, null);
  return redirectTo("/admin/shop?saved=1");
}

async function handleDeleteBanner(request, env, admin, id) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  await deleteBanner(env, id);
  await writeAuditLog(env, admin.username, "delete_shop_banner", String(id), null);
  return redirectTo("/admin/shop?saved=1");
}

async function handleMoveBanner(request, env, admin, id) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const form = await request.formData();
  await moveBanner(env, id, String(form.get("direction") || ""));
  return redirectTo("/admin/shop?saved=1");
}

async function handleUploadPortfolio(request, env, admin) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const form = await request.formData();
  const file = form.get("image");
  if (!file || typeof file === "string") return redirectTo("/admin/shop");
  const caption = String(form.get("caption") || "").trim();
  const result = await savePortfolioImage(env, file, caption);
  if (!result.ok) {
    return handleShopProfilePage(request, env, admin, false, result.error);
  }
  await writeAuditLog(env, admin.username, "upload_shop_portfolio", null, null);
  return redirectTo("/admin/shop?saved=1");
}

async function handleDeletePortfolio(request, env, admin, id) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  await deletePortfolioImage(env, id);
  await writeAuditLog(env, admin.username, "delete_shop_portfolio", String(id), null);
  return redirectTo("/admin/shop?saved=1");
}

async function handleMovePortfolio(request, env, admin, id) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const form = await request.formData();
  await movePortfolioImage(env, id, String(form.get("direction") || ""));
  return redirectTo("/admin/shop?saved=1");
}

async function handleUploadLogo(request, env, admin) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const form = await request.formData();
  const file = form.get("image");
  if (!file || typeof file === "string") return redirectTo("/admin/shop");
  const result = await saveLogo(env, file);
  if (!result.ok) {
    return handleShopProfilePage(request, env, admin, false, result.error);
  }
  await writeAuditLog(env, admin.username, "upload_shop_logo", null, null);
  return redirectTo("/admin/shop?saved=1");
}

async function handleDeleteLogo(request, env, admin) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  await deleteLogo(env);
  await writeAuditLog(env, admin.username, "delete_shop_logo", null, null);
  return redirectTo("/admin/shop?saved=1");
}

async function handleServeLogo(request, env) {
  const row = await getLogo(env);
  if (!row || !row.image_data) return new Response("Not Found", { status: 404 });
  const bytes = new Uint8Array(row.image_data);
  return new Response(bytes, {
    headers: { "Content-Type": row.image_content_type || "image/jpeg", "Cache-Control": "public, max-age=600", "Content-Length": String(bytes.byteLength) },
  });
}

async function handleServeBannerImage(request, env, id) {
  const row = await getBannerImage(env, id);
  if (!row || !row.image_data) return new Response("Not Found", { status: 404 });
  const bytes = new Uint8Array(row.image_data);
  return new Response(bytes, {
    headers: { "Content-Type": row.image_content_type || "image/jpeg", "Cache-Control": "public, max-age=600", "Content-Length": String(bytes.byteLength) },
  });
}

async function handleServePortfolioImage(request, env, id) {
  const row = await getPortfolioImage(env, id);
  if (!row || !row.image_data) return new Response("Not Found", { status: 404 });
  const bytes = new Uint8Array(row.image_data);
  return new Response(bytes, {
    headers: { "Content-Type": row.image_content_type || "image/jpeg", "Cache-Control": "public, max-age=600", "Content-Length": String(bytes.byteLength) },
  });
}

function validateAdminLoginPath(value) {
  if (!/^\/[a-zA-Z0-9-]{5,40}$/.test(value)) {
    return "自訂路徑必須以 / 開頭，後面接 5~40 個英文字母、數字或連字號（-）。";
  }
  const lower = value.toLowerCase();
  if (lower.startsWith("/admin")) {
    return "自訂路徑不能以 /admin 開頭（會跟系統內部路由衝突），請換一個開頭。";
  }
  const reserved = ["/api", "/my-booking", "/liff", "/line", "/webhook"];
  if (reserved.some((r) => lower === r || lower.startsWith(r + "/") || r.startsWith(lower))) {
    return "這個路徑跟系統既有的網址太接近，請換一個。";
  }
  return null;
}

async function handleUpdateSettings(request, env, admin) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const form = await request.formData();

  if (form.has("ADMIN_LOGIN_PATH") && String(form.get("ADMIN_LOGIN_PATH")).trim()) {
    const rawPath = String(form.get("ADMIN_LOGIN_PATH")).trim();
    const err = validateAdminLoginPath(rawPath);
    if (err) {
      const values = await getAllLineSettings(env);
      const masked = {
        LINE_CHANNEL_SECRET: maskSecret(values.LINE_CHANNEL_SECRET),
        LINE_CHANNEL_ACCESS_TOKEN: maskSecret(values.LINE_CHANNEL_ACCESS_TOKEN),
        LIFF_ID: values.LIFF_ID,
        ADMIN_NOTIFY_LINE_USER_ID: values.ADMIN_NOTIFY_LINE_USER_ID,
        TURNSTILE_SITE_KEY: values.TURNSTILE_SITE_KEY,
        TURNSTILE_SECRET_KEY: maskSecret(values.TURNSTILE_SECRET_KEY),
        ADMIN_LOGIN_PATH: values.ADMIN_LOGIN_PATH,
        MIN_BOOKING_HOURS: values.MIN_BOOKING_HOURS,
        MIN_CANCEL_HOURS: values.MIN_CANCEL_HOURS,
        MIN_RESCHEDULE_HOURS: values.MIN_RESCHEDULE_HOURS,
      };
      return new Response(
        adminLayout("第三方串接設定", escapeHtml(admin.username), settingsPage(masked, false, err), "settings", admin.role),
        { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }
  }

  const HOUR_KEYS = ["MIN_BOOKING_HOURS", "MIN_CANCEL_HOURS", "MIN_RESCHEDULE_HOURS"];
  let changed = [];
  for (const key of LINE_SETTING_KEYS) {
    let value = String(form.get(key) || "").trim();
    if (HOUR_KEYS.includes(key)) {
      const n = parseInt(value, 10);
      value = Number.isFinite(n) && n >= 0 ? String(n) : "";
    }
    if (value) {
      await setLineSetting(env, key, value);
      changed.push(key);
    }
  }
  if (changed.length) await writeAuditLog(env, admin.username, "update_line_settings", changed.join(","), null);
  return redirectTo("/admin/settings?saved=1");
}

async function handleResetAdminLoginPath(request, env, admin) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  await setLineSetting(env, "ADMIN_LOGIN_PATH", "");
  await writeAuditLog(env, admin.username, "update_line_settings", "ADMIN_LOGIN_PATH（恢復預設 /admin）", null);
  return redirectTo("/admin/settings?saved=1");
}

// ---------- 帳號設定 ----------
// 中文搜尋關鍵字 → 資料庫實際使用的英文狀態值
const AUDIT_STATUS_WORD_MAP = {
  "待確認": "pending", "待處理": "pending",
  "已確認": "confirmed", "確認": "confirmed",
  "已完成": "completed", "完成": "completed",
  "已取消": "cancelled", "取消": "cancelled",
  "登入": "login", "密碼": "password",
};

function expandAuditSearchTerms(q) {
  const terms = new Set([q]);
  for (const [key, label] of Object.entries(AUDIT_ACTION_LABELS)) {
    if (label.includes(q) || q.includes(label)) terms.add(key);
  }
  for (const [word, value] of Object.entries(AUDIT_STATUS_WORD_MAP)) {
    if (word.includes(q) || q.includes(word)) terms.add(value);
  }
  return Array.from(terms);
}

async function handleAuditLogPage(request, env, admin, url) {
  const q = url.searchParams.get("q") || "";
  let logs;
  if (q) {
    const terms = expandAuditSearchTerms(q);
    const clause = terms.map(() => "(actor LIKE ? OR action LIKE ? OR target LIKE ? OR detail LIKE ?)").join(" OR ");
    const binds = terms.flatMap((t) => { const like = `%${t}%`; return [like, like, like, like]; });
    logs = (await env.DB.prepare(
      `SELECT * FROM audit_log WHERE ${clause} ORDER BY id DESC LIMIT 200`
    ).bind(...binds).all()).results;
  } else {
    logs = (await env.DB.prepare(`SELECT * FROM audit_log ORDER BY id DESC LIMIT 200`).all()).results;
  }
  const body = auditLogPage(logs, q);
  return new Response(adminLayout("操作紀錄", escapeHtml(admin.username), body, "audit", admin.role), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

async function handleLoginHistoryPage(request, env, admin, url) {
  const q = url.searchParams.get("q") || "";
  let logs;
  if (q) {
    logs = (await env.DB.prepare(
      `SELECT * FROM login_attempts WHERE username LIKE ? ORDER BY id DESC LIMIT 200`
    ).bind(`%${q}%`).all()).results;
  } else {
    logs = (await env.DB.prepare(`SELECT * FROM login_attempts ORDER BY id DESC LIMIT 200`).all()).results;
  }

  const firstSuccessOverall = (await env.DB.prepare(
    `SELECT username, MIN(created_at) as first_seen FROM login_attempts WHERE success = 1 GROUP BY username`
  ).all()).results;
  const firstSuccessPerCountry = (await env.DB.prepare(
    `SELECT username, country, MIN(created_at) as first_seen FROM login_attempts WHERE success = 1 GROUP BY username, country`
  ).all()).results;
  const overallMap = new Map(firstSuccessOverall.map((r) => [r.username, r.first_seen]));
  const countryMap = new Map(firstSuccessPerCountry.map((r) => [`${r.username}|${r.country}`, r.first_seen]));

  logs = logs.map((l) => {
    const key = `${l.username}|${l.country}`;
    const isFirstFromCountry = l.success === 1 && countryMap.get(key) === l.created_at && overallMap.get(l.username) !== l.created_at;
    return { ...l, is_first_from_country: isFirstFromCountry };
  });

  const body = loginHistoryPage(logs, q);
  return new Response(adminLayout("登入紀錄", escapeHtml(admin.username), body, "loginHistory", admin.role), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

async function handleLineMessageLogPage(request, env, admin, url) {
  const q = url.searchParams.get("q") || "";
  const result = url.searchParams.get("result") || "all";
  const clauses = [];
  const binds = [];
  if (q) {
    clauses.push("(recipient_name LIKE ? OR purpose LIKE ?)");
    binds.push(`%${q}%`, `%${q}%`);
  }
  if (result === "success") clauses.push("success = 1");
  else if (result === "failed") clauses.push("success = 0");
  const where = clauses.length ? "WHERE " + clauses.join(" AND ") : "";

  const logs = (await env.DB.prepare(
    `SELECT * FROM line_message_log ${where} ORDER BY id DESC LIMIT 200`
  ).bind(...binds).all()).results;

  const body = lineMessageLogPage(logs, q, result);
  return new Response(adminLayout("LINE 通知紀錄", escapeHtml(admin.username), body, "lineMessages", admin.role), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

async function handleAccountPage(request, env, admin, saved) {
  const body = accountPage(admin.username, null, saved);
  return new Response(adminLayout("系統設定", escapeHtml(admin.username), body, "account", admin.role), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

async function handleUpdatePassword(request, env, admin) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const form = await request.formData();
  const currentPassword = String(form.get("currentPassword") || "");
  const newPassword = String(form.get("newPassword") || "");
  const confirmPassword = String(form.get("confirmPassword") || "");

  const renderError = (msg) => new Response(
    adminLayout("系統設定", escapeHtml(admin.username), accountPage(admin.username, msg, false), "account", admin.role),
    { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );

  const user = await env.DB.prepare(`SELECT * FROM admin_users WHERE id = ?`).bind(admin.user_id).first();
  const valid = await verifyPassword(currentPassword, user.password_hash, user.password_salt);
  if (!valid) return renderError("目前密碼不正確。");
  if (!isPasswordComplexEnough(newPassword)) return renderError("新密碼至少需要 8 碼，且需同時包含英文字母與數字。");
  if (newPassword !== confirmPassword) return renderError("兩次輸入的新密碼不一致。");

  const { hash, salt } = await hashPassword(newPassword);
  await env.DB.prepare(`UPDATE admin_users SET password_hash = ?, password_salt = ? WHERE id = ?`).bind(hash, salt, admin.user_id).run();

  const cookies = parseCookies(request);
  const currentSid = cookies["admin_session"];
  await env.DB.prepare(`DELETE FROM sessions WHERE admin_user_id = ? AND id != ?`).bind(admin.user_id, currentSid || "").run();

  await writeAuditLog(env, admin.username, "change_password", null, null);
  return redirectTo("/admin/account?saved=1");
}

async function handleAccountsPage(request, env, admin, added) {
  const { results } = await env.DB.prepare(`SELECT id, username, role, created_at FROM admin_users ORDER BY id ASC`).all();
  const body = accountsPage(results, admin.user_id, null, added);
  return new Response(adminLayout("帳號管理", escapeHtml(admin.username), body, "accounts", admin.role), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

async function handleCreateAccount(request, env, admin) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const form = await request.formData();
  const username = String(form.get("username") || "").trim();
  const password = String(form.get("password") || "");
  const role = form.get("role") === "admin" ? "admin" : "staff";

  const renderError = async (msg) => {
    const { results } = await env.DB.prepare(`SELECT id, username, role, created_at FROM admin_users ORDER BY id ASC`).all();
    return new Response(
      adminLayout("帳號管理", escapeHtml(admin.username), accountsPage(results, admin.user_id, msg, false), "accounts", admin.role),
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  };

  if (username.length < 3) return renderError("帳號至少需要 3 個字元。");
  if (!isPasswordComplexEnough(password)) return renderError("密碼至少需要 8 碼，且需同時包含英文字母與數字。");

  const existing = await env.DB.prepare(`SELECT id FROM admin_users WHERE username = ?`).bind(username).first();
  if (existing) return renderError("這個帳號已經被使用了。");

  const { hash, salt } = await hashPassword(password);
  await env.DB.prepare(
    `INSERT INTO admin_users (username, password_hash, password_salt, role) VALUES (?, ?, ?, ?)`
  ).bind(username, hash, salt, role).run();

  await writeAuditLog(env, admin.username, "create_account", `${username}（${role === "admin" ? "管理員" : "員工"}）`, null);
  return redirectTo("/admin/accounts?added=1");
}

async function handleDeleteAccount(request, env, admin, targetId) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const id = parseInt(targetId, 10);
  if (id === admin.user_id) return new Response("不能刪除自己目前登入中的帳號。", { status: 400 });

  const target = await env.DB.prepare(`SELECT username FROM admin_users WHERE id = ?`).bind(id).first();
  if (!target) return redirectTo("/admin/accounts");

  await env.DB.prepare(`DELETE FROM sessions WHERE admin_user_id = ?`).bind(id).run();
  await env.DB.prepare(`DELETE FROM admin_users WHERE id = ?`).bind(id).run();

  await writeAuditLog(env, admin.username, "delete_account", target.username, null);
  return redirectTo("/admin/accounts");
}

async function handleResetAccountPasswordPage(request, env, admin, targetId) {
  const id = parseInt(targetId, 10);
  const target = await env.DB.prepare(`SELECT id, username FROM admin_users WHERE id = ?`).bind(id).first();
  if (!target) return new Response("Not Found", { status: 404 });
  if (target.id === admin.user_id) return redirectTo("/admin/account");

  const body = resetAccountPasswordPage(target, null);
  return new Response(adminLayout("重設密碼", escapeHtml(admin.username), body, "accounts", admin.role), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

async function handleResetAccountPassword(request, env, admin, targetId) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const id = parseInt(targetId, 10);
  const target = await env.DB.prepare(`SELECT id, username FROM admin_users WHERE id = ?`).bind(id).first();
  if (!target) return new Response("Not Found", { status: 404 });
  if (target.id === admin.user_id) return redirectTo("/admin/account");

  const form = await request.formData();
  const newPassword = String(form.get("newPassword") || "");
  const confirmPassword = String(form.get("confirmPassword") || "");

  const renderError = (msg) => new Response(
    adminLayout("重設密碼", escapeHtml(admin.username), resetAccountPasswordPage(target, msg), "accounts", admin.role),
    { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );

  if (!isPasswordComplexEnough(newPassword)) return renderError("新密碼至少需要 8 碼，且需同時包含英文字母與數字。");
  if (newPassword !== confirmPassword) return renderError("兩次輸入的新密碼不一致。");

  const { hash, salt } = await hashPassword(newPassword);
  await env.DB.prepare(`UPDATE admin_users SET password_hash = ?, password_salt = ? WHERE id = ?`).bind(hash, salt, id).run();
  await env.DB.prepare(`DELETE FROM sessions WHERE admin_user_id = ?`).bind(id).run();

  await writeAuditLog(env, admin.username, "reset_account_password", target.username, null);
  return redirectTo("/admin/accounts?added=1");
}

// ---------- 公開 API（客人端） ----------
async function handlePublicServices(request, env) {
  const { results } = await env.DB.prepare(
    `SELECT id, name, price, description, duration_minutes FROM service_types WHERE active = 1 ORDER BY id ASC`
  ).all();
  return Response.json({ ok: true, services: results });
}

async function handlePublicStylists(request, env) {
  const url = new URL(request.url);
  const serviceTypeId = parseInt(url.searchParams.get("serviceTypeId"), 10);
  if (!serviceTypeId) return Response.json({ ok: false, error: "missing_service" }, { status: 400 });
  const today = taipeiTodayStr();

  const { results: manualStylists } = await env.DB.prepare(
    `SELECT DISTINCT st.id, st.name, st.bio, (CASE WHEN st.photo_data IS NOT NULL THEN 1 ELSE 0 END) as has_photo FROM time_slots t
     JOIN stylists st ON st.id = t.stylist_id
     WHERE t.service_type_id = ? AND t.active = 1 AND t.booked_count < t.capacity
           AND t.slot_date >= ? AND st.active = 1 AND st.auto_schedule = 0
     ORDER BY st.id ASC`
  ).bind(serviceTypeId, today).all();

  const { results: autoStylists } = await env.DB.prepare(
    `SELECT DISTINCT st.id, st.name, st.max_advance_days, st.bio, (CASE WHEN st.photo_data IS NOT NULL THEN 1 ELSE 0 END) as has_photo FROM stylist_services ss
     JOIN stylists st ON st.id = ss.stylist_id
     WHERE ss.service_type_id = ? AND st.active = 1 AND st.auto_schedule = 1
     ORDER BY st.id ASC`
  ).bind(serviceTypeId).all();

  const merged = [...manualStylists, ...autoStylists].sort((a, b) => a.id - b.id);
  return Response.json({ ok: true, stylists: merged });
}

async function handlePublicSlots(request, env) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  const serviceTypeId = parseInt(url.searchParams.get("serviceTypeId"), 10);
  const stylistId = parseInt(url.searchParams.get("stylistId"), 10) || null;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ ok: false, error: "invalid_date" }, { status: 400 });
  }
  if (!serviceTypeId) {
    return Response.json({ ok: false, error: "missing_service" }, { status: 400 });
  }
  const closed = await env.DB.prepare(`SELECT 1 FROM closed_dates WHERE closed_date = ?`).bind(date).first();
  if (closed) {
    return Response.json({ ok: true, slots: [] });
  }

  if (stylistId) {
    const stylist = await env.DB.prepare(`SELECT * FROM stylists WHERE id = ? AND active = 1`).bind(stylistId).first();
    if (stylist && stylist.auto_schedule) {
      const times = await computeAutoAvailability(env, stylist, serviceTypeId, date);
      const slots = times.map((t) => ({
        id: `virtual:${stylistId}:${date}:${t}:${serviceTypeId}`,
        slot_time: t, capacity: 1, booked_count: 0, stylist_name: stylist.name,
      }));
      return Response.json({ ok: true, slots });
    }
    const { results } = await env.DB.prepare(
      `SELECT t.id, t.slot_time, t.capacity, t.booked_count, st.name as stylist_name FROM time_slots t
       LEFT JOIN stylists st ON st.id = t.stylist_id
       WHERE t.slot_date = ? AND t.service_type_id = ? AND t.active = 1 AND t.booked_count < t.capacity AND t.stylist_id = ?
       ORDER BY t.slot_time ASC`
    ).bind(date, serviceTypeId, stylistId).all();
    return Response.json({ ok: true, slots: results });
  }

  // 不指定服務人員：手動時段照舊查詢，另外把每位「自動排程」服務人員即時算出的空檔一起併入
  const { results: manualSlots } = await env.DB.prepare(
    `SELECT t.id, t.slot_time, t.capacity, t.booked_count, st.name as stylist_name FROM time_slots t
     LEFT JOIN stylists st ON st.id = t.stylist_id
     WHERE t.slot_date = ? AND t.service_type_id = ? AND t.active = 1 AND t.booked_count < t.capacity
     ORDER BY t.slot_time ASC`
  ).bind(date, serviceTypeId).all();

  const { results: autoStylists } = await env.DB.prepare(
    `SELECT st.* FROM stylist_services ss JOIN stylists st ON st.id = ss.stylist_id
     WHERE ss.service_type_id = ? AND st.active = 1 AND st.auto_schedule = 1`
  ).bind(serviceTypeId).all();

  let autoSlots = [];
  for (const stylist of autoStylists) {
    const times = await computeAutoAvailability(env, stylist, serviceTypeId, date);
    autoSlots = autoSlots.concat(times.map((t) => ({
      id: `virtual:${stylist.id}:${date}:${t}:${serviceTypeId}`,
      slot_time: t, capacity: 1, booked_count: 0, stylist_name: stylist.name,
    })));
  }

  // 不指定人員時，客人不在乎是哪位服務人員服務，同一個時間不管有幾位人員有空，只顯示一次
  const seenTimes = new Set();
  const merged = [];
  for (const slot of [...manualSlots, ...autoSlots].sort((a, b) => a.slot_time.localeCompare(b.slot_time))) {
    if (seenTimes.has(slot.slot_time)) continue;
    seenTimes.add(slot.slot_time);
    merged.push(slot);
  }
  return Response.json({ ok: true, slots: merged });
}

// 客人預約的是「自動排程」服務人員即時算出的虛擬時段時，要在真正送出預約的這一刻，
// 重新驗證一次（班表、休息時間、是否被搶走）並真正建立一筆 time_slots 紀錄，
// 之後就跟手動建立的時段完全一樣，共用同一套預約/取消/衝突防護邏輯。
async function materializeVirtualSlot(env, virtualId) {
  const m = virtualId.match(/^virtual:(\d+):(\d{4}-\d{2}-\d{2}):(\d{2}:\d{2}):(\d+)$/);
  if (!m) return { ok: false, error: "slot_not_found" };
  const [, stylistIdStr, date, time, serviceTypeIdStr] = m;
  const stylistId = parseInt(stylistIdStr, 10);
  const serviceTypeId = parseInt(serviceTypeIdStr, 10);

  const stylist = await env.DB.prepare(`SELECT * FROM stylists WHERE id = ? AND active = 1 AND auto_schedule = 1`).bind(stylistId).first();
  if (!stylist) return { ok: false, error: "slot_not_found" };

  const availableTimes = await computeAutoAvailability(env, stylist, serviceTypeId, date);
  if (!availableTimes.includes(time)) return { ok: false, error: "slot_full" };

  const service = await env.DB.prepare(`SELECT duration_minutes FROM service_types WHERE id = ? AND active = 1`).bind(serviceTypeId).first();
  if (!service) return { ok: false, error: "slot_not_found" };

  const startMinutes = timeToMinutes(time);
  const conflict = await findStylistConflict(env, stylistId, date, startMinutes, startMinutes + service.duration_minutes, null);
  if (conflict) return { ok: false, error: "slot_full" };

  const insert = await env.DB.prepare(
    `INSERT INTO time_slots (service_type_id, slot_date, slot_time, capacity, stylist_id) VALUES (?, ?, ?, 1, ?)`
  ).bind(serviceTypeId, date, time, stylistId).run();
  const slot = await env.DB.prepare(`SELECT * FROM time_slots WHERE id = ?`).bind(insert.meta.last_row_id).first();
  return { ok: true, slot };
}

async function handleCreateBooking(request, env) {
  let data;
  try {
    data = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  const rawSlotId = String(data.slotId || "");
  const name = String(data.name || "").trim().slice(0, 100);
  const phone = String(data.phone || "").trim().slice(0, 30);
  const email = String(data.email || "").trim().slice(0, 200);
  const note = String(data.note || "").trim().slice(0, 1000);
  const lineUserId = String(data.lineUserId || "").trim().slice(0, 100);
  const lineDisplayName = String(data.lineDisplayName || "").trim().slice(0, 100);
  const turnstileToken = String(data.turnstileToken || "");
  const addonIds = Array.isArray(data.addonIds) ? data.addonIds.map((v) => parseInt(v, 10)).filter(Boolean) : [];

  if (!rawSlotId || !name || !phone) {
    return Response.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }
  if (!isValidPhone(phone)) {
    return Response.json({ ok: false, error: "invalid_phone" }, { status: 400 });
  }

  const turnstileSecretKey = await getLineSetting(env, "TURNSTILE_SECRET_KEY");
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const turnstileOk = await verifyTurnstileToken(turnstileSecretKey, turnstileToken, ip);
  if (!turnstileOk) {
    return Response.json({ ok: false, error: "turnstile_failed" }, { status: 400 });
  }

  if (await isCustomerBlocked(env, phone, lineUserId)) {
    return Response.json({ ok: false, error: "blocked" }, { status: 403 });
  }

  const minBookingHours = parseInt(await getLineSetting(env, "MIN_BOOKING_HOURS"), 10) || 0;

  let slot;
  let slotId;
  if (rawSlotId.startsWith("virtual:")) {
    const result = await materializeVirtualSlot(env, rawSlotId);
    if (!result.ok) return Response.json({ ok: false, error: result.error }, { status: result.error === "slot_full" ? 409 : 404 });
    slot = result.slot;
    slotId = slot.id;

    if (minBookingHours > 0 && hoursUntilSlot(slot.slot_date, slot.slot_time) < minBookingHours) {
      return Response.json({ ok: false, error: "too_late_to_book" }, { status: 400 });
    }

    const updateResult = await env.DB.prepare(
      `UPDATE time_slots SET booked_count = booked_count + 1 WHERE id = ? AND booked_count < capacity`
    ).bind(slotId).run();
    if (!updateResult.meta.changes) return Response.json({ ok: false, error: "slot_full" }, { status: 409 });
  } else {
    slotId = parseInt(rawSlotId, 10);
    if (!slotId) return Response.json({ ok: false, error: "missing_fields" }, { status: 400 });

    slot = await env.DB.prepare(`SELECT * FROM time_slots WHERE id = ? AND active = 1`).bind(slotId).first();
    if (!slot) return Response.json({ ok: false, error: "slot_not_found" }, { status: 404 });
    if (slot.booked_count >= slot.capacity) return Response.json({ ok: false, error: "slot_full" }, { status: 409 });

    if (minBookingHours > 0 && hoursUntilSlot(slot.slot_date, slot.slot_time) < minBookingHours) {
      return Response.json({ ok: false, error: "too_late_to_book" }, { status: 400 });
    }

    const updateResult = await env.DB.prepare(
      `UPDATE time_slots SET booked_count = booked_count + 1 WHERE id = ? AND booked_count < capacity`
    ).bind(slotId).run();
    if (!updateResult.meta.changes) return Response.json({ ok: false, error: "slot_full" }, { status: 409 });
  }

  const manageToken = newSessionId();
  const bookingResult = await env.DB.prepare(
    `INSERT INTO bookings (time_slot_id, customer_name, customer_phone, customer_email, line_user_id, line_display_name, note, manage_token)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(slotId, name, phone, email || null, lineUserId || null, lineDisplayName || null, note || null, manageToken).run();
  const bookingId = bookingResult.meta.last_row_id;

  if (addonIds.length) {
    const { results: addons } = await env.DB.prepare(
      `SELECT id, name, price FROM service_addons WHERE active = 1 AND id IN (${addonIds.map(() => "?").join(",")})`
    ).bind(...addonIds).all();
    for (const a of addons) {
      await env.DB.prepare(
        `INSERT INTO booking_addons (booking_id, addon_id, name_snapshot, price_snapshot) VALUES (?, ?, ?, ?)`
      ).bind(bookingId, a.id, a.name, a.price).run();
    }
  }

  const manageUrl = `${new URL(request.url).origin}/my-booking?token=${manageToken}`;

  const accessToken = await getLineSetting(env, "LINE_CHANNEL_ACCESS_TOKEN");
  if (lineUserId && accessToken) {
    try {
      const template = await getTemplate(env, "booking_received");
      const message = buildLineMessage(template, {
        customer_name: name,
        slot_date: slot.slot_date,
        slot_time: slot.slot_time,
        manage_url: manageUrl,
      });
      await sendLineAndLog(env, {
        direction: "push", purpose: "預約成立通知", to: lineUserId, name,
        messages: [message], accessToken,
      });
    } catch (e) { /* 通知失敗不影響預約本身成功 */ }
  }

  return Response.json({ ok: true, manageUrl });
}

// ---------- 客人自助取消／改期 ----------
async function fetchBookingByToken(env, token) {
  return env.DB.prepare(
    `SELECT b.*, t.slot_date, t.slot_time, t.service_type_id, t.stylist_id, s.name as service_name, s.duration_minutes
     FROM bookings b
     JOIN time_slots t ON t.id = b.time_slot_id
     JOIN service_types s ON s.id = t.service_type_id
     WHERE b.manage_token = ?`
  ).bind(token).first();
}

async function handleMyBookingPage(request, env, url) {
  const token = url.searchParams.get("token") || "";
  const msgKey = url.searchParams.get("msg") || "";
  const booking = token ? await fetchBookingByToken(env, token) : null;

  let availableSlots = [];
  if (booking && (booking.status === "pending" || booking.status === "confirmed")) {
    const { results } = await env.DB.prepare(
      `SELECT id, slot_date, slot_time, capacity, booked_count FROM time_slots
       WHERE service_type_id = ? AND active = 1 AND booked_count < capacity AND slot_date >= ?
       AND slot_date NOT IN (SELECT closed_date FROM closed_dates)
       ORDER BY slot_date ASC, slot_time ASC LIMIT 50`
    ).bind(booking.service_type_id, taipeiTodayStr()).all();
    availableSlots = results.filter((s) => s.id !== booking.time_slot_id);

    // 如果原本預約的是「自動排程」服務人員，另外即時算出這位服務人員未來的空檔一起併入選項
    if (booking.stylist_id) {
      const stylist = await env.DB.prepare(`SELECT * FROM stylists WHERE id = ? AND active = 1 AND auto_schedule = 1`).bind(booking.stylist_id).first();
      if (stylist) {
        const today = taipeiTodayStr();
        for (let i = 0; i < 30 && availableSlots.length < 50; i++) {
          const d = addDaysToDateStr(today, i);
          const times = await computeAutoAvailability(env, stylist, booking.service_type_id, d);
          for (const t of times) {
            availableSlots.push({
              id: `virtual:${stylist.id}:${d}:${t}:${booking.service_type_id}`,
              slot_date: d, slot_time: t, capacity: 1, booked_count: 0,
            });
          }
        }
      }
    }
  }

  const themeColor = (await getLineSetting(env, "SHOP_THEME_COLOR")) || "#16181c";
  return new Response(myBookingPage(booking, availableSlots, msgKey, token, themeColor), {
    status: booking ? 200 : 404,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

async function handleCancelMyBooking(request, env, url) {
  const token = url.searchParams.get("token") || "";
  const booking = await fetchBookingByToken(env, token);
  if (!booking) return new Response("Not Found", { status: 404 });
  if (booking.status === "cancelled" || booking.status === "completed") {
    return redirectTo(`/my-booking?token=${token}&msg=already`);
  }
  const minCancelHours = parseInt(await getLineSetting(env, "MIN_CANCEL_HOURS"), 10) || 0;
  if (minCancelHours > 0 && hoursUntilSlot(booking.slot_date, booking.slot_time) < minCancelHours) {
    return redirectTo(`/my-booking?token=${token}&msg=too_late_to_cancel`);
  }
  await env.DB.prepare(`UPDATE bookings SET status = 'cancelled' WHERE id = ?`).bind(booking.id).run();
  await env.DB.prepare(`UPDATE time_slots SET booked_count = MAX(booked_count - 1, 0) WHERE id = ?`).bind(booking.time_slot_id).run();
  await writeAuditLog(env, booking.customer_name, "customer_cancel_booking", `booking:${booking.id}`, null);
  return redirectTo(`/my-booking?token=${token}&msg=cancelled`);
}

async function handleRescheduleMyBooking(request, env, url) {
  const token = url.searchParams.get("token") || "";
  const booking = await fetchBookingByToken(env, token);
  if (!booking) return new Response("Not Found", { status: 404 });
  if (booking.status !== "pending" && booking.status !== "confirmed") {
    return redirectTo(`/my-booking?token=${token}&msg=cannot_change`);
  }
  const minRescheduleHours = parseInt(await getLineSetting(env, "MIN_RESCHEDULE_HOURS"), 10) || 0;
  if (minRescheduleHours > 0 && hoursUntilSlot(booking.slot_date, booking.slot_time) < minRescheduleHours) {
    return redirectTo(`/my-booking?token=${token}&msg=too_late_to_reschedule`);
  }

  const form = await request.formData();
  const rawNewSlotId = String(form.get("newSlotId") || "");
  if (!rawNewSlotId) {
    return redirectTo(`/my-booking?token=${token}&msg=invalid_slot`);
  }

  let newSlotId;
  if (rawNewSlotId.startsWith("virtual:")) {
    const result = await materializeVirtualSlot(env, rawNewSlotId);
    if (!result.ok) return redirectTo(`/my-booking?token=${token}&msg=${result.error === "slot_full" ? "slot_full" : "invalid_slot"}`);
    newSlotId = result.slot.id;
  } else {
    newSlotId = parseInt(rawNewSlotId, 10);
  }
  if (!newSlotId || newSlotId === booking.time_slot_id) {
    return redirectTo(`/my-booking?token=${token}&msg=invalid_slot`);
  }

  const newSlot = await env.DB.prepare(`SELECT * FROM time_slots WHERE id = ? AND active = 1`).bind(newSlotId).first();
  if (!newSlot) return redirectTo(`/my-booking?token=${token}&msg=invalid_slot`);

  const upd = await env.DB.prepare(
    `UPDATE time_slots SET booked_count = booked_count + 1 WHERE id = ? AND booked_count < capacity`
  ).bind(newSlotId).run();
  if (!upd.meta.changes) return redirectTo(`/my-booking?token=${token}&msg=slot_full`);

  await env.DB.prepare(`UPDATE time_slots SET booked_count = MAX(booked_count - 1, 0) WHERE id = ?`).bind(booking.time_slot_id).run();
  await env.DB.prepare(
    `UPDATE bookings SET time_slot_id = ?, status = 'pending', reminder_sent = 0 WHERE id = ?`
  ).bind(newSlotId, booking.id).run();
  await writeAuditLog(env, booking.customer_name, "customer_reschedule_booking", `booking:${booking.id}`, `to slot:${newSlotId}`);

  return redirectTo(`/my-booking?token=${token}&msg=rescheduled`);
}

const BOOKING_QUERY_KEYWORDS = ["查詢", "查詢預約"];
const CONTACT_KEYWORDS = ["聯絡我們"];
const BOOKING_STATUS_LABEL_ZH = { pending: "待確認", confirmed: "已確認" };

async function lookupActiveBookingsForLineUser(env, lineUserId) {
  const { results } = await env.DB.prepare(
    `SELECT b.manage_token, b.status, t.slot_date, t.slot_time, s.name as service_name
     FROM bookings b
     JOIN time_slots t ON t.id = b.time_slot_id
     JOIN service_types s ON s.id = t.service_type_id
     WHERE b.line_user_id = ? AND b.status IN ('pending', 'confirmed')
     ORDER BY t.slot_date ASC, t.slot_time ASC`
  ).bind(lineUserId).all();
  return results;
}

async function handleLineWebhook(request, env) {
  const rawBody = await request.text();
  const signature = request.headers.get("X-Line-Signature");
  const channelSecret = await getLineSetting(env, "LINE_CHANNEL_SECRET");
  const valid = await verifyLineSignature(rawBody, signature, channelSecret);
  if (!valid) return new Response("Invalid signature", { status: 401 });

  const liffId = await getLineSetting(env, "LIFF_ID");
  const accessToken = await getLineSetting(env, "LINE_CHANNEL_ACCESS_TOKEN");
  const origin = new URL(request.url).origin;

  const body = JSON.parse(rawBody);
  for (const event of body.events || []) {
    if (event.type === "message" && event.message?.type === "text") {
      const text = (event.message.text || "").trim();
      const lineUserId = event.source && event.source.userId;

      if (BOOKING_QUERY_KEYWORDS.includes(text)) {
        const allBookings = lineUserId ? await lookupActiveBookingsForLineUser(env, lineUserId) : [];
        // 只顯示還沒開始的預約，已經過去的時段即使狀態還沒被標記完成也不列出
        const bookings = allBookings.filter((b) => hoursUntilSlot(b.slot_date, b.slot_time) > 0).slice(0, 5);
        const messages = bookings.length
          ? [{
              type: "flex",
              altText: "你目前的預約",
              contents: {
                type: "bubble",
                body: {
                  type: "box", layout: "vertical", spacing: "md",
                  contents: [
                    { type: "text", text: "你目前的預約", weight: "bold", size: "md" },
                    { type: "separator", margin: "md" },
                    ...bookings.flatMap((b, i) => [
                      {
                        type: "box", layout: "vertical", margin: i === 0 ? "md" : "lg", spacing: "xs",
                        contents: [
                          { type: "text", text: `📅 ${b.slot_date} ${b.slot_time}`, size: "sm", weight: "bold" },
                          { type: "text", text: `${b.service_name}（${BOOKING_STATUS_LABEL_ZH[b.status] || b.status}）`, size: "sm", color: "#55585f" },
                          {
                            type: "button", style: "secondary", height: "sm", margin: "sm",
                            action: { type: "uri", label: "查看／改期／取消", uri: `${origin}/my-booking?token=${b.manage_token}` },
                          },
                        ],
                      },
                    ]),
                  ],
                },
              },
            }]
          : [{ type: "text", text: `目前沒有找到你的預約紀錄。${liffId ? "\n\n如果想預約，請輸入「預約」。" : ""}` }];
        await sendLineAndLog(env, {
          direction: "reply", purpose: "自動回覆：查詢預約",
          to: lineUserId, replyToken: event.replyToken,
          messages, accessToken,
        });
      } else if (CONTACT_KEYWORDS.includes(text)) {
        const [phone, hours, socialLinksRaw] = await Promise.all([
          getLineSetting(env, "SHOP_PHONE"),
          getLineSetting(env, "SHOP_HOURS"),
          getLineSetting(env, "SHOP_SOCIAL_LINKS"),
        ]);
        let social = {};
        try { social = JSON.parse(socialLinksRaw || "{}"); } catch { social = {}; }
        const lines = [];
        if (hours) lines.push(`🕐 營業時間\n${hours}`);
        if (phone) lines.push(`📞 電話\n${phone}`);
        if (social.line) lines.push(`LINE 官方帳號：${social.line}`);
        if (social.ig) lines.push(`Instagram：${social.ig}`);
        if (social.fb) lines.push(`Facebook：${social.fb}`);
        const replyText = lines.length ? lines.join("\n\n") : "目前尚未設定聯絡資訊，請直接在這裡留言，我們會盡快回覆你。";
        await sendLineAndLog(env, {
          direction: "reply", purpose: "自動回覆：聯絡我們",
          to: lineUserId, replyToken: event.replyToken,
          messages: [{ type: "text", text: replyText }], accessToken,
        });
      } else if (text.includes("預約") && liffId) {
        const template = await getTemplate(env, "booking_prompt");
        const message = buildLineMessage(template, { liff_url: `https://liff.line.me/${liffId}` });
        await sendLineAndLog(env, {
          direction: "reply", purpose: "自動回覆：預約連結",
          to: lineUserId, replyToken: event.replyToken,
          messages: [message], accessToken,
        });
      }
    }
  }
  return new Response("OK", { status: 200 });
}

// ---------- 預約前 1 小時自動提醒 ----------
async function sendUpcomingReminders(env) {
  const accessToken = await getLineSetting(env, "LINE_CHANNEL_ACCESS_TOKEN");
  if (!accessToken) return;

  const { results } = await env.DB.prepare(
    `SELECT b.id, b.customer_name, b.line_user_id, t.slot_date, t.slot_time, s.name as service_name
     FROM bookings b
     JOIN time_slots t ON t.id = b.time_slot_id
     JOIN service_types s ON s.id = t.service_type_id
     WHERE b.status = 'confirmed' AND b.reminder_sent = 0 AND b.line_user_id IS NOT NULL`
  ).all();

  if (!results.length) return;

  // 兩邊都用「真實 UTC」時間軸比較，避免混用 taipeiNow() 位移後的假時間軸
  const nowMinutes = Math.floor(Date.now() / 60000);
  const template = await getTemplate(env, "reminder");

  for (const b of results) {
    const [y, m, d] = b.slot_date.split("-").map(Number);
    const [hh, mm] = b.slot_time.split(":").map(Number);
    // slot_date/slot_time 存的是台灣時間（UTC+8），換算成真實 UTC 分鐘數
    const slotMinutes = Math.floor(Date.UTC(y, m - 1, d, hh - 8, mm) / 60000);
    const minutesUntil = slotMinutes - nowMinutes;

    if (minutesUntil > 0 && minutesUntil <= 60) {
      try {
        const message = buildLineMessage(template, {
          customer_name: b.customer_name,
          slot_date: b.slot_date,
          slot_time: b.slot_time,
          service_name: b.service_name,
        });
        await sendLineAndLog(env, {
          direction: "push", purpose: "預約提醒（一小時前）", to: b.line_user_id, name: b.customer_name,
          messages: [message], accessToken,
        });
      } catch (e) { /* 單筆推播失敗不影響其他筆 */ }
      await env.DB.prepare(`UPDATE bookings SET reminder_sent = 1 WHERE id = ?`).bind(b.id).run();
    }
  }
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(sendUpcomingReminders(env));
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // ---- 首次啟動精靈 ----
    if (path === "/setup" && method === "GET") return handleSetupPage(request, env);
    if (path === "/setup" && method === "POST") return handleSetupSubmit(request, env);

    // ---- 公開 API ----
    if (path === "/api/services" && method === "GET") return handlePublicServices(request, env);
    if (path === "/api/stylists" && method === "GET") return handlePublicStylists(request, env);
    if (path === "/api/addons" && method === "GET") return handlePublicAddons(request, env);
    if (path === "/api/booking/slots" && method === "GET") return handlePublicSlots(request, env);
    if (path === "/api/booking" && method === "POST") return handleCreateBooking(request, env);

    const stylistPhotoServeMatch = path.match(/^\/uploads\/stylist-photo\/(\d+)$/);
    if (stylistPhotoServeMatch && method === "GET") return handleServeStylistPhoto(request, env, parseInt(stylistPhotoServeMatch[1], 10));
    if (path === "/uploads/shop-logo" && method === "GET") return handleServeLogo(request, env);
    const shopBannerServeMatch = path.match(/^\/uploads\/shop-banner\/(\d+)$/);
    if (shopBannerServeMatch && method === "GET") return handleServeBannerImage(request, env, parseInt(shopBannerServeMatch[1], 10));
    const shopPortfolioServeMatch = path.match(/^\/uploads\/shop-portfolio\/(\d+)$/);
    if (shopPortfolioServeMatch && method === "GET") return handleServePortfolioImage(request, env, parseInt(shopPortfolioServeMatch[1], 10));
    if (path === "/api/line/webhook" && method === "POST") return handleLineWebhook(request, env);
    const templateImageMatch = path.match(/^\/uploads\/template\/([a-z_]+)$/);
    if (templateImageMatch && method === "GET") return handleServeTemplateImage(request, env, templateImageMatch[1]);

    if (path === "/my-booking" && method === "GET") return handleMyBookingPage(request, env, url);
    if (path === "/my-booking/cancel" && method === "POST") return handleCancelMyBooking(request, env, url);
    if (path === "/my-booking/reschedule" && method === "POST") return handleRescheduleMyBooking(request, env, url);
    if ((path === "/" || path === "/liff/booking") && method === "GET") {
      const liffId = await getLineSetting(env, "LIFF_ID");
      const turnstileSiteKey = await getLineSetting(env, "TURNSTILE_SITE_KEY");
      const shopValues = await getAllLineSettings(env);
      let socialLinks = {};
      try { socialLinks = JSON.parse(shopValues.SHOP_SOCIAL_LINKS || "{}"); } catch { socialLinks = {}; }
      const shop = {
        tagline: shopValues.SHOP_TAGLINE,
        about: shopValues.SHOP_ABOUT,
        announcement: shopValues.SHOP_ANNOUNCEMENT,
        themeColor: shopValues.SHOP_THEME_COLOR,
        hours: shopValues.SHOP_HOURS,
        phone: shopValues.SHOP_PHONE,
        socialLinks,
        hasLogo: await hasLogo(env),
        banners: await listBanners(env),
        portfolio: await listPortfolio(env),
      };
      return new Response(liffBookingPage(liffId, turnstileSiteKey, shop), { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    // ---- Admin 登入/登出（登入路徑可自訂，隱藏預設的 /admin 入口）----
    const rawCustomAdminPath = await getLineSetting(env, "ADMIN_LOGIN_PATH");
    const customLoginPath = rawCustomAdminPath && rawCustomAdminPath.trim() ? rawCustomAdminPath.trim() : null;
    const loginEntryPath = customLoginPath || "/admin";

    if (path === `${loginEntryPath}/login` && method === "POST") return handleAdminLogin(request, env, loginEntryPath);
    if (path === "/admin/logout" && method === "POST") return handleAdminLogout(request, env, loginEntryPath);

    // 設定了自訂路徑時，預設的 /admin/login 一律視為不存在（隱藏起來，不給猜）
    if (customLoginPath && path === "/admin/login" && method === "POST") {
      return new Response("Not Found", { status: 404 });
    }

    if (path === loginEntryPath && method === "GET") {
      const existingAdmin = await getAuthedAdmin(request, env);
      if (existingAdmin) {
        if (customLoginPath) return redirectTo("/admin");
        // 沒有自訂路徑時 loginEntryPath 就是 "/admin" 本身，繼續往下走到後台首頁的一般路由
      } else {
        const turnstileSiteKey = await getLineSetting(env, "TURNSTILE_SITE_KEY");
        return new Response(loginPage(null, turnstileSiteKey, `${loginEntryPath}/login`), { headers: { "Content-Type": "text/html; charset=utf-8" } });
      }
    }

    // 設定了自訂路徑時，未登入狀態下造訪預設的 /admin 一律視為不存在
    if (customLoginPath && path === "/admin" && method === "GET") {
      const existingAdmin = await getAuthedAdmin(request, env);
      if (!existingAdmin) return new Response("Not Found", { status: 404 });
    }

    // ---- Admin 受保護區 ----
    if (path === "/admin" || path.startsWith("/admin/")) {
      const admin = await getAuthedAdmin(request, env);
      if (!admin) {
        return customLoginPath ? new Response("Not Found", { status: 404 }) : redirectTo("/admin");
      }

      if (admin.role !== "admin" && !isStaffAllowedPath(path)) {
        return new Response("權限不足，請聯絡管理員。", { status: 403 });
      }

      if (path === "/admin" && method === "GET") return handleAdminDashboard(request, env, admin);
      if (path === "/admin/quick/close-today" && method === "POST") return handleQuickCloseToday(request, env, admin);

      if (path === "/admin/bookings" && method === "GET") return handleAdminBookings(request, env, admin, url);
      if (path === "/admin/bookings/export.csv" && method === "GET") return handleExportBookingsCsv(request, env, admin, url);
      if (path === "/admin/bookings/new" && method === "GET") return handleNewBookingPage(request, env, admin, null);
      if (path === "/admin/bookings/new" && method === "POST") return handleAdminCreateBooking(request, env, admin);
      const statusMatch = path.match(/^\/admin\/bookings\/(\d+)\/status$/);
      if (statusMatch && method === "POST") return handleUpdateBookingStatus(request, env, admin, statusMatch[1]);

      if (path === "/admin/customers" && method === "GET") return handleAdminCustomers(request, env, admin, url);
      if (path === "/admin/customers/export.csv" && method === "GET") return handleExportCustomersCsv(request, env, admin);
      if (path === "/admin/customers/import" && method === "POST") return handleImportCustomersCsv(request, env, admin);
      const customerNoteMatch = path.match(/^\/admin\/customers\/([^/]+)\/note$/);
      if (customerNoteMatch && method === "POST") return handleUpdateCustomerNote(request, env, admin, decodeURIComponent(customerNoteMatch[1]));

      if (path === "/admin/reports" && method === "GET") return handleReportsPage(request, env, admin, url);

      if (path === "/admin/closed-dates" && method === "GET") return handleClosedDatesPage(request, env, admin, null);
      if (path === "/admin/closed-dates" && method === "POST") return handleCreateClosedDate(request, env, admin);
      const closedDateDeleteMatch = path.match(/^\/admin\/closed-dates\/(\d{4}-\d{2}-\d{2})\/delete$/);
      if (closedDateDeleteMatch && method === "POST") return handleDeleteClosedDate(request, env, admin, closedDateDeleteMatch[1]);

      if (path === "/admin/services" && method === "GET") return handleAdminServices(request, env, admin, null);
      if (path === "/admin/services" && method === "POST") return handleCreateService(request, env, admin);
      const serviceToggleMatch = path.match(/^\/admin\/services\/(\d+)\/toggle$/);
      if (serviceToggleMatch && method === "POST") return handleToggleService(request, env, admin, serviceToggleMatch[1]);
      const serviceDeleteMatch = path.match(/^\/admin\/services\/(\d+)\/delete$/);
      if (serviceDeleteMatch && method === "POST") return handleDeleteService(request, env, admin, serviceDeleteMatch[1]);
      const serviceUpdateMatch = path.match(/^\/admin\/services\/(\d+)\/update$/);
      if (serviceUpdateMatch && method === "POST") return handleUpdateService(request, env, admin, serviceUpdateMatch[1]);

      if (path === "/admin/addons" && method === "GET") return handleAdminAddons(request, env, admin, null);
      if (path === "/admin/addons" && method === "POST") return handleCreateAddon(request, env, admin);
      const addonUpdateMatch = path.match(/^\/admin\/addons\/(\d+)\/update$/);
      if (addonUpdateMatch && method === "POST") return handleUpdateAddon(request, env, admin, addonUpdateMatch[1]);
      const addonToggleMatch = path.match(/^\/admin\/addons\/(\d+)\/toggle$/);
      if (addonToggleMatch && method === "POST") return handleToggleAddon(request, env, admin, addonToggleMatch[1]);
      const addonDeleteMatch = path.match(/^\/admin\/addons\/(\d+)\/delete$/);
      if (addonDeleteMatch && method === "POST") return handleDeleteAddon(request, env, admin, addonDeleteMatch[1]);

      if (path === "/admin/shop" && method === "GET") return handleShopProfilePage(request, env, admin, url.searchParams.get("saved") === "1");
      if (path === "/admin/shop/profile" && method === "POST") return handleUpdateShopProfile(request, env, admin);
      if (path === "/admin/shop/logo" && method === "POST") return handleUploadLogo(request, env, admin);
      if (path === "/admin/shop/logo/delete" && method === "POST") return handleDeleteLogo(request, env, admin);
      if (path === "/admin/shop/banners" && method === "POST") return handleUploadBanner(request, env, admin);
      const shopBannerDeleteMatch = path.match(/^\/admin\/shop\/banners\/(\d+)\/delete$/);
      if (shopBannerDeleteMatch && method === "POST") return handleDeleteBanner(request, env, admin, parseInt(shopBannerDeleteMatch[1], 10));
      const shopBannerMoveMatch = path.match(/^\/admin\/shop\/banners\/(\d+)\/move$/);
      if (shopBannerMoveMatch && method === "POST") return handleMoveBanner(request, env, admin, parseInt(shopBannerMoveMatch[1], 10));
      if (path === "/admin/shop/portfolio" && method === "POST") return handleUploadPortfolio(request, env, admin);
      const shopPortfolioDeleteMatch = path.match(/^\/admin\/shop\/portfolio\/(\d+)\/delete$/);
      if (shopPortfolioDeleteMatch && method === "POST") return handleDeletePortfolio(request, env, admin, parseInt(shopPortfolioDeleteMatch[1], 10));
      const shopPortfolioMoveMatch = path.match(/^\/admin\/shop\/portfolio\/(\d+)\/move$/);
      if (shopPortfolioMoveMatch && method === "POST") return handleMovePortfolio(request, env, admin, parseInt(shopPortfolioMoveMatch[1], 10));

      if (path === "/admin/line-richmenu" && method === "GET") return handleLineRichMenuPage(request, env, admin);

      if (path === "/admin/stylists" && method === "GET") return handleAdminStylists(request, env, admin, null);
      if (path === "/admin/stylists" && method === "POST") return handleCreateStylist(request, env, admin);
      const stylistToggleMatch = path.match(/^\/admin\/stylists\/(\d+)\/toggle$/);
      if (stylistToggleMatch && method === "POST") return handleToggleStylist(request, env, admin, stylistToggleMatch[1]);
      const stylistDeleteMatch = path.match(/^\/admin\/stylists\/(\d+)\/delete$/);
      if (stylistDeleteMatch && method === "POST") return handleDeleteStylist(request, env, admin, stylistDeleteMatch[1]);
      const stylistScheduleMatch = path.match(/^\/admin\/stylists\/(\d+)\/schedule$/);
      if (stylistScheduleMatch && method === "GET") return handleStylistSchedulePage(request, env, admin, stylistScheduleMatch[1], null, url.searchParams.get("saved") === "1");
      if (stylistScheduleMatch && method === "POST") return handleUpdateStylistSchedule(request, env, admin, stylistScheduleMatch[1]);
      const stylistProfileMatch = path.match(/^\/admin\/stylists\/(\d+)\/profile$/);
      if (stylistProfileMatch && method === "POST") return handleUpdateStylistProfile(request, env, admin, stylistProfileMatch[1]);
      const stylistPhotoMatch = path.match(/^\/admin\/stylists\/(\d+)\/photo$/);
      if (stylistPhotoMatch && method === "POST") return handleUploadStylistPhoto(request, env, admin, stylistPhotoMatch[1]);
      const stylistPhotoDeleteMatch = path.match(/^\/admin\/stylists\/(\d+)\/photo\/delete$/);
      if (stylistPhotoDeleteMatch && method === "POST") return handleDeleteStylistPhoto(request, env, admin, stylistPhotoDeleteMatch[1]);

      if (path === "/admin/slots" && method === "GET") return handleAdminSlots(request, env, admin, url);
      if (path === "/admin/slots" && method === "POST") return handleCreateSlot(request, env, admin);
      if (path === "/admin/slots/batch" && method === "POST") return handleBatchCreateSlots(request, env, admin);
      if (path === "/admin/slots/bulk" && method === "POST") return handleBulkSlots(request, env, admin);
      const toggleMatch = path.match(/^\/admin\/slots\/(\d+)\/toggle$/);
      if (toggleMatch && method === "POST") return handleToggleSlot(request, env, admin, toggleMatch[1]);
      const deleteMatch = path.match(/^\/admin\/slots\/(\d+)\/delete$/);
      if (deleteMatch && method === "POST") return handleDeleteSlot(request, env, admin, deleteMatch[1]);

      if (path === "/admin/settings" && method === "GET") return handleAdminSettingsPage(request, env, admin, url.searchParams.get("saved") === "1");
      if (path === "/admin/settings" && method === "POST") return handleUpdateSettings(request, env, admin);
      if (path === "/admin/settings/reset-admin-path" && method === "POST") return handleResetAdminLoginPath(request, env, admin);

      if (path === "/admin/messages" && method === "GET") return handleMessagesPage(request, env, admin, url.searchParams.get("saved") === "1");
      const messageMatch = path.match(/^\/admin\/messages\/([a-z_]+)$/);
      if (messageMatch && method === "POST") return handleUpdateMessage(request, env, admin, messageMatch[1]);
      const imageUploadMatch = path.match(/^\/admin\/messages\/([a-z_]+)\/image$/);
      if (imageUploadMatch && method === "POST") return handleUploadTemplateImage(request, env, admin, imageUploadMatch[1]);
      const imageDeleteMatch = path.match(/^\/admin\/messages\/([a-z_]+)\/image\/delete$/);
      if (imageDeleteMatch && method === "POST") return handleDeleteTemplateImage(request, env, admin, imageDeleteMatch[1]);

      if (path === "/admin/audit-log" && method === "GET") return handleAuditLogPage(request, env, admin, url);
      if (path === "/admin/login-history" && method === "GET") return handleLoginHistoryPage(request, env, admin, url);
      if (path === "/admin/line-messages" && method === "GET") return handleLineMessageLogPage(request, env, admin, url);

      if (path === "/admin/account" && method === "GET") return handleAccountPage(request, env, admin, url.searchParams.get("saved") === "1");
      if (path === "/admin/account/password" && method === "POST") return handleUpdatePassword(request, env, admin);

      if (path === "/admin/accounts" && method === "GET") return handleAccountsPage(request, env, admin, url.searchParams.get("added") === "1");
      if (path === "/admin/accounts" && method === "POST") return handleCreateAccount(request, env, admin);
      const accountDeleteMatch = path.match(/^\/admin\/accounts\/(\d+)\/delete$/);
      if (accountDeleteMatch && method === "POST") return handleDeleteAccount(request, env, admin, accountDeleteMatch[1]);
      const accountPasswordMatch = path.match(/^\/admin\/accounts\/(\d+)\/password$/);
      if (accountPasswordMatch && method === "GET") return handleResetAccountPasswordPage(request, env, admin, accountPasswordMatch[1]);
      if (accountPasswordMatch && method === "POST") return handleResetAccountPassword(request, env, admin, accountPasswordMatch[1]);

      return new Response("Not Found", { status: 404 });
    }

    // ---- 其餘走靜態資源 ----
    return env.ASSETS.fetch(request);
  },
};
