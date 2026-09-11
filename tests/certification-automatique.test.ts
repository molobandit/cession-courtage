/**
 * Le label de certification s'obtient sans geste manuel, sur la vraie base D1.
 *
 * Les tests unitaires ne couvrent que la décision pure. Celui-ci vérifie la
 * chaîne complète : pièces en base, recalcul, écriture du statut de l'annonce.
 * C'est la partie qui pouvait casser sans que rien ne le dise, puisque le statut
 * n'avançait jamais de lui-même auparavant.
 *
 * Prérequis : `npm run db:migrate && npm run db:seed`.
 */
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
// Importe directement : l'alias de vitest ne vaut pas pour tsc.
import { disposePlatformProxy } from "./setup/prisma-test";
import { CERTIFICATION_SLOTS } from "@/lib/listing/certification-slots";
import { synchroniserCertification } from "@/lib/listing/certification-sync";

const OBLIGATOIRES = CERTIFICATION_SLOTS.filter((s) => s.required);

let listingId: string;

/** Repose l'annonce et ses pièces dans l'état « demande déposée, rien validé ». */
beforeEach(async () => {
  const listing = await prisma.listing.findFirst({
    where: { publicNumber: 10001 },
    select: { id: true },
  });
  if (!listing) throw new Error("Annonce 10001 absente. Lancez npm run db:seed.");
  listingId = listing.id;

  await prisma.certificationDocument.deleteMany({ where: { listingId } });
  await prisma.certificationDocument.createMany({
    data: CERTIFICATION_SLOTS.map((slot) => ({
      listingId,
      category: slot.category,
      label: slot.label,
      required: slot.required,
      status: "MISSING",
    })),
  });
  await prisma.listing.update({
    where: { id: listingId },
    data: { certificationRequested: true, certificationStatus: "PENDING" },
  });
});

afterAll(async () => {
  // L'annonce de démonstration repart sans demande ni pièce.
  await prisma.certificationDocument.deleteMany({ where: { listingId } });
  await prisma.listing.update({
    where: { id: listingId },
    data: { certificationRequested: false, certificationStatus: "NONE" },
  });
  await disposePlatformProxy();
});

async function trancher(label: string, status: string) {
  await prisma.certificationDocument.updateMany({
    where: { listingId, label },
    data: { status },
  });
}

async function statutAnnonce(): Promise<string> {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { certificationStatus: true },
  });
  return listing?.certificationStatus ?? "";
}

describe("certification automatique, base réelle", () => {
  it("reste en instruction tant qu’une obligatoire manque", async () => {
    for (const slot of OBLIGATOIRES.slice(1)) await trancher(slot.label, "VALIDATED");
    await synchroniserCertification(listingId);
    expect(await statutAnnonce()).toBe("PENDING");
  });

  it("accorde le label dès la dernière pièce obligatoire validée", async () => {
    for (const slot of OBLIGATOIRES) await trancher(slot.label, "VALIDATED");
    await synchroniserCertification(listingId);
    expect(await statutAnnonce()).toBe("CERTIFIED");
  });

  it("ne certifie pas sur des pièces seulement reçues", async () => {
    for (const slot of OBLIGATOIRES) await trancher(slot.label, "RECEIVED");
    await synchroniserCertification(listingId);
    expect(await statutAnnonce()).toBe("PENDING");
  });

  it("retire le label si une pièce est refusée après coup", async () => {
    for (const slot of OBLIGATOIRES) await trancher(slot.label, "VALIDATED");
    await synchroniserCertification(listingId);
    expect(await statutAnnonce()).toBe("CERTIFIED");

    await trancher(OBLIGATOIRES[0].label, "REJECTED");
    await synchroniserCertification(listingId);
    expect(await statutAnnonce()).toBe("REJECTED");
  });

  it("ne certifie jamais une annonce qui n’a rien demandé", async () => {
    for (const slot of OBLIGATOIRES) await trancher(slot.label, "VALIDATED");
    await prisma.listing.update({
      where: { id: listingId },
      data: { certificationRequested: false },
    });
    await synchroniserCertification(listingId);
    expect(await statutAnnonce()).toBe("NONE");
  });

  it("trace chaque passage de statut", async () => {
    for (const slot of OBLIGATOIRES) await trancher(slot.label, "VALIDATED");
    await synchroniserCertification(listingId);
    const trace = await prisma.auditLog.findFirst({
      where: { entityType: "Listing", entityId: listingId, action: "listing.certification.certified" },
      orderBy: { createdAt: "desc" },
    });
    expect(trace).not.toBeNull();
  });

  it("n’écrit rien quand rien n’a changé", async () => {
    for (const slot of OBLIGATOIRES) await trancher(slot.label, "VALIDATED");
    expect(await synchroniserCertification(listingId)).toBe("CERTIFIED");
    // Rappelée sans mouvement de pièce, elle doit se taire : D1 n'a pas de
    // transactions, la fonction doit pouvoir être rejouée sans effet.
    expect(await synchroniserCertification(listingId)).toBeNull();
  });
});
