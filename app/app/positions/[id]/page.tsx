import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ToolIcon } from "@/components/app/toolbox";
import { OfferChat } from "@/components/chat/offer-chat";
import { DepositForm } from "@/components/listing/deposit-form";
import { AcceptOfferButton, SubmitOfferForm, WithdrawOfferButton } from "@/components/offer/offer-forms";
import { getActor, isOriasVerified, listListingMessages } from "@/lib/authz";
import { isOfferWindowSealed, ownsFirm } from "@/lib/authz/policies";
import { interestDepositFor } from "@/lib/billing/rates";
import { nextPipelineAction } from "@/lib/deal/pipeline";
import { formatDateTime } from "@/lib/format/fr";
import { formatEuroWhole } from "@/lib/format/number";
import { lotAvailability } from "@/lib/listing/lot-availability";
import { listingAcceptsOffers } from "@/lib/offer/acceptance";
import { loadPosition } from "@/lib/position/load";
import { POSITION_STEPS, positionStepIndex } from "@/lib/position/progress";

export const metadata = { title: "Dossier" };

const dateLongue = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" });

/**
 * Le dossier d'une prise de position, pour ses deux parties.
 *
 * Même page pour l'acquéreur et le cédant, comme un dossier partagé : en tête
 * l'étape et l'avancement, au centre ce qu'il y a à faire maintenant, puis la
 * frise complète et la messagerie. On ne quitte cette page que pour le dossier
 * de cession, une fois l'offre retenue.
 */
