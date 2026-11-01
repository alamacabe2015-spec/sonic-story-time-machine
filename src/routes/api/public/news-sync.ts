import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/news-sync")({
  server: { handlers: { POST: async ({ request }) => {
    const denied = await authenticateCronRequest(request);
    if (denied) return denied;
    try {
      const { syncSonicNews } = await import("@/lib/news.server");
      return Response.json(await syncSonicNews());
    } catch (error) {
      console.error("News sync failed", error instanceof Error ? error.message : "Unknown error");
      return Response.json({ error: "No se pudieron actualizar las noticias" }, { status: 502 });
    }
  } } },
});