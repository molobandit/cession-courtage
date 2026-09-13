/**
 * Adaptateurs réellement branchés.
 *
 * Une clé dans l’environnement ne suffit pas : sans adaptateur, afficher
 * « Circuit actif » ferait croire qu’un euro ou une signature part chez le
 * prestataire. Stripe a un adaptateur. Les autres restent en enregistrement
 * local jusqu’à implémentation de l’API.
 */
export const PARTNER_ADAPTERS = {
  stripe: true,
  trustap: false,
  yousign: false,
  docusign: false,
  identity: false,
  financing: false,
} as const;
