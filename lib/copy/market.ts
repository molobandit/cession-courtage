import {
  GROWTH_PLAN_ANNUAL_EUR,
  INTEREST_DEPOSIT_LABEL,
  SUCCESS_FEE_FLOOR_EUR,
  VERIFIED_FEE_RANGE_LABEL,
} from "@/lib/billing/rates";

/** Marque affichée. */
export { BRAND_NAME } from "@/lib/site";

/**
 * Dénomination sociale, republiée depuis `lib/site.ts`.
 *
 * Elle y était définie une seconde fois avec la même valeur : deux sources de
 * vérité pour une même donnée, qui finissent toujours par diverger le jour où
 * l'une est corrigée et pas l'autre. La dénomination appartient à l'identité du
 * site, pas aux textes du marché.
 */
export { COMPANY_LEGAL_NAME } from "@/lib/site";

export const HERO_HEADLINE = "Prenez position.";
export const HERO_HEADLINE_REST = "Achetez ou vendez votre portefeuille d’assurance.";
export const HERO_TITLE = `${HERO_HEADLINE} ${HERO_HEADLINE_REST}`;

/**
 * Chapô sous le slogan. Le nom de société ne doit pas précéder « salle de
 * marché » ni « portefeuilles » dans la même phrase : c’est le défaut relevé
 * sur l’accueil (marché / marché, portefeuille / portefeuilles).
 */
export const HERO_LEDE =
  "Cédants, acquéreurs et investisseurs s’y rencontrent pour conclure, sur des dossiers ouverts, chiffrés et vérifiés.";


export const MARKET_HALL = "La salle de marché";
export const MARKET_HALL_TITLE = "Portefeuilles à vendre";

export const MARKET_ACCESS = "Accès au marché";
export const NO_FEE_LABEL = "Sans frais";
export const TAKE_POSITION = "Prenez position.";

export const CTA_SELL = "Mettre en vente votre portefeuille";
export const CTA_BROWSE = "Consulter les portefeuilles disponibles";
export const NAV_SELL = "Je vends mon portefeuille";
export const NAV_BUY = "Je recherche un portefeuille";
export const NAV_INVESTOR = "Je suis investisseur";

export const STAMP_CERTIFIED = "CERTIFIÉ";
export const STAMP_SOLD = "VENDU";
export const UNCERTIFIED_LABEL = "Portefeuille non certifié";
export const CERTIFICATION_POINTS = 50;
export const CERTIFICATION_POINTS_LABEL = `plus de ${CERTIFICATION_POINTS} points de contrôle`;

/**
 * Preuves du premier écran.
 *
 * Cinq faits vérifiables, pas cinq adjectifs. Un visiteur qui doit céder le
 * travail de vingt ans ne se décide pas sur « sécurisé » et « professionnel » :
 * il cherche ce qui est contrôlé, par qui, et à quel moment son nom sort. Trois
 * étiquettes vagues occupaient cette place et ne donnaient aucune raison de
 * continuer à lire.
 *
 * Chaque ligne est tenue par du code : la capacité financière par un contrôle
 * daté, les cinquante points par les pièces de certification, l'anonymat par
 * `canReadCedantIdentity`. Aucune ne peut donc être démentie par le produit.
 */
export const HERO_PROOFS = [
  "La valeur de marché est établie avant la mise en vente",
  "La capacité financière des acquéreurs est vérifiée",
  `Les dossiers certifiés passent ${CERTIFICATION_POINTS_LABEL}`,
  "Les contrats sont contrôlés par nos avocats, la transaction est sécurisée",
  `L’acquéreur verse ${INTEREST_DEPOSIT_LABEL} dans un trust pour lancer la procédure de cession`,
] as const;

export const SALE_SPEED_CLAIM = "Nos portefeuilles sont vendus en moyenne en moins d’une semaine.";

/**
 * Bandeau de chiffres de l'accueil.
 *
 * Trois repères, pas quatre : « ORIAS » n'était pas un chiffre qui se compare,
 * et à quatre aucun ne peut être grand.
 *
 * Trois infinitifs de même longueur, et non trois étiquettes : « pour déposer »
 * dit au lecteur ce que le nombre lui coûte ou lui rapporte, là où « frais de
 * dépôt » ne nommait qu'une rubrique comptable. Ils tiennent aussi sur une
 * seule ligne, ce qui garde la ligne de base des trois colonnes alignée — le
 * bandeau n'existe que pour cet ordre.
 *
 * La note du délai annonce elle-même sa limite : un chiffre moyen présenté sans
 * réserve se lit comme un engagement, et le reconnaître avant qu'on ne le
 * demande inspire plus confiance que de le laisser deviner.
 */
export const MARKET_FIGURES_KICKER = "Le marché en trois chiffres";

/*
 * « Pour mettre en vente » et non « pour déposer » : depuis que l'acquéreur
 * verse un dépôt de garantie avant toute offre, « 0 € pour déposer » se lisait
 * aussi comme « pas de dépôt » — l'exact contraire de ce qu'il allait trouver.
 */
