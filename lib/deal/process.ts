import type { DealStage } from "@prisma/client";

/**
 * Ce qu'exige chaque étape du dossier de cession, et qui doit le faire.
 *
 * Quatre étapes après le positionnement : vérifications, signature, paiement
 * et transfert, clôture. La vitesse ne vient pas de contrôles en moins
 * mais de contrôles faits une fois : la confidentialité est acceptée au dépôt,
 * le dépôt de positionnement vaut engagement, le compte de chaque cabinet est vérifié une
 * fois pour toutes, les pièces du cabinet cédant sont déposées sur l'annonce
 * avant même la vente.
 *
 * Une étape n'est franchie que lorsque toutes ses tâches sont faites. Une
 * validation couvre un contenu, pas un instant : une pièce ajoutée après la
 * confirmation du prix la fait redemander, une signature ne vaut que pour le
 * texte signé.
 *
 * Fonctions pures, testables sans base.
 */

export type Side = "seller" | "buyer";

export type SignoffKind =
  | "NDA_SIGNED"
  | "PRICE_CONFIRMED"
  | "LOI_ACCEPTED"
  | "DEED_SIGNED"
  | "ATTESTATIONS_SENT"
  | "TRANSFER_CONFIRMED";

export const SIGNOFF_LABELS: Record<string, string> = {
  NDA_SIGNED: "a accepté l’engagement de confidentialité",
  PRICE_CONFIRMED: "a confirmé le montant de l’annonce après examen des pièces",
  LOI_ACCEPTED: "s’en est tenu au montant de l’annonce",
  DEED_SIGNED: "a signé le protocole et les attestations de transfert",
  ATTESTATIONS_SENT: "a adressé les attestations aux compagnies",
  TRANSFER_CONFIRMED: "a confirmé le rattachement des contrats",
  RETENTION_ACCEPTED: "a validé la déclaration de conservation",
  // Engagements de l'ancien parcours, encore lisibles dans les journaux.
  DATA_ROOM_REVIEWED: "a validé l’examen de la salle de données",
  KYC_REVIEWED: "a contrôlé les pièces de la contrepartie",
  DEED_APPROVED: "a approuvé le protocole de cession",
};

export const FUNDS_ORIGINS = [
  { value: "FONDS_PROPRES", label: "Fonds propres du cabinet" },
  { value: "EMPRUNT", label: "Emprunt bancaire" },
  { value: "APPORT_ASSOCIES", label: "Apport des associés" },
  { value: "MIXTE", label: "Plusieurs sources" },
] as const;

export const MAX_PIECE_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_PIECE_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;

/** Étapes réellement parcourues, dans l'ordre. */
export const ACTIVE_STAGES: DealStage[] = ["DATA_ROOM", "SIGNATURE", "TRANSFER", "CLOSED"];

/** Étapes de l'ancien parcours, ramenées à l'étape qui les regroupe désormais. */
export function normalizeStage(stage: DealStage): DealStage {
  if (stage === "NDA" || stage === "LOI" || stage === "KYC") return "DATA_ROOM";
  if (stage === "DEED") return "SIGNATURE";
  if (stage === "ESCROW" || stage === "RETENTION") return "TRANSFER";
  return stage;
}

// ---------------------------------------------------------------------------
// État du dossier
// ---------------------------------------------------------------------------

export type VerificationState = { status: string; missingIdentity: string[]; note: string | null };

export type ProcessSnapshot = {
  stage: DealStage;
  sellerId: string;
  buyerId: string;
  signoffs: { kind: string; userId: string; createdAt: Date; contentHash: string | null }[];
  /** Pièces du cabinet déposées sur l'annonce, par type. */
  roomDocs: { kind: string; createdAt: Date }[];
  roomKinds: readonly string[];
  verification: { seller: VerificationState; buyer: VerificationState };
  /** Montant de l'annonce, retenu à l'ouverture du dossier. */
  agreedPrice: number;
  /** Révision du prix proposée par l'acquéreur après examen, si elle existe. */
  revision: { proposedAt: Date; price: number } | null;
  declined: { at: Date; reason: string | null } | null;
  carriers: { name: string; code: string }[];
  /** Empreinte du protocole tel qu'il serait signé aujourd'hui. */
  deedHash: string | null;
  escrowStage: string;
};

export type Task = {
  key: string;
  label: string;
  detail: string;
  owner: Side;
  done: boolean;
  doneAt: Date | null;
  /** Faux tant qu'une tâche préalable manque. */
  available: boolean;
  waitingReason?: string;
  progress?: { done: number; total: number };
  /** Tâche qui se remplit d'elle-même (compte vérifié, pièces déjà déposées). */
  automatic?: boolean;
};

