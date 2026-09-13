import type { DealStage } from "@prisma/client";
import { certificateKey } from "@/lib/direct/documents";

/**
 * Pièces générées d'un dossier de cession, et à partir de quand elles s'ouvrent.
 *
 * Une pièce n'existe pas avant l'étape qui la justifie : un protocole avant la
 * lettre d'intention nommerait un prix que personne n'a accepté.
 */

const ORDRE: DealStage[] = ["NDA", "DATA_ROOM", "LOI", "KYC", "DEED", "SIGNATURE", "ESCROW", "TRANSFER", "RETENTION", "CLOSED"];

function atteinte(stage: DealStage, cible: DealStage) {
  return ORDRE.indexOf(stage) >= ORDRE.indexOf(cible);
}

export type DealPiece = { key: string; title: string; available: boolean; hint: string };

export function dealPieces(input: {
  stage: DealStage;
  loiProposed: boolean;
  carriers: { name: string }[];
}): DealPiece[] {
  const { stage } = input;
  const loi = atteinte(stage, "KYC") || (stage === "LOI" && input.loiProposed);
  const pieces: DealPiece[] = [
    { key: "confidentialite", title: "Accord de confidentialité", available: true, hint: atteinte(stage, "DATA_ROOM") ? "Signé par les deux parties" : "À signer" },
    { key: "lettre-intention", title: "Lettre d’intention", available: loi, hint: atteinte(stage, "KYC") ? "Acceptée" : loi ? "Proposée, en attente de réponse" : "Après l’examen de la salle de données" },
    { key: "protocole", title: "Protocole de cession", available: atteinte(stage, "DEED"), hint: atteinte(stage, "ESCROW") ? "Signé par les deux parties" : atteinte(stage, "DEED") ? "En relecture et signature" : "Après la conformité" },
  ];
  input.carriers.forEach((c, i) => {
    pieces.push({
      key: certificateKey(i),
      title: `Attestation de transfert — ${c.name}`,
      available: atteinte(stage, "TRANSFER"),
      hint: atteinte(stage, "TRANSFER") ? "À signer et adresser à la compagnie" : "Après le séquestre",
    });
  });
  return pieces;
}