export const MARKET_FIGURES = [
  {
    icon: "tag",
    figure: "0 €",
    label: "Pour mettre en vente",
    note: "Vous ne payez qu’une fois la vente conclue.",
  },
  {
    icon: "clock",
    figure: "< 1 sem.",
    label: "Délai moyen*",
    note: "Constaté, jamais garanti.",
  },
  {
    icon: "shield",
    figure: `${CERTIFICATION_POINTS}+`,
    label: "Points de contrôle",
    note: "Vérifiés avant chaque certification.",
  },
] as const;

export const ACCESS_PRICE_LINE = `${GROWTH_PLAN_ANNUAL_EUR.toLocaleString("fr-FR")} € HT / an`;

export const ADVISOR_BOOKING_HREF = "/rendez-vous";
export const CTA_ADVISOR = "Réserver un entretien de 30 min";
export const ADVISOR_BOOKING_TITLE = "Un conseiller vous reçoit";
export const ADVISOR_BOOKING_LEDE =
  "Choisissez l’un des créneaux encore libres. L’entretien dure 30 minutes.";
export const CTA_DEPOSIT = "Déposer votre portefeuille";
export const CTA_CONSULT = "Consulter les portefeuilles";

export const SELL_KICKER = "Cédants";
export const SELL_TITLE = "Vendez à la juste valeur, à un acquéreur qui peut conclure";
export const SELL_LEDE =
  "Vous avez mis des années à bâtir ce portefeuille. Sa cession ne devrait pas se jouer sur un chiffre lancé au téléphone et la parole d’un inconnu.";
export const SELL_REASSURANCE =
  "Le dépôt est sans frais. Des honoraires ne sont dus que si la vente aboutit.";

export const BUY_KICKER = "Acquéreurs";
export const BUY_TITLE = "Achetez sur pièces, pas sur parole";
export const BUY_LEDE =
  "Un portefeuille certifié a été ouvert, contrôlé et chiffré avant de vous être présenté. Vous savez ce que vous achetez avant de vous engager.";
export const BUY_REASSURANCE =
  "Dès que vous vous positionnez, un dépôt de 2,5 % est versé dans un trust pour lancer la procédure de cession.";

/** Fiche « Demandes de modification » : phrases reprises à la lettre. */
export const STUDY_SENTENCE =
  "Nous réalisons une étude du portefeuille afin de mettre en évidence ses différents éléments et caractéristiques.";
export const PRICE_RULE_SENTENCES = [
  "Ce n’est pas le vendeur qui fixe le montant de l’annonce ni qui la publie.",
  "Nous réalisons d’abord l’étude du portefeuille.",
  "Une fois la valeur déterminée, l’annonce est mise en ligne avec le montant correspondant.",
] as const;
export const PRICE_RULE = PRICE_RULE_SENTENCES.join(" ");

/** Contrôles sur le cabinet (bloc « La société »). */
export const COMPANY_SOCIETY_CHECKS = [
  "Extrait Kbis ou justificatif d’immatriculation",
  "Informations légales (dénomination, siège, représentant)",
  "Statuts ou documents juridiques pertinents",
  "Justificatif ORIAS associé au dossier",
  "Réputation du cabinet",
] as const;

/** Éléments contrôlés avant mise en ligne d’un portefeuille certifié. */
export const CERTIFIED_CONTROLLED_ELEMENTS = [
  "Kbis ou justificatif d’immatriculation",
  "Informations légales de la société",
  "Pièces d’identité du représentant",
  "Statuts",
  "Justificatif ORIAS",
  "Réputation du cabinet",
  "Données du portefeuille",
  "Bordereaux et relevés de commissions",
  "Relevés des compagnies",
  "États de production",
  "Répartition des clients et des contrats",
  "Renouvellements et résiliations",
  "Précomptes, le cas échéant",
] as const;

export const SELL_PILLARS = [
  {
    title: "Une étude du portefeuille, d’abord",
    body: STUDY_SENTENCE,
  },
  {
    title: "Des acquéreurs dont la capacité financière est vérifiée",
    body: "Mise en relation avec des acquéreurs sérieux et sélectionnés, dont la capacité financière est vérifiée, afin d’éviter les démarches inutiles et les pertes de temps.",
  },
  {
    title: "Une cession qui ne traîne pas",
    body: `${SALE_SPEED_CLAIM}*`,
  },
  {
    title: "Une transaction sécurisée, des contrats contrôlés",
    body: "Vos contrats sont contrôlés par nos avocats. La transaction passe par un trust. Nous vous accompagnons jusqu’au transfert des contrats.",
  },
] as const;

export const BUY_POINTS = [
  `Accès à des portefeuilles certifiés avec ${CERTIFICATION_POINTS_LABEL}.`,
  "Une étude de chaque portefeuille par notre équipe, avant sa mise en ligne.",
  "Accès aux informations essentielles avant de se positionner.",
  "Contrôle juridique des contrats par nos avocats.",
  "Transaction sécurisée.",
  "Accompagnement de la transaction jusqu’au transfert effectif des contrats.",
  "Processus encadré permettant de réduire le risque transactionnel.",
] as const;

