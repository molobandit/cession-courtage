import { INTEREST_DEPOSIT_LABEL } from "@/lib/billing/rates";

export const PAYMENT_FAQ: { q: string; a: string }[] = [
  {
    q: "Pourquoi un dépôt avant de voir qui vend ?",
    a: `Le dépôt de ${INTEREST_DEPOSIT_LABEL} du prix demandé sert d’engagement. Il protège le cédant contre une curiosité sans suite. Si la vente se conclut, ce montant s’impute sur le prix à consigner. Il n’est pas un honoraire de la plateforme.`,
  },
  {
    q: "Où va l’argent du prix de vente ?",
    a: "Pas sur les comptes de La bourse du portefeuille. Le prix est conçu pour transiter par Trustap, le séquestre. Quatre cinquièmes partent à la signature. Le cinquième restant sort après le transfert et le contrôle de conservation. Tant que le contrat Trustap n’est pas validé, l’étape est enregistrée sur le dossier sans mouvement réel.",
  },
  {
    q: "À quoi sert Stripe alors ?",
    a: "Stripe règle l’abonnement annuel qui ouvre le contact et les messages. C’est le droit d’accès au marché, pas le prix du portefeuille. Les deux circuits sont séparés exprès : un incident sur l’abonnement ne touche pas la consignation de la cession.",
  },
  {
    q: "Que se passe-t-il si la cession s’arrête ?",
    a: "Le solde encore consigné revient à l’acquéreur. Un dépôt d’intérêt peut rester dû selon l’état du dossier, par exemple si l’engagement a déjà ouvert l’identité du cédant. Les honoraires de cession ne sont dus que si la vente aboutit, pour l’option vérifiée.",
  },
  {
    q: "La signature sur le dossier est-elle déjà opposable ?",
    a: "Le parcours appelle Yousign, ou DocuSign si ce rail est choisi. Une signature électronique n’a la force prévue par le règlement européen qu’une fois le contrat prestataire validé. Avant cela, le bouton enregistre le consentement sur la plateforme, sans se présenter comme une signature qualifiée.",
  },
  {
    q: "Qui vérifie que j’existe vraiment ?",
    a: "L’ORIAS à l’inscription. Puis, avant l’acte, une vérification d’identité du cabinet et du représentant. Le prestataire de conformité sera branché à la validation du contrat. Les noms d’assurés n’entrent jamais dans ce contrôle.",
  },
  {
    q: "Puis-je emprunter pour acheter ?",
    a: "Oui, via un courtier en financement professionnel, dès que ce partenaire sera validé. En attendant, un entretien avec un conseiller aide à cadrer l’apport. Le prêt, une fois obtenu, alimente le séquestre. Il ne le remplace pas.",
  },
];
