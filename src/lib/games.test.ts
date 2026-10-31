import { describe, expect, it } from "vitest";
import { canRedeemTitle, coinsForAnswer } from "./games";

describe("monedas y títulos", () => {
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