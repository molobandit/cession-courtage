import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  CloseDealButton,
  ConfirmSignatureButton,
  ConfirmTransferButton,
  DataRoomUpload,
  EscrowButtons,
  KycButton,
  MarkDocumentViewedButton,
  NdaButton,
  SignDocButton,
  SignLoiButton,
  ValidateDeedButton,
} from "@/components/deal/deal-forms";
import { SalePipeline } from "@/components/deal/sale-pipeline";
import { OfferChat } from "@/components/chat/offer-chat";
import { SectionTab, SectionTabs } from "@/components/ui/section-tabs";
import { counterpartyDisplayName, findMyDeal, getActor, isOriasVerified } from "@/lib/authz";
import { formatDate, formatDateTime, formatEuro } from "@/lib/format/fr";
import { DEAL_STAGE_LABELS, ESCROW_STAGE_LABELS } from "@/lib/labels";
import { isStageAtLeast } from "@/lib/authz/policies";
import { DueDiligencePanel } from "@/components/deal/due-diligence-panel";
import { checklistProgress, type DueDiligenceCategory } from "@/lib/deal/due-diligence";
import { nextPipelineAction } from "@/lib/deal/pipeline";
import { ensureDealChecklist } from "@/lib/deal/seed-checklist";
import { PartnerStrip } from "@/components/partners/partner-grid";
import { escrowRailLive, presentPartners, signatureProvider, signatureRailLive } from "@/lib/partners/status";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Dossier" };

