const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024; // 1.5MB，D1 綁定 blob 保守上限
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_BANNERS = 5;

function validateImageFile(file) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return "只支援 JPG / PNG / WebP 格式的圖片。";
  }
  return null;
}

// ---------- 店徽 Logo（單張，覆蓋式）----------
export async function getLogo(env) {
  return env.DB.prepare(`SELECT image_data, image_content_type FROM shop_logo WHERE id = 1`).first();
}

export async function hasLogo(env) {
  const row = await env.DB.prepare(`SELECT id FROM shop_logo WHERE id = 1`).first();
  return !!row;
}

export async function saveLogo(env, file) {
  const err = validateImageFile(file);
  if (err) return { ok: false, error: err };
  const buffer = await file.arrayBuffer();
  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    return { ok: false, error: "圖片檔案太大，請壓縮到 1.5MB 以內再上傳。" };
  }
  await env.DB.prepare(
    `INSERT INTO shop_logo (id, image_data, image_content_type, updated_at) VALUES (1, ?, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET image_data = excluded.image_data, image_content_type = excluded.image_content_type, updated_at = excluded.updated_at`
  ).bind(new Uint8Array(buffer), file.type).run();
  return { ok: true };
}

export async function deleteLogo(env) {
  await env.DB.prepare(`DELETE FROM shop_logo WHERE id = 1`).run();
}

// ---------- 橫幅圖片 ----------
export async function listBanners(env) {
  const { results } = await env.DB.prepare(
    `SELECT id, image_content_type, sort_order, created_at FROM shop_banners ORDER BY sort_order ASC, id ASC`
  ).all();
  return results;
}

export async function getBannerImage(env, id) {
  return env.DB.prepare(`SELECT image_data, image_content_type FROM shop_banners WHERE id = ?`).bind(id).first();
}

export async function saveBanner(env, file) {
  const err = validateImageFile(file);
  if (err) return { ok: false, error: err };
  const buffer = await file.arrayBuffer();
  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    return { ok: false, error: "圖片檔案太大，請壓縮到 1.5MB 以內再上傳。" };
  }
  const count = await env.DB.prepare(`SELECT COUNT(*) as c FROM shop_banners`).first();
  if (count.c >= MAX_BANNERS) {
    return { ok: false, error: `橫幅圖片最多 ${MAX_BANNERS} 張，請先刪除一張再上傳。` };
  }
  const maxOrder = await env.DB.prepare(`SELECT MAX(sort_order) as m FROM shop_banners`).first();
  const nextOrder = (maxOrder.m ?? -1) + 1;
  await env.DB.prepare(
    `INSERT INTO shop_banners (image_data, image_content_type, sort_order) VALUES (?, ?, ?)`
  ).bind(new Uint8Array(buffer), file.type, nextOrder).run();
  return { ok: true };
}

export async function deleteBanner(env, id) {
  await env.DB.prepare(`DELETE FROM shop_banners WHERE id = ?`).bind(id).run();
}

export async function moveBanner(env, id, direction) {
  const rows = await env.DB.prepare(`SELECT id, sort_order FROM shop_banners ORDER BY sort_order ASC, id ASC`).all();
  const list = rows.results;
  const idx = list.findIndex((r) => r.id === id);
  if (idx === -1) return;
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= list.length) return;
  const a = list[idx], b = list[swapIdx];
  await env.DB.batch([
    env.DB.prepare(`UPDATE shop_banners SET sort_order = ? WHERE id = ?`).bind(b.sort_order, a.id),
    env.DB.prepare(`UPDATE shop_banners SET sort_order = ? WHERE id = ?`).bind(a.sort_order, b.id),
  ]);
}

// ---------- 作品集圖片 ----------
export async function listPortfolio(env) {
  const { results } = await env.DB.prepare(
    `SELECT id, image_content_type, caption, sort_order, created_at FROM shop_portfolio ORDER BY sort_order ASC, id ASC`
  ).all();
  return results;
}

export async function getPortfolioImage(env, id) {
  return env.DB.prepare(`SELECT image_data, image_content_type FROM shop_portfolio WHERE id = ?`).bind(id).first();
}

export async function savePortfolioImage(env, file, caption) {
  const err = validateImageFile(file);
  if (err) return { ok: false, error: err };
  const buffer = await file.arrayBuffer();
  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    return { ok: false, error: "圖片檔案太大，請壓縮到 1.5MB 以內再上傳。" };
  }
  const maxOrder = await env.DB.prepare(`SELECT MAX(sort_order) as m FROM shop_portfolio`).first();
  const nextOrder = (maxOrder.m ?? -1) + 1;
  await env.DB.prepare(
    `INSERT INTO shop_portfolio (image_data, image_content_type, caption, sort_order) VALUES (?, ?, ?, ?)`
  ).bind(new Uint8Array(buffer), file.type, caption || null, nextOrder).run();
  return { ok: true };
}

export async function deletePortfolioImage(env, id) {
  await env.DB.prepare(`DELETE FROM shop_portfolio WHERE id = ?`).bind(id).run();
}

export async function movePortfolioImage(env, id, direction) {
  const rows = await env.DB.prepare(`SELECT id, sort_order FROM shop_portfolio ORDER BY sort_order ASC, id ASC`).all();
  const list = rows.results;
  const idx = list.findIndex((r) => r.id === id);
  if (idx === -1) return;
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= list.length) return;
  const a = list[idx], b = list[swapIdx];
  await env.DB.batch([
    env.DB.prepare(`UPDATE shop_portfolio SET sort_order = ? WHERE id = ?`).bind(b.sort_order, a.id),
    env.DB.prepare(`UPDATE shop_portfolio SET sort_order = ? WHERE id = ?`).bind(a.sort_order, b.id),
  ]);
}
