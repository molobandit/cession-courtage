/**
 * Vérification du compte, faite une fois pour toutes les cessions.
 *
 * Avant de signer une cession et de faire circuler des fonds, la plateforme
 * doit savoir qui est derrière chaque cabinet : c'est l'obligation de
 * vigilance de la lutte contre le blanchiment. Plutôt que de redemander ces
 * pièces à chaque dossier, elles sont déposées dans le profil, contrôlées une
 * fois, puis valent pour toutes les transactions — comme un compte vérifié.
 *
 * L'immatriculation ORIAS est déjà vérifiée à l'inscription ; la raison
 * sociale, le SIREN, le siège et le représentant viennent du profil.
 */

export type AccountPieceKind = "KBIS" | "IDENTITY" | "RC_PRO" | "BENEFICIAL_OWNERS";

export const ACCOUNT_PIECES: { kind: AccountPieceKind; label: string; detail: string }[] = [
  { kind: "KBIS", label: "Extrait Kbis", detail: "De moins de trois mois." },
  { kind: "IDENTITY", label: "Pièce d’identité du représentant légal", detail: "Carte d’identité ou passeport en cours de validité." },
  { kind: "RC_PRO", label: "Attestation d’assurance RC professionnelle", detail: "Et de garantie financière si le cabinet encaisse des fonds." },
  { kind: "BENEFICIAL_OWNERS", label: "Bénéficiaires effectifs", detail: "Extrait du registre des bénéficiaires effectifs, disponible sur le site de l’INPI." },
];

export function isAccountPieceKind(value: string): value is AccountPieceKind {
  return ACCOUNT_PIECES.some((p) => p.kind === value);
}

export type VerificationStatus = "NONE" | "PENDING" | "VERIFIED" | "REJECTED";

export const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
  NONE: "À vérifier",
  PENDING: "En cours de vérification",
  VERIFIED: "Compte vérifié",
  REJECTED: "Vérification refusée",
};

export function missingAccountPieces(kinds: string[]): AccountPieceKind[] {
  return ACCOUNT_PIECES.map((p) => p.kind).filter((k) => !kinds.includes(k));
}
