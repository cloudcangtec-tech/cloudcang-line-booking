function b64encode(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

export async function verifyLineSignature(rawBody, signatureB64, channelSecret) {
  if (!channelSecret || !signatureB64) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(channelSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const computed = b64encode(sig);
  return computed === signatureB64;
}

async function checkLineResponse(res) {
  if (res.ok) return { ok: true };
  const text = await res.text().catch(() => "");
  return { ok: false, status: res.status, error: `HTTP ${res.status}${text ? `: ${text.slice(0, 300)}` : ""}` };
}

export async function replyMessage(replyToken, messages, accessToken) {
  const res = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ replyToken, messages }),
  });
  return checkLineResponse(res);
}

export async function pushMessage(to, messages, accessToken) {
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ to, messages }),
  });
  return checkLineResponse(res);
}
