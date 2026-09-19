export const TEMPLATE_KEYS = ["booking_prompt", "booking_received", "status_confirmed", "status_cancelled", "status_completed", "reminder"];

export const TEMPLATE_LABELS = {
  booking_prompt: "LINE 傳「預約」時的自動回覆",
  booking_received: "客人送出預約後的確認訊息",
  status_confirmed: "預約已確認通知",
  status_cancelled: "預約已取消通知",
  status_completed: "預約已完成通知",
  reminder: "預約前 1 小時提醒",
};

export async function getTemplate(env, key) {
  const row = await env.DB.prepare(`SELECT * FROM message_templates WHERE template_key = ?`).bind(key).first();
  return row || { template_key: key, image_url: null, title: null, body_text: "", button_text: null, button_url: null };
}

export async function getAllTemplates(env) {
  const { results } = await env.DB.prepare(`SELECT * FROM message_templates`).all();
  const map = {};
  for (const row of results) map[row.template_key] = row;
  return TEMPLATE_KEYS.map((key) => map[key] || { template_key: key, image_url: null, title: null, body_text: "", button_text: null, button_url: null });
}

export async function saveTemplate(env, key, { title, bodyText, buttonText, buttonUrl }) {
  // 圖片透過獨立的上傳/刪除 API 管理，這裡不動 image_url / image_data
  await env.DB.prepare(
    `INSERT INTO message_templates (template_key, body_text, title, button_text, button_url, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(template_key) DO UPDATE SET
       title = excluded.title, body_text = excluded.body_text,
       button_text = excluded.button_text, button_url = excluded.button_url, updated_at = excluded.updated_at`
  ).bind(key, bodyText || "", title || null, buttonText || null, buttonUrl || null).run();
}

const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024; // 1.5MB，D1 綁定 blob 保守上限
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function saveTemplateImage(env, key, file, origin) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { ok: false, error: "只支援 JPG / PNG / WebP 格式的圖片。" };
  }
  const buffer = await file.arrayBuffer();
  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    return { ok: false, error: "圖片檔案太大，請壓縮到 1.5MB 以內再上傳。" };
  }
  await env.DB.prepare(
    `INSERT INTO message_templates (template_key, body_text, image_data, image_content_type, image_url, updated_at)
     VALUES (?, '', ?, ?, ?, datetime('now'))
     ON CONFLICT(template_key) DO UPDATE SET
       image_data = excluded.image_data, image_content_type = excluded.image_content_type,
       image_url = excluded.image_url, updated_at = excluded.updated_at`
  ).bind(key, new Uint8Array(buffer), file.type, `${origin}/uploads/template/${key}`).run();
  return { ok: true };
}

export async function deleteTemplateImage(env, key) {
  await env.DB.prepare(
    `UPDATE message_templates SET image_data = NULL, image_content_type = NULL, image_url = NULL, updated_at = datetime('now') WHERE template_key = ?`
  ).bind(key).run();
}

export async function getTemplateImage(env, key) {
  return env.DB.prepare(
    `SELECT image_data, image_content_type FROM message_templates WHERE template_key = ?`
  ).bind(key).first();
}

function fillPlaceholders(str, vars) {
  if (!str) return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, name) => (vars[name] != null ? String(vars[name]) : ""));
}

// 依範本設定組出實際要送出的 LINE 訊息物件（有圖片/按鈕就用 Buttons Template，否則退回純文字）
export function buildLineMessage(template, vars) {
  const text = fillPlaceholders(template.body_text, vars) || "";
  const buttonUrl = fillPlaceholders(template.button_url, vars);
  const hasButton = template.button_text && buttonUrl;
  const hasImage = !!template.image_url;

  if (!hasButton && !hasImage && !template.title) {
    return { type: "text", text: text.slice(0, 5000) };
  }

  return {
    type: "template",
    altText: text.slice(0, 400) || template.title || "通知",
    template: {
      type: "buttons",
      ...(hasImage ? { thumbnailImageUrl: template.image_url } : {}),
      ...(template.title ? { title: template.title.slice(0, 40) } : {}),
      text: (text || " ").slice(0, hasImage || template.title ? 60 : 160),
      // LINE 的 buttons template 規定至少要有一個 action；如果範本設定了圖片/標題卻沒設定按鈕，
      // 用 LINE 官方網域當保底連結，避免留下任何特定商家的網址。
      ...(hasButton ? { actions: [{ type: "uri", label: template.button_text.slice(0, 20), uri: buttonUrl }] } : { actions: [{ type: "uri", label: "了解更多", uri: "https://line.me" }] }),
    },
  };
}
