import { BRAND_NAME } from "@/lib/site";
import { ACCESS_PRICE_LINE, MARKET_ACCESS, NO_FEE_LABEL } from "@/lib/copy/market";

export const AUDIENCE_ONE_LINER =
  "Salle de marché pour céder, acquérir ou prendre position sur un portefeuille d’assurance.";

export const AUDIENCE_FOOTER = `${AUDIENCE_ONE_LINER} ${MARKET_ACCESS} : ${ACCESS_PRICE_LINE}. Mettre en vente : ${NO_FEE_LABEL.toLowerCase()}.`;

export const SIGNUP_WHO_CAN =
  "Vous pouvez vendre, rechercher un portefeuille ou vous inscrire comme investisseur. Les cédants et acquéreurs professionnels justifient de leur immatriculation avant l’espace membre.";

export const HOME_FAQ = [
  {
    q: "Qui peut prendre position ?",
    a: SIGNUP_WHO_CAN,
  },
  {
    q: "Que donne l’accès au marché ?",
    a: `Pour ${ACCESS_PRICE_LINE}, accès illimité aux portefeuilles disponibles à l’achat pendant la durée de l’abonnement.`,
  },
  {
    q: `Que signifie « ${NO_FEE_LABEL.toLowerCase()} » pour vendre ?`,
    a: `Déposer un portefeuille se fait ${NO_FEE_LABEL.toLowerCase()}. ${BRAND_NAME} facture l’accès au marché pour consulter et se positionner, et des honoraires seulement si vous choisissez l’option certifiée à la vente conclue.`,
  },
];
