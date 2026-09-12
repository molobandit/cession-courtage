/**
 * Carte d'essai Stripe.
 *
 * Ce numéro est publié par Stripe dans sa documentation : il n'appartient à
 * personne, ne correspond à aucun compte bancaire et n'est accepté qu'en mode
 * essai. Le garder ici plutôt que dans un fichier de notes évite qu'il circule
 * en copie approximative, et permet de l'afficher au moment précis où la
 * personne en a besoin.
 *
 * Il n'est montré que lorsque la clé est en `sk_test_`. En mode direct, ce
 * numéro est simplement refusé par Stripe.
 */
export const STRIPE_TEST_CARD = {
  /** Visa d'essai, paiement toujours accepté. */
  number: "4242 4242 4242 4242",
  /** N'importe quelle date future convient. */
  expiry: "12 / 34",
  /** N'importe quel cryptogramme à trois chiffres convient. */
  cvc: "123",
} as const;

/**
 * Autres cartes d'essai utiles, pour vérifier que les refus sont bien traités.
 * Une démonstration qui ne montre que le cas heureux ne prouve pas grand-chose.
 */
export const STRIPE_TEST_CARDS_REFUS = [
  { number: "4000 0000 0000 0002", effet: "Paiement refusé par la banque" },
  { number: "4000 0000 0000 9995", effet: "Provision insuffisante" },
  { number: "4000 0025 0000 3155", effet: "Demande une authentification 3D Secure" },
] as const;
