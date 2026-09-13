import { GROWTH_PLAN_ANNUAL_EUR } from "@/lib/billing/rates";

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
  "Cédants, acquéreurs et investisseurs s’y rencontrent pour conclure — sur des dossiers ouverts, chiffrés et vérifiés.";


export const MARKET_HALL = "Salle de marché";
export const MARKET_HALL_TITLE = "Salle de marché — Portefeuilles disponibles";
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
  "Le prix de marché est établi avant la mise en vente",
  "La capacité financière des acquéreurs est vérifiée",
  `Les dossiers certifiés passent ${CERTIFICATION_POINTS_LABEL}`,
  "Les contrats sont contrôlés par nos avocats, le paiement séquestré",
  "Votre nom n’est révélé qu’à un acquéreur qui a engagé un dépôt",
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
export const SELL_TITLE = "Vendez au juste prix, à un acquéreur qui peut payer";
export const SELL_LEDE =
  "Vous avez mis des années à bâtir ce portefeuille. Sa cession ne devrait pas se jouer sur un chiffre lancé au téléphone et la parole d’un inconnu.";
export const SELL_REASSURANCE =
  "Le dépôt est sans frais. Des honoraires ne sont dus que si la vente aboutit.";

export const BUY_KICKER = "Acquéreurs";
export const BUY_TITLE = "Achetez sur pièces, pas sur parole";
export const BUY_LEDE =
  "Un portefeuille certifié a été ouvert, contrôlé et chiffré avant de vous être présenté. Vous savez ce que vous achetez avant de vous engager.";
export const BUY_REASSURANCE =
  "Chaque dossier reste anonyme jusqu’à votre engagement : vous jugez les chiffres, pas une enseigne.";

export const SELL_PILLARS = [
  {
    title: "Le juste prix, établi d’abord",
    body: "Une évaluation du portefeuille pour vous positionner au juste prix du marché.",
  },
  {
    title: "Des acquéreurs dont l’argent est vérifié",
    body: "Mise en relation avec des acquéreurs sérieux et sélectionnés, dont la capacité financière est vérifiée, afin d’éviter les démarches inutiles et les pertes de temps.",
  },
  {
    title: "Une cession qui ne traîne pas",
    body: `${SALE_SPEED_CLAIM}*`,
  },
  {
    title: "Rien ne se règle sans séquestre ni avocat",
    body: "Contrats contrôlés par nos avocats et paiement sécurisé via un Trust. Nous accompagnons la transaction jusqu’au transfert des contrats.",
  },
] as const;

export const BUY_POINTS = [
  `Accès à des portefeuilles certifiés avec ${CERTIFICATION_POINTS_LABEL}.`,
  "Valorisation indépendante du portefeuille pour vérifier la cohérence du prix demandé.",
  "Accès aux informations essentielles avant de se positionner.",
  "Contrôle juridique des contrats par nos avocats.",
  "Paiement sécurisé via un Trust.",
  "Accompagnement de la transaction jusqu’au transfert effectif des contrats.",
  "Processus encadré permettant de réduire le risque transactionnel.",
] as const;

export const ACCESS_MARKET_POINTS = [
  "Accès à toutes les opportunités de portefeuille.",
  "Évaluation de votre portefeuille.",
  "Encadrement de la transaction de A à Z.",
] as const;
