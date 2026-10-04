import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DeskPageHeader } from "@/components/app/desk";
import { OfferChat } from "@/components/chat/offer-chat";
import { DealJournal, DealProcessPanel, RoomDocsList } from "@/components/deal/deal-process-panel";
import { PieceUpload, RemovePiece } from "@/components/deal/process-forms";
import { SalePipeline } from "@/components/deal/sale-pipeline";
import { PartnerStrip } from "@/components/partners/partner-grid";
import { SectionTab, SectionTabs } from "@/components/ui/section-tabs";
import { counterpartyDisplayName, findMyDeal, getActor, isOriasVerified } from "@/lib/authz";
import { dealPieces } from "@/lib/deal/pieces";
import { ESCROW_UPFRONT_SHARE, pipelineProgressPercent } from "@/lib/deal/pipeline";
import { currentPrice, revisionPending, stageTasks, tasksFor, type Side } from "@/lib/deal/process";
import { escrowAmountAfterDeposit } from "@/lib/billing/deposit-fate";
import { loadDealProcess } from "@/lib/deal/process-load";
import { formatDate, formatDateTime, formatEuro } from "@/lib/format/fr";
import { DEAL_STAGE_LABELS, ESCROW_STAGE_LABELS } from "@/lib/labels";
import { escrowRailLive, presentPartners } from "@/lib/partners/status";

export const metadata = { title: "Dossier" };

const lien = "font-medium text-indigo-dark underline-offset-2 hover:underline";

