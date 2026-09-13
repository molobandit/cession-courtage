import type { DealStage } from "@prisma/client";

/**
 * Ce qu'exige chaque étape du dossier de cession, et qui doit le faire.
 *
 * Le dossier avançait d'un clic, de n'importe quelle partie, sans la moindre
 * pièce. Ici, une étape est une liste de tâches concrètes — déposer, examiner,
 * proposer, accepter, signer — attribuées au cédant ou à l'acquéreur. L'étape
 * n'est franchie que lorsque toutes ses tâches sont faites : aucun bouton ne
 * « passe à la suite ».
 *
 * Une validation couvre un contenu, pas un instant. L'acquéreur qui a examiné
 * la salle de données doit l'examiner de nouveau si le cédant remplace une
 * pièce ; une approbation du protocole ne vaut que pour le texte approuvé.
 *
 * Fonctions pures, testables sans base.
 */

export type Side = "seller" | "buyer";

export type SignoffKind =
  | "NDA_SIGNED"
  | "DATA_ROOM_REVIEWED"
  | "LOI_ACCEPTED"
  | "KYC_REVIEWED"
  | "DEED_APPROVED"
  | "DEED_SIGNED"
  | "TRANSFER_CONFIRMED"
  | "RETENTION_ACCEPTED";

export const SIGNOFF_LABELS: Record<SignoffKind, string> = {
  NDA_SIGNED: "a signé l’accord de confidentialité",
  DATA_ROOM_REVIEWED: "a validé l’examen de la salle de données",
  LOI_ACCEPTED: "a accepté la lettre d’intention",
  KYC_REVIEWED: "a contrôlé les pièces d’identification de la contrepartie",
  DEED_APPROVED: "a approuvé le protocole de cession",
  DEED_SIGNED: "a signé le protocole de cession",
  TRANSFER_CONFIRMED: "a confirmé le rattachement des contrats",
  RETENTION_ACCEPTED: "a validé la déclaration de conservation",
};

export type KycPieceKind = "kbis" | "identite" | "orias";

export const KYC_PIECES: { kind: KycPieceKind; label: string; detail: string }[] = [
  { kind: "kbis", label: "Extrait Kbis", detail: "De moins de trois mois." },
  { kind: "identite", label: "Pièce d’identité du représentant légal", detail: "Carte d’identité ou passeport en cours de validité." },
  { kind: "orias", label: "Attestation d’immatriculation ORIAS", detail: "En cours de validité à la date de la signature." },
];

export const MAX_PIECE_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_PIECE_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;

// ---------------------------------------------------------------------------
// Emplacements de pièces
// ---------------------------------------------------------------------------

export function dueDiligenceSlot(itemId: string): string {
  return `dd:${itemId}`;
}

export function kycSlot(side: Side, kind: KycPieceKind): string {
  return `kyc:${side}:${kind}`;
}

/** Une compagnie s'identifie par son nom, normalisé : l'ordre de la liste peut changer. */
export function carrierKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export function transferSlot(carrierName: string): string {
  return `transfer:${carrierKey(carrierName)}`;
}

export type SlotRule = {
  /** Qui dépose. */
  owner: Side;
  /** Étapes pendant lesquelles le dépôt est ouvert. */
  stages: DealStage[];
};

const AFTER_ROOM: DealStage[] = ["DATA_ROOM", "LOI", "KYC", "DEED", "SIGNATURE", "ESCROW", "TRANSFER", "RETENTION"];

/**
 * Qui peut déposer sur un emplacement, et quand. `null` : emplacement inconnu,
 * le dépôt est refusé — un identifiant fabriqué ne crée pas de pièce.
 */
