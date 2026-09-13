import { describe, expect, it } from "vitest";
import {
  carrierKey,
  dueDiligenceSlot,
  kycSlot,
  slotRule,
  stageComplete,
  stageTasks,
  tasksFor,
  transferSlot,
  type ProcessSnapshot,
} from "@/lib/deal/process";

const T0 = new Date("2026-09-01T10:00:00Z");
const plus = (minutes: number) => new Date(T0.getTime() + minutes * 60_000);

function base(over: Partial<ProcessSnapshot> = {}): ProcessSnapshot {
  return {
    stage: "NDA",
    sellerId: "s",
    buyerId: "b",
    signoffs: [],
    pieces: [],
    checklist: [
      { id: "i1", label: "Statuts", required: true, providedAt: null },
      { id: "i2", label: "Liasses", required: true, providedAt: null },
      { id: "i3", label: "Sinistralité", required: false, providedAt: null },
    ],
    loi: { proposedAt: null, declinedAt: null, declineReason: null, price: null, effectiveDate: null },
    missingIdentity: { seller: [], buyer: [] },
    carriers: [{ name: "AXA", code: "" }, { name: "Générali Vie", code: "" }],
    deedHash: "h1",
    escrowStage: "NONE",
    retention: null,
    ...over,
  };
}

const signe = (kind: string, userId: string, at = T0, contentHash: string | null = null) => ({ kind, userId, createdAt: at, contentHash });
const piece = (slot: string, uploadedById: string, at = T0) => ({ slot, uploadedById, createdAt: at });

describe("aucune étape ne se franchit sans ses tâches", () => {
  it("la confidentialité exige les deux signatures", () => {
    expect(stageComplete(base())).toBe(false);
    expect(stageComplete(base({ signoffs: [signe("NDA_SIGNED", "b")] }))).toBe(false);
    expect(stageComplete(base({ signoffs: [signe("NDA_SIGNED", "b"), signe("NDA_SIGNED", "s")] }))).toBe(true);
  });

  it("la salle de données exige toutes les pièces obligatoires, puis l’examen de l’acquéreur", () => {
    const s = base({ stage: "DATA_ROOM", pieces: [piece(dueDiligenceSlot("i1"), "s")] });
    const review = stageTasks(s).find((t) => t.key === "dd-review")!;
    expect(review.available).toBe(false);

    const complet = base({
      stage: "DATA_ROOM",
      pieces: [piece(dueDiligenceSlot("i1"), "s"), piece(dueDiligenceSlot("i2"), "s")],
    });
    expect(stageComplete(complet)).toBe(false);
    expect(stageComplete({ ...complet, signoffs: [signe("DATA_ROOM_REVIEWED", "b", plus(5))] })).toBe(true);
  });

  it("une pièce remplacée après l’examen demande un nouvel examen", () => {
    const s = base({
      stage: "DATA_ROOM",
      pieces: [piece(dueDiligenceSlot("i1"), "s"), piece(dueDiligenceSlot("i2"), "s", plus(10))],
      signoffs: [signe("DATA_ROOM_REVIEWED", "b", plus(5))],
    });
    expect(stageComplete(s)).toBe(false);
  });

  it("la lettre d’intention exige une proposition puis une acceptation postérieure", () => {
    const proposee = base({ stage: "LOI", loi: { proposedAt: plus(10), declinedAt: null, declineReason: null, price: 30000, effectiveDate: plus(9000) } });
    expect(stageComplete(proposee)).toBe(false);
    // Une acceptation antérieure à la proposition en cours ne vaut rien.
    expect(stageComplete({ ...proposee, signoffs: [signe("LOI_ACCEPTED", "s", plus(1))] })).toBe(false);
    expect(stageComplete({ ...proposee, signoffs: [signe("LOI_ACCEPTED", "s", plus(20))] })).toBe(true);
  });

  it("la conformité exige les pièces des deux cabinets et le contrôle croisé", () => {
    const toutes = (["seller", "buyer"] as const).flatMap((side) =>
      (["kbis", "identite", "orias"] as const).map((k) => piece(kycSlot(side, k), side === "seller" ? "s" : "b")),
    );
    const s = base({ stage: "KYC", pieces: toutes });
    expect(stageComplete(s)).toBe(false);
    expect(stageComplete({ ...s, signoffs: [signe("KYC_REVIEWED", "b", plus(1))] })).toBe(false);
    expect(stageComplete({ ...s, signoffs: [signe("KYC_REVIEWED", "b", plus(1)), signe("KYC_REVIEWED", "s", plus(1))] })).toBe(true);
  });

  it("le protocole n’est approuvable que complet, et l’approbation suit le texte", () => {
    const incomplet = base({ stage: "DEED", missingIdentity: { seller: ["SIREN"], buyer: [] } });
    expect(stageTasks(incomplet).find((t) => t.key === "deed-approve-buyer")!.available).toBe(false);

    const complet = base({ stage: "DEED", carriers: [{ name: "AXA", code: "123" }] });
    const approuve = { ...complet, signoffs: [signe("DEED_APPROVED", "s", T0, "h1"), signe("DEED_APPROVED", "b", T0, "h1")] };
    expect(stageComplete(approuve)).toBe(true);
    // Le texte a changé depuis : les approbations tombent.
    expect(stageComplete({ ...approuve, deedHash: "h2" })).toBe(false);
  });

  it("la signature couvre le texte approuvé", () => {
    const s = base({ stage: "SIGNATURE", signoffs: [signe("DEED_SIGNED", "s", T0, "h1"), signe("DEED_SIGNED", "b", T0, "h1")] });
    expect(stageComplete(s)).toBe(true);
    expect(stageComplete({ ...s, deedHash: "h2" })).toBe(false);
  });

  it("le transfert exige une attestation par compagnie et la confirmation de l’acquéreur", () => {
    const s = base({
      stage: "TRANSFER",
      pieces: [piece(transferSlot("AXA"), "s"), piece(transferSlot("Générali Vie"), "s")],
    });
    expect(stageComplete(s)).toBe(false);
    expect(stageComplete({ ...s, signoffs: [signe("TRANSFER_CONFIRMED", "b", plus(1))] })).toBe(true);
  });

  it("la clôture exige la déclaration à douze mois validée après sa dernière modification", () => {
    const s = base({ stage: "RETENTION", retention: { reportedAt: plus(10), retentionRate: 0.92 } });
    expect(stageComplete({ ...s, signoffs: [signe("RETENTION_ACCEPTED", "s", plus(5))] })).toBe(false);
    expect(stageComplete({ ...s, signoffs: [signe("RETENTION_ACCEPTED", "s", plus(15))] })).toBe(true);
  });
});

