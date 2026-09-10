/**
 * Durees de conservation, article 5.1.e du RGPD.
 *
 * Le reglement n'impose pas de chiffres, il impose de fixer une duree, de la
 * justifier, de l'annoncer et de l'appliquer. Une donnee gardee « au cas ou »
 * est une donnee gardee sans base legale.
 *
 * Pure, donc testable sans base. Les valeurs sont ici, dans un seul fichier,
 * pour qu'une revision juridique se lise d'un coup d'oeil et ne suppose pas de
 * relire le code de purge.
 */

const JOUR = 24 * 60 * 60 * 1000;

export type RegleConservation = {
  /** Ce qui est conserve. */
  donnee: string;
  /** Duree en jours a compter de la date de reference. */
  jours: number;
  /** Pourquoi cette duree, et pas une autre. */
  motif: string;
};

export const REGLES: RegleConservation[] = [
  {
    donnee: "Jeton de connexion par lien magique",
    jours: 1,
    motif:
      "Le jeton vaut quinze minutes. Passé ce délai il n’ouvre plus rien : le conserver n’aurait d’autre effet que d’exposer une empreinte inutile.",
  },
  {
    donnee: "Compteur d’échecs de connexion",
    jours: 1,
    motif:
      "Sert uniquement à ralentir une attaque en cours. La fenêtre se referme au bout d’une heure, la ligne n’a plus d’objet le lendemain.",
  },
  {
    donnee: "Notifications",
    jours: 180,
    motif:
      "Une alerte de correspondance ou de clôture de fenêtre perd tout intérêt passé six mois, et le dossier qu’elle signalait est archivé par ailleurs.",
  },
  {
    donnee: "Consultations de la salle de données",
    jours: 365,
    motif:
      "Trace de qui a consulté quelle pièce, utile en cas de contestation sur la diligence. Un an couvre la durée usuelle d’une cession et sa contestation immédiate.",
  },
  {
    donnee: "Journal d’audit",
    jours: 365,
    motif:
      "Journalisation de sécurité. Un an correspond à la recommandation de la CNIL pour les traces de connexion et d’action ; au-delà, la conservation devient disproportionnée.",
  },
  {
    donnee: "Demandes d’exercice des droits",
    jours: 1095,
    motif:
      "Preuve que le droit a bien été servi. Trois ans correspondent au délai pendant lequel l’autorité peut demander à en rendre compte.",
  },
  {
    donnee: "Dossiers, offres et dépôts",
    jours: 3650,
    motif:
      "Pièces d’une cession conclue. Dix ans, durée imposée par l’article L123-22 du code de commerce pour les pièces comptables : les effacer plus tôt priverait chaque partie de sa preuve et exposerait l’éditeur.",
  },
  {
    donnee: "Compte sans aucune activité",
    jours: 1095,
    motif:
      "Trois ans d’inactivité, seuil recommandé par la CNIL. Le compte est alors neutralisé comme sur demande d’effacement, les pièces contractuelles restant soumises à leur propre durée.",
  },
];

/** Date avant laquelle une donnee soumise a cette regle doit disparaitre. */
export function seuil(jours: number, maintenant: Date): Date {
  return new Date(maintenant.getTime() - jours * JOUR);
}

/** Vrai si la donnee a depasse sa duree de conservation. */
export function aExpire(dateReference: Date, jours: number, maintenant: Date): boolean {
  return dateReference.getTime() <= seuil(jours, maintenant).getTime();
}

/** Acces a une regle par le libelle exact, pour eviter les durees en dur. */
export function regle(donnee: string): RegleConservation {
  const trouvee = REGLES.find((r) => r.donnee === donnee);
  if (!trouvee) throw new Error(`Regle de conservation absente : ${donnee}`);
  return trouvee;
}
