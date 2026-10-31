import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type QuizState = { sessionId: string; position: number; total: number; correct: number; question: { prompt: string; options: string[]; imageKey: string | null } | null; coins?: number; earned?: number; wasCorrect?: boolean; correctAnswer?: string; explanation?: string };

export const startQuiz = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.rpc("start_sonic_quiz");
  if (error) throw new Error(error.message);
  return data as unknown as QuizState;
});

export const answerQuiz = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ sessionId: z.string().uuid(), position: z.number().int().min(0).max(4), choice: z.number().int().min(0).max(3) }))
  .handler(async ({ data: input, context }) => {
    const { data, error } = await context.supabase.rpc("answer_sonic_quiz", { session_id: input.sessionId, expected_position: input.position, choice: input.choice });
    if (error) throw new Error(error.message);
    return data as unknown as QuizState;
  });

export const redeemTitle = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().min(1).max(80) }))
  .handler(async ({ data: input, context }) => {
    const { data, error } = await context.supabase.rpc("redeem_sonic_title", { title_id_input: input.id });
    if (error) throw new Error(error.message);
    return data;
  });

export const equipTitle = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().nullable() }))
  .handler(async ({ data: input, context }) => {
    const { error } = await context.supabase.rpc("equip_sonic_title", { title_id_input: input.id as string });
    if (error) throw new Error(error.message);
    return { ok: true };
  });