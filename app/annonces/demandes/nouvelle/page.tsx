import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SubscribeButton } from "@/components/billing/subscribe-button";
import { MandateForm } from "@/components/mandate/mandate-form";
import { canBuy, getActor, isOriasVerified } from "@/lib/authz";
import { hasContactSubscription } from "@/lib/billing/contact-access";
import { ACCESS_PRICE_LINE } from "@/lib/copy/market";
import { ACQUISITION_REQUEST_PATH } from "@/lib/nav/acquisition";

export const metadata: Metadata = {
  title: "Déposer une demande d’acquisition",
  alternates: { canonical: ACQUISITION_REQUEST_PATH },
};

export default async function NewAcquisitionRequestPage() {
  const actor = await getActor();
  if (!actor) {
    redirect(`/connexion?next=${encodeURIComponent(ACQUISITION_REQUEST_PATH)}`);
  }
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");
  if (!canBuy(actor)) redirect("/app");

  const subscribed = await hasContactSubscription(actor);
  if (!subscribed) {
    return (
      <main className="mx-auto max-w-xl px-4 py-14">
        <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-indigo">
          Accès au marché
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink">
          L’accès au marché ouvre le dépôt d’une demande
        </h1>
        <p className="mt-4 text-[16px] leading-relaxed text-muted">
          L’accès au marché, {ACCESS_PRICE_LINE}, ouvre le dépôt d’une demande
          d’acquisition. Après le règlement, vous revenez sur ce formulaire.
        </p>
        <SubscribeButton
          className="mt-8"
          label={`Régler ${ACCESS_PRICE_LINE}`}
          next={ACQUISITION_REQUEST_PATH}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-14">
      <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-indigo">
        Acquéreur
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        Déposer une demande d’acquisition
      </h1>
      <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-muted">
        Décrivez le portefeuille recherché. La demande est publiée sous alias,
        sans raison sociale. Un cédant correspondant pourra vous trouver.
      </p>
      <div className="mt-8 rounded-[1.75rem] border border-line bg-paper p-6 sm:p-8">
        <MandateForm publish submitLabel="Publier ma demande d’acquisition" />
      </div>
    </main>
  );
}
