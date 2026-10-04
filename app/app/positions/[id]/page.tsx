import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DeskPageHeader } from "@/components/app/desk";
import { ToolIcon } from "@/components/app/toolbox";
import { formatMultiple, listingMultiple } from "@/lib/market/indices";
import { OfferChat } from "@/components/chat/offer-chat";
import { DepositForm } from "@/components/listing/deposit-form";
import { getActor, isOriasVerified, listListingMessages } from "@/lib/authz";
import { ownsFirm } from "@/lib/authz/policies";
import { interestDepositFor } from "@/lib/billing/rates";
import { loadEngagementReadiness } from "@/lib/buyer/readiness";
import { nextPipelineAction } from "@/lib/deal/pipeline";
import { formatDateTime } from "@/lib/format/fr";
import { formatEuroWhole } from "@/lib/format/number";
import { CONFIDENTIALITY_POINTS, DEPOSIT_CONSEQUENCES } from "@/lib/copy/market";
import { commissionsCedees, listingLotTotals } from "@/lib/listing/lot-totals";
import { listingAcceptsOffers } from "@/lib/offer/acceptance";
import { loadPosition } from "@/lib/position/load";
import { POSITION_STEPS, positionStepIndex } from "@/lib/position/progress";

export const metadata = { title: "Dossier" };

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
  const { position, deposit, deal, state } = charge;
  const listing = position.listing;

  const estAcheteur = position.buyerId === actor.id;
  const estCedant = ownsFirm(actor, listing.portfolio.firmId);
  if (!estAcheteur && !estCedant) notFound();

  const prix = Number(listing.askingPrice);
  const commissions = commissionsCedees(listing, listing.isPartial ? await listingLotTotals([listing.id]) : new Map());
  const readiness = estAcheteur ? await loadEngagementReadiness(actor, 0, `/app/positions/${position.id}`) : null;
  const courant = positionStepIndex(state);
  const message = estAcheteur ? state.buyerMessage : state.sellerMessage;

  const messagesBruts = await listListingMessages(listing.id, actor);
  // Le cédant lit ici le seul fil de ce candidat, pas celui des autres.
  const messages = estCedant
    ? messagesBruts.filter((m) => m.senderId === position.buyerId || m.recipientId === position.buyerId)
    : messagesBruts;

  let action: React.ReactNode = null;
  if (estAcheteur && (state.key === "POSITION" || state.key === "DEPOSIT") && !deal) {
    const depot = interestDepositFor(prix);
    action = listingAcceptsOffers(listing.status) ? (
      <div className="mt-5 grid gap-4">
        <section className="rounded-2xl border border-line bg-surface p-5">
          <h3 className="text-[15px] font-semibold text-ink">Avant de vous positionner</h3>
          <ul className="mt-3 grid gap-2 text-[14px] text-ink">
            <li>
              {readiness?.financing.ok ? "✓" : "○"} Capacité financière justifiée
              {readiness?.financing.ok ? null : (
                <>
                  {" · "}
                  <Link href="/app/profil#capacite" className="font-medium text-indigo-dark hover:underline">
                    la déclarer
                  </Link>
                </>
              )}
            </li>
            <li>
              {readiness?.agreements ? "✓" : "○"} Engagement de confidentialité :{" "}
              {CONFIDENTIALITY_POINTS.map((point) => point.title.toLowerCase()).join(", ")}
              {readiness?.agreements ? null : (
                <>
                  {" · "}
                  <Link href="/app/engagements" className="font-medium text-indigo-dark hover:underline">
                    signer
                  </Link>
                </>
              )}
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-indigo-line bg-indigo-soft/60 p-5">
          <h3 className="text-[15px] font-semibold text-ink">Ce qui se passe quand vous versez le dépôt</h3>
          <ol className="mt-2 grid gap-1 text-[14px] leading-relaxed text-ink">
            {DEPOSIT_CONSEQUENCES.map((suite, index) => (
              <li key={suite}>
                {index + 1}. {suite}
              </li>
            ))}
          </ol>
          <DepositForm
            listingId={listing.id}
            publicNumber={listing.publicNumber}
            amountLabel={formatEuroWhole(depot)}
            amountEur={depot}
            listingAmountLabel={formatEuroWhole(prix)}
            readiness={readiness!}
            rappelPrerequis={false}
          />
        </section>
      </div>
    ) : null;
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
      <DeskPageHeader
        back={{ href: estAcheteur ? "/app/achats" : "/app/cessions", label: estAcheteur ? "Mes achats" : "Mes ventes" }}
        kicker={estAcheteur ? "Se positionner" : `Acquéreur ${position.buyer.publicAlias}`}
        badge={<span className="text-[13px] text-muted">pris le {formatDateTime(position.createdAt)}</span>}
        title={`Dossier n° ${listing.publicNumber} · ${state.title}`}
        progress={{
          percent: state.percent,
          tone: state.outcome === "closed" ? "closed" : state.outcome === "lost" || state.outcome === "withdrawn" ? "lost" : "active",
        }}
        figures={[
          { label: "Montant", value: formatEuroWhole(prix) },
          { label: "Commissions / an", value: formatEuroWhole(commissions) },
          {
            label: "Multiple",
            value: formatMultiple(listingMultiple(prix, commissions)),
            note: "Montant ÷ commissions",
          },
          deal
            ? { label: "Montant de l’annonce", value: formatEuroWhole(Number(deal.agreedPrice)), accent: true }
            : {
                label: "Dépôt de positionnement",
                value: deposit ? formatEuroWhole(Number(deposit.amount)) : formatEuroWhole(interestDepositFor(prix)),
                note: deposit ? "versé" : "2,5 % du montant",
              },
        ]}
      />

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
            Messagerie sécurisée
          </h2>
          <p className="mt-1 text-[13px] text-muted">
            {estAcheteur ? "Vos questions ne sont visibles que du cédant." : "Ce fil n’est visible que de vous et de cet acquéreur."}
          </p>
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
                <dt className="text-muted">Montant</dt>
                <dd className="tabular font-semibold text-ink">{formatEuroWhole(prix)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Commissions / an</dt>
                <dd className="tabular text-ink">{formatEuroWhole(commissions)}</dd>
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
            <h2 className="text-[15px] font-semibold text-ink">Les quatre étapes</h2>
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
