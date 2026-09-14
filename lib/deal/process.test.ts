import { describe, expect, it } from "vitest";
import {
  currentPrice,
  nextStage,
  normalizeStage,
  revisionPending,
  stageComplete,
  stageTasks,
  tasksFor,
  type ProcessSnapshot,
} from "@/lib/deal/process";

const T0 = new Date("2026-09-01T10:00:00Z");
const plus = (minutes: number) => new Date(T0.getTime() + minutes * 60_000);
const KINDS = ["STATUTS", "LIASSES", "COMMISSIONS", "CONVENTIONS"] as const;
const verifie = { status: "VERIFIED", missingIdentity: [], note: null };

function base(over: Partial<ProcessSnapshot> = {}): ProcessSnapshot {
  return {
    stage: "DATA_ROOM",
    sellerId: "s",
    buyerId: "b",
    signoffs: [],
    roomDocs: KINDS.map((kind) => ({ kind, createdAt: T0 })),
    roomKinds: KINDS,
    verification: { seller: verifie, buyer: verifie },
    agreedPrice: 30000,
    revision: null,
    declined: null,
    carriers: [{ name: "AXA", code: "123" }],
    deedHash: "h1",
    escrowStage: "NONE",
    ...over,
  };
}

const signe = (kind: string, userId: string, at = plus(1), contentHash: string | null = null) => ({ kind, userId, createdAt: at, contentHash });

describe("vérifications", () => {
  it("se franchissent en un geste quand le cabinet et les comptes sont prêts", () => {
    const s = base();
    expect(stageComplete(s)).toBe(false);
    expect(tasksFor(s, "buyer").mine.map((t) => t.key)).toEqual(["price-confirm"]);
    expect(stageComplete({ ...s, signoffs: [signe("PRICE_CONFIRMED", "b")] })).toBe(true);
  });

  it("n’ouvre pas la confirmation du prix tant que des pièces du cabinet manquent", () => {
    const s = base({ roomDocs: [{ kind: "STATUTS", createdAt: T0 }] });
    const t = stageTasks(s).find((x) => x.key === "price-confirm")!;
    expect(t.available).toBe(false);
    expect(stageComplete({ ...s, signoffs: [signe("PRICE_CONFIRMED", "b")] })).toBe(false);
  });

  it("redemande la confirmation si une pièce arrive après", () => {
    const s = base({
      roomDocs: [...KINDS.map((kind) => ({ kind, createdAt: T0 })), { kind: "LIASSES", createdAt: plus(10) }],
      signoffs: [signe("PRICE_CONFIRMED", "b", plus(5))],
    });
    expect(stageComplete(s)).toBe(false);
  });

  it("attend des comptes vérifiés et des profils complets", () => {
    const s = base({ signoffs: [signe("PRICE_CONFIRMED", "b")] });
    expect(stageComplete({ ...s, verification: { seller: verifie, buyer: { status: "PENDING", missingIdentity: [], note: null } } })).toBe(false);
    expect(stageComplete({ ...s, verification: { seller: { status: "VERIFIED", missingIdentity: ["SIREN"], note: null }, buyer: verifie } })).toBe(false);
  });

  it("attend un code courtier par compagnie", () => {
    const s = base({ carriers: [{ name: "AXA", code: "123" }, { name: "Generali", code: "" }], signoffs: [signe("PRICE_CONFIRMED", "b")] });
    expect(stageComplete(s)).toBe(false);
  });

  it("une révision du prix attend l’accord du cédant, et fixe le prix en vigueur", () => {
    const revision = { proposedAt: plus(10), price: 27000 };
    const s = base({ revision, signoffs: [signe("PRICE_CONFIRMED", "b", plus(10))] });
    expect(revisionPending(s)).toBe(true);
    expect(currentPrice(s)).toBe(27000);
    expect(stageComplete(s)).toBe(false);
    // Une acceptation antérieure à la révision ne vaut rien.
    expect(stageComplete({ ...s, signoffs: [...s.signoffs, signe("LOI_ACCEPTED", "s", plus(2))] })).toBe(false);
    expect(stageComplete({ ...s, signoffs: [...s.signoffs, signe("LOI_ACCEPTED", "s", plus(20))] })).toBe(true);
  });
});

describe("signature, paiement et transfert", () => {
  it("la signature couvre le texte signé, pour les deux parties", () => {
    const s = base({ stage: "SIGNATURE", signoffs: [signe("DEED_SIGNED", "s", T0, "h1"), signe("DEED_SIGNED", "b", T0, "h1")] });
    expect(stageComplete(s)).toBe(true);
    expect(stageComplete({ ...s, deedHash: "h2" })).toBe(false);
  });

  it("le transfert suit l’ordre : séquestre, envoi des attestations, confirmation", () => {
    const s = base({ stage: "TRANSFER" });
    expect(stageTasks(s).find((t) => t.key === "attestations-sent")!.available).toBe(false);
    const verse = { ...s, escrowStage: "FUNDS_HELD" };
    expect(stageTasks(verse).find((t) => t.key === "transfer-confirm")!.available).toBe(false);
    const envoye = { ...verse, signoffs: [signe("ATTESTATIONS_SENT", "s", plus(1))] };
    expect(stageComplete(envoye)).toBe(false);
    expect(stageComplete({ ...envoye, signoffs: [...envoye.signoffs, signe("TRANSFER_CONFIRMED", "b", plus(2))] })).toBe(true);
  });

});

describe("les étapes", () => {
  it("ramène les étapes de l’ancien parcours à celle qui les regroupe", () => {
    expect(normalizeStage("NDA")).toBe("DATA_ROOM");
    expect(normalizeStage("KYC")).toBe("DATA_ROOM");
    expect(normalizeStage("DEED")).toBe("SIGNATURE");
    expect(normalizeStage("ESCROW")).toBe("TRANSFER");
    expect(normalizeStage("RETENTION")).toBe("TRANSFER");
  });

  it("enchaîne vérifications, signature, paiement et transfert, clôture", () => {
    expect(nextStage("DATA_ROOM")).toBe("SIGNATURE");
    expect(nextStage("SIGNATURE")).toBe("TRANSFER");
    expect(nextStage("TRANSFER")).toBe("CLOSED");
    expect(nextStage("CLOSED")).toBeNull();
  });
});
