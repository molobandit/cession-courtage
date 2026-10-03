import Link from "next/link";
import { redirect } from "next/navigation";
import { confirmDepositReturn } from "@/lib/billing/deposit-checkout";
import { getActor, isOriasVerified } from "@/lib/authz";

export const metadata = { title: "Dépôt de garantie" };

/**
 * Retour du paiement du dépôt.
 *
 * La session est relue chez le prestataire : le dépôt, puis l'offre saisie avec
 * lui, sont posés si le paiement est accepté. Le webhook fait de même, au cas
 * où le navigateur ne revient pas.
 */
export default async function DepositReturnPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const actor = await getActor();
  if (!actor) redirect("/connexion");
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");
  const { session_id } = await searchParams;
  let suite: { positionId: string } | null = null;
  try {
    suite = session_id ? await confirmDepositReturn(session_id, actor.id) : null;
  } catch (error) {
    console.error("confirmDepositReturn", error);
  }
  if (suite) redirect(`/app/positions/${suite.positionId}`);

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-semibold text-ink">Dépôt en cours de confirmation</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted">
        Le prestataire n’a pas encore confirmé votre dépôt. Dès sa confirmation, votre dépôt et votre offre
        apparaissent dans « Mes achats » et vous êtes prévenu par notification.
      </p>
      <Link href="/app/achats" className="mt-6 inline-flex h-11 items-center rounded-full bg-indigo px-5 text-[15px] font-semibold !text-white hover:bg-indigo-dark">
        Voir mes achats
      </Link>
    </main>
  );
}
