import type { DealStage } from "@prisma/client";
import { certificateKey } from "@/lib/direct/documents";

/**
 * Pièces générées d'un dossier de cession, et à partir de quand elles s'ouvrent.
 *
 * Le protocole est lisible dès les vérifications, pour que chacun le relise
 * avant de signer. Les attestations et le courrier aux clients s'ouvrent au
 * transfert : avant, ils attesteraient une cession qui n'est pas signée.
 */

const ORDRE: DealStage[] = ["NDA", "DATA_ROOM", "LOI", "KYC", "DEED", "SIGNATURE", "ESCROW", "TRANSFER", "RETENTION", "CLOSED"];

function atteinte(stage: DealStage, cible: DealStage) {
  return ORDRE.indexOf(stage) >= ORDRE.indexOf(cible);
}

export type DealPiece = { key: string; title: string; available: boolean; hint: string };

export function dealPieces(input: { stage: DealStage; carriers: { name: string }[] }): DealPiece[] {
  const { stage } = input;
  const signe = atteinte(stage, "TRANSFER");
  const pieces: DealPiece[] = [
    { key: "confidentialite", title: "Engagement de confidentialité", available: true, hint: "Accepté par les deux parties" },
    { key: "lettre-intention", title: "Lettre d’intention", available: true, hint: "L’offre acceptée par le cédant" },
    { key: "protocole", title: "Protocole de cession", available: true, hint: signe ? "Signé par les deux parties" : "Projet, à relire avant la signature" },
  ];
  input.carriers.forEach((c, i) => {
    pieces.push({
      key: certificateKey(i),
      title: `Attestation de transfert — ${c.name}`,
      available: signe,
      hint: signe ? "Signée, à adresser à la compagnie" : "Signée avec le protocole",
    });
  });
  pieces.push({
    key: "courrier-clients",
    title: "Courrier d’information des clients",
    available: signe,
    hint: signe ? "Prêt à envoyer" : "Après la signature",
  });
  return pieces;
}
