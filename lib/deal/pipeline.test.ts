import { describe, expect, it } from "vitest";
import {
  ESCROW_UPFRONT_SHARE,
  nextPipelineAction,
  pipelineProgressPercent,
  SALE_PIPELINE,
} from "./pipeline";

describe("sale pipeline", () => {
  it("commence au positionnement et finit à la clôture", () => {
    expect(SALE_PIPELINE[0]?.key).toBe("POSITION");
    expect(SALE_PIPELINE.at(-1)?.key).toBe("CLOSED");
  });

  it("donne 0 % au positionnement et 100 % à la clôture", () => {
    expect(pipelineProgressPercent("POSITION")).toBe(0);
    expect(pipelineProgressPercent("CLOSED")).toBe(100);
  });

  it("séquestre 80 % à la signature", () => {
    expect(ESCROW_UPFRONT_SHARE).toBe(0.8);
    expect(nextPipelineAction("ESCROW", "buyer").title).toMatch(/80/);
  });
});
