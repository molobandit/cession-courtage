import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  AdvanceStageButton,
  DataRoomUpload,
  EscrowButtons,
  KycButton,
  MarkDocumentViewedButton,
  MessageForm,
  NdaButton,
  SignDocButton,
} from "@/components/deal/deal-forms";
import { findMyDeal, getActor, isOriasVerified } from "@/lib/authz";
import { formatDate, formatEuro } from "@/lib/format/fr";
import { DEAL_STAGE_LABELS, DEAL_STAGE_ORDER, ESCROW_STAGE_LABELS } from "@/lib/labels";
import { isStageAtLeast } from "@/lib/authz/policies";

export const metadata = { title: "Dossier" };

export default async function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await getActor();
  if (!actor) redirect("/connexion");
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");
  const { id } = await params;
  const deal = await findMyDeal(id, actor);
  if (!deal) notFound();

  const counterparty = deal.sellerId === actor.id ? deal.buyer : deal.seller;
  const counterpartyLabel =
    counterparty.kind === "alias" ? counterparty.label : counterparty.fullName ?? counterparty.email;
  const isSeller = deal.sellerId === actor.id;
  const roomOpen = isStageAtLeast(deal.stage, "DATA_ROOM");

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <p className="text-sm text-muted">
        <Link href="/app" className="underline-offset-2 hover:underline">
          Espace membre
        </Link>
      </p>
      <h1 className="mt-1 font-serif text-2xl text-navy">Dossier #{deal.listing.publicNumber}</h1>
      <p className="text-sm text-muted">
        {DEAL_STAGE_LABELS[deal.stage]} · {formatEuro(Number(deal.agreedPrice))} · contrepartie {counterpartyLabel}
      </p>

      <ol className="mt-4 flex flex-wrap gap-1 text-xs">
        {DEAL_STAGE_ORDER.map((stage) => (
          <li
            key={stage}
            className={`rounded-sm px-2 py-1 ${
              stage === deal.stage ? "bg-navy text-cream" : "bg-cream text-muted"
            }`}
          >
            {DEAL_STAGE_LABELS[stage]}
          </li>
        ))}
      </ol>

      <section className="mt-6 grid gap-3 sm:grid-cols-3 text-sm">
        <div className="border border-line bg-paper p-3">
          Prix convenu
          <p className="font-serif text-lg text-navy">{formatEuro(Number(deal.agreedPrice))}</p>
        </div>
        <div className="border border-line bg-paper p-3">
          Comptant
          <p className="font-serif text-lg text-navy">{formatEuro(Number(deal.upfrontAmount))}</p>
        </div>
        <div className="border border-line bg-paper p-3">
          Différé
          <p className="font-serif text-lg text-navy">{formatEuro(Number(deal.deferredAmount))}</p>
          {deal.adjustedDeferredAmount ? (
            <p className="text-xs text-muted">Ajusté rétention : {formatEuro(Number(deal.adjustedDeferredAmount))}</p>
          ) : null}
        </div>
      </section>

      <section className="mt-6 space-y-3">
        {deal.stage === "NDA" ? <NdaButton dealId={deal.id} /> : null}
        {deal.stage === "DATA_ROOM" || deal.stage === "LOI" ? (
          <AdvanceStageButton dealId={deal.id} label="Passer à l'étape suivante" />
        ) : null}
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
        {deal.stage === "DEED" || deal.stage === "SIGNATURE" || deal.stage === "TRANSFER" ? (
          <AdvanceStageButton dealId={deal.id} label="Valider l'étape (mock)" />
        ) : null}
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
          <h2 className="font-serif text-lg text-navy">Salle de données</h2>
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
              <h3 className="text-sm font-medium text-navy">Journal de consultation</h3>
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

      <section className="mt-8">
        <h2 className="font-serif text-lg text-navy">Messagerie</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {deal.messages.map((m) => (
            <li key={m.id} className="border border-line bg-paper p-2">
              <span className="text-xs text-muted">#{m.senderLabel}</span>
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
