import Link from "next/link";
import { MemberPageHeader } from "@/components/app/member-page-header";
import { Pill } from "@/components/app/dashboard-cards";
import { AcceptOfferButton } from "@/components/offer/offer-forms";
import { formatDate, formatEuro, formatPercent } from "@/lib/format/fr";
import { LISTING_STATUS_LABELS, OFFER_STATUS_LABELS } from "@/lib/labels";
import { barScale, cashSplit, rankOffers, vsAsking } from "@/lib/offer/compare";
import { cn } from "@/lib/utils";
import type { ListingStatus, OfferStatus } from "@prisma/client";

export type ReviewableOffer = {
  id: string;
  amount: number;
  upfrontPercent: number;
  message: string | null;
  status: OfferStatus;
  submittedAt: Date;
  buyer: { publicAlias: string };
};

export type OfferReviewListing = {
  id: string;
  publicNumber: number;
  askingPrice: number;
  displayedZone: string;
  status: ListingStatus;
  offerWindowClosesAt: Date | null;
  annualCommissions: number;
};

function statusTone(status: OfferStatus): "indigo" | "ok" | "warn" | "mute" {
  if (status === "ACCEPTED") return "ok";
  if (status === "SUBMITTED") return "indigo";
  if (status === "DECLINED") return "warn";
  return "mute";
}

function vsAskingCopy(amount: number, asking: number): { label: string; tone: "ok" | "warn" | "mute" } {
  const { delta, ratio } = vsAsking(amount, asking);
  if (Math.abs(delta) < 1) return { label: "Au prix demandé", tone: "ok" };
  if (delta > 0) return { label: `${formatEuro(delta)} au-dessus`, tone: "ok" };
  return {
    label: `${formatEuro(Math.abs(delta))} en dessous · ${formatPercent(ratio * 100, 0)} du demandé`,
    tone: "warn",
  };
}