export default async function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await getActor();
  if (!actor) redirect("/connexion");
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");
  const { id } = await params;
  const deal = await findMyDeal(id, actor);
  if (!deal) notFound();

  await ensureDealChecklist(deal.id);

  const counterparty = deal.sellerId === actor.id ? deal.buyer : deal.seller;
  const counterpartyLabel = counterpartyDisplayName(counterparty);
  const isSeller = deal.sellerId === actor.id;
  const roomOpen = isStageAtLeast(deal.stage, "DATA_ROOM");
  const next = nextPipelineAction(deal.stage, isSeller ? "seller" : "buyer");
  const agreed = Number(deal.agreedPrice);
  const upfront = Number(deal.upfrontAmount);
  const deferred = Number(deal.deferredAmount);

  const checklist = await prisma.dueDiligenceItem.findMany({
    where: { dealId: deal.id },
    orderBy: [{ category: "asc" }, { label: "asc" }],
    select: { id: true, category: true, label: true, required: true, providedAt: true },
  });
  const progress = checklistProgress(checklist);
  const partners = presentPartners();
  const escrowLive = escrowRailLive();
  const signLive = signatureRailLive();
  const signName = signatureProvider() === "docusign" ? "DocuSign" : "Yousign";

  const parcours = (
    <div className="grid gap-6">
      <SalePipeline currentKey={deal.stage} />
      <PartnerStrip partners={partners} />
      <section className="rounded-3xl border border-indigo-line bg-indigo-soft p-6">
        <p className="text-[12px] font-medium uppercase tracking-wide text-indigo-dark">
          Étape en cours
        </p>
        <h2 className="mt-1 text-xl font-semibold text-ink">{next.title}</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">{next.body}</p>
        <p className="mt-3 text-[13px] text-muted">
          {escrowLive && signLive
            ? "Le séquestre et la signature passent par les prestataires du circuit."
            : `Trustap et ${signName} sont prévus. Tant que les contrats ne sont pas validés, l’étape est enregistrée sans mouvement d’argent et sans signature qualifiée.`}
        </p>
        <div className="mt-4">
          {deal.stage === "NDA" ? <NdaButton dealId={deal.id} /> : null}
          {deal.stage === "DATA_ROOM" ? <SignLoiButton dealId={deal.id} /> : null}
          {deal.stage === "KYC" || deal.stage === "LOI" ? <KycButton dealId={deal.id} /> : null}
          {deal.stage === "DEED" ? <ValidateDeedButton dealId={deal.id} /> : null}
          {deal.stage === "SIGNATURE" ? <ConfirmSignatureButton dealId={deal.id} /> : null}
          {deal.stage === "ESCROW" || deal.escrowStage !== "NONE" ? (
            <div>
              <p className="mb-2 text-sm text-muted">
                Séquestre : {ESCROW_STAGE_LABELS[deal.escrowStage as keyof typeof ESCROW_STAGE_LABELS]}
                {deal.escrowProviderRef ? ` · ${deal.escrowProviderRef}` : ""}
              </p>
              <EscrowButtons dealId={deal.id} />
            </div>
          ) : null}
          {deal.stage === "TRANSFER" ? <ConfirmTransferButton dealId={deal.id} /> : null}
          {deal.stage === "RETENTION" || deal.stage === "CLOSED" ? (
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={`/app/dossiers/${deal.id}/retention`}
                className="text-[15px] font-medium text-indigo-dark underline-offset-2 hover:underline"
              >
                Déclarations de conservation
              </Link>
              {deal.stage === "RETENTION" ? <CloseDealButton dealId={deal.id} /> : null}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );

  const informations = (
    <section className="rounded-3xl border border-line bg-paper p-6">
      <h2 className="text-lg font-semibold text-ink">Informations du dossier</h2>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-[12px] uppercase tracking-wide text-muted">Annonce</dt>
          <dd className="mt-1">
            <Link
              href={`/annonces/${deal.listing.publicNumber}`}
              className="font-medium text-indigo-dark underline-offset-2 hover:underline"
            >
              Dossier n° {deal.listing.publicNumber}
            </Link>
          </dd>
        </div>
        <div>
          <dt className="text-[12px] uppercase tracking-wide text-muted">Contrepartie</dt>
          <dd className="mt-1 text-[15px] text-ink">{counterpartyLabel}</dd>
        </div>
        <div>
          <dt className="text-[12px] uppercase tracking-wide text-muted">Prix convenu</dt>
          <dd className="tabular mt-1 text-[15px] font-semibold">{formatEuro(agreed)}</dd>
        </div>
        <div>
          <dt className="text-[12px] uppercase tracking-wide text-muted">Séquestre 80 %</dt>
          <dd className="tabular mt-1 text-[15px] font-semibold">{formatEuro(upfront)}</dd>
        </div>
        <div>
          <dt className="text-[12px] uppercase tracking-wide text-muted">Solde 20 % (différé)</dt>
          <dd className="tabular mt-1 text-[15px] font-semibold">{formatEuro(deferred)}</dd>
        </div>
        {deal.adjustedDeferredAmount ? (
          <div>
            <dt className="text-[12px] uppercase tracking-wide text-muted">Différé ajusté</dt>
            <dd className="tabular mt-1 text-[15px] font-semibold">
              {formatEuro(Number(deal.adjustedDeferredAmount))}
            </dd>
          </div>
        ) : null}
      </dl>
    </section>
  );

  const documents = (
    <div className="grid gap-6">
      {roomOpen ? (
        <section className="rounded-3xl border border-line bg-paper p-6">
          <h2 className="text-lg font-semibold text-ink">Salle de données</h2>
          <p className="text-[14px] text-muted">Fichiers hors base, hashés. Aucune PII client final.</p>
          {isSeller ? (
            <div className="mt-3">
              <DataRoomUpload dealId={deal.id} />
            </div>
          ) : null}
          <ul className="mt-3 text-sm">
            {deal.documents.map((doc) => (
              <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-line py-1.5">
                <span>
                  {doc.fileName} · {doc.type}
                  {doc.signedAt ? ` · signé ${formatDate(doc.signedAt)}` : ""}
                </span>
                <span className="flex gap-2">
                  <MarkDocumentViewedButton dealId={deal.id} documentId={doc.id} />
                  {!doc.signedAt ? <SignDocButton dealId={deal.id} documentId={doc.id} /> : null}
                </span>
              </li>
            ))}
          </ul>
          {deal.dataRoomViews.length > 0 ? (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-ink">Journal de consultation</h3>
              <ul className="mt-1 text-xs text-muted">
                {deal.dataRoomViews.map((view) => (
                  <li key={view.id}>
                    {formatDate(view.viewedAt)}
                    {view.documentId ? " · pièce consultée" : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : (
        <p className="rounded-3xl border border-line bg-paper p-6 text-[15px] text-muted">
          Salle de données verrouillée tant que l’accord de confidentialité n’est pas accepté.
        </p>
      )}
      {checklist.length > 0 ? (
        <DueDiligencePanel
          items={checklist.map((item) => ({
            ...item,
            category: item.category as DueDiligenceCategory,
          }))}
          canEdit={isSeller}
          progress={progress}
        />
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
      <p className="text-[13px] font-medium text-indigo-dark">
        <Link href="/app" className="inline-flex min-h-11 items-center hover:text-indigo">
          Accueil
        </Link>
        {" · "}
        <Link
          href={`/annonces/${deal.listing.publicNumber}`}
          className="inline-flex min-h-11 items-center hover:text-indigo"
        >
          Fiche
        </Link>
      </p>

      <section className="rounded-3xl bg-indigo-soft p-5 sm:p-8">
        <span className="inline-flex rounded-full bg-white px-3 py-1 text-[12px] font-medium text-indigo-dark">
          {isSeller ? "Cession" : "Acquisition"} · {DEAL_STAGE_LABELS[deal.stage]}
        </span>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Dossier n° {deal.listing.publicNumber}
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          Contrepartie : {counterpartyLabel}. Confidentialité, pièces, accord, acte,
          séquestre 80/20, transfert, clôture.
        </p>
      </section>

      <div className="mt-6">
        <SectionTabs defaultId="parcours">
          <SectionTab id="parcours" label="Parcours">
            {parcours}
          </SectionTab>
          <SectionTab id="informations" label="Informations">
            {informations}
          </SectionTab>
          <SectionTab id="documents" label="Documents">
            {documents}
          </SectionTab>
          <SectionTab id="messages" label="Messages">
            {messages}
          </SectionTab>
        </SectionTabs>
      </div>
    </main>
  );
}
