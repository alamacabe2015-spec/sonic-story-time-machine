import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let schema: z.ZodTypeAny | undefined;
    const builder = {
      middleware: () => builder,
      inputValidator: (value: z.ZodTypeAny) => { schema = value; return builder; },
      handler: (handler: (input: unknown) => unknown) => (input: { data: unknown; context: unknown }) => handler({ ...input, data: schema?.parse(input.data) ?? input.data }),
    };
    return builder;
  },
}));
import { equipCosmetic, redeemCosmetic } from "./games.functions";
type Handler = (input: { data: unknown; context: { supabase: { rpc: ReturnType<typeof vi.fn> } } }) => Promise<unknown>;

describe("protected account backgrounds", () => {
  it("equips a background through the ownership-checked RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    await (equipCosmetic as unknown as Handler)({ data: { id: "background-green-hill", kind: "background" }, context: { supabase: { rpc } } });
    expect(rpc).toHaveBeenCalledWith("equip_sonic_cosmetic", { item_id: "background-green-hill", kind: "background" });
  });
  it("preserves the insufficient-coins rejection from a background purchase", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: { message: "Necesitas más monedas" } });
    await expect((redeemCosmetic as unknown as Handler)({ data: { id: "background-green-hill" }, context: { supabase: { rpc } } })).rejects.toThrow("Necesitas más monedas");
  });
  it("preserves the unowned-background rejection", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: { message: "Premio no comprado" } });
    await expect((equipCosmetic as unknown as Handler)({ data: { id: "background-green-hill", kind: "background" }, context: { supabase: { rpc } } })).rejects.toThrow("Premio no comprado");
  });
});