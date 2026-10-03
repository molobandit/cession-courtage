import { describe, expect, it } from "vitest";
import { POSITION_STEPS, positionState, positionStepIndex } from "@/lib/position/progress";

const base = { hasDeposit: false, offerStatus: null, dealStage: null, listingStatus: "OFFERS_OPEN" } as const;

describe("avancement d’une prise de position", () => {
  it("démarre au positionnement et attend l’acquéreur", () => {
    const s = positionState(base);
    expect(s.key).toBe("POSITION");
    expect(s.title).toBe("Le positionnement");
    expect(s.waitingFor).toBe("buyer");
    expect(s.percent).toBe(50);
  });

  it("passe au dépôt de positionnement sans changer d’étape", () => {
    const depot = positionState({ ...base, hasDeposit: true });
    expect(depot.key).toBe("DEPOSIT");
    expect(depot.title).toBe("Dépôt de positionnement versé");
    expect(depot.percent).toBe(50);
  });

  it("suit le dossier une fois la procédure lancée, jusqu’à 100 %", () => {
    const encours = positionState({ ...base, dealStage: "DATA_ROOM", listingStatus: "UNDER_NEGOTIATION" });
    expect(encours.title).toBe("La signature");
    expect(encours.percent).toBe(75);
    const close = positionState({ ...base, dealStage: "CLOSED", listingStatus: "SOLD" });
    expect(close.percent).toBe(100);
    expect(close.outcome).toBe("closed");
  });

  it("dit au candidat écarté qu’un acquéreur s’est positionné", () => {
    expect(positionState({ ...base, offerStatus: "DECLINED" }).outcome).toBe("lost");
    expect(positionState({ ...base, listingStatus: "UNDER_NEGOTIATION" }).title).toBe(
      "Un acquéreur s’est positionné",
    );
  });

  it("place l’étape courante parmi les quatre du modèle", () => {
    expect(POSITION_STEPS.map((s) => s.key)).toEqual(["ETUDE", "ONLINE", "POSITION", "SIGNATURE"]);
    expect(positionStepIndex(positionState({ ...base, hasDeposit: true }))).toBe(2);
    expect(positionStepIndex(positionState({ ...base, dealStage: "SIGNATURE" }))).toBe(3);
    expect(positionStepIndex(positionState({ ...base, offerStatus: "DECLINED" }))).toBe(-1);
  });
});
