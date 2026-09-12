import { STRIPE_TEST_CARD } from "@/lib/billing/test-card";

/**
 * Bandeau du mode essai, affiché près du bouton de paiement.
 *
 * Deux raisons de le montrer plutôt que de le documenter ailleurs. D'abord
 * personne ne doit croire, pendant une démonstration, qu'un vrai paiement vient
 * d'avoir lieu. Ensuite celui qui essaie a besoin du numéro de carte à l'instant
 * où il le tape : aller le chercher dans un fichier casse l'essai.
 *
 * Il ne s'affiche jamais en mode direct — c'est la page appelante qui décide.
 */
export function TestModeNotice() {
  return (
    <div className="mt-4 rounded-xl border border-line bg-surface-alt px-4 py-3 text-left">
      <p className="text-[13px] font-semibold text-ink">
        Mode essai · aucun paiement réel
      </p>
      <p className="mt-1 text-[13px] leading-relaxed text-muted">
        Payez avec la carte de test{" "}
        <span className="tabular font-semibold text-ink">{STRIPE_TEST_CARD.number}</span>, une date
        d’expiration future ({STRIPE_TEST_CARD.expiry}), n’importe quel cryptogramme (
        {STRIPE_TEST_CARD.cvc}) et n’importe quel code postal. Aucune somme n’est débitée.
      </p>
    </div>
  );
}
