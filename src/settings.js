// 這幾把比較敏感（LINE 金鑰、Turnstile Secret），後台可以編輯，
// 但如果後台沒填過，會 fallback 回用「wrangler secret put」設定的 Cloudflare Secret（env 變數）。
const SECRET_KEYS = ["LINE_CHANNEL_SECRET", "LINE_CHANNEL_ACCESS_TOKEN", "TURNSTILE_SECRET_KEY"];

// 一般設定：只存在 D1，沒有 env fallback
const DB_KEYS = [
  "LIFF_ID", "ADMIN_NOTIFY_LINE_USER_ID", "TURNSTILE_SITE_KEY", "ADMIN_LOGIN_PATH",
  "MIN_BOOKING_HOURS", "MIN_CANCEL_HOURS", "MIN_RESCHEDULE_HOURS",
];

const KEYS = [...SECRET_KEYS, ...DB_KEYS];

// 後台介面編輯的優先權比 wrangler secret 高：D1 有值就用 D1，沒有才 fallback 回 env。
export async function getLineSetting(env, key) {
  const row = await env.DB.prepare(`SELECT value FROM settings WHERE key = ?`).bind(key).first();
  if (row && row.value) return row.value;
  return env[key] || "";
}

export async function getAllLineSettings(env) {
  const out = {};
  for (const key of KEYS) {
    out[key] = await getLineSetting(env, key);
  }
  return out;
}

export async function setLineSetting(env, key, value) {
  if (!KEYS.includes(key)) throw new Error("Unknown setting key");
  await env.DB.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).bind(key, value).run();
}

export function maskSecret(value) {
  if (!value) return "";
  if (value.length <= 8) return "•".repeat(value.length);
  return value.slice(0, 4) + "•".repeat(Math.min(value.length - 8, 24)) + value.slice(-4);
}

export { KEYS as LINE_SETTING_KEYS, SECRET_KEYS };
