function b64encode(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function b64decode(str) {
  const bin = atob(str);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr.buffer;
}

export async function hashPassword(password, saltB64) {
  const enc = new TextEncoder();
  const salt = saltB64 ? new Uint8Array(b64decode(saltB64)) : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return { hash: b64encode(bits), salt: b64encode(salt.buffer) };
}

export async function verifyPassword(password, hashB64, saltB64) {
  const { hash } = await hashPassword(password, saltB64);
  return timingSafeEqual(hash, hashB64);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function newSessionId() {
  return b64encode(crypto.getRandomValues(new Uint8Array(32)).buffer).replace(/[+/=]/g, "");
}

export function parseCookies(request) {
  const header = request.headers.get("Cookie") || "";
  const out = {};
  header.split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx === -1) return;
    out[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
  });
  return out;
}

export async function getAuthedAdmin(request, env) {
  const cookies = parseCookies(request);
  const sid = cookies["admin_session"];
  if (!sid) return null;
  const row = await env.DB.prepare(
    `SELECT s.id as session_id, s.expires_at, u.id as user_id, u.username, u.role
     FROM sessions s JOIN admin_users u ON u.id = s.admin_user_id
     WHERE s.id = ?`
  ).bind(sid).first();
  if (!row) return null;
  if (new Date(row.expires_at + "Z") < new Date()) return null;
  return row;
}

export function sessionCookie(sid, maxAgeSeconds) {
  return `admin_session=${sid}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAgeSeconds}`;
}

export function clearSessionCookie() {
  return `admin_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}