export function OfferReviewBoard({
  listing,
  offers,
  access,
  canRetain,
}: {
  listing: OfferReviewListing;
  offers: ReviewableOffer[];
  access: "sealed" | "full" | "own";
  canRetain: boolean;
}) {
  const ranked = rankOffers(offers.map((o) => ({ ...o, amount: Number(o.amount) })));
  const submitted = ranked.filter((o) => o.status === "SUBMITTED");
  const best = submitted[0] ?? ranked.find((o) => o.status === "ACCEPTED") ?? null;
  const asking = Number(listing.askingPrice);
  const scale = barScale(asking, ranked.map((o) => o.amount)) * 1.08;
  const askingWidth = (asking / scale) * 100;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-[13px] text-muted">
        <Link href="/app" className="hover:text-ink">
          Tableau de bord
        </Link>
        <span className="mx-1.5">·</span>
        Dossier n° {listing.publicNumber}
      </p>
      <MemberPageHeader title="Comparer les offres">
        Les acquéreurs restent sous alias. Retenir une proposition ouvre un dossier de
        confidentialité et écarte les autres.
      </MemberPageHeader>

      <section className="rounded-[1.75rem] border border-line bg-paper p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Pill>{LISTING_STATUS_LABELS[listing.status]}</Pill>
          <p className="text-[15px] font-semibold text-ink">Dossier n° {listing.publicNumber}</p>
        </div>
        <p className="mt-2 text-[14px] text-muted">{listing.displayedZone}</p>
        <dl className="mt-5 grid gap-4 border-t border-line pt-5 sm:grid-cols-3">
          <div>
            <dt className="text-[12px] text-muted">Prix demandé</dt>
            <dd className="tabular mt-1 text-[20px] font-bold text-ink">{formatEuro(asking)}</dd>
          </div>
          <div>
            <dt className="text-[12px] text-muted">Commissions / an</dt>
            <dd className="tabular mt-1 text-[20px] font-bold text-ink">
              {formatEuro(listing.annualCommissions)}
            </dd>
          </div>
          <div>
            <dt className="text-[12px] text-muted">Fenêtre d’offres</dt>
            <dd className="mt-1 text-[15px] font-medium text-ink">
              {listing.offerWindowClosesAt
                ? access === "sealed"
                  ? `Ouverte jusqu’au ${formatDate(listing.offerWindowClosesAt)}`
                  : `Close depuis le ${formatDate(listing.offerWindowClosesAt)}`
                : "Non ouverte"}
            </dd>
          </div>
        </dl>
        <div className="mt-5 flex flex-wrap gap-4 text-[14px]">
          <Link href={`/annonces/${listing.publicNumber}`} className="font-medium text-indigo-dark hover:underline">
            Fiche publique
          </Link>
          {canRetain ? (
            <Link href={`/app/annonces/${listing.id}`} className="font-medium text-indigo-dark hover:underline">
              Gérer l’annonce
            </Link>
          ) : null}
        </div>
      </section>

      {access === "sealed" ? (
        <section className="mt-6 rounded-[1.75rem] border border-line bg-indigo-soft/60 p-6">
          <h2 className="text-lg font-bold text-ink">Fenêtre encore ouverte</h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
            Les montants, le nombre de propositions et les messages restent masqués jusqu’à la
            clôture, y compris pour vous. Cela place tous les acquéreurs sur un pied d’égalité.
          </p>
        </section>
      ) : ranked.length === 0 ? (
        <section className="mt-6 rounded-[1.75rem] border border-dashed border-line bg-paper p-6">
          <h2 className="text-lg font-bold text-ink">Aucune offre visible</h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
            Aucune proposition n’a été déposée, ou elles ne vous sont pas encore accessibles.
          </p>
        </section>
      ) : (
        <>
          <section className="mt-6" aria-label="Synthèse">
            <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <li className="rounded-[1.25rem] border border-line bg-paper px-4 py-4">
                <p className="tabular text-2xl font-bold text-ink">{ranked.length}</p>
                <p className="mt-1 text-[13px] text-muted">
                  {ranked.length === 1 ? "Proposition" : "Propositions"}
                </p>
              </li>
              <li className="rounded-[1.25rem] border border-line bg-paper px-4 py-4">
                <p className="tabular text-2xl font-bold text-ink">
                  {best ? formatEuro(best.amount) : "Aucun"}
                </p>
                <p className="mt-1 text-[13px] text-muted">Meilleure offre</p>
              </li>
              <li className="rounded-[1.25rem] border border-line bg-paper px-4 py-4">
                <p className="tabular text-2xl font-bold text-ink">
                  {best ? vsAskingCopy(best.amount, asking).label.split(" · ")[0] : "Aucun"}
                </p>
                <p className="mt-1 text-[13px] text-muted">Écart au demandé</p>
              </li>
              <li className="rounded-[1.25rem] border border-line bg-paper px-4 py-4">
                <p className="tabular text-2xl font-bold text-ink">
                  {best ? formatPercent(best.upfrontPercent, 0) : "Aucun"}
                </p>
                <p className="mt-1 text-[13px] text-muted">Comptant, meilleure offre</p>
              </li>
            </ul>
          </section>

          <section className="mt-6 rounded-[1.75rem] border border-line bg-paper p-5 sm:p-6">
            <h2 className="text-lg font-bold tracking-tight text-ink">Positionnement</h2>
            <p className="mt-1 text-[14px] text-muted">
              La ligne verticale marque le prix demandé. Les barres sont à l’échelle de la plus
              haute proposition.
            </p>
            <ul className="mt-5 space-y-3">
              {ranked.map((offer, index) => {
                const width = (offer.amount / scale) * 100;
                const isBest = best?.id === offer.id;
                return (
                  <li key={offer.id}>
                    <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
                      <span className="truncate font-medium text-ink">
                        {offer.buyer.publicAlias}
                        {isBest ? (
                          <span className="ml-2 text-[12px] font-medium text-indigo-dark">Meilleure</span>
                        ) : null}
                      </span>
                      <span className="tabular shrink-0 text-muted">{formatEuro(offer.amount)}</span>
                    </div>
                    <div className="relative h-2.5 overflow-hidden rounded-full bg-surface-alt">
                      <span
                        className={cn(
                          "absolute inset-y-0 left-0 rounded-full",
                          isBest ? "bg-indigo" : "bg-indigo-line",
                        )}
                        style={{ width: `${width}%` }}
                      />
                      <span
                        className="absolute top-[-3px] h-4 w-px bg-ink/70"
                        style={{ left: `${askingWidth}%` }}
                        title="Prix demandé"
                      />
                    </div>
                    {index === 0 ? (
                      <p className="mt-1 text-[11px] text-muted">Repère : prix demandé</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="mt-6 space-y-4" aria-label="Détail des propositions">
            {ranked.map((offer, index) => {
              const split = cashSplit(offer.amount, offer.upfrontPercent);
              const vs = vsAskingCopy(offer.amount, asking);
              const retainable = canRetain && offer.status === "SUBMITTED";
              return (
                <article
                  key={offer.id}
                  className={cn(
                    "rounded-[1.75rem] border bg-paper p-5 sm:p-6",
                    best?.id === offer.id && offer.status === "SUBMITTED"
                      ? "border-indigo shadow-sm"
                      : "border-line",
                  )}
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface-alt text-[13px] font-semibold text-ink">
                          {index + 1}
                        </span>
                        <h3 className="text-[16px] font-semibold text-ink">Acquéreur {offer.buyer.publicAlias}</h3>
                        <Pill tone={statusTone(offer.status)}>{OFFER_STATUS_LABELS[offer.status]}</Pill>
                      </div>
                      <p className="tabular mt-4 text-[28px] font-bold tracking-tight text-ink">
                        {formatEuro(offer.amount)}
                      </p>
                      <p className={cn("mt-1 text-[14px]", vs.tone === "ok" ? "text-ok" : vs.tone === "warn" ? "text-warn" : "text-muted")}>
                        {vs.label}
                      </p>
                      <dl className="mt-5 grid gap-4 sm:grid-cols-3">
                        <div>
                          <dt className="text-[12px] text-muted">Comptant</dt>
                          <dd className="tabular mt-0.5 text-[15px] font-semibold text-ink">
                            {formatEuro(split.cash)} · {formatPercent(offer.upfrontPercent, 0)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[12px] text-muted">Différé</dt>
                          <dd className="tabular mt-0.5 text-[15px] font-semibold text-ink">
                            {formatEuro(split.deferred)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[12px] text-muted">Déposée le</dt>
                          <dd className="mt-0.5 text-[15px] font-medium text-ink">
                            {formatDate(offer.submittedAt)}
                          </dd>
                        </div>
                      </dl>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-alt" aria-hidden="true">
                        <span
                          className="block h-full bg-indigo"
                          style={{ width: `${Math.min(100, offer.upfrontPercent)}%` }}
                        />
                      </div>
                      {offer.message ? (
                        <blockquote className="mt-5 border-l-2 border-indigo-line pl-4 text-[14px] leading-relaxed text-ink/80">
                          {offer.message}
                        </blockquote>
                      ) : null}
                      <p className="mt-4">
                        <Link
                          href={`/app/annonces/${listing.id}#echanges`}
                          className="text-[14px] font-medium text-indigo underline-offset-2 hover:underline"
                        >
                          Échanger dans le chat
                        </Link>
                      </p>
                    </div>
                    {retainable ? (
                      <div className="shrink-0 lg:w-52">
                        <AcceptOfferButton offerId={offer.id} />
                        <p className="mt-2 text-[12px] leading-relaxed text-muted">
                          Ouvre un dossier. Les autres propositions seront écartées.
                        </p>
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </section>
        </>
      )}
    </main>
  );
}