export const ACCESS_MARKET_POINTS = [
  "Accès à toutes les opportunités de portefeuille.",
  "Étude de votre portefeuille.",
  "Encadrement de la transaction de A à Z.",
] as const;

/** Dépôt versé dès que l’acquéreur se positionne. */
export const DEPOSIT_POSITION_TITLE = "Dépôt identité";
export const DEPOSIT_POSITION_LEDE = `Dès que l’acquéreur se positionne, il verse un dépôt de ${INTEREST_DEPOSIT_LABEL} dans un trust, pour lancer la procédure de cession.`;
export const DEPOSIT_POSITION_ITEMS = [
  "Calculé sur le montant de l’annonce",
  "Versé dans un trust",
  "Lance la procédure de cession",
  "Ce n’est pas le contrôle des pièces",
] as const;

export const TRANSACTION_SECURE_TITLE = "Transaction sécurisée";
export const TRANSACTION_SECURE_LEDE =
  "La transaction entre l’acquéreur et le cédant est sécurisée grâce à La bourse du portefeuille.";
export const TRANSACTION_SECURE_ITEMS = [
  "Tout passe par un trust",
  "Les fonds sont libérés via le trust uniquement après contrôle et vérification de l’ensemble des données",
] as const;
export const TRANSACTION_SECURE_BODY =
  "La transaction entre l’acquéreur et le cédant est sécurisée grâce à La bourse du portefeuille. Tout passe par un trust. Les fonds sont libérés via le trust uniquement après contrôle et vérification de l’ensemble des données.";

export const SECURE_PAYMENT_TITLE = TRANSACTION_SECURE_TITLE;
export const SECURE_PAYMENT_LEDE = TRANSACTION_SECURE_LEDE;
export const SECURE_PAYMENT_ITEMS = TRANSACTION_SECURE_ITEMS;

export const FAQ_PORTFOLIO_TRANSFER_Q = "À quel moment le portefeuille est-il transmis ?";
export const FAQ_PORTFOLIO_TRANSFER_A =
  "Il est transmis une fois que les contrats sont signés des deux parties, et une fois que le trust a bien reçu la totalité des fonds.";

/** Conservation : hors FAQ, rubrique autonome. */
export const RETENTION_TRUST_TITLE = "Séquestre de conservation";
export const RETENTION_TRUST_LEDE =
  "Le trust séquestre 20 % du montant du portefeuille.";
export const RETENTION_TRUST_ITEMS = [
  "Redistribué au prorata à l’acquéreur",
  "Uniquement si la déperdition dépasse 10 %",
] as const;
export const RETENTION_TRUST_BODY =
  "Le trust séquestre 20 % du montant du portefeuille. Cette part est versée au prorata à l’acquéreur uniquement si la déperdition dépasse 10 %.";

/**
 * Les cinq engagements de confidentialité, repris de la page 1 du dossier de
 * présentation. Mêmes mots à l'écran et dans le PDF.
 */
export const CONFIDENTIALITY_POINTS = [
  {
    title: "Aucune communication",
    body:
      "Aucune communication, publique ou privée, portant sur ce portefeuille, sur votre intérêt pour son rachat ou sur le contenu de ce dossier ne peut être faite sans l’accord écrit préalable du cédant et de La bourse du portefeuille.",
  },
  {
    title: "Non contact",
    body:
      "Vous acceptez de ne pas entrer en contact avec les compagnies partenaires, les collaborateurs ni les clients du cédant. Cet engagement s’étend à l’ensemble de vos collaborateurs et conseils.",
  },
  {
    title: "Confidentialité des informations",
    body:
      "Les informations de ce dossier, celles permettant d’identifier le cédant, ses opérations et son profil financier, ainsi que vos propres analyses, sont strictement confidentielles.",
  },
  {
    title: "Usage limité et restitution",
    body:
      "Ces éléments vous sont remis dans le seul but d’apprécier l’opportunité et de préparer votre positionnement. Les documents sont détruits ou restitués sur simple demande.",
  },
  {
    title: "Absence de garantie",
    body:
      "La bourse du portefeuille ne pourra être tenue pour responsable de l’inexactitude éventuelle d’informations transmises tout au long du processus.",
  },
] as const;

/** Ce que déclenche le versement du dépôt de positionnement. */
export const DEPOSIT_CONSEQUENCES = [
  "Le dépôt est versé dans un trust.",
  "La procédure de cession démarre.",
  "Le nom du cabinet cédant vous est révélé et ses pièces s’ouvrent.",
] as const;

/** Ce que coûte la cession, dit comme dans le dossier de présentation. */
export const CERTIFIED_FEE_LINE = `Portefeuille certifié : ${VERIFIED_FEE_RANGE_LABEL}, minimum ${SUCCESS_FEE_FLOOR_EUR.toLocaleString("fr-FR")} € HT. Honoraires dus uniquement si la vente aboutit.`;
