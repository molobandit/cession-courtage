import { GROWTH_PLAN_ANNUAL_EUR } from "@/lib/billing/rates";

/** Marque affichée. */
export { BRAND_NAME } from "@/lib/site";

/** Dénomination sociale indiquée dans le brief. */
export const COMPANY_LEGAL_NAME = "Le marché du portefeuille";

export const HERO_HEADLINE = "Prenez position.";
export const HERO_HEADLINE_REST = "Achetez ou vendez votre portefeuille d’assurance.";
export const HERO_TITLE = `${HERO_HEADLINE} ${HERO_HEADLINE_REST}`;

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

export const SALE_SPEED_CLAIM = "Nos portefeuilles sont vendus en moyenne en moins d’une semaine.";

export const ACCESS_PRICE_LINE = `${GROWTH_PLAN_ANNUAL_EUR.toLocaleString("fr-FR")} € HT / an`;

export const SELL_PILLARS = [
  {
    title: "Valorisation",
    body: "Une évaluation du portefeuille pour vous positionner au juste prix du marché.",
  },
  {
    title: "Acheteurs qualifiés",
    body: "Mise en relation avec des acquéreurs sérieux et sélectionnés, dont la capacité financière est vérifiée, afin d’éviter les démarches inutiles et les pertes de temps.",
  },
  {
    title: "Rapidité",
    body: `${SALE_SPEED_CLAIM}*`,
  },
  {
    title: "Sécurité",
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
  "Accès illimité aux portefeuilles disponibles à l’achat.",
  "L’abonnement donne accès de manière illimitée aux opportunités disponibles sur la plateforme pendant la durée de l’abonnement.",
] as const;
