import { describe, expect, it } from "vitest";
import {
  ESCROW_UPFRONT_SHARE,
  nextPipelineAction,
  pipelineIndex,
  pipelineProgressPercent,
  SALE_PIPELINE,
} from "./pipeline";

describe("sale pipeline", () => {
  it("tient dans les quatre étapes du modèle", () => {
    expect(SALE_PIPELINE.map((s) => s.key)).toEqual(["ETUDE", "ONLINE", "POSITION", "SIGNATURE"]);
    expect(SALE_PIPELINE.map((s) => s.num)).toEqual(["01", "02", "03", "04"]);
    expect(SALE_PIPELINE[2]?.label).toBe("Le positionnement");
  });

  it("place le positionnement en troisième étape et le dossier en quatrième", () => {
    expect(pipelineIndex("POSITION")).toBe(2);
    expect(pipelineIndex("DATA_ROOM")).toBe(3);
    expect(pipelineProgressPercent("POSITION")).toBe(50);
    expect(pipelineProgressPercent("SIGNATURE")).toBe(75);
    expect(pipelineProgressPercent("CLOSED")).toBe(100);
  });

  it("tout le montant passe par le trust, libéré après vérification", () => {
    expect(ESCROW_UPFRONT_SHARE).toBe(1);
    expect(nextPipelineAction("TRANSFER", "seller").body).toMatch(/trust/);
  });
});
