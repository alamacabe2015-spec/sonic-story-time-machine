import { describe, expect, it } from "vitest";
import { GAME_MODES, canRedeemTitle, coinsForAnswer } from "./games";

describe("monedas y títulos", () => {
  it.each(["easy", "normal", "hard", "chaos"] as const)("cada reto tiene más de cinco preguntas: %s", (mode) => {
    expect(GAME_MODES.find((m) => m.id === mode)?.total).toBeGreaterThan(5);
  });
  it("las dificultades superiores dan más monedas por acierto", () => {
    expect(coinsForAnswer(true, "normal")).toBeGreaterThan(coinsForAnswer(true, "easy"));
    expect(coinsForAnswer(true, "hard")).toBeGreaterThan(coinsForAnswer(true, "normal"));
    expect(coinsForAnswer(true, "chaos")).toBeGreaterThan(coinsForAnswer(true, "hard"));
    expect(coinsForAnswer(false, "chaos")).toBe(0);
  });
  it("los aciertos dan monedas y los errores no", () => {
    expect(coinsForAnswer(true)).toBe(10);
    expect(coinsForAnswer(false)).toBe(0);
  });
  it("solo permite canjear con saldo suficiente y sin tener el premio", () => {
    expect(canRedeemTitle(30, 30, false)).toBe(true);
    expect(canRedeemTitle(29, 30, false)).toBe(false);
    expect(canRedeemTitle(100, 30, true)).toBe(false);
  });
});