export function slotRule(
  slot: string,
  known: { dueDiligenceIds: string[]; carriers: string[] },
): SlotRule | null {
  if (slot === "other") return { owner: "seller", stages: AFTER_ROOM };
  const dd = /^dd:(.+)$/.exec(slot);
  if (dd) {
    return known.dueDiligenceIds.includes(dd[1]!) ? { owner: "seller", stages: AFTER_ROOM } : null;
  }
  const kyc = /^kyc:(seller|buyer):(kbis|identite|orias)$/.exec(slot);
  if (kyc) return { owner: kyc[1] as Side, stages: ["KYC"] };
  const transfer = /^transfer:(.+)$/.exec(slot);
  if (transfer) {
    return known.carriers.some((c) => carrierKey(c) === transfer[1])
      ? { owner: "seller", stages: ["TRANSFER"] }
      : null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// État du dossier
// ---------------------------------------------------------------------------

export type ProcessSnapshot = {
  stage: DealStage;
  sellerId: string;
  buyerId: string;
  signoffs: { kind: string; userId: string; createdAt: Date; contentHash: string | null }[];
  pieces: { slot: string | null; uploadedById: string; createdAt: Date }[];
  checklist: { id: string; label: string; required: boolean; providedAt: Date | null }[];
  loi: {
    proposedAt: Date | null;
    declinedAt: Date | null;
    declineReason: string | null;
    price: number | null;
    effectiveDate: Date | null;
  };
  /** Champs d'identification manquants pour rédiger le protocole. */
  missingIdentity: { seller: string[]; buyer: string[] };
  carriers: { name: string; code: string }[];
  /** Empreinte du protocole tel qu'il serait signé aujourd'hui. */
  deedHash: string | null;
  escrowStage: string;
  /** Déclaration de conservation à douze mois, si elle existe. */
  retention: { reportedAt: Date; retentionRate: number } | null;
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
};

function idOf(s: ProcessSnapshot, side: Side): string {
  return side === "seller" ? s.sellerId : s.buyerId;
}

function signoff(s: ProcessSnapshot, kind: SignoffKind, side: Side) {
  return s.signoffs.find((x) => x.kind === kind && x.userId === idOf(s, side)) ?? null;
}

function latest(dates: Date[]): Date | null {
  if (dates.length === 0) return null;
  return new Date(Math.max(...dates.map((d) => d.getTime())));
}

/** Validation encore valable : donnée après la dernière modification de ce qu'elle couvre. */
function freshSignoff(
  s: ProcessSnapshot,
  kind: SignoffKind,
  side: Side,
  since: Date | null,
  hash?: string | null,
) {
  const x = signoff(s, kind, side);
  if (!x) return null;
  if (since && x.createdAt.getTime() < since.getTime()) return null;
  if (hash !== undefined && (hash === null || x.contentHash !== hash)) return null;
  return x;
}

function piecesOn(s: ProcessSnapshot, slot: string) {
  return s.pieces.filter((p) => p.slot === slot);
}

export function kycPiecesDone(s: ProcessSnapshot, side: Side) {
  const deposees = KYC_PIECES.map((k) => piecesOn(s, kycSlot(side, k.kind)));
  return {
    done: deposees.filter((d) => d.length > 0).length,
    total: KYC_PIECES.length,
    lastAt: latest(deposees.flat().map((p) => p.createdAt)),
  };
}

export function dueDiligenceDone(s: ProcessSnapshot) {
  const obligatoires = s.checklist.filter((i) => i.required);
  const fournies = obligatoires.filter((i) => piecesOn(s, dueDiligenceSlot(i.id)).length > 0);
  const pieces = s.checklist.flatMap((i) => piecesOn(s, dueDiligenceSlot(i.id)));
  return {
    done: fournies.length,
    total: obligatoires.length,
    lastAt: latest(pieces.map((p) => p.createdAt)),
  };
}

export function transferDone(s: ProcessSnapshot) {
  const faites = s.carriers.filter((c) => piecesOn(s, transferSlot(c.name)).length > 0);
  const pieces = s.carriers.flatMap((c) => piecesOn(s, transferSlot(c.name)));
  return { done: faites.length, total: s.carriers.length, lastAt: latest(pieces.map((p) => p.createdAt)) };
}

function task(t: Omit<Task, "available" | "doneAt"> & { available?: boolean; doneAt?: Date | null }): Task {
  return { available: true, doneAt: null, ...t };
}

const DE_SIDE: Record<Side, string> = { seller: "du cédant", buyer: "de l’acquéreur" };

export function stageTasks(s: ProcessSnapshot): Task[] {
  switch (s.stage) {
    case "NDA":
      return (["seller", "buyer"] as const).map((side) => {
        const x = signoff(s, "NDA_SIGNED", side);
        return task({
          key: `nda-${side}`,
          label: side === "seller" ? "Signature du cédant" : "Signature de l’acquéreur",
          detail: "Accord de confidentialité lu et signé.",
          owner: side,
          done: Boolean(x),
          doneAt: x?.createdAt ?? null,
        });
      });

    case "DATA_ROOM": {
      const dd = dueDiligenceDone(s);
      const review = freshSignoff(s, "DATA_ROOM_REVIEWED", "buyer", dd.lastAt);
      const complet = dd.total > 0 && dd.done === dd.total;
      return [
        task({
          key: "dd-pieces",
          label: "Déposer les pièces obligatoires du bordereau",
          detail: "Un fichier par ligne : statuts, ORIAS, liasses, conventions compagnies, liste des contrats…",
          owner: "seller",
          done: complet,
          progress: { done: dd.done, total: dd.total },
        }),
        task({
          key: "dd-review",
          label: "Examiner les pièces et valider la salle de données",
          detail: "L’acquéreur confirme avoir consulté les pièces. Un fichier remplacé ensuite demande un nouvel examen.",
          owner: "buyer",
          done: complet && Boolean(review),
          doneAt: review?.createdAt ?? null,
          available: complet,
          waitingReason: complet ? undefined : "Toutes les pièces obligatoires doivent être déposées.",
        }),
      ];
    }

    case "LOI": {
      const proposee = Boolean(s.loi.proposedAt);
      const acceptee = proposee ? freshSignoff(s, "LOI_ACCEPTED", "seller", s.loi.proposedAt) : null;
      return [
        task({
          key: "loi-propose",
          label: "Proposer la lettre d’intention",
          detail: s.loi.declinedAt && !proposee
            ? `Le cédant a refusé la proposition précédente${s.loi.declineReason ? ` : « ${s.loi.declineReason} »` : ""}. Ajustez-la.`
            : "Prix ferme après examen des pièces, date d’effet du transfert, conditions particulières.",
          owner: "buyer",
          done: proposee,
          doneAt: s.loi.proposedAt,
        }),
        task({
          key: "loi-accept",
          label: "Accepter ou refuser la lettre d’intention",
          detail: "L’acceptation fige le prix : 80 % comptant au séquestre, 20 % différé selon la conservation.",
          owner: "seller",
          done: Boolean(acceptee),
          doneAt: acceptee?.createdAt ?? null,
          available: proposee,
          waitingReason: proposee ? undefined : "En attente de la proposition de l’acquéreur.",
        }),
      ];
    }

    case "KYC": {
      const out: Task[] = [];
      for (const side of ["seller", "buyer"] as const) {
        const p = kycPiecesDone(s, side);
        out.push(
          task({
            key: `kyc-pieces-${side}`,
            label: side === "seller" ? "Pièces d’identification du cédant" : "Pièces d’identification de l’acquéreur",
            detail: "Extrait Kbis, pièce d’identité du représentant légal, attestation ORIAS.",
            owner: side,
            done: p.done === p.total,
            progress: { done: p.done, total: p.total },
          }),
        );
      }
      for (const side of ["seller", "buyer"] as const) {
        const controle: Side = side === "seller" ? "buyer" : "seller";
        const p = kycPiecesDone(s, side);
        const complet = p.done === p.total;
        const x = complet ? freshSignoff(s, "KYC_REVIEWED", controle, p.lastAt) : null;
        out.push(
          task({
            key: `kyc-review-${side}`,
            label: side === "seller" ? "Contrôler les pièces du cédant" : "Contrôler les pièces de l’acquéreur",
            detail: "Raison sociale, SIREN, représentant et ORIAS concordent avec la lettre d’intention.",
            owner: controle,
            done: Boolean(x),
            doneAt: x?.createdAt ?? null,
            available: complet,
            waitingReason: complet ? undefined : `En attente des pièces ${DE_SIDE[side]}.`,
          }),
        );
      }
      return out;
    }

    case "DEED": {
      const out: Task[] = [];
      for (const side of ["seller", "buyer"] as const) {
        const manque = s.missingIdentity[side];
        out.push(
          task({
            key: `deed-identity-${side}`,
            label: side === "seller" ? "Identification complète du cabinet cédant" : "Identification complète du cabinet acquéreur",
            detail: manque.length ? `À compléter dans le profil : ${manque.join(", ")}.` : "Raison sociale, forme, SIREN, siège, ORIAS et représentant renseignés.",
            owner: side,
            done: manque.length === 0,
          }),
        );
      }
      const codes = s.carriers.filter((c) => c.code.trim()).length;
      const codesOk = s.carriers.length > 0 && codes === s.carriers.length;
      out.push(
        task({
          key: "deed-carriers",
          label: "Codes courtier du cédant, compagnie par compagnie",
          detail: "Ils figurent en annexe du protocole et sur chaque attestation de transfert.",
          owner: "seller",
          done: codesOk,
          progress: { done: codes, total: s.carriers.length },
        }),
      );
      const pret = codesOk && s.missingIdentity.seller.length === 0 && s.missingIdentity.buyer.length === 0;
      for (const side of ["seller", "buyer"] as const) {
        const x = pret ? freshSignoff(s, "DEED_APPROVED", side, null, s.deedHash) : null;
        out.push(
          task({
            key: `deed-approve-${side}`,
            label: side === "seller" ? "Approbation du protocole par le cédant" : "Approbation du protocole par l’acquéreur",
            detail: "Relecture du protocole généré. Toute modification ultérieure demande une nouvelle approbation.",
            owner: side,
            done: Boolean(x),
            doneAt: x?.createdAt ?? null,
            available: pret,
            waitingReason: pret ? undefined : "Le protocole doit être complet : identifications et codes courtier.",
          }),
        );
      }
      return out;
    }

    case "SIGNATURE":
      return (["seller", "buyer"] as const).map((side) => {
        const x = freshSignoff(s, "DEED_SIGNED", side, null, s.deedHash);
        return task({
          key: `sign-${side}`,
          label: side === "seller" ? "Signature du protocole par le cédant" : "Signature du protocole par l’acquéreur",
          detail: "Signature électronique : nom du signataire, consentement, horodatage et empreinte du texte signé.",
          owner: side,
          done: Boolean(x),
          doneAt: x?.createdAt ?? null,
        });
      });

    case "ESCROW":
      return [
        task({
          key: "escrow-fund",
          label: "Verser le comptant au séquestre",
          detail: "80 % du prix convenu, bloqués jusqu’à la vérification de conservation.",
          owner: "buyer",
          done: s.escrowStage !== "NONE",
        }),
      ];

    case "TRANSFER": {
      const t = transferDone(s);
      const complet = t.total > 0 && t.done === t.total;
      const x = complet ? freshSignoff(s, "TRANSFER_CONFIRMED", "buyer", t.lastAt) : null;
      return [
        task({
          key: "transfer-attestations",
          label: "Déposer les attestations de transfert signées",
          detail: "Une par compagnie, signée par les deux parties et adressée à la compagnie.",
          owner: "seller",
          done: complet,
          progress: { done: t.done, total: t.total },
        }),
        task({
          key: "transfer-confirm",
          label: "Confirmer le rattachement des contrats à votre code",
          detail: "L’acquéreur confirme que les compagnies ont basculé les contrats et les commissions.",
          owner: "buyer",
          done: Boolean(x),
          doneAt: x?.createdAt ?? null,
          available: complet,
          waitingReason: complet ? undefined : "En attente des attestations du cédant.",
        }),
      ];
    }

    case "RETENTION": {
      const declaree = Boolean(s.retention);
      const x = s.retention ? freshSignoff(s, "RETENTION_ACCEPTED", "seller", s.retention.reportedAt) : null;
      return [
        task({
          key: "retention-report",
          label: "Déclarer la conservation à douze mois",
          detail: "Contrats conservés et commissions encaissées. Le solde de 20 % en dépend.",
          owner: "buyer",
          done: declaree,
          doneAt: s.retention?.reportedAt ?? null,
        }),
        task({
          key: "retention-accept",
          label: "Valider la déclaration et clore la cession",
          detail: "La validation libère le séquestre et le solde ajusté.",
          owner: "seller",
          done: Boolean(x),
          doneAt: x?.createdAt ?? null,
          available: declaree,
          waitingReason: declaree ? undefined : "En attente de la déclaration de l’acquéreur.",
        }),
      ];
    }

    case "CLOSED":
      return [];
  }
}

export function stageComplete(s: ProcessSnapshot): boolean {
  if (s.stage === "CLOSED") return false;
  const tasks = stageTasks(s);
  return tasks.length > 0 && tasks.every((t) => t.done);
}

const NEXT: Record<DealStage, DealStage | null> = {
  NDA: "DATA_ROOM",
  DATA_ROOM: "LOI",
  LOI: "KYC",
  KYC: "DEED",
  DEED: "SIGNATURE",
  SIGNATURE: "ESCROW",
  ESCROW: "TRANSFER",
  TRANSFER: "RETENTION",
  RETENTION: "CLOSED",
  CLOSED: null,
};

export function nextStage(stage: DealStage): DealStage | null {
  return NEXT[stage];
}

/** Ce qu'une partie a à faire maintenant, et ce qu'elle attend de l'autre. */
export function tasksFor(s: ProcessSnapshot, side: Side) {
  const tasks = stageTasks(s);
  return {
    mine: tasks.filter((t) => t.owner === side && !t.done && t.available),
    waiting: tasks.filter((t) => t.owner !== side && !t.done),
    done: tasks.filter((t) => t.done).length,
    total: tasks.length,
  };
}

export const STAGE_INTRO: Record<DealStage, string> = {
  NDA: "Chaque partie signe l’accord de confidentialité. La salle de données s’ouvre avec la seconde signature.",
  DATA_ROOM: "Le cédant dépose les pièces du bordereau, l’acquéreur les examine. Rien ne se négocie sur pièces manquantes.",
  LOI: "L’acquéreur propose un prix ferme et une date d’effet, le cédant accepte ou refuse avec un motif.",
  KYC: "Chaque cabinet dépose ses pièces d’identification, l’autre les contrôle. Les fonds ne se séquestrent pas au profit d’un inconnu.",
  DEED: "Le protocole est rédigé à partir du dossier. Les deux parties le relisent et l’approuvent.",
  SIGNATURE: "Les deux représentants signent le protocole approuvé.",
  ESCROW: "L’acquéreur verse le comptant sur le compte séquestre.",
  TRANSFER: "Le cédant adresse une attestation signée à chaque compagnie, l’acquéreur confirme le rattachement des contrats.",
  RETENTION: "À douze mois, l’acquéreur déclare la conservation, le cédant la valide : le séquestre et le solde se libèrent.",
  CLOSED: "La cession est close.",
};
