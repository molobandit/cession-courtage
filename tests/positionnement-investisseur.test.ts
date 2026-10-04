/**
 * Le positionnement d'un investisseur, sur la vraie base D1.
 *
 * Le dossier investisseurs applique au compte investisseur la règle de
 * l'acquéreur : 2,5 % du montant de l'annonce versés dans un trust, et c'est
 * ce dépôt qui lance la procédure et lève l'anonymat du cédant. La position
 * s'enregistrait sans aucun paiement, et ouvrait l'identité aussitôt.
 *
 * Prérequis : `npm run db:migrate && npm run db:seed && npm run db:catalog`.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
// Importés directement : l'alias de vitest ne vaut pas pour tsc.
import { disposePlatformProxy } from "./setup/prisma-test";
import { connecterUtilisateur } from "./setup/auth-stub";
import { placeInvestorDepositAction } from "@/app/actions/investor-positions";
import { findMyInvestorPosition } from "@/lib/investor/positions";
import { depositReleasesIdentity } from "@/lib/listing/identity-access";

const ANNONCE = "lst_catalog_03";
let investisseur: string;
let creee = false;

function form(champs: Record<string, string>): FormData {
  const data = new FormData();
  for (const [c, v] of Object.entries(champs)) data.set(c, v);
  return data;
}

beforeAll(async () => {
  const u = await prisma.user.findFirst({
    where: { role: "INVESTOR", erasedAt: null, investorPositions: { none: { listingId: ANNONCE } } },
    select: { id: true },
  });
  if (!u) throw new Error("Aucun compte investisseur disponible. Lancez npm run db:seed.");
  investisseur = u.id;
});

beforeEach(() => connecterUtilisateur(investisseur));

afterAll(async () => {
  connecterUtilisateur(null);
  if (creee) {
    await prisma.investorPosition
      .delete({ where: { listingId_investorId: { listingId: ANNONCE, investorId: investisseur } } })
      .catch(() => undefined);
  }
  await disposePlatformProxy();
});

describe("le dépôt de positionnement d'un investisseur", () => {
  it("refuse un positionnement sans moyen de paiement", async () => {
    const r = await placeInvestorDepositAction({}, form({ listingId: ANNONCE }));
    expect(r.error).toContain("carte");
    expect(await findMyInvestorPosition(ANNONCE, investisseur)).toBeNull();
  });

  it("enregistre la position avec l'état de son règlement", async () => {
    const r = await placeInvestorDepositAction({}, form({ listingId: ANNONCE, paymentMethod: "CARD" }));
    expect(r.error).toBeUndefined();
    creee = true;

    const position = await findMyInvestorPosition(ANNONCE, investisseur);
    expect(position).not.toBeNull();
    // Sans Stripe configuré, la démonstration enregistre le dépôt sans débit.
    expect(position!.paymentStatus).toBe("RECORDED");

    const annonce = await prisma.listing.findUniqueOrThrow({
      where: { id: ANNONCE },
      select: { askingPrice: true },
    });
    expect(Number(position!.depositAmount)).toBeCloseTo(Number(annonce.askingPrice) * 0.025, 2);
  });
});

describe("l'anonymat du cédant, vu de l'investisseur", () => {
  it("tient tant que le dépôt n'est pas reçu, et cède quand il l'est", () => {
    // Paiements actifs : seul un dépôt payé ouvre l'identité.
    expect(depositReleasesIdentity("RECORDED", true)).toBe(false);
    expect(depositReleasesIdentity("PROCESSING", true)).toBe(false);
    expect(depositReleasesIdentity("PAID", true)).toBe(true);
    // Sans paiements en ligne, la démonstration reste utilisable.
    expect(depositReleasesIdentity("RECORDED", false)).toBe(true);
    expect(depositReleasesIdentity(null, false)).toBe(false);
  });

  it("applique la même règle à l'investisseur qu'à l'acquéreur", async () => {
    const position = await findMyInvestorPosition(ANNONCE, investisseur);
    if (!position) return;
    // La position porte bien le champ que la règle interroge.
    expect(typeof position.paymentStatus).toBe("string");
    expect(depositReleasesIdentity(position.paymentStatus, true)).toBe(position.paymentStatus === "PAID");
  });
});
