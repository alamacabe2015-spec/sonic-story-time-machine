import { supabaseAdmin } from "@/integrations/supabase/client.server";

const VAPID_PUBLIC = "BFlBy5SLjigxpiczN_6nOmjCvVWfrC5LoAGCEkNMMtmCl3VQ_fVoyr23TWLnFn6xe9th6TRBT5wWlP52lkcANNc";

const te = new TextEncoder();

function b64u(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64u(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
const concat = (...parts: Uint8Array[]): Uint8Array => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
};
async function hmac(keyBytes: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", keyBytes as BufferSource, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, data as BufferSource));
}

async function vapidJwt(aud: string, privJwk: JsonWebKey): Promise<string> {
  const header = b64u(te.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const payload = b64u(te.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: "mailto:hola@sonicnews.app" })));
  const key = await crypto.subtle.importKey("jwk", privJwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, te.encode(`${header}.${payload}`) as BufferSource);
  return `${header}.${payload}.${b64u(sig)}`;
}

/** RFC 8291 aes128gcm content encryption using only WebCrypto (workerd-safe). */
async function encryptPayload(payload: string, p256dh: string, auth: string): Promise<Uint8Array> {
  const uaPublic = fromB64u(p256dh);
  const authSecret = fromB64u(auth);
  const subKey = await crypto.subtle.importKey("raw", uaPublic as BufferSource, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const eph = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: subKey }, eph.privateKey, 256));
  const ephPublic = new Uint8Array(await crypto.subtle.exportKey("raw", eph.publicKey));
  const prkKey = await hmac(authSecret, shared);
  const keyInfo = concat(te.encode("WebPush: info"), new Uint8Array([0]), uaPublic, ephPublic);
  const ikm = await hmac(prkKey, concat(keyInfo, new Uint8Array([1])));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, concat(te.encode("Content-Encoding: aes128gcm"), new Uint8Array([0, 1])))).slice(0, 16);
  const nonce = (await hmac(prk, concat(te.encode("Content-Encoding: nonce"), new Uint8Array([0, 1])))).slice(0, 12);
  const record = concat(te.encode(payload), new Uint8Array([2]));
  const aesKey = await crypto.subtle.importKey("raw", cek as BufferSource, { name: "AES-GCM" }, false, ["encrypt"]);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce as BufferSource }, aesKey, record as BufferSource));
  return concat(salt, new Uint8Array([0, 0, 16, 0]), new Uint8Array([ephPublic.length]), ephPublic, ciphertext);
}

/** Sends a "new Sonic news" push to every stored subscription; prunes dead ones. */
export async function sendNewsPush(title: string, count: number) {
  const raw = process.env["VAPID_PRIVATE_JWK"];
  if (!raw) return { sent: 0, removed: 0 };
  const privJwk = JSON.parse(raw) as JsonWebKey;
  const { data: subs } = await supabaseAdmin.from("push_subscriptions").select("id, endpoint, p256dh, auth");
  if (!subs?.length) return { sent: 0, removed: 0 };
  const body = JSON.stringify({
    title: "Sonic News 📰",
    body: count > 1 ? `¡${count} noticias nuevas! La última: ${title}` : `¡Noticia nueva! ${title}`,
  });
  let sent = 0;
  const dead: string[] = [];
  for (const sub of subs) {
    try {
      const jwt = await vapidJwt(new URL(sub.endpoint).origin, privJwk);
      const encrypted = await encryptPayload(body, sub.p256dh, sub.auth);
      const res = await fetch(sub.endpoint, {
        method: "POST",
        headers: {
          TTL: "86400",
          "Content-Encoding": "aes128gcm",
          "Content-Type": "application/octet-stream",
          Authorization: `vapid t=${jwt}, k=${VAPID_PUBLIC}`,
        },
        body: encrypted as unknown as BodyInit,
      });
      if (res.status === 404 || res.status === 410) dead.push(sub.id);
      else if (res.ok) sent++;
    } catch { /* una suscripción que falla no detiene al resto */ }
  }
  if (dead.length) await supabaseAdmin.from("push_subscriptions").delete().in("id", dead);
  return { sent, removed: dead.length };
}