export default async function PositionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await getActor();
  if (!actor) redirect(`/connexion?next=/app/positions/${id}`);
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");

  const charge = await loadPosition(id);
  if (!charge) notFound();
  const { position, deposit, offer, deal, state } = charge;
  const listing = position.listing;

  const estAcheteur = position.buyerId === actor.id;
  const estCedant = ownsFirm(actor, listing.portfolio.firmId);
  if (!estAcheteur && !estCedant) notFound();

  const prix = Number(listing.askingPrice);
  const scelle = isOfferWindowSealed(listing);
  const courant = positionStepIndex(state);
  const message = estAcheteur ? state.buyerMessage : state.sellerMessage;

  const [lots, messagesBruts] = await Promise.all([
    estAcheteur && state.key === "DEPOSIT" ? lotAvailability(listing.id) : Promise.resolve(null),
    listListingMessages(listing.id, actor),
  ]);
  // Le cédant lit ici le seul fil de ce candidat, pas celui des autres.
  const messages = estCedant
    ? messagesBruts.filter((m) => m.senderId === position.buyerId || m.recipientId === position.buyerId)
    : messagesBruts;

  let action: React.ReactNode = null;
  if (estAcheteur) {
    if (state.key === "POSITION") {
      action = listingAcceptsOffers(listing.status) ? (
        <DepositForm listingId={listing.id} amountLabel={formatEuroWhole(interestDepositFor(prix))} amountEur={interestDepositFor(prix)} />
      ) : null;
    } else if (state.key === "DEPOSIT" && lots) {
      action = (
        <div className="mt-5">
          <SubmitOfferForm
            listingId={listing.id}
            asking={String(prix)}
            lots={lots.lots}
            availableCarriers={lots.available}
          />
        </div>
      );
    } else if (state.key === "OFFER" && offer) {
      action = (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-4">
          <div>
            <p className="text-[13px] text-muted">Votre offre</p>
            <p className="tabular text-xl font-bold text-ink">{formatEuroWhole(Number(offer.amount))}</p>
            <p className="text-[13px] text-muted">
              {Number(offer.upfrontPercent)} % comptant
              {scelle && listing.offerWindowClosesAt
                ? ` · le cédant découvrira les offres le ${dateLongue.format(listing.offerWindowClosesAt)}`
                : " · transmise au cédant"}
            </p>
          </div>
          <WithdrawOfferButton offerId={offer.id} />
        </div>
      );
    }
  } else if (estCedant && state.key === "OFFER" && offer) {
    action = scelle ? (
      <p className="mt-5 rounded-2xl border border-line bg-surface p-4 text-[15px] text-muted">
        Offre scellée jusqu’à la clôture de la fenêtre
        {listing.offerWindowClosesAt ? `, le ${dateLongue.format(listing.offerWindowClosesAt)}` : ""}. Vous pourrez
        alors la comparer et la retenir.
      </p>
    ) : (
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-4">
        <div>
          <p className="text-[13px] text-muted">Offre de {position.buyer.publicAlias}</p>
          <p className="tabular text-xl font-bold text-ink">{formatEuroWhole(Number(offer.amount))}</p>
          <p className="text-[13px] text-muted">{Number(offer.upfrontPercent)} % comptant</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/app/annonces/${listing.id}/offres`}
            className="inline-flex h-10 items-center rounded-full border border-line px-4 text-[14px] font-medium text-ink hover:bg-surface-alt"
          >
            Comparer les offres
          </Link>
          <div className="min-w-[12rem]">
            <AcceptOfferButton offerId={offer.id} />
          </div>
        </div>
      </div>
    );
  }

  if (deal) {
    const suite = state.outcome === "closed" ? null : nextPipelineAction(deal.stage, estAcheteur ? "buyer" : "seller");
    action = (
      <div className="mt-5 rounded-2xl border border-indigo-line bg-indigo-soft/60 p-4">
        {suite ? (
          <>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-indigo-dark">À faire maintenant</p>
            <p className="mt-1 text-[16px] font-semibold text-ink">{suite.title}</p>
            <p className="mt-1 text-[14px] text-muted">{suite.body}</p>
          </>
        ) : null}
        <Link
          href={`/app/dossiers/${deal.id}`}
          className="mt-4 inline-flex h-11 items-center gap-2 rounded-lg bg-indigo-dark px-5 text-[15px] font-semibold !text-white hover:bg-indigo"
        >
          Ouvrir le dossier de cession
          <ToolIcon name="arrow-right" className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  if (state.outcome === "lost" && estAcheteur) {
    action = (
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/app" className="inline-flex h-11 items-center rounded-lg bg-indigo-dark px-5 text-[15px] font-semibold !text-white">
          Tableau de bord
        </Link>
        <Link href="/annonces" className="inline-flex h-11 items-center rounded-lg border border-line px-5 text-[15px] font-medium text-ink">
          Autres portefeuilles
        </Link>
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href={estAcheteur ? "/app/achats" : "/app/cessions"}
        className="inline-flex items-center gap-2 text-[14px] text-muted hover:text-ink"
      >
        <ToolIcon name="arrow-left" className="h-4 w-4" />
        {estAcheteur ? "Mes achats" : "Mes cessions"}
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-muted">
            {estAcheteur ? "Position Acheteur" : `Candidat ${position.buyer.publicAlias}`} · pris le{" "}
            {formatDateTime(position.createdAt)}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-[28px]">
            Dossier N° {listing.publicNumber} — {state.title}
          </h1>
        </div>
        <div className="w-full sm:w-72">
          <div
            className="relative h-6 overflow-hidden rounded-full bg-surface-alt"
            role="progressbar"
            aria-valuenow={state.percent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={`h-full rounded-full ${state.outcome === "lost" ? "bg-muted/40" : "bg-indigo-dark"}`}
              style={{ width: `${Math.max(state.percent, 6)}%` }}
            />
            <span
              className={`tabular absolute inset-0 flex items-center justify-center text-[12px] font-bold ${
                state.percent >= 55 && state.outcome !== "lost" ? "text-white" : "text-ink"
              }`}
            >
              {state.percent}%
            </span>
          </div>
        </div>
      </header>

      <section
        className={`mt-6 rounded-2xl border p-6 shadow-sm ${
          state.outcome === "lost" ? "border-line bg-paper text-center" : "border-line bg-paper"
        }`}
      >
        <p className={`text-[16px] leading-relaxed text-ink ${state.outcome === "lost" ? "mx-auto max-w-xl" : ""}`}>
          {message}
        </p>
        {state.waitingFor === (estAcheteur ? "seller" : "buyer") ? (
          <p className="mt-2 text-[13px] text-muted">
            En attente de {estAcheteur ? "la réponse du cédant" : "l’acquéreur"}. Vous êtes prévenu par notification dès
            qu’il agit.
          </p>
        ) : null}
        {action}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <section className="rounded-2xl border border-line bg-paper p-5 shadow-sm" aria-labelledby="messages">
          <h2 id="messages" className="flex items-center gap-2 text-[17px] font-semibold text-ink">
            <ToolIcon name="doc" className="h-5 w-5 text-indigo" />
            Messages
          </h2>
          <div className="mt-4">
            <OfferChat
              listingId={listing.id}
              actorId={actor.id}
              recipients={estCedant ? [{ id: position.buyer.id, publicAlias: position.buyer.publicAlias }] : undefined}
              messages={messages.map((m) => ({
                id: m.id,
                body: m.body,
                createdLabel: formatDateTime(m.createdAt),
                senderId: m.senderId,
                senderAlias: m.sender.publicAlias,
              }))}
            />
          </div>
        </section>

        <aside className="grid h-fit gap-4">
          <section className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
            <h2 className="text-[15px] font-semibold text-ink">Portefeuille</h2>
            <dl className="mt-3 grid gap-2 text-[14px]">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Prix demandé</dt>
                <dd className="tabular font-semibold text-ink">{formatEuroWhole(prix)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Commissions / an</dt>
                <dd className="tabular text-ink">{formatEuroWhole(Number(listing.portfolio.annualCommissions))}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Zone</dt>
                <dd className="text-right text-ink">{listing.displayedZone}</dd>
              </div>
              {deposit ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Dépôt versé</dt>
                  <dd className="tabular text-ink">{formatEuroWhole(Number(deposit.amount))}</dd>
                </div>
              ) : null}
            </dl>
            <Link
              href={`/annonces/${listing.publicNumber}`}
              className="mt-4 inline-flex text-[14px] font-medium text-indigo-dark hover:underline"
            >
              Voir la fiche complète
            </Link>
          </section>

          <section className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
            <h2 className="text-[15px] font-semibold text-ink">Étapes jusqu’à la clôture</h2>
            <ol className="mt-3 grid gap-1.5">
              {POSITION_STEPS.map((step, index) => {
                const fait = courant >= 0 && index < courant;
                const ici = index === courant;
                return (
                  <li key={step.key} className="flex items-center gap-2.5 text-[13px]">
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        fait ? "bg-ok text-white" : ici ? "bg-indigo-dark text-white" : "bg-surface-alt text-muted"
                      }`}
                    >
                      {fait ? "✓" : index + 1}
                    </span>
                    <span className={ici ? "font-semibold text-ink" : fait ? "text-muted" : "text-ink/80"}>
                      {step.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>
        </aside>
      </div>
    </main>
  );
}
