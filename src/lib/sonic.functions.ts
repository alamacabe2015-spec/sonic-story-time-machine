import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type YearItem = { title: string; summary: string };

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const uid = context.userId;
    await supabaseAdmin.from("messages").delete().or(`sender.eq.${uid},receiver.eq.${uid}`);
    await supabaseAdmin.from("friendships").delete().or(`requester.eq.${uid},addressee.eq.${uid}`);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(uid);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getYearNews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { year: number }) => {
    const y = Math.floor(Number(d.year));
    if (y < 1991 || y > new Date().getFullYear()) throw new Error("Año no válido");
    return { year: y };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const isCurrent = data.year === new Date().getFullYear();
    const { data: cached } = await supabaseAdmin
      .from("year_news").select("items, created_at").eq("year", data.year).maybeSingle();
    const fresh = cached && (!isCurrent || Date.now() - new Date(cached.created_at).getTime() < 864e5);
    if (cached && fresh) return cached.items as YearItem[];

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env["LOVABLE_API_KEY"]}` },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Eres un historiador de videojuegos experto en Sonic the Hedgehog. Responde SOLO con JSON válido, en español, sin inventar hechos." },
          { role: "user", content: `Dame entre 4 y 6 noticias reales sobre Sonic the Hedgehog (juegos, series, películas, cómics, SEGA) ocurridas en el año ${data.year}. Formato: {"items":[{"title":"...","summary":"..."}]}. Resúmenes cortos para niños.` },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) throw new Error(res.status === 429 ? "Demasiadas peticiones, prueba en un momento" : "No se pudieron cargar las noticias");
    const json = await res.json();
    const items = (JSON.parse(json.choices[0].message.content).items ?? []) as YearItem[];
    await supabaseAdmin.from("year_news").upsert({ year: data.year, items, created_at: new Date().toISOString() });
    return items;
  });

const decode = (s: string) =>
  s.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/<[^>]+>/g, "").trim();

/** Pulls the latest real Sonic headlines (Spanish) into the news table. Throttled to every 15 min. */
export const refreshNews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: last } = await supabaseAdmin.from("news").select("fetched_at").not("url", "is", null)
      .order("fetched_at", { ascending: false }).limit(1).maybeSingle();
    if (last && Date.now() - new Date(last.fetched_at).getTime() < 15 * 60 * 1000) return { added: 0 };

    const res = await fetch("https://news.google.com/rss/search?q=Sonic+the+Hedgehog+when:60d&hl=es&gl=ES&ceid=ES:es");
    if (!res.ok) return { added: 0 };
    const xml = await res.text();
    const rows = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 40).map(([, it]) => {
      const get = (tag: string) => decode((it ?? "").match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))?.[1] ?? "");
      const source = get("source");
      let title = get("title");
      if (source && title.endsWith(` - ${source}`)) title = title.slice(0, -(source.length + 3));
      return { title, summary: source ? `Fuente: ${source}` : "", url: get("link"), source, published_at: new Date(get("pubDate") || Date.now()).toISOString(), fetched_at: new Date().toISOString() };
    }).filter((r) => r.title && r.url);
    if (!rows.length) return { added: 0 };
    await supabaseAdmin.from("news").upsert(rows, { onConflict: "url", ignoreDuplicates: true });
    await supabaseAdmin.from("news").update({ fetched_at: new Date().toISOString() }).eq("url", rows[0]!.url);
    return { added: rows.length };
  });
