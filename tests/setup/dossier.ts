/**
 * Conduit un dossier de cession à travers ses cinq étapes, par les vraies actions.
 *
 * Chaque geste est joué par la partie à qui il revient : le cédant dépose les
 * pièces du cabinet et ses codes courtier, chaque compte dépose ses pièces
 * d'identification et l'administrateur les valide, l'acquéreur confirme son
 * prix, les deux signent, et ainsi de suite. Rien n'est posé directement en
 * base : si une garde refuse, le test échoue avec son message.
 */
import type { DealStage } from "@prisma/client";
import { uploadAccountDocumentAction } from "@/app/actions/account-verification";
import { decideKycAction } from "@/app/actions/admin-orias";
import {
  acceptRetentionAction,
  confirmCarrierTransferAction,
  confirmPriceAction,
  fundEscrowAction,
  saveDealCarrierCodesAction,
  sendAttestationsAction,
  signDeedAction,
  uploadRoomDocumentAction,
  type DealProcessState,
} from "@/app/actions/deal-process";
import { submitRetentionReportAction } from "@/app/actions/retention";
import { ACCOUNT_PIECES } from "@/lib/account/verification";
import { loadDealProcess } from "@/lib/deal/process-load";
import { DATA_ROOM_KINDS } from "@/lib/listing/company-doc-kinds";
import { prisma } from "@/lib/prisma";
import { connecterUtilisateur } from "./auth-stub";

export function formulaire(champs: Record<string, string | File>): FormData {
  const data = new FormData();
  for (const [cle, valeur] of Object.entries(champs)) data.set(cle, valeur);
  return data;
}

export function pdf(nom = "piece.pdf"): File {
  return new File([new TextEncoder().encode("%PDF-1.4\n% piece de test\n")], nom, { type: "application/pdf" });
}

function reussi(etiquette: string, r: DealProcessState | { error?: string }) {
  if (r.error) throw new Error(`${etiquette} : ${r.error}`);
}

export async function etapeDe(dealId: string): Promise<DealStage> {
  return (await prisma.deal.findUniqueOrThrow({ where: { id: dealId }, select: { stage: true } })).stage;
}

/** Vérifie un compte comme en vrai : quatre pièces déposées, puis validation par un administrateur. */
export async function verifierCompte(userId: string): Promise<void> {
  connecterUtilisateur(userId);
  for (const piece of ACCOUNT_PIECES) {
    reussi(`pièce de compte ${piece.kind}`, await uploadAccountDocumentAction({}, formulaire({ kind: piece.kind, file: pdf() })));
  }
  const admin = await prisma.user.findFirstOrThrow({ where: { role: "ADMIN" }, select: { id: true } });
  connecterUtilisateur(admin.id);
  reussi("validation du compte", await decideKycAction({}, formulaire({ userId, approved: "1" })));
}

/** Joue l'étape courante en entier. */
export async function jouerEtape(dealId: string, options: { verifierComptes?: boolean } = {}): Promise<void> {
  const p = await loadDealProcess(dealId);
  if (!p) throw new Error("Dossier introuvable.");
  const { deal } = p;
  const s = deal.sellerId;
  const b = deal.buyerId;
  const f = (champs: Record<string, string | File> = {}) => formulaire({ dealId, ...champs });

  switch (deal.stage) {
    case "DATA_ROOM": {
      connecterUtilisateur(s);
      for (const kind of DATA_ROOM_KINDS) {
        if (!deal.listing.companyDocuments.some((d) => d.kind === kind)) {
          reussi(`pièce du cabinet ${kind}`, await uploadRoomDocumentAction({}, f({ kind, file: pdf() })));
        }
      }
      const codes: Record<string, string> = {};
      p.carriers.forEach((_, i) => (codes[`code_${i}`] = `C${1000 + i}`));
      reussi("codes", await saveDealCarrierCodesAction({}, f(codes)));
      for (const [side, userId] of [["seller", s], ["buyer", b]] as const) {
        if (options.verifierComptes || p.snapshot.verification[side].status !== "VERIFIED") await verifierCompte(userId);
      }
      connecterUtilisateur(b);
      reussi("confirmation du prix", await confirmPriceAction({}, f({ consent: "on" })));
      return;
    }
    case "SIGNATURE": {
      const frais = (await loadDealProcess(dealId))!;
      connecterUtilisateur(s);
      reussi("signature cédant", await signDeedAction({}, f({ consent: "on", signatureName: frais.parties.seller.representative ?? "Signataire" })));
      connecterUtilisateur(b);
      reussi("signature acquéreur", await signDeedAction({}, f({ consent: "on", signatureName: frais.parties.buyer.representative ?? "Signataire" })));
      return;
    }
    case "TRANSFER":
      connecterUtilisateur(b);
      reussi("séquestre", await fundEscrowAction({}, f({ consent: "on", fundsOrigin: "FONDS_PROPRES" })));
      connecterUtilisateur(s);
      reussi("envoi des attestations", await sendAttestationsAction({}, f({ consent: "on" })));
      connecterUtilisateur(b);
      reussi("rattachement", await confirmCarrierTransferAction({}, f({ consent: "on" })));
      return;
    case "RETENTION":
      connecterUtilisateur(b);
      reussi(
        "déclaration M+12",
        await submitRetentionReportAction({}, f({ monthIndex: "12", contractsTransferred: "100", contractsRetained: "92", actualCommissions: "10000" })),
      );
      connecterUtilisateur(s);
      reussi("validation", await acceptRetentionAction({}, f({ consent: "on" })));
      return;
    default:
      return;
  }
}

const ORDRE: DealStage[] = ["DATA_ROOM", "SIGNATURE", "TRANSFER", "RETENTION", "CLOSED"];

export async function menerDossier(dealId: string, jusqua: DealStage = "CLOSED", options: { verifierComptes?: boolean } = {}): Promise<void> {
  for (let i = 0; i < ORDRE.length; i += 1) {
    const etape = await etapeDe(dealId);
    if (ORDRE.indexOf(etape) >= ORDRE.indexOf(jusqua)) return;
    await jouerEtape(dealId, options);
    const apres = await etapeDe(dealId);
    if (apres === etape) throw new Error(`Le dossier est resté à l’étape ${etape} après l’avoir jouée.`);
  }
}

/** Efface ce que le parcours a produit sur un dossier de démonstration. */
export async function effacerParcours(dealId: string): Promise<void> {
  await prisma.dealSignoff.deleteMany({ where: { dealId, kind: { not: "NDA_SIGNED" } } });
  await prisma.document.deleteMany({ where: { dealId, slot: { not: null } } });
  await prisma.deal.update({
    where: { id: dealId },
    data: {
      loiPrice: null,
      loiProposedAt: null,
      loiDeclinedAt: null,
      loiDeclineReason: null,
      transferCarriers: [],
      fundsOrigin: null,
    },
  });
}
