/**
 * Conduit un dossier de cession à travers ses étapes, par les vraies actions.
 *
 * Chaque étape est jouée par la partie à qui elle revient : le cédant dépose
 * les pièces du bordereau, l'acquéreur les examine, propose la lettre
 * d'intention, et ainsi de suite. Rien n'est posé directement en base : si une
 * garde refuse, le test échoue avec son message.
 */
import type { DealStage } from "@prisma/client";
import {
  acceptRetentionAction,
  answerLoiAction,
  approveDeedAction,
  confirmCarrierTransferAction,
  fundEscrowAction,
  proposeLoiAction,
  reviewDataRoomAction,
  reviewKycAction,
  saveDealCarrierCodesAction,
  signDeedAction,
  signNdaAction,
  uploadDealPieceAction,
  type DealProcessState,
} from "@/app/actions/deal-process";
import { submitRetentionReportAction } from "@/app/actions/retention";
import { KYC_PIECES, kycSlot, transferSlot } from "@/lib/deal/process";
import { loadDealProcess } from "@/lib/deal/process-load";
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

/** Joue l'étape courante en entier. */
export async function jouerEtape(dealId: string): Promise<void> {
  const p = await loadDealProcess(dealId);
  if (!p) throw new Error("Dossier introuvable.");
  const { deal } = p;
  const s = deal.sellerId;
  const b = deal.buyerId;
  const f = (champs: Record<string, string | File> = {}) => formulaire({ dealId, ...champs });

  switch (deal.stage) {
    case "NDA":
      connecterUtilisateur(b);
      reussi("NDA acquéreur", await signNdaAction({}, f({ consent: "on" })));
      connecterUtilisateur(s);
      reussi("NDA cédant", await signNdaAction({}, f({ consent: "on" })));
      return;
    case "DATA_ROOM":
      connecterUtilisateur(s);
      for (const item of deal.dueDiligence.filter((i) => i.required)) {
        reussi(`pièce ${item.label}`, await uploadDealPieceAction({}, f({ slot: `dd:${item.id}`, file: pdf() })));
      }
      connecterUtilisateur(b);
      reussi("examen", await reviewDataRoomAction({}, f({ consent: "on" })));
      return;
    case "LOI": {
      const date = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 2, 1)).toISOString().slice(0, 10);
      connecterUtilisateur(b);
      reussi("proposition", await proposeLoiAction({}, f({ price: String(Number(deal.agreedPrice)), effectiveDate: date, conditions: "" })));
      connecterUtilisateur(s);
      reussi("acceptation", await answerLoiAction({}, f({ decision: "accept", consent: "on" })));
      return;
    }
    case "KYC":
      for (const [side, userId] of [["seller", s], ["buyer", b]] as const) {
        connecterUtilisateur(userId);
        for (const k of KYC_PIECES) {
          reussi(`kyc ${side} ${k.kind}`, await uploadDealPieceAction({}, f({ slot: kycSlot(side, k.kind), file: pdf() })));
        }
      }
      connecterUtilisateur(b);
      reussi("contrôle par l’acquéreur", await reviewKycAction({}, f({ consent: "on" })));
      connecterUtilisateur(s);
      reussi("contrôle par le cédant", await reviewKycAction({}, f({ consent: "on" })));
      return;
    case "DEED": {
      connecterUtilisateur(s);
      const codes: Record<string, string> = {};
      p.carriers.forEach((_, i) => (codes[`code_${i}`] = `C${1000 + i}`));
      reussi("codes", await saveDealCarrierCodesAction({}, f(codes)));
      reussi("approbation cédant", await approveDeedAction({}, f({ consent: "on" })));
      connecterUtilisateur(b);
      reussi("approbation acquéreur", await approveDeedAction({}, f({ consent: "on" })));
      return;
    }
    case "SIGNATURE":
      connecterUtilisateur(s);
      reussi("signature cédant", await signDeedAction({}, f({ consent: "on", signatureName: p.parties.seller.representative ?? "Signataire cédant" })));
      connecterUtilisateur(b);
      reussi("signature acquéreur", await signDeedAction({}, f({ consent: "on", signatureName: p.parties.buyer.representative ?? "Signataire acquéreur" })));
      return;
    case "ESCROW":
      connecterUtilisateur(b);
      reussi("séquestre", await fundEscrowAction({}, f({ consent: "on" })));
      return;
    case "TRANSFER":
      connecterUtilisateur(s);
      for (const c of p.carriers) {
        reussi(`attestation ${c.name}`, await uploadDealPieceAction({}, f({ slot: transferSlot(c.name), file: pdf() })));
      }
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
    case "CLOSED":
      return;
  }
}

const ORDRE: DealStage[] = ["NDA", "DATA_ROOM", "LOI", "KYC", "DEED", "SIGNATURE", "ESCROW", "TRANSFER", "RETENTION", "CLOSED"];

export async function menerDossier(dealId: string, jusqua: DealStage = "CLOSED"): Promise<void> {
  for (let i = 0; i < ORDRE.length; i += 1) {
    const etape = await etapeDe(dealId);
    if (ORDRE.indexOf(etape) >= ORDRE.indexOf(jusqua)) return;
    await jouerEtape(dealId);
    const apres = await etapeDe(dealId);
    if (apres === etape) throw new Error(`Le dossier est resté à l’étape ${etape} après l’avoir jouée.`);
  }
}

/** Efface ce que le parcours a produit sur un dossier de démonstration. */
export async function effacerParcours(dealId: string): Promise<void> {
  await prisma.dealSignoff.deleteMany({ where: { dealId } });
  await prisma.document.deleteMany({ where: { dealId, slot: { not: null } } });
  await prisma.dueDiligenceItem.updateMany({ where: { dealId }, data: { providedAt: null } });
  await prisma.deal.update({
    where: { id: dealId },
    data: {
      loiPrice: null,
      loiEffectiveDate: null,
      loiConditions: null,
      loiProposedAt: null,
      loiDeclinedAt: null,
      loiDeclineReason: null,
      transferCarriers: [],
    },
  });
}
