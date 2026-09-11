import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ConfirmSignatureButton,
  ConfirmTransferButton,
  DataRoomUpload,
  EscrowButtons,
  KycButton,
  MarkDocumentViewedButton,
  MessageForm,
  NdaButton,
  SignDocButton,
  SignLoiButton,
  ValidateDeedButton,
} from "@/components/deal/deal-forms";
import { counterpartyDisplayName, findMyDeal, getActor, isOriasVerified } from "@/lib/authz";
import { formatDate, formatEuro } from "@/lib/format/fr";
import { DEAL_STAGE_LABELS, DEAL_STAGE_ORDER, ESCROW_STAGE_LABELS } from "@/lib/labels";
import { isStageAtLeast } from "@/lib/authz/policies";
import { DueDiligencePanel } from "@/components/deal/due-diligence-panel";
import { checklistProgress, type DueDiligenceCategory } from "@/lib/deal/due-diligence";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Dossier" };

export default async function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await getActor();
  if (!actor) redirect("/connexion");
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");
  const { id } = await params;
  const deal = await findMyDeal(id, actor);
  if (!deal) notFound();

  const counterparty = deal.sellerId === actor.id ? deal.buyer : deal.seller;
  const counterpartyLabel = counterpartyDisplayName(counterparty);
  const isSeller = deal.sellerId === actor.id;
  const roomOpen = isStageAtLeast(deal.stage, "DATA_ROOM");

  // Bordereau de pièces : visible des deux parties, modifiable par le seul cédant.
  const checklist = await prisma.dueDiligenceItem.findMany({
    where: { dealId: deal.id },
    orderBy: [{ category: "asc" }, { label: "asc" }],
    select: { id: true, category: true, label: true, required: true, providedAt: true },
  });
  const progress = checklistProgress(checklist);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
      <p className="text-[13px] font-medium text-indigo-dark">
        <Link href="/app" className="inline-flex min-h-11 items-center hover:text-indigo">
          Accueil
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
          Contrepartie : {counterpartyLabel}. Le tunnel va de la confidentialité
          jusqu’au transfert ORIAS.
        </p>
      </section>

      <ol className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {DEAL_STAGE_ORDER.map((stage) => (
          <li
            key={stage}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium ${
              stage === deal.stage
                ? "bg-indigo text-white"
                : "border border-line bg-paper text-muted"
            }`}
          >
            {DEAL_STAGE_LABELS[stage]}
          </li>
        ))}
      </ol>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-3xl border border-line bg-paper px-5 py-6 text-center shadow-sm">
          <p className="text-[13px] text-muted">Prix convenu</p>
          <p className="tabular mt-2 text-2xl font-bold text-ink">{formatEuro(Number(deal.agreedPrice))}</p>
        </div>
        <div className="rounded-3xl border border-line bg-paper px-5 py-6 text-center shadow-sm">
          <p className="text-[13px] text-muted">Comptant</p>
          <p className="tabular mt-2 text-2xl font-bold text-ink">{formatEuro(Number(deal.upfrontAmount))}</p>
        </div>
        <div className="rounded-3xl border border-line bg-paper px-5 py-6 text-center shadow-sm">
          <p className="text-[13px] text-muted">Différé</p>
          <p className="tabular mt-2 text-2xl font-bold text-ink">{formatEuro(Number(deal.deferredAmount))}</p>
          {deal.adjustedDeferredAmount ? (
            <p className="mt-1 text-[12px] text-muted">
              Ajusté rétention : {formatEuro(Number(deal.adjustedDeferredAmount))}
            </p>
          ) : null}
        </div>
      </section>

      <section className="mt-6 space-y-3">
        {deal.stage === "NDA" ? <NdaButton dealId={deal.id} /> : null}
        {deal.stage === "DATA_ROOM" ? <SignLoiButton dealId={deal.id} /> : null}
        {deal.stage === "KYC" || deal.stage === "LOI" ? <KycButton dealId={deal.id} /> : null}
        {deal.stage === "ESCROW" || deal.escrowStage !== "NONE" ? (
          <div>
            <p className="mb-2 text-sm text-muted">
              Séquestre : {ESCROW_STAGE_LABELS[deal.escrowStage as keyof typeof ESCROW_STAGE_LABELS]}
              {deal.escrowProviderRef ? ` · ${deal.escrowProviderRef}` : ""}
            </p>
            <EscrowButtons dealId={deal.id} />
          </div>
        ) : null}
        {deal.stage === "DEED" ? <ValidateDeedButton dealId={deal.id} /> : null}
        {deal.stage === "SIGNATURE" ? <ConfirmSignatureButton dealId={deal.id} /> : null}
        {deal.stage === "TRANSFER" ? <ConfirmTransferButton dealId={deal.id} /> : null}
        {deal.stage === "RETENTION" || deal.stage === "CLOSED" ? (
          <p className="text-sm">
            <Link href={`/app/dossiers/${deal.id}/retention`} className="underline-offset-2 hover:underline">
              Déclarations de rétention
            </Link>
          </p>
        ) : null}
      </section>

      {roomOpen ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-ink">Salle de données</h2>
          <p className="text-xs text-muted">Fichiers hors base, hashés. Aucune PII client final.</p>
          {isSeller ? (
            <div className="mt-2">
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
                {deal.dataRoomViews.map((v) => (
                  <li key={v.id}>
                    {formatDate(v.viewedAt)}
                    {v.documentId ? " · pièce consultée" : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : (
        <p className="mt-6 text-sm text-muted">Salle de données verrouillée tant que l&apos;NDA n&apos;est pas accepté.</p>
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

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink">Messagerie</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {deal.messages.map((m) => (
            <li key={m.id} className="rounded-2xl border border-line bg-paper p-3 sm:p-4">
              <span className="text-xs text-muted">{m.senderLabel}</span>
              <p>{m.body}</p>
            </li>
          ))}
        </ul>
        <div className="mt-3">
          <MessageForm dealId={deal.id} />
        </div>
      </section>
    </main>
  );
}
