import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bell, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { refreshNews } from "@/lib/sonic.functions";
import { Button } from "@/components/ui/button";
import { setupPush } from "@/lib/push";
import { useAchievements } from "@/lib/use-achievements";

type News = { id: string; title: string; summary: string; published_at: string; url: string | null };

export function NewsTab({ userId }: { userId: string }) {
  const [news, setNews] = useState<News[]>([]);
  const [limit, setLimit] = useState(60);
  const [pushing, setPushing] = useState(false);
  const refresh = useServerFn(refreshNews);
  const { record } = useAchievements();
  useEffect(() => {
    const load = () => supabase.from("news").select("*").order("published_at", { ascending: false }).limit(limit).then(({ data }) => setNews(data ?? []));
    load();
    refresh().then(load).catch(() => {});
    const timer = setInterval(() => refresh().catch(() => {}), 60 * 60 * 1000);
    const ch = supabase.channel(`news-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "news" }, load).subscribe();
    return () => { clearInterval(timer); supabase.removeChannel(ch); };
  }, [refresh, limit]);

  async function enablePush() {
    setPushing(true);
    try { toast.info(await setupPush(userId)); }
    catch { toast.error("No se pudieron activar las notificaciones"); }
    finally { setPushing(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-2xl text-primary">Noticias recientes</h2>
        <Button variant="outline" size="sm" onClick={enablePush} disabled={pushing} aria-label="Activar notificaciones">
          <Bell className="h-4 w-4" /> Avisarme
        </Button>
      </div>
      {news.map((n) => (
        <article key={n.id} className="rounded-2xl bg-card p-4 border-l-8 border-ring-gold shadow-sm">
          <p className="text-xs font-bold text-muted-foreground">{new Date(n.published_at).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}</p>
          <h3 className="mt-1 text-lg">{n.title}</h3>
          {n.summary && <p className="mt-1 text-sm">{n.summary}</p>}
          {n.url && (
            <a href={n.url} target="_blank" rel="noreferrer" onClick={() => record("news_read")} className="mt-2 inline-flex items-center gap-1 text-sm font-extrabold text-primary">
              Leer noticia <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </article>
      ))}
      {news.length === 0 && <p className="text-muted-foreground">Cargando noticias...</p>}
      {news.length >= limit && <Button variant="outline" className="w-full" onClick={() => setLimit((v) => v + 60)}>Más noticias</Button>}
    </div>
  );
}
