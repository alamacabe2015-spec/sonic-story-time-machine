import { describe, it, expect } from "vitest";
import { yearsAvailable } from "./sonic";

describe("máquina del tiempo", () => {
  it("va de 2026 a 1991 en 2026", () => {
    const y = yearsAvailable(new Date("2026-10-26"));
    expect(y[0]).toBe(2026);
    expect(y[y.length - 1]).toBe(1991);
  });
  it("se actualiza a 2027 con el año nuevo", () => {
    expect(yearsAvailable(new Date("2027-01-01"))[0]).toBe(2027);
  });
});
