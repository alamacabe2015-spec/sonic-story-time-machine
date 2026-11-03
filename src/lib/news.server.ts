import { supabaseAdmin } from "@/integrations/supabase/client.server";

const decode = (s: string) => s.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/<[^>]+>/g, "").trim();

export async function syncSonicNews() {
  const { data: last, error: readError } = await supabaseAdmin.from("news").select("fetched_at").not("url", "is", null).order("fetched_at", { ascending: false }).limit(1).maybeSingle();
  if (readError) throw new Error("No se pudieron consultar las noticias");
  if (last && Date.now() - new Date(last.fetched_at).getTime() < 55 * 60 * 1000) return { added: 0 };
  const response = await fetch("https://news.google.com/rss/search?q=Sonic+the+Hedgehog+when:60d&hl=es&gl=ES&ceid=ES:es", { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error("La fuente de noticias no está disponible");
  const xml = await response.text();
  const now = new Date().toISOString();
  const rows = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, item]) => {
    const get = (tag: string) => decode((item ?? "").match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))?.[1] ?? "");
    const source = get("source"); let title = get("title");
    if (source && title.endsWith(` - ${source}`)) title = title.slice(0, -(source.length + 3));
    const date = new Date(get("pubDate"));
    return { title, summary: source ? `Fuente: ${source}` : "", source, url: get("link"), published_at: Number.isNaN(date.getTime()) ? now : date.toISOString(), fetched_at: now };
  }).filter((row) => row.title && /^https:\/\//.test(row.url));
  if (!rows.length) return { added: 0 };
  const unique = [...new Map(rows.map((r) => [r.url, r])).values()];
  const { data, error } = await supabaseAdmin.from("news").upsert(unique, { onConflict: "url", ignoreDuplicates: true }).select("id");
  if (error) throw new Error("No se pudieron guardar las noticias");
  const first = unique[0];
  if (first) {
    const { error: stampError } = await supabaseAdmin.from("news").update({ fetched_at: now }).eq("url", first.url);
    if (stampError) throw new Error("No se pudo guardar la actualización");
  }
  const added = data?.length ?? 0;
  if (added > 0 && unique[0]) {
    try {
      const { sendNewsPush } = await import("./push.server");
      await sendNewsPush(unique[0].title, added);
    } catch { /* las notificaciones no deben romper la sincronización */ }
  }
  return { added };
}