import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type News = { id: string; title: string; summary: string; published_at: string };

export function NewsTab() {
  const [news, setNews] = useState<News[]>([]);
  useEffect(() => {
    const load = () => supabase.from("news").select("*").order("published_at", { ascending: false }).then(({ data }) => setNews(data ?? []));
    load();
    const ch = supabase.channel(`news-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "news" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);
  return (
    <div className="space-y-4">
      <h2 className="text-2xl text-primary">Noticias recientes</h2>
      {news.map((n) => (
        <article key={n.id} className="rounded-2xl bg-card p-4 border-l-8 border-ring-gold shadow-sm">
          <p className="text-xs font-bold text-muted-foreground">{new Date(n.published_at).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}</p>
          <h3 className="mt-1 text-lg">{n.title}</h3>
          <p className="mt-1 text-sm">{n.summary}</p>
        </article>
      ))}
      {news.length === 0 && <p className="text-muted-foreground">Cargando noticias...</p>}
    </div>
  );
}