export default async function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await getActor();
  if (!actor) redirect("/connexion");
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");
  const { id } = await params;
  const deal = await findMyDeal(id, actor);
  if (!deal) notFound();
  const p = await loadDealProcess(deal.id);
  if (!p) notFound();

  // Un dossier ouvert sous l'ancien parcours s'affiche à l'étape qui regroupe la sienne.
  const etape = p.snapshot.stage;
  const isSeller = deal.sellerId === actor.id;
  const side: Side = isSeller ? "seller" : "buyer";
  const counterparty = isSeller ? deal.buyer : deal.seller;
  const counterpartyLabel = counterpartyDisplayName(counterparty);
  const agreed = Number(p.deal.agreedPrice);
  // Avant la signature, le prix n'est pas figé : un ancien dossier garde en base
  // la part comptant de l'ancien parcours, alors que le séquestre recevra le prix entier.
  const upfront =
    p.snapshot.stage === "DATA_ROOM"
      ? Math.round((revisionPending(p.snapshot) ? agreed : currentPrice(p.snapshot)) * ESCROW_UPFRONT_SHARE * 100) / 100
      : Number(p.deal.upfrontAmount);
  const depot = Number(p.deal.listing.deposits.find((d) => d.buyerId === p.deal.buyerId)?.amount ?? 0);
  const auSequestre = escrowAmountAfterDeposit(upfront, depot);

  const suivi = tasksFor(p.snapshot, side);
  const tasks = stageTasks(p.snapshot);
  const titre =
    deal.stage === "CLOSED"
      ? "Cession close"
      : suivi.mine[0]
        ? suivi.mine[0].label
        : suivi.waiting.length
          ? `En attente ${suivi.waiting.every((t) => t.owner === "seller") ? "du cédant" : suivi.waiting.every((t) => t.owner === "buyer") ? "de l’acquéreur" : "des deux parties"}`
          : DEAL_STAGE_LABELS[etape];

  const pieces = dealPieces({ stage: deal.stage, carriers: p.carriers });
  const autres = p.deal.documents.filter((d) => d.slot === "other");
  const views = deal.dataRoomViews;
  const nomDoc = new Map([...p.deal.documents, ...p.deal.listing.companyDocuments].map((d) => [d.id, d.fileName]));

  const parcours = (
    <div className="grid gap-6">
      <DealProcessPanel p={p} side={side} escrowLive={escrowRailLive()} />
      <SalePipeline currentKey={etape} />
      <DealJournal p={p} />
      <PartnerStrip partners={presentPartners()} />
    </div>
  );

  const informations = (
    <section className="rounded-3xl border border-line bg-paper p-6">
      <h2 className="text-lg font-semibold text-ink">Informations du dossier</h2>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-[12px] uppercase tracking-wide text-muted">Annonce</dt>
          <dd className="mt-1">
            <Link href={`/annonces/${deal.listing.publicNumber}`} className={lien}>
              Dossier n° {deal.listing.publicNumber}
            </Link>
          </dd>
        </div>
        <div>
          <dt className="text-[12px] uppercase tracking-wide text-muted">Contrepartie</dt>
          <dd className="mt-1 text-[15px] text-ink">{counterpartyLabel}</dd>
        </div>
        <div>
          <dt className="text-[12px] uppercase tracking-wide text-muted">Montant convenu</dt>
          <dd className="tabular mt-1 text-[15px] font-semibold">{formatEuro(agreed)}</dd>
        </div>
        <div>
          <dt className="text-[12px] uppercase tracking-wide text-muted">Date d’effet</dt>
          <dd className="mt-1 text-[15px] font-semibold">{p.deal.loiEffectiveDate ? formatDate(p.deal.loiEffectiveDate) : "Fixée au contrat"}</dd>
        </div>
        <div>
          <dt className="text-[12px] uppercase tracking-wide text-muted">Montant à sécuriser</dt>
          <dd className="tabular mt-1 text-[15px] font-semibold">{formatEuro(auSequestre)}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-[12px] uppercase tracking-wide text-muted">Compagnies cédées</dt>
          <dd className="mt-1 text-[15px] text-ink">
            {p.carriers.length ? p.carriers.map((c) => (c.code ? `${c.name} (${c.code})` : c.name)).join(", ") : "Aucune"}
          </dd>
        </div>
        {p.deal.adjustedDeferredAmount ? (
          <div>
            <dt className="text-[12px] uppercase tracking-wide text-muted">Solde ajusté</dt>
            <dd className="tabular mt-1 text-[15px] font-semibold">{formatEuro(Number(p.deal.adjustedDeferredAmount))}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );

  const canUpload = deal.stage !== "CLOSED";

  const documents = (
    <div className="grid gap-6">
      <section className="rounded-3xl border border-line bg-paper p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Pièces du dossier</h2>
        <p className="mt-1 text-[14px] text-muted">Rédigées à partir du dossier, signées électroniquement, prêtes à imprimer.</p>
        <ul className="mt-3 divide-y divide-line">
          {pieces.map((piece) => (
            <li key={piece.key} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <p className="text-[14px] font-medium text-ink">{piece.title}</p>
                <p className="text-[13px] text-muted">{piece.hint}</p>
              </div>
              {piece.available ? (
                <Link href={`/app/dossiers/${deal.id}/pieces/${piece.key}`} className={`text-[14px] ${lien}`}>
                  Ouvrir
                </Link>
              ) : (
                <span className="text-[13px] text-muted">Pas encore disponible</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl border border-line bg-paper p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Pièces du cabinet cédant</h2>
        <p className="mt-1 text-[14px] text-muted">
          Déposées sur l’annonce, communes à tout acquéreur du portefeuille. Chaque ouverture par l’acquéreur est journalisée.
        </p>
        <a
          href={`/annonces/${deal.listing.publicNumber}/cabinet`}
          className="mt-3 flex items-center gap-3 rounded-xl border border-indigo-line bg-indigo-soft px-3 py-2.5 hover:border-indigo"
        >
          <span className="flex h-9 w-7 shrink-0 items-center justify-center rounded bg-indigo text-[9px] font-bold text-white">PDF</span>
          <span className="flex-1 text-[14px] font-semibold text-ink">Présentation détaillée du cabinet</span>
          <span className="text-[13px] font-semibold text-indigo-dark">Ouvrir</span>
        </a>
        <div className="mt-3">
          <RoomDocsList p={p} canUpload={isSeller && canUpload} />
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-paper p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Pièces complémentaires</h2>
        <p className="mt-1 text-[14px] text-muted">Tout document demandé en plus, par l’une ou l’autre partie.</p>
        {autres.length ? (
          <ul className="mt-3 divide-y divide-line">
            {autres.map((doc) => (
              <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-[14px]">
                <a href={`/api/dossiers/${deal.id}/${doc.id}`} target="_blank" rel="noreferrer" className={lien}>
                  {doc.fileName}
                </a>
                <span className="flex items-center gap-3 text-[13px] text-muted">
                  {doc.uploadedById === deal.sellerId ? "Cédant" : "Acquéreur"} · {formatDate(doc.createdAt)}
                  {canUpload && doc.uploadedById === actor.id ? <RemovePiece dealId={deal.id} documentId={doc.id} /> : null}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-[14px] text-muted">Aucune pièce complémentaire.</p>
        )}
        {canUpload ? (
          <div className="mt-3">
            <PieceUpload dealId={deal.id} slot="other" />
          </div>
        ) : null}
      </section>

      {views.length > 0 ? (
        <section className="rounded-3xl border border-line bg-paper p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-ink">Journal de consultation</h2>
          <ul className="mt-2 divide-y divide-line text-[13px]">
            {views.map((view) => (
              <li key={view.id} className="flex flex-wrap gap-x-4 py-1.5">
                <span className="tabular w-36 text-muted">{formatDateTime(view.viewedAt)}</span>
                <span className="text-ink">
                  {view.viewerId === deal.sellerId ? "Le cédant" : "L’acquéreur"} a ouvert{" "}
                  {view.documentId ? (nomDoc.get(view.documentId) ?? "une pièce retirée depuis") : "la salle de données"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );

  const messages = (
    <section id="echanges">
      <h2 className="text-lg font-semibold text-ink">Échanges</h2>
      <p className="mt-1 text-[14px] text-muted">
        Les numéros de portable sont bloqués. La négociation reste sur la plateforme.
      </p>
      <div className="mt-3">
        <OfferChat
          dealId={deal.id}
          actorId={actor.id}
          messages={deal.messages.map((message) => ({
            id: message.id,
            body: message.body,
            createdLabel: formatDateTime(message.createdAt),
            senderId: message.senderId,
            senderAlias: message.senderLabel,
          }))}
        />
      </div>
    </section>
  );

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
      <DeskPageHeader
        back={{ href: isSeller ? "/app/cessions" : "/app/achats", label: isSeller ? "Mes cessions" : "Mes achats" }}
        kicker={isSeller ? "Dossier de cession" : "Dossier d’acquisition"}
        badge={
          <span className="rounded-full border border-indigo-line bg-paper px-2.5 py-0.5 text-[12px] font-semibold text-indigo-dark">
            {DEAL_STAGE_LABELS[etape]}
            {tasks.length ? ` · ${suivi.done}/${suivi.total}` : ""}
          </span>
        }
        title={`Dossier N° ${deal.listing.publicNumber} · ${titre}`}
        subtitle={
          <>
            Contrepartie : {counterpartyLabel}.{" "}
            {suivi.mine.length
              ? `${suivi.mine.length} action${suivi.mine.length > 1 ? "s" : ""} vous attend${suivi.mine.length > 1 ? "ent" : ""} à cette étape.`
              : deal.stage === "CLOSED"
                ? "Toutes les pièces restent consultables."
                : "Rien à faire de votre côté pour l’instant : vous serez prévenu dès que l’autre partie aura agi."}
          </>
        }
        progress={{ percent: pipelineProgressPercent(etape), tone: deal.stage === "CLOSED" ? "closed" : "active" }}
        figures={[
          { label: "Montant convenu", value: formatEuro(agreed) },
          { label: "Dans le trust", value: formatEuro(auSequestre), note: depot > 0 ? `Dépôt de positionnement de ${formatEuro(depot)} déduit` : "Montant convenu entier" },
          { label: "Versement au cédant", value: "Accord des compagnies", note: "Après la signature" },
          { label: "Transaction", value: ESCROW_STAGE_LABELS[deal.escrowStage as keyof typeof ESCROW_STAGE_LABELS] ?? deal.escrowStage },
        ]}
        actions={
          <Link
            href={`/annonces/${deal.listing.publicNumber}`}
            className="inline-flex h-10 items-center rounded-full border border-indigo bg-paper px-4 text-[14px] font-semibold !text-indigo-dark hover:bg-indigo-soft"
          >
            Voir la fiche
          </Link>
        }
      />

      <div className="mt-6">
        <SectionTabs defaultId="parcours">
          <SectionTab id="parcours" label="Parcours">
            {parcours}
          </SectionTab>
          <SectionTab id="documents" label="Documents">
            {documents}
          </SectionTab>
          <SectionTab id="informations" label="Informations">
            {informations}
          </SectionTab>
          <SectionTab id="messages" label="Messages">
            {messages}
          </SectionTab>
        </SectionTabs>
      </div>
    </main>
  );
}
