/**
 * Jauges de préparation à la cession.
 *
 * Un cédant ne sait pas où il en est. Plutôt qu'un questionnaire déclaratif,
 * ces quatre axes sont calculés à partir de ce qui existe réellement en base :
 * on ne demande jamais au courtier de s'auto-évaluer sur ce que la plateforme
 * peut constater.
 */

export type ReadinessAxis = {
  key: "portefeuille" | "valorisation" | "codes" | "pieces";
  label: string;
  /** Avancement entre 0 et 1. */
  share: number;
  /** Ce qu'il reste à faire, ou la confirmation que c'est acquis. */
  detail: string;
  href: string;
};

export type ReadinessInput = {
  portfolioCount: number;
  /** Portefeuilles disposant d'une valorisation. */
  valuedCount: number;
  /** Annonces publiées, tous statuts publics confondus. */
  publishedListings: number;
  carrierCodesTotal: number;
  carrierCodesDecided: number;
  checklistRequired: number;
  checklistProvided: number;
  firstPortfolioId: string | null;
};

function ratio(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(1, done / total);
}

export function readinessAxes(input: ReadinessInput): ReadinessAxis[] {
  const portfolioHref = input.firstPortfolioId
    ? `/app/portefeuilles/${input.firstPortfolioId}`
    : "/app/import";

  return [
    {
      key: "portefeuille",
      label: "Portefeuille importé",
      share: input.portfolioCount > 0 ? 1 : 0,
      detail:
        input.portfolioCount > 0
          ? "Vos contrats sont en base, sans aucune donnée nominative."
          : "Déposez un bordereau pour commencer. Rien ne se calcule avant.",
      href: input.portfolioCount > 0 ? portfolioHref : "/app/import",
    },
    {
      key: "valorisation",
      label: "Valorisation calculée",
      share: ratio(input.valuedCount, Math.max(1, input.portfolioCount)),
      detail:
        input.portfolioCount === 0
          ? "Disponible dès le premier import."
          : input.valuedCount >= input.portfolioCount
            ? "Chaque portefeuille a sa fourchette et sa cascade détaillée."
            : "Un portefeuille attend encore son calcul.",
      href: portfolioHref,
    },
    {
      key: "codes",
      label: "Codes de courtage",
      share: ratio(input.carrierCodesDecided, input.carrierCodesTotal),
      detail:
        input.carrierCodesTotal === 0
          ? "La liste se construit à partir des compagnies de vos contrats."
          : input.carrierCodesDecided >= input.carrierCodesTotal
            ? "Toutes les compagnies se sont prononcées."
            : `${input.carrierCodesTotal - input.carrierCodesDecided} compagnie${
                input.carrierCodesTotal - input.carrierCodesDecided > 1 ? "s" : ""
              } n’ont pas encore répondu. Sans accord, les commissions cessent après la signature.`,
      href: portfolioHref,
    },
    {
      key: "pieces",
      label: "Bordereau de pièces",
      share: ratio(input.checklistProvided, input.checklistRequired),
      detail:
        input.checklistRequired === 0
          ? "Le bordereau s’ouvre avec votre premier dossier."
          : input.checklistProvided >= input.checklistRequired
            ? "Toutes les pièces obligatoires sont déposées."
            : `${input.checklistRequired - input.checklistProvided} pièce${
                input.checklistRequired - input.checklistProvided > 1 ? "s" : ""
              } manquent. Les préparer d’avance raccourcit la négociation.`,
      href: "/app",
    },
  ];
}

/** Moyenne des quatre axes : l'état de préparation d'ensemble. */
export function readinessScore(axes: ReadinessAxis[]): number {
  if (axes.length === 0) return 0;
  return axes.reduce((sum, axis) => sum + axis.share, 0) / axes.length;
}