function idOf(s: ProcessSnapshot, side: Side): string {
  return side === "seller" ? s.sellerId : s.buyerId;
}

function signoff(s: ProcessSnapshot, kind: SignoffKind, side: Side) {
  return s.signoffs.find((x) => x.kind === kind && x.userId === idOf(s, side)) ?? null;
}

function latest(dates: (Date | null | undefined)[]): Date | null {
  const valides = dates.filter((d): d is Date => d instanceof Date);
  if (valides.length === 0) return null;
  return new Date(Math.max(...valides.map((d) => d.getTime())));
}

/** Validation encore valable : donnée après la dernière modification de ce qu'elle couvre. */
function freshSignoff(s: ProcessSnapshot, kind: SignoffKind, side: Side, since: Date | null, hash?: string | null) {
  const x = signoff(s, kind, side);
  if (!x) return null;
  if (since && x.createdAt.getTime() < since.getTime()) return null;
  if (hash !== undefined && (hash === null || x.contentHash !== hash)) return null;
  return x;
}

export function roomDocsDone(s: ProcessSnapshot) {
  const presents = s.roomKinds.filter((k) => s.roomDocs.some((d) => d.kind === k));
  return {
    done: presents.length,
    total: s.roomKinds.length,
    missing: s.roomKinds.filter((k) => !presents.includes(k)),
    lastAt: latest(s.roomDocs.filter((d) => s.roomKinds.includes(d.kind)).map((d) => d.createdAt)),
  };
}

/** Prix en vigueur : la révision acceptée ou en attente, sinon le montant de l'annonce. */
export function currentPrice(s: ProcessSnapshot): number {
  return s.revision ? s.revision.price : s.agreedPrice;
}

export function revisionPending(s: ProcessSnapshot): boolean {
  return Boolean(s.revision) && !freshSignoff(s, "LOI_ACCEPTED", "seller", s.revision!.proposedAt);
}

function task(t: Omit<Task, "available" | "doneAt"> & { available?: boolean; doneAt?: Date | null }): Task {
  return { available: true, doneAt: null, ...t };
}

function verificationTask(s: ProcessSnapshot, side: Side): Task {
  const v = s.verification[side];
  const complet = v.missingIdentity.length === 0;
  const verifie = v.status === "VERIFIED" && complet;
  const qui = side === "seller" ? "du cédant" : "de l’acquéreur";
  let detail: string;
  if (verifie) detail = "Pièces du cabinet contrôlées une fois, valables pour toutes les cessions.";
  else if (!complet) detail = `Profil à compléter : ${v.missingIdentity.join(", ")}.`;
  else if (v.status === "PENDING") detail = "Pièces transmises, contrôle en cours par la plateforme.";
  else if (v.status === "REJECTED") detail = `Vérification refusée${v.note ? ` : « ${v.note} »` : ""}. Remplacez la pièce concernée.`;
  else detail = "Kbis, pièce d’identité, RC professionnelle et bénéficiaires effectifs, à déposer une seule fois dans le profil.";
  return task({
    key: `verify-${side}`,
    label: `Compte ${qui} vérifié`,
    detail,
    owner: side,
    done: verifie,
    automatic: true,
  });
}

