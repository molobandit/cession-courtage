import Link from "next/link";
import type { DealStage } from "@prisma/client";
import {
  confirmCarrierTransferAction,
  confirmPriceAction,
  sendAttestationsAction,
} from "@/app/actions/deal-process";
import {
  CarrierCodesForm,
  CommitForm,
  EscrowForm,
  PieceUpload,
  RevisePriceForm,
  RevisionAnswerForm,
  SignDeedForm,
} from "@/components/deal/process-forms";
import { certificateKey } from "@/lib/direct/documents";
import { SALE_PIPELINE } from "@/lib/deal/pipeline";
import {
  SIGNOFF_LABELS,
  STAGE_INTRO,

  stageTasks,
  type Side,
  type Task,
} from "@/lib/deal/process";
import type { DealProcess } from "@/lib/deal/process-load";
import { DATA_ROOM_KINDS, companyDocLabel } from "@/lib/listing/company-doc-kinds";
import { escrowAmountAfterDeposit } from "@/lib/billing/deposit-fate";
import { formatDateTime, formatEuro, formatPercent } from "@/lib/format/fr";
import { cn } from "@/lib/utils";

/**
 * L'étape en cours du dossier, tâche par tâche.
 *
 * Chaque ligne dit ce qu'il faut faire, qui doit le faire, et ce qui est déjà
 * fait. Quand la tâche revient au lecteur, l'action est sur la ligne même.
 * Les tâches déjà remplies ailleurs — compte vérifié, pièces déposées sur
 * l'annonce — se cochent seules. L'étape se franchit quand tout est coché.
 */

const OWNER: Record<Side, string> = { seller: "Cédant", buyer: "Acquéreur" };

function stageLabel(stage: DealStage) {
  return SALE_PIPELINE.find((s) => s.key === stage)?.label ?? stage;
}

function pieceLink(dealId: string, key: string) {
  return `/app/dossiers/${dealId}/pieces/${key}`;
}

const lien = "text-[14px] font-medium text-indigo-dark underline-offset-2 hover:underline";

