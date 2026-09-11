/**
 * Conditions de mouvement des fonds sous séquestre.
 *
 * Pure, donc testable sans base et sans prestataire.
 *
 * Le principe qui gouverne ce fichier : la plateforme ne tient jamais les
 * fonds. Un tiers habilité les detient, et ce module dit uniquement si le
 * mouvement demande est legitime, et sinon ce qui manque. Le prestataire
 * execute, il ne decide pas.
 *
 * Chaque condition est nommee et justifiee : un refus doit pouvoir etre montre
 * aux deux parties. Un sequestre qui refuse sans dire pourquoi ne rassure
 * personne et finit par etre contourne a la main.
 */

export type EtapeTunnel =
  | "NDA"
  | "DATA_ROOM"
  | "LOI"
  | "KYC"
  | "DEED"
  | "SIGNATURE"
  | "ESCROW"
  | "TRANSFER"
  | "RETENTION"
  | "CLOSED";

export type EtapeSequestre = "NONE" | "FUNDS_HELD" | "PARTIAL_RELEASE" | "RELEASED" | "REFUNDED";

const ORDRE_TUNNEL: EtapeTunnel[] = [
  "NDA",
  "DATA_ROOM",
  "LOI",
  "KYC",
  "DEED",
  "SIGNATURE",
  "ESCROW",
  "TRANSFER",
  "RETENTION",
  "CLOSED",
];

export function auMoins(etape: EtapeTunnel, minimum: EtapeTunnel): boolean {
  return ORDRE_TUNNEL.indexOf(etape) >= ORDRE_TUNNEL.indexOf(minimum);
}

export type EtatDossier = {
  etape: EtapeTunnel;
  sequestre: EtapeSequestre;
  /** KYC verifie des deux cotes : on ne detient pas les fonds d'un inconnu. */
  kycCedant: boolean;
  kycAcquereur: boolean;
  /** Acte de cession signe par les deux parties. */
  acteSigne: boolean;
  /** Compagnies concernees par un transfert de code de courtage. */
  compagniesTotal: number;
  /** Compagnies ayant repondu, accord ou refus. */
  compagniesRepondues: number;
  /** Le releve de retention a douze mois a ete remis. */
  releveDouzeMois: boolean;
};

export type Condition = {
  cle: string;
  libelle: string;
  remplie: boolean;
};

export type Mouvement = "DEPOT" | "LIBERATION_COMPTANT" | "LIBERATION_DIFFERE" | "REMBOURSEMENT";

/**
 * Dépôt des fonds : l'acquéreur verse, le tiers détient.
 *
 * Exigé avant tout mouvement : un acte signé, et l'identité vérifiée des deux
 * côtés. Détenir les fonds d'une personne non identifiée expose le séquestre
 * autant que la plateforme.
 */
function conditionsDepot(etat: EtatDossier): Condition[] {
  return [
    {
      cle: "acte_signe",
      libelle: "L’acte de cession est signé par les deux parties",
      remplie: etat.acteSigne && auMoins(etat.etape, "SIGNATURE"),
    },
    {
      cle: "kyc_cedant",
      libelle: "L’identité du cédant est vérifiée",
      remplie: etat.kycCedant,
    },
    {
      cle: "kyc_acquereur",
      libelle: "L’identité de l’acquéreur est vérifiée",
      remplie: etat.kycAcquereur,
    },
  ];
}

/**
 * Libération du comptant : la part versée à la signature du transfert.
 *
 * Le verrou décisif est la réponse des compagnies. Un refus de transfert de
 * code de courtage coupe les commissions après la signature : c'est le premier
 * motif d'échec d'une cession en France. Libérer avant d'avoir leurs réponses
 * reviendrait à payer un portefeuille qui peut se vider.
 */
function conditionsComptant(etat: EtatDossier): Condition[] {
  return [
    {
      cle: "fonds_deposes",
      libelle: "Les fonds sont détenus par le séquestre",
      remplie: etat.sequestre === "FUNDS_HELD",
    },
    {
      cle: "transfert_engage",
      libelle: "Le transfert du portefeuille est engagé",
      remplie: auMoins(etat.etape, "TRANSFER"),
    },
    {
      cle: "compagnies_repondues",
      libelle:
        etat.compagniesTotal === 0
          ? "Aucune compagnie à consulter"
          : `Les ${etat.compagniesTotal} compagnies ont répondu (${etat.compagniesRepondues} sur ${etat.compagniesTotal})`,
      remplie: etat.compagniesRepondues >= etat.compagniesTotal,
    },
  ];
}