describe("chaque partie voit ce qui lui revient", () => {
  it("sépare ce que j’ai à faire de ce que j’attends", () => {
    const s = base({ signoffs: [signe("NDA_SIGNED", "b")] });
    expect(tasksFor(s, "seller").mine.map((t) => t.key)).toEqual(["nda-seller"]);
    expect(tasksFor(s, "buyer").mine).toEqual([]);
    expect(tasksFor(s, "buyer").waiting.map((t) => t.key)).toEqual(["nda-seller"]);
  });
});

describe("emplacements de pièces", () => {
  const known = { dueDiligenceIds: ["i1"], carriers: ["Générali Vie"] };

  it("refuse un emplacement fabriqué", () => {
    expect(slotRule("dd:inconnu", known)).toBeNull();
    expect(slotRule("transfer:axa", known)).toBeNull();
    expect(slotRule("kyc:seller:passeport", known)).toBeNull();
    expect(slotRule("n'importe quoi", known)).toBeNull();
  });

  it("attribue chaque emplacement à sa partie et à son étape", () => {
    expect(slotRule("dd:i1", known)).toMatchObject({ owner: "seller" });
    expect(slotRule("kyc:buyer:kbis", known)).toEqual({ owner: "buyer", stages: ["KYC"] });
    expect(slotRule(transferSlot("Générali Vie"), known)).toEqual({ owner: "seller", stages: ["TRANSFER"] });
  });

  it("normalise le nom des compagnies", () => {
    expect(carrierKey("Générali Vie")).toBe("generali-vie");
  });
});
