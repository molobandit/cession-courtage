import { describe, expect, it } from "vitest";
import { POSITION_STEPS, positionState, positionStepIndex } from "@/lib/position/progress";

const base = { hasDeposit: false, offerStatus: null, dealStage: null, listingStatus: "OFFERS_OPEN" } as const;

describe("avancement d’une prise de position", () => {
  it("démarre à la position, attend l’acquéreur", () => {
    const s = positionState(base);
    expect(s.key).toBe("POSITION");
    expect(s.waitingFor).toBe("buyer");
    expect(s.percent).toBe(3);
  });

  it("monte avec le dépôt puis l’offre, qui attend le cédant", () => {
    expect(positionState({ ...base, hasDeposit: true }).percent).toBe(8);
    const offre = positionState({ ...base, hasDeposit: true, offerStatus: "SUBMITTED" });
    expect(offre.key).toBe("OFFER");
    expect(offre.waitingFor).toBe("seller");
  });

  it("suit le dossier une fois l’offre retenue, jusqu’à 100 %", () => {
    const retenue = positionState({ ...base, offerStatus: "ACCEPTED", dealStage: "NDA", listingStatus: "UNDER_NEGOTIATION" });
    expect(retenue.title).toBe("Offre retenue");
    expect(retenue.percent).toBe(15);
    const signature = positionState({ ...base, offerStatus: "ACCEPTED", dealStage: "SIGNATURE" });
    expect(signature.percent).toBeGreaterThan(retenue.percent);
    const close = positionState({ ...base, offerStatus: "ACCEPTED", dealStage: "CLOSED", listingStatus: "SOLD" });
    expect(close.percent).toBe(100);
    expect(close.outcome).toBe("closed");
  });

  it("dit au candidat écarté que le dossier est en négociation", () => {
    expect(positionState({ ...base, offerStatus: "DECLINED" }).outcome).toBe("lost");
    expect(positionState({ ...base, listingStatus: "UNDER_NEGOTIATION" }).title).toBe("Le dossier est en négociation");
  });

  it("place chaque étape du parcours dans la frise", () => {
    expect(POSITION_STEPS[0].key).toBe("POSITION");
    expect(POSITION_STEPS.at(-1)?.key).toBe("CLOSED");
    expect(positionStepIndex(positionState({ ...base, hasDeposit: true }))).toBe(1);
    expect(positionStepIndex(positionState({ ...base, offerStatus: "DECLINED" }))).toBe(-1);
  });
});
