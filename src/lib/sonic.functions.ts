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

/** Pulls the latest real Sonic headlines (Spanish) into the news table. Throttled to every 15 min. */
export const refreshNews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { syncSonicNews } = await import("@/lib/news.server");
    return syncSonicNews();
  });
