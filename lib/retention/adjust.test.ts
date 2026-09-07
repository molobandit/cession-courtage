import { describe, expect, it } from "vitest";
import { adjustedDeferredAmount } from "@/lib/retention/adjust";

describe("adjustedDeferredAmount", () => {
  it("ne change rien à 90 % de rétention (cible)", () => {
    expect(adjustedDeferredAmount({ deferredAmount: 10000, retentionRate: 0.9 })).toBe(10000);
  });

  it("réduit le différé sous la cible, plancher 50 %", () => {
    expect(adjustedDeferredAmount({ deferredAmount: 10000, retentionRate: 0.81 })).toBe(9000);
    expect(adjustedDeferredAmount({ deferredAmount: 10000, retentionRate: 0.2 })).toBe(5000);
  });

  it("ne dépasse pas 100 % du différé si la rétention est supérieure à la cible", () => {
    expect(adjustedDeferredAmount({ deferredAmount: 10000, retentionRate: 0.99 })).toBe(10000);
  });
});
