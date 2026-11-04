import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      middleware: () => builder,
      inputValidator: () => builder,
      handler: (handler: unknown) => handler,
    };
    return builder;
  },
}));

import { checkMyAchievements, getAchievements, trackEvent } from "./achievements.functions";

type Handler = (input: { context: { supabase: unknown }; data?: { stat: string } }) => Promise<unknown>;

describe("achievement checks", () => {
  const rpc = vi.fn();
  beforeEach(() => rpc.mockReset());

  it("returns the newly awarded Chaos and perfect-round achievements", async () => {
    rpc.mockResolvedValue({ data: ["caos-1", "perfecto-1"], error: null });
    const result = await (checkMyAchievements as unknown as Handler)({ context: { supabase: { rpc } } });
    expect(result).toEqual({ unlocked: ["caos-1", "perfecto-1"] });
    expect(rpc).toHaveBeenCalledWith("check_achievements");
  });

  it("does not report an award failure as successful event tracking", async () => {
    rpc.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ data: null, error: { message: "award failed" } });
    await expect((trackEvent as unknown as Handler)({ data: { stat: "chaos_played" }, context: { supabase: { rpc } } })).rejects.toThrow("award failed");
  });

  it("does not present earned achievements as locked when the ownership read fails", async () => {
    const from = vi.fn((table: string) => ({ select: () => table === "achievements"
      ? { order: () => Promise.resolve({ data: [], error: null }) }
      : Promise.resolve({ data: null, error: { message: "read failed" } }) }));
    await expect((getAchievements as unknown as Handler)({ context: { supabase: { from } } })).rejects.toThrow("No se pudieron cargar tus logros conseguidos");
  });
});