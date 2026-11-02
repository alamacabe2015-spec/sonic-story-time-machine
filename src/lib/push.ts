import { supabase } from "@/integrations/supabase/client";

export const VAPID_PUBLIC_KEY = "BFlBy5SLjigxpiczN_6nOmjCvVWfrC5LoAGCEkNMMtmCl3VQ_fVoyr23TWLnFn6xe9th6TRBT5wWlP52lkcANNc";

const PUBLISHED_HOSTS = ["sonic-story-time-machine.lovable.app"];
const BLOCKED_HOST = /(^|\.)(localhost|lovableproject\.com|lovableproject-dev\.com|gpt-eng\.com|gptengineer\.run|beta\.lovable\.dev)$|(^|\.)lovable\.app$/;

/** Push solo en la app publicada o dominios propios; nunca en vista previa ni en desarrollo. */
export function pushAllowedHere(): boolean {
  const h = window.location.hostname.toLowerCase();
  if (PUBLISHED_HOSTS.includes(h)) return true;
  return !BLOCKED_HOST.test(h);
}
export function pushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function urlB64ToBytes(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Pide permiso, registra el service worker de notificaciones y guarda la suscripción. */
export async function setupPush(userId: string): Promise<string> {
  if (!pushSupported()) return "Este navegador no admite notificaciones";
  if (!pushAllowedHere()) return "Las notificaciones funcionan en la aplicación publicada";
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return "Has rechazado las notificaciones";
  const reg = await navigator.serviceWorker.register("/sw.js");
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToBytes(VAPID_PUBLIC_KEY) as BufferSource });
  const keys = sub.toJSON().keys;
  const p256dh = keys?.["p256dh"];
  const auth = keys?.["auth"];
  if (!p256dh || !auth) return "No se pudo activar en este dispositivo";
  await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  const { error } = await supabase.from("push_subscriptions").insert({ user_id: userId, endpoint: sub.endpoint, p256dh, auth });
  if (error) return "No se pudo guardar la suscripción";
  return "¡Listo! Te avisaré cuando haya noticias nuevas";
}
