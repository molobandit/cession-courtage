import type { DirectServices } from "@/lib/direct/fees";

/**
 * Étapes d'une cession de gré à gré.
 *
 * Le parcours est plus court que l'intermédié, et c'est voulu : les parties se
 * sont trouvées seules, ont négocié seules, et ne viennent chercher que la
 * formalisation. Reproduire ici la salle de données, la lettre d'intention et
 * la fenêtre d'offres n'ajouterait que des écrans à franchir.
 *
 * Le parcours s'adapte aussi aux services achetés : qui ne prend pas le
 * séquestre ne doit pas voir une étape « fonds bloqués » qu'il ne franchira
 * jamais. Une étape qu'on ne peut pas faire est une étape qui bloque.
 *
 * Fonctions pures, testables sans base.
 */

export type DirectStage =
  | "INVITED"
  | "ACCEPTED"
  | "KYC"
  | "DEED"
  | "SIGNATURE"
  | "ESCROW"
  | "TRANSFER"
  | "CLOSED";

export type DirectStep = {
  key: DirectStage;
  label: string;
  summary: string;
  /** Service dont dépend l'étape. Absent = toujours présente. */
  requires?: keyof DirectServices;
};

export const DIRECT_STEPS: DirectStep[] = [
  {
    key: "INVITED",
    label: "Invitation",
    summary: "L’autre partie est invitée à confirmer le prix et les services retenus.",
  },
  {
    key: "ACCEPTED",
    label: "Accord des parties",
    summary: "Les deux parties confirment les conditions. Le dossier s’ouvre.",
  },
  {
    key: "KYC",
    label: "Vérification des parties",
    summary: "Identité et immatriculation des deux cabinets, avant tout acte.",
    requires: "kit",
  },
  {
    key: "DEED",
    label: "Acte de cession",
    summary: "Protocole établi sur les conditions convenues, prêt à signer.",
    requires: "kit",
  },
  {
    key: "SIGNATURE",
    label: "Signature",
    summary: "Signature électronique de l’acte par les deux parties.",
    requires: "kit",
  },
  {
    key: "ESCROW",
    label: "Fonds séquestrés",
    summary: "Le prix est bloqué, puis libéré en deux temps.",
    requires: "escrow",
  },
  {
    key: "TRANSFER",
    label: "Attestations de transfert",
    summary: "Générées puis transmises à chaque fournisseur.",
    requires: "attestations",
  },
  {
    key: "CLOSED",
    label: "Clôturé",
    summary: "Formalisation terminée.",
  },
];

/**
 * Étapes réellement applicables, au vu des services achetés.
 *
 * Les attestations sont comprises dans le kit : celui qui prend le kit passe
 * donc par l'étape de transfert, même sans avoir coché la ligne séparée.
 */
export function stagesFor(services: DirectServices): DirectStage[] {
  return DIRECT_STEPS.filter((step) => {
    if (!step.requires) return true;
    if (step.requires === "attestations") return services.attestations || services.kit;
    return services[step.requires];
  }).map((step) => step.key);
}

/** Étape suivante, ou `null` si le dossier est au bout. */
export function nextStage(current: DirectStage, services: DirectServices): DirectStage | null {
  const ordre = stagesFor(services);
  const index = ordre.indexOf(current);
  if (index < 0 || index >= ordre.length - 1) return null;
  return ordre[index + 1];
}

/**
 * Le passage demandé est-il celui qui vient ?
 *
 * On n'avance que d'un cran, et jamais en arrière : chaque étape engage les
 * parties, et revenir dessus laisserait un acte signé sur un dossier réputé
 * non signé.
 */
export function canAdvance(
  current: DirectStage,
  target: DirectStage,
  services: DirectServices,
): boolean {
  return nextStage(current, services) === target;
}

/**
 * Avancement, en pourcentage.
 *
 * Calculé sur les étapes applicables et non sur la liste complète : un dossier
 * sans séquestre atteint bien 100 % quand il est clos.
 */
export function progressPercent(current: DirectStage, services: DirectServices): number {
  const ordre = stagesFor(services);
  const index = ordre.indexOf(current);
  if (index < 0) return 0;
  const dernier = ordre.length - 1;
  return dernier <= 0 ? 100 : Math.round((index / dernier) * 100);
}

export function stepByKey(key: DirectStage): DirectStep {
  return DIRECT_STEPS.find((step) => step.key === key) ?? DIRECT_STEPS[0];
}