export function stageTasks(s: ProcessSnapshot): Task[] {
  switch (normalizeStage(s.stage)) {
    case "DATA_ROOM": {
      const docs = roomDocsDone(s);
      const docsOk = docs.total > 0 && docs.done === docs.total;
      const codes = s.carriers.filter((c) => c.code.trim()).length;
      const codesOk = s.carriers.length > 0 && codes === s.carriers.length;
      const depuis = latest([docs.lastAt, s.revision?.proposedAt]);
      const confirme = docsOk ? freshSignoff(s, "PRICE_CONFIRMED", "buyer", depuis) : null;

      const out: Task[] = [
        task({
          key: "room-docs",
          label: "Pièces du cabinet cédant",
          detail: "Statuts, liasses fiscales, bordereaux de commissions et conventions de courtage.",
          owner: "seller",
          done: docsOk,
          progress: { done: docs.done, total: docs.total },
          automatic: docsOk,
        }),
        verificationTask(s, "seller"),
        verificationTask(s, "buyer"),
        task({
          key: "carrier-codes",
          label: "Codes courtier par compagnie",
          detail: "Ils figurent sur le protocole et sur chaque attestation de transfert.",
          owner: "seller",
          done: codesOk,
          progress: { done: codes, total: s.carriers.length },
        }),
        task({
          key: "price-confirm",
          label: "Confirmer le montant après examen des pièces",
          /*
           * Le montant ne se négocie pas : il est arrêté par l'équipe à l'issue
           * de l'étude, et l'acquéreur s'est positionné dessus. Après les
           * pièces, il confirme, il ne propose pas autre chose.
           */
          detail: "Un geste, après lecture des pièces du cabinet cédant.",
          owner: "buyer",
          done: Boolean(confirme),
          doneAt: confirme?.createdAt ?? null,
          available: docsOk,
          waitingReason: docsOk ? undefined : "Les pièces du cabinet cédant doivent être déposées.",
        }),
      ];
      return out;
    }

    case "SIGNATURE":
      return (["seller", "buyer"] as const).map((side) => {
        const x = freshSignoff(s, "DEED_SIGNED", side, null, s.deedHash);
        return task({
          key: `sign-${side}`,
          label: side === "seller" ? "Signature du cédant" : "Signature de l’acquéreur",
          detail: "Protocole de cession et attestations de transfert, signés en un geste. Horodatage et empreinte du texte.",
          owner: side,
          done: Boolean(x),
          doneAt: x?.createdAt ?? null,
        });
      });

    case "TRANSFER": {
      const verse = s.escrowStage !== "NONE";
      const envoyees = verse ? signoff(s, "ATTESTATIONS_SENT", "seller") : null;
      const confirme = envoyees ? freshSignoff(s, "TRANSFER_CONFIRMED", "buyer", envoyees.createdAt) : null;
      return [
        task({
          key: "escrow-fund",
          label: "Verser le montant sur le compte sécurisé",
          detail: "Le montant, dépôt de positionnement déduit, reste sur un compte sécurisé jusqu’à l’accord des compagnies. Origine des fonds déclarée.",
          owner: "buyer",
          done: verse,
        }),
        task({
          key: "attestations-sent",
          label: "Adresser les attestations aux compagnies",
          detail: "Elles sont déjà signées par les deux parties : il reste à les envoyer.",
          owner: "seller",
          done: Boolean(envoyees),
          doneAt: envoyees?.createdAt ?? null,
          available: verse,
          waitingReason: verse ? undefined : "En attente du versement du montant.",
        }),
        task({
          key: "transfer-confirm",
          label: "Confirmer l’accord des compagnies",
          detail: "Quand les compagnies ont rattaché les contrats et les commissions au code de l’acquéreur : le montant est alors versé au cédant et la cession close.",
          owner: "buyer",
          done: Boolean(confirme),
          doneAt: confirme?.createdAt ?? null,
          available: Boolean(envoyees),
          waitingReason: envoyees ? undefined : "En attente de l’envoi des attestations.",
        }),
      ];
    }

    default:
      return [];
  }
}

export function stageComplete(s: ProcessSnapshot): boolean {
  const tasks = stageTasks(s);
  return tasks.length > 0 && tasks.every((t) => t.done);
}

const NEXT: Partial<Record<DealStage, DealStage>> = {
  DATA_ROOM: "SIGNATURE",
  SIGNATURE: "TRANSFER",
  TRANSFER: "CLOSED",
};

export function nextStage(stage: DealStage): DealStage | null {
  return NEXT[normalizeStage(stage)] ?? null;
}

/** Ce qu'une partie a à faire maintenant, et ce qu'elle attend de l'autre. */
export function tasksFor(s: ProcessSnapshot, side: Side) {
  const tasks = stageTasks(s);
  return {
    mine: tasks.filter((t) => t.owner === side && !t.done && t.available && !(t.automatic && t.key.startsWith("verify-") && s.verification[side].status === "PENDING")),
    waiting: tasks.filter((t) => t.owner !== side && !t.done),
    done: tasks.filter((t) => t.done).length,
    total: tasks.length,
  };
}

export const STAGE_INTRO: Partial<Record<DealStage, string>> = {
  DATA_ROOM: "L’acquéreur examine les pièces du cabinet et confirme le montant de l’annonce. Les deux comptes sont vérifiés une fois pour toutes, le cédant renseigne ses codes courtier.",
  SIGNATURE: "Les deux représentants signent le protocole et les attestations de transfert, en un geste chacun.",
  TRANSFER: "L’acquéreur verse le montant sur un compte sécurisé, le cédant envoie les attestations signées, l’acquéreur confirme l’accord des compagnies : le montant est alors versé au cédant.",
  CLOSED: "La cession est close.",
};