/** Pièces du cabinet cédant, avec leur lien d'ouverture et, pour le cédant, le dépôt. */
export function RoomDocsList({ p, canUpload }: { p: DealProcess; canUpload: boolean }) {
  const docs = p.deal.listing.companyDocuments;
  return (
    <ul className="grid gap-2">
      {DATA_ROOM_KINDS.map((kind) => {
        const doc = [...docs].reverse().find((d) => d.kind === kind);
        return (
          <li key={kind} className="rounded-xl border border-line bg-paper p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[14px] font-medium text-ink">
                <span className={doc ? "text-ok" : "text-muted"}>{doc ? "✓ " : "○ "}</span>
                {companyDocLabel(kind)}
              </p>
              {doc ? (
                <a href={`/api/cabinet/${p.deal.listingId}/${doc.id}`} target="_blank" rel="noreferrer" className="text-[13px] font-medium text-indigo-dark hover:underline">
                  Ouvrir
                </a>
              ) : (
                <span className="text-[12px] text-muted">{canUpload ? "À déposer" : "En attente du cédant"}</span>
              )}
            </div>
            {canUpload ? (
              <div className="mt-2">
                <PieceUpload dealId={p.deal.id} kind={kind} replace={Boolean(doc)} />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function TaskAction({ p, task, side, escrowLive }: { p: DealProcess; task: Task; side: Side; escrowLive: boolean }) {
  const { deal } = p;
  const id = deal.id;

  if (task.key === "room-docs") {
    return (
      <div className="grid gap-2">
        <p className="text-[13px] text-muted">
          Déposées une fois sur l’annonce, elles servent à tout acquéreur de ce portefeuille. PDF, JPG ou PNG.
        </p>
        <RoomDocsList p={p} canUpload />
      </div>
    );
  }

  if (task.key.startsWith("verify-")) {
    return (
      <Link href="/app/profil#verification" className={lien}>
        Vérifier mon compte en quelques minutes
      </Link>
    );
  }

  if (task.key === "carrier-codes") {
    return <CarrierCodesForm dealId={id} carriers={p.carriers} />;
  }

  if (task.key === "price-confirm") {
    const prix = p.snapshot.agreedPrice;
    return (
      <div className="grid gap-4">
        <RoomDocsList p={p} canUpload={false} />
        <CommitForm
          dealId={id}
          action={confirmPriceAction}
          consentLabel={`J’ai examiné les pièces du cabinet et je confirme mon montant de ${formatEuro(prix)}.`}
          submitLabel="Confirmer mon montant"
        />
        <RevisePriceForm dealId={id} defaultPrice={String(prix)} />
      </div>
    );
  }

  if (task.key === "price-accept" && p.snapshot.revision) {
    const r = p.snapshot.revision;
    return (
      <div className="grid gap-4">
        <dl className="grid gap-3 rounded-2xl bg-surface-alt p-4 sm:grid-cols-3">
          <div>
            <dt className="text-[12px] uppercase tracking-wide text-muted">Montant révisé</dt>
            <dd className="tabular text-[17px] font-bold text-ink">{formatEuro(r.price)}</dd>
          </div>
          <div>
            <dt className="text-[12px] uppercase tracking-wide text-muted">Montant de l’offre</dt>
            <dd className="tabular text-[15px] font-semibold text-ink">{formatEuro(p.snapshot.agreedPrice)}</dd>
          </div>
          <div>
            <dt className="text-[12px] uppercase tracking-wide text-muted">Écart</dt>
            <dd className="tabular text-[15px] font-semibold text-ink">
              {formatPercent(((r.price - p.snapshot.agreedPrice) / p.snapshot.agreedPrice) * 100)}
            </dd>
          </div>
          {deal.loiConditions ? (
            <div className="sm:col-span-3">
              <dt className="text-[12px] uppercase tracking-wide text-muted">Motif</dt>
              <dd className="whitespace-pre-line text-[14px] text-ink">{deal.loiConditions}</dd>
            </div>
          ) : null}
        </dl>
        <RevisionAnswerForm dealId={id} />
      </div>
    );
  }

  if (task.key.startsWith("sign-")) {
    return (
      <div className="grid gap-3">
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          <Link href={pieceLink(id, "protocole")} className={lien}>
            Lire le protocole
          </Link>
          {p.carriers.length ? (
            <Link href={pieceLink(id, certificateKey(0))} className={lien}>
              Voir une attestation de transfert
            </Link>
          ) : null}
        </div>
        <SignDeedForm dealId={id} representative={p.parties[side].representative} />
      </div>
    );
  }

  if (task.key === "escrow-fund") {
    const depot = Number(deal.listing.deposits.find((d) => d.buyerId === deal.buyerId)?.amount ?? 0);
    const aVerser = escrowAmountAfterDeposit(Number(deal.upfrontAmount), depot);
    return (
      <div className="grid gap-2">
        <p className="text-[14px] text-ink">
          Montant {formatEuro(Number(deal.upfrontAmount))}
          {depot > 0 ? ` − dépôt de garantie déjà versé ${formatEuro(depot)}` : ""} ={" "}
          <span className="tabular font-bold">{formatEuro(aVerser)} à verser sur le compte sécurisé</span>
        </p>
        <EscrowForm dealId={id} amountLabel={formatEuro(aVerser)} live={escrowLive} />
      </div>
    );
  }

  if (task.key === "attestations-sent") {
    return (
      <div className="grid gap-3">
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {p.carriers.map((c, i) => (
            <li key={c.name} className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2 text-[14px]">
              <span className="text-ink">
                {c.name} <span className="text-[12px] text-muted">code {c.code || "à renseigner"}</span>
              </span>
              <Link href={pieceLink(id, certificateKey(i))} className="text-[13px] font-medium text-indigo-dark hover:underline">
                Télécharger
              </Link>
            </li>
          ))}
        </ul>
        <CommitForm
          dealId={id}
          action={sendAttestationsAction}
          consentLabel={`J’ai adressé à chacune des ${p.carriers.length} compagnies son attestation signée électroniquement.`}
          submitLabel="Attestations envoyées"
        />
      </div>
    );
  }

  if (task.key === "transfer-confirm") {
    return (
      <div className="grid gap-3">
        <Link href={pieceLink(id, "courrier-clients")} className={lien}>
          Courrier d’information des clients, prêt à envoyer
        </Link>
        <CommitForm
          dealId={id}
          action={confirmCarrierTransferAction}
          consentLabel="Les compagnies ont accepté le transfert et rattaché les contrats et les commissions à mon code. J’informe les clients avec le courrier fourni. Les fonds sont alors libérés via le trust."
          submitLabel="Confirmer l’accord des compagnies"
        />
      </div>
    );
  }

  return null;
}

/** Rappels réglementaires de l'étape, sans case à cocher de plus. */
function ComplianceNotes({ stage }: { stage: DealStage }) {
  if (stage !== "TRANSFER" && stage !== "CLOSED") return null;
  return (
    <aside className="mt-4 rounded-2xl border border-line bg-surface-alt/60 p-4 text-[13px] leading-relaxed text-ink">
      <p className="font-semibold">À ne pas oublier</p>
      <ul className="mt-1.5 list-disc space-y-1 pl-5 text-muted">
        <li>
          La cession de clientèle se déclare au service des impôts dans le mois qui suit l’acte, avec le paiement des droits
          d’enregistrement ; faites-la valider par votre expert-comptable.
        </li>
        <li>Les clients sont informés du changement d’intermédiaire : le courrier type est fourni dans les pièces du dossier.</li>
        <li>Si des salariés sont attachés au portefeuille, leur contrat de travail suit la cession.</li>
      </ul>
    </aside>
  );
}

export function DealProcessPanel({ p, side, escrowLive }: { p: DealProcess; side: Side; escrowLive: boolean }) {
  const { deal } = p;
  const tasks = stageTasks(p.snapshot);
  const faites = tasks.filter((t) => t.done).length;

  if (deal.stage === "CLOSED") {
    return (
      <section className="rounded-3xl border border-ok/30 bg-paper p-6">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-ok">Cession close</p>
        <h2 className="mt-1 text-xl font-semibold text-ink">Le portefeuille a changé de mains.</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          Montant {formatEuro(Number(deal.agreedPrice))}. Fonds libérés via le trust après l’accord des compagnies. Toutes les
          pièces restent consultables dans l’onglet Documents.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-indigo-line bg-paper p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-indigo-dark">Étape en cours · {stageLabel(deal.stage)}</p>
          <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-muted">{STAGE_INTRO[deal.stage] ?? ""}</p>
        </div>
        <p className="tabular shrink-0 rounded-full bg-indigo-soft px-3 py-1 text-[13px] font-semibold text-indigo-dark">
          {faites} sur {tasks.length} fait{faites > 1 ? "es" : "e"}
        </p>
      </div>

      <ol className="mt-5 grid gap-3">
        {tasks.map((t) => {
          const aMoi = t.owner === side && !t.done;
          const actif = aMoi && t.available;
          return (
            <li
              key={t.key}
              className={cn(
                "rounded-2xl border p-4",
                t.done ? "border-line bg-surface-alt/60" : actif ? "border-indigo bg-indigo-soft/50" : "border-line bg-paper",
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[13px] font-bold",
                    t.done ? "bg-ok text-white" : actif ? "bg-indigo text-white" : "border border-line bg-paper text-muted",
                  )}
                >
                  {t.done ? "✓" : actif ? "!" : ""}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={cn("text-[15px] font-semibold", t.done ? "text-muted" : "text-ink")}>{t.label}</p>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        actif ? "bg-indigo text-white" : "bg-surface-alt text-muted",
                      )}
                    >
                      {t.owner === side ? (t.done ? "Vous · fait" : t.available ? "À vous" : "À vous, ensuite") : `${OWNER[t.owner]}${t.done ? " · fait" : " · en attente"}`}
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted">
                    {t.done && t.doneAt ? `Fait le ${formatDateTime(t.doneAt)}. ` : ""}
                    {t.detail}
                  </p>
                  {t.progress && t.progress.total > 0 ? (
                    <div className="mt-2 flex max-w-sm items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-alt">
                        <div
                          className={cn("h-full rounded-full", t.done ? "bg-ok" : "bg-indigo")}
                          style={{ width: `${(t.progress.done / t.progress.total) * 100}%` }}
                        />
                      </div>
                      <span className="tabular text-[12px] font-semibold text-ink">
                        {t.progress.done} / {t.progress.total}
                      </span>
                    </div>
                  ) : null}
                  {!t.done && !t.available && t.waitingReason ? (
                    <p className="mt-1.5 text-[13px] font-medium text-ink/70">{t.waitingReason}</p>
                  ) : null}
                  {actif ? (
                    <div className="mt-4">
                      <TaskAction p={p} task={t} side={side} escrowLive={escrowLive} />
                    </div>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <ComplianceNotes stage={deal.stage} />
    </section>
  );
}

const ARCHIVES: Record<string, string> = {
  "generated:confidentialite": "accord de confidentialité signé",
  "generated:lettre-intention": "lettre d’intention (offre acceptée)",
  "generated:protocole": "protocole de cession signé",
};

/** Journal du dossier : chaque engagement, qui, quand. */
export function DealJournal({ p }: { p: DealProcess }) {
  const { deal } = p;
  const lignes = [
    ...deal.signoffs.map((s) => ({
      at: s.createdAt,
      text: `${s.userId === deal.sellerId ? "Le cédant" : "L’acquéreur"} ${SIGNOFF_LABELS[s.kind] ?? s.kind}${s.signatureName ? ` (${s.signatureName})` : ""}.`,
    })),
    ...(deal.loiProposedAt ? [{ at: deal.loiProposedAt, text: `L’acquéreur a révisé son prix à ${formatEuro(Number(deal.loiPrice ?? 0))}.` }] : []),
    ...(deal.loiDeclinedAt ? [{ at: deal.loiDeclinedAt, text: `Le cédant a refusé une révision du prix${deal.loiDeclineReason ? ` : « ${deal.loiDeclineReason} »` : ""}.` }] : []),
    ...deal.documents
      .filter((d) => d.slot?.startsWith("generated:"))
      .map((d) => ({ at: d.createdAt, text: `Pièce archivée : ${ARCHIVES[d.slot!] ?? d.fileName} (empreinte ${d.sha256.slice(0, 12)}…).` })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  if (lignes.length === 0) return null;
  return (
    <section className="rounded-3xl border border-line bg-paper p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-ink">Journal du dossier</h2>
      <ol className="mt-3 divide-y divide-line">
        {lignes.slice(0, 30).map((l, i) => (
          <li key={i} className="flex flex-wrap gap-x-4 gap-y-0.5 py-2 text-[14px]">
            <span className="tabular w-36 shrink-0 text-muted">{formatDateTime(l.at)}</span>
            <span className="min-w-0 flex-1 text-ink">{l.text}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
