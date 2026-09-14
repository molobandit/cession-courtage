/**
 * Prérequis d'un courtier avant de s'engager, joués par les vraies actions :
 * engagements signés une fois, financement déclaré avec son justificatif.
 * `sauvegarder` / `restaurer` remettent le compte de démonstration en l'état.
 */
import { signAgreementsAction } from "@/app/actions/agreements";
import { declarerCapaciteAction } from "@/app/actions/financial-capacity";
import { prisma } from "@/lib/prisma";
import { connecterUtilisateur } from "./auth-stub";

function formulaire(champs: Record<string, string | File>): FormData {
  const data = new FormData();
  for (const [cle, valeur] of Object.entries(champs)) data.set(cle, valeur);
  return data;
}

export async function signerEngagements(userId: string): Promise<void> {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { fullName: true } });
  connecterUtilisateur(userId);
  const r = await signAgreementsAction({}, formulaire({ consent: "on", signatureName: u.fullName ?? "Signataire" }));
  if (r.error) throw new Error(`Signature des engagements : ${r.error}`);
}

export async function declarerFinancement(userId: string, montant = 500_000): Promise<void> {
  connecterUtilisateur(userId);
  const piece = new File([new TextEncoder().encode("%PDF-1.4\n% accord de principe\n")], "accord-de-principe.pdf", { type: "application/pdf" });
  const r = await declarerCapaciteAction({}, formulaire({ montant: String(montant), financingMode: "CREDIT", file: piece }));
  if (r.error) throw new Error(`Déclaration du financement : ${r.error}`);
}

export async function preparerAcquereur(userId: string, montant?: number) {
  await signerEngagements(userId);
  await declarerFinancement(userId, montant);
}

type Sauvegarde = {
  id: string;
  financialCapacityEur: unknown;
  financialCapacityStatus: string;
  financialCapacityAt: Date | null;
  financialCapacityNote: string | null;
  financingMode: string | null;
};

export async function sauvegarder(ids: string[]): Promise<{ lignes: Sauvegarde[]; depuis: Date }> {
  const lignes = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, financialCapacityEur: true, financialCapacityStatus: true, financialCapacityAt: true, financialCapacityNote: true, financingMode: true },
  });
  return { lignes, depuis: new Date(Date.now() - 1000) };
}

export async function restaurer(s: { lignes: Sauvegarde[]; depuis: Date }): Promise<void> {
  const ids = s.lignes.map((l) => l.id);
  await prisma.userAgreement.deleteMany({ where: { userId: { in: ids }, signedAt: { gte: s.depuis } } });
  await prisma.accountDocument.deleteMany({ where: { userId: { in: ids }, createdAt: { gte: s.depuis } } });
  await prisma.depositCheckout.deleteMany({ where: { buyerId: { in: ids }, createdAt: { gte: s.depuis } } });
  for (const l of s.lignes) {
    await prisma.user.update({
      where: { id: l.id },
      data: {
        financialCapacityEur: l.financialCapacityEur === null ? null : String(l.financialCapacityEur),
        financialCapacityStatus: l.financialCapacityStatus as never,
        financialCapacityAt: l.financialCapacityAt,
        financialCapacityNote: l.financialCapacityNote,
        financingMode: l.financingMode,
      },
    });
  }
}