/**
 * Libération du différé : le solde, ajusté sur la rétention constatée.
 *
 * Le montant dépend du taux de rétention à douze mois. Libérer avant ce relevé
 * priverait l'acquéreur de l'ajustement pour lequel il a accepté un différé.
 */
function conditionsDiffere(etat: EtatDossier): Condition[] {
  return [
    {
      cle: "comptant_libere",
      libelle: "Le comptant a été libéré",
      remplie: etat.sequestre === "PARTIAL_RELEASE",
    },
    {
      cle: "releve_douze_mois",
      libelle: "Le relevé de rétention à douze mois est remis",
      remplie: etat.releveDouzeMois,
    },
  ];
}

/**
 * Remboursement : les fonds retournent à l'acquéreur.
 *
 * Possible tant que rien n'a été libéré. Au-delà, la cession a produit ses
 * effets et un retour en arrière relève du contentieux, pas d'un bouton.
 */
function conditionsRemboursement(etat: EtatDossier): Condition[] {
  return [
    {
      cle: "fonds_deposes",
      libelle: "Les fonds sont détenus par le séquestre",
      remplie: etat.sequestre === "FUNDS_HELD",
    },
  ];
}

export function conditions(mouvement: Mouvement, etat: EtatDossier): Condition[] {
  switch (mouvement) {
    case "DEPOT":
      return conditionsDepot(etat);
    case "LIBERATION_COMPTANT":
      return conditionsComptant(etat);
    case "LIBERATION_DIFFERE":
      return conditionsDiffere(etat);
    case "REMBOURSEMENT":
      return conditionsRemboursement(etat);
  }
}

/** Le mouvement est-il permis ? Toutes les conditions doivent être remplies. */
export function mouvementPermis(mouvement: Mouvement, etat: EtatDossier): boolean {
  if (!etatCompatible(mouvement, etat.sequestre)) return false;
  return conditions(mouvement, etat).every((c) => c.remplie);
}

/**
 * Un mouvement n'a de sens que depuis l'état où il part.
 *
 * Sans ce contrôle, un rejeu libérerait deux fois, ou rembourserait des fonds
 * déjà versés au cédant. D1 n'ayant pas de transactions, cette vérification est
 * la seule barrière.
 */
function etatCompatible(mouvement: Mouvement, sequestre: EtapeSequestre): boolean {
  switch (mouvement) {
    case "DEPOT":
      return sequestre === "NONE";
    case "LIBERATION_COMPTANT":
      return sequestre === "FUNDS_HELD";
    case "LIBERATION_DIFFERE":
      return sequestre === "PARTIAL_RELEASE";
    case "REMBOURSEMENT":
      return sequestre === "FUNDS_HELD";
  }
}

/** Ce qui manque, pour l'afficher aux deux parties. */
export function manquants(mouvement: Mouvement, etat: EtatDossier): Condition[] {
  return conditions(mouvement, etat).filter((c) => !c.remplie);
}

/** État du séquestre après un mouvement accepté. */
export function etatApres(mouvement: Mouvement): EtapeSequestre {
  switch (mouvement) {
    case "DEPOT":
      return "FUNDS_HELD";
    case "LIBERATION_COMPTANT":
      return "PARTIAL_RELEASE";
    case "LIBERATION_DIFFERE":
      return "RELEASED";
    case "REMBOURSEMENT":
      return "REFUNDED";
  }
}

/** Prochain mouvement attendu, ou null si le séquestre est terminé. */
export function prochainMouvement(etat: EtatDossier): Mouvement | null {
  switch (etat.sequestre) {
    case "NONE":
      return "DEPOT";
    case "FUNDS_HELD":
      return "LIBERATION_COMPTANT";
    case "PARTIAL_RELEASE":
      return "LIBERATION_DIFFERE";
    case "RELEASED":
    case "REFUNDED":
      return null;
  }
}

export const LIBELLES_MOUVEMENT: Record<Mouvement, string> = {
  DEPOT: "Dépôt des fonds",
  LIBERATION_COMPTANT: "Libération du comptant",
  LIBERATION_DIFFERE: "Libération du solde",
  REMBOURSEMENT: "Remboursement à l’acquéreur",
};
