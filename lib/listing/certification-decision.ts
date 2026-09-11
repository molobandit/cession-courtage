import { CERTIFICATION_SLOTS } from "@/lib/listing/certification-slots";

/**
 * Décide seule du statut de certification d'une annonce.
 *
 * Pure, donc testable sans base.
 *
 * Jusqu'ici le statut passait de NONE à PENDING à la demande, et plus rien ne
 * le faisait avancer : le label ne pouvait pas être gagné, seules les annonces
 * de démonstration l'affichaient parce qu'il y était écrit en dur. Le rendre
 * automatique supprime à la fois cette impasse et la tentation de l'accorder à
 * la main.
 *
 * Le label engage l'éditeur devant l'acquéreur : il ne s'obtient que lorsque
 * TOUTES les pièces obligatoires ont été validées une par une. Une pièce reçue
 * mais non contrôlée ne vaut rien, sinon la certification ne certifierait que
 * l'existence d'un envoi.
 */

export type StatutCertification = "NONE" | "PENDING" | "CERTIFIED" | "REJECTED";

export type PieceCertification = { category: string; label: string; status: string };

/** Une pièce obligatoire refusée bloque tout : le dossier ne peut pas aboutir. */
function aUneRefusee(pieces: PieceCertification[]): boolean {
  const parCle = new Map(pieces.map((p) => [`${p.category}:${p.label}`, p.status]));
  return CERTIFICATION_SLOTS.some(
    (slot) => slot.required && parCle.get(`${slot.category}:${slot.label}`) === "REJECTED",
  );
}

/** Toutes les pièces obligatoires sont-elles validées ? */
export function toutesObligatoiresValidees(pieces: PieceCertification[]): boolean {
  const parCle = new Map(pieces.map((p) => [`${p.category}:${p.label}`, p.status]));
  return CERTIFICATION_SLOTS.filter((s) => s.required).every(
    (slot) => parCle.get(`${slot.category}:${slot.label}`) === "VALIDATED",
  );
}

/**
 * Statut que devrait porter l'annonce, au vu de ses pièces.
 *
 * `demandee` distingue une annonce qui n'a rien demandé d'une annonce en cours
 * d'instruction : sans elle, une annonce sans pièce basculerait en PENDING.
 */
export function statutCertification(
  pieces: PieceCertification[],
  demandee: boolean,
): StatutCertification {
  if (!demandee) return "NONE";
  if (aUneRefusee(pieces)) return "REJECTED";
  if (toutesObligatoiresValidees(pieces)) return "CERTIFIED";
  return "PENDING";
}

/**
 * Le statut doit-il être réécrit en base ?
 *
 * Evite une écriture par consultation : D1 n'aime pas les mises à jour
 * gratuites, et une ligne réécrite sans changement brouille l'horodatage.
 */
export function statutAChanger(
  actuel: string,
  calcule: StatutCertification,
): StatutCertification | null {
  return actuel === calcule ? null : calcule;
}

/** Ce qui reste à faire, pour l'afficher au cédant sans qu'il ait à deviner. */
export function resteAFaire(pieces: PieceCertification[]): string[] {
  const parCle = new Map(pieces.map((p) => [`${p.category}:${p.label}`, p.status]));
  const manques: string[] = [];
  for (const slot of CERTIFICATION_SLOTS) {
    if (!slot.required) continue;
    const statut = parCle.get(`${slot.category}:${slot.label}`) ?? "MISSING";
    if (statut === "VALIDATED") continue;
    manques.push(
      statut === "REJECTED"
        ? `${slot.label} — pièce refusée, à remplacer`
        : statut === "RECEIVED"
          ? `${slot.label} — reçue, contrôle en cours`
          : `${slot.label} — à déposer`,
    );
  }
  return manques;
}
