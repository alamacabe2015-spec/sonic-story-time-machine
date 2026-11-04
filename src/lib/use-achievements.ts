import { useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { checkMyAchievements, trackEvent } from "@/lib/achievements.functions";

/** Hook para registrar acciones y anunciar los logros recién conseguidos. */
export function useAchievements() {
  const track = useServerFn(trackEvent);
  const check = useServerFn(checkMyAchievements);

  const announce = useCallback(async (codes: string[]) => {
    if (!codes.length) return;
    const { data } = await supabase.from("achievements").select("code, name").in("code", codes);
    const names = new Map((data ?? []).map((a) => [a.code, a.name]));
    for (const code of codes) toast.success(`🏆 ¡Logro conseguido! ${names.get(code) ?? code}`);
  }, []);

  const record = useCallback(async (stat: string, opts?: { amount?: number; year?: number }) => {
    try {
      const r = await track({ data: { stat, amount: opts?.amount, year: opts?.year } });
      await announce(r.unlocked);
    } catch { toast.error("No se pudieron comprobar tus logros. Vuelve a abrir la app para reintentarlo."); }
  }, [track, announce]);

  const refresh = useCallback(async () => {
    try {
      const r = await check();
      await announce(r.unlocked);
    } catch { toast.error("No se pudieron comprobar tus logros. Vuelve a abrir la app para reintentarlo."); }
  }, [check, announce]);

  return { record, refresh };
}
