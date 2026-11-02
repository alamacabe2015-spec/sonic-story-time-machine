import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type Achievement = { code: string; name: string; description: string; icon: string; sort: number; unlocked_at: string | null };

export const getAchievements = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [catalog, mine] = await Promise.all([
      context.supabase.from("achievements").select("*").order("sort"),
      context.supabase.from("user_achievements").select("code, unlocked_at"),
    ]);
    if (catalog.error) throw new Error("No se pudieron cargar los logros");
    const unlocked = new Map((mine.data ?? []).map((r) => [r.code, r.unlocked_at]));
    return (catalog.data ?? []).map((a) => ({ ...a, unlocked_at: unlocked.get(a.code) ?? null })) as Achievement[];
  });

/** Recalcula y concede los logros ganados; devuelve los códigos recién desbloqueados. */
export const checkMyAchievements = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("check_achievements");
    if (error) throw new Error(error.message);
    return { unlocked: (data ?? []) as string[] };
  });

/** Registra una acción (partida, mensaje, viaje...) y concede los logros que toquen. */
export const trackEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    stat: z.string().min(1).max(30),
    amount: z.number().int().min(1).max(100).optional(),
    year: z.number().int().min(1991).max(2100).optional(),
  }))
  .handler(async ({ data: input, context }) => {
    const { error } = await context.supabase.rpc("record_stat", { p_stat: input.stat, p_amount: input.amount ?? 1, p_year: input.year });
    if (error) throw new Error(error.message);
    const { data } = await context.supabase.rpc("check_achievements");
    return { unlocked: (data ?? []) as string[] };
  });
