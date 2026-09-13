import Link from "next/link";
import type { DealStage } from "@prisma/client";
import {
  acceptRetentionAction,
  approveDeedAction,
  confirmCarrierTransferAction,
  fundEscrowAction,
  proposeLoiAction,
  reviewDataRoomAction,
  reviewKycAction,
  signNdaAction,
} from "@/app/actions/deal-process";
import {
  CarrierCodesForm,
  CommitForm,
  LoiAnswerForm,
  LoiProposalForm,
  PieceUpload,
  RemovePiece,
  SignDeedForm,
} from "@/components/deal/process-forms";
import { SectionTabLink } from "@/components/ui/section-tabs";
import { certificateKey } from "@/lib/direct/documents";
import { SALE_PIPELINE } from "@/lib/deal/pipeline";
import {
  KYC_PIECES,
  SIGNOFF_LABELS,
  STAGE_INTRO,
  dueDiligenceDone,
  kycSlot,
  stageTasks,
  transferSlot,
  type Side,
  type SignoffKind,
  type Task,
} from "@/lib/deal/process";
import type { DealProcess } from "@/lib/deal/process-load";
import { adjustedDeferredAmount } from "@/lib/retention/adjust";
import { formatDate, formatDateTime, formatEuro, formatPercent } from "@/lib/format/fr";
import { cn } from "@/lib/utils";

/**
 * L'étape en cours du dossier, tâche par tâche.
 *
 * Chaque ligne dit ce qu'il faut faire, qui doit le faire, et ce qui est déjà
 * fait. Quand la tâche revient au lecteur, l'action est sur la ligne même :
 * déposer, relire, signer. L'étape se franchit seule quand tout est coché.
 */

const OWNER: Record<Side, string> = { seller: "Cédant", buyer: "Acquéreur" };

function stageLabel(stage: DealStage) {
  return SALE_PIPELINE.find((s) => s.key === stage)?.label ?? stage;
}

function pieceLink(dealId: string, key: string) {
  return `/app/dossiers/${dealId}/pieces/${key}`;
}

const lien = "text-[14px] font-medium text-indigo-dark underline-offset-2 hover:underline";

function FileLine({ p, slot, canManage }: { p: DealProcess; slot: string; canManage: boolean }) {
  const doc = [...p.deal.documents].reverse().find((d) => d.slot === slot);
  if (!doc) return null;
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
      <a href={`/api/dossiers/${p.deal.id}/${doc.id}`} target="_blank" rel="noreferrer" className={lien}>
        {doc.fileName}
      </a>
      <span className="text-muted">déposé le {formatDate(doc.createdAt)}</span>
      {canManage ? <RemovePiece dealId={p.deal.id} documentId={doc.id} /> : null}
    </span>
  );
}

function TaskAction({ p, task, side, escrowLive }: { p: DealProcess; task: Task; side: Side; escrowLive: boolean }) {
  const { deal } = p;
  const id = deal.id;

  if (task.key.startsWith("nda-")) {
    return (
      <div className="grid gap-3">
        <Link href={pieceLink(id, "confidentialite")} className={lien}>
          Lire l’accord de confidentialité
        </Link>
        <CommitForm
          dealId={id}
          action={signNdaAction}
          consentLabel="J’ai lu l’accord de confidentialité et je m’engage à en respecter les termes pendant trois ans."
          submitLabel="Signer l’accord"
        />
      </div>
    );
  }

  if (task.key === "dd-pieces") {
    const manquantes = p.snapshot.checklist.filter(
      (i) => i.required && !p.snapshot.pieces.some((d) => d.slot === `dd:${i.id}`),
    );
    return (
      <div className="grid gap-2">
        {manquantes.length ? (
          <p className="text-[13px] text-muted">
            Manquent encore : {manquantes.slice(0, 4).map((i) => i.label).join(", ")}
            {manquantes.length > 4 ? ` et ${manquantes.length - 4} autre${manquantes.length - 4 > 1 ? "s" : ""}` : ""}.
          </p>
        ) : null}
        <SectionTabLink href="#documents" className={lien}>
          Ouvrir le bordereau et déposer les pièces
        </SectionTabLink>
      </div>
    );
  }

  if (task.key === "dd-review") {
    const dd = dueDiligenceDone(p.snapshot);
    return (
      <div className="grid gap-3">
        <SectionTabLink href="#documents" className={lien}>
          Consulter les {dd.done} pièces obligatoires
        </SectionTabLink>
        <CommitForm
          dealId={id}
          action={reviewDataRoomAction}
          consentLabel="J’ai examiné les pièces de la salle de données. Je peux proposer une lettre d’intention en connaissance de cause."
          submitLabel="Valider l’examen"
        />
      </div>
    );
  }

  if (task.key === "loi-propose") {
    const demain = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    const premierDuMois = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 2, 1)).toISOString().slice(0, 10);
    return (
      <LoiProposalForm
        dealId={id}
        action={proposeLoiAction}
        defaultPrice={String(Number(deal.loiPrice ?? deal.agreedPrice))}
        defaultDate={deal.loiEffectiveDate ? deal.loiEffectiveDate.toISOString().slice(0, 10) : premierDuMois}
        defaultConditions={deal.loiConditions ?? ""}
        minDate={demain}
      />
    );
  }

  if (task.key === "loi-accept") {
    const prix = Number(deal.loiPrice ?? 0);
    const comptant = Math.round(prix * 0.8 * 100) / 100;
    return (
      <div className="grid gap-4">
        <dl className="grid gap-3 rounded-2xl bg-surface-alt p-4 sm:grid-cols-3">
          <div>
            <dt className="text-[12px] uppercase tracking-wide text-muted">Prix proposé</dt>
            <dd className="tabular text-[17px] font-bold text-ink">{formatEuro(prix)}</dd>
            <dd className="text-[12px] text-muted">Offre initiale {formatEuro(Number(deal.agreedPrice))}</dd>
          </div>
          <div>
            <dt className="text-[12px] uppercase tracking-wide text-muted">Comptant · différé</dt>
            <dd className="tabular text-[15px] font-semibold text-ink">
              {formatEuro(comptant)} · {formatEuro(prix - comptant)}
            </dd>
          </div>
          <div>
            <dt className="text-[12px] uppercase tracking-wide text-muted">Date d’effet</dt>
            <dd className="text-[15px] font-semibold text-ink">{deal.loiEffectiveDate ? formatDate(deal.loiEffectiveDate) : "—"}</dd>
          </div>
          {deal.loiConditions ? (
            <div className="sm:col-span-3">
              <dt className="text-[12px] uppercase tracking-wide text-muted">Conditions particulières</dt>
              <dd className="whitespace-pre-line text-[14px] text-ink">{deal.loiConditions}</dd>
            </div>
          ) : null}
        </dl>
        <Link href={pieceLink(id, "lettre-intention")} className={lien}>
          Lire la lettre d’intention
        </Link>
        <LoiAnswerForm dealId={id} />
      </div>
    );
  }

  const kycPieces = /^kyc-pieces-(seller|buyer)$/.exec(task.key);
  if (kycPieces) {
    const cote = kycPieces[1] as Side;
    return (
      <ul className="grid gap-3">
        {KYC_PIECES.map((k) => {
          const slot = kycSlot(cote, k.kind);
          const depose = p.deal.documents.some((d) => d.slot === slot);
          return (
            <li key={k.kind} className="rounded-xl border border-line bg-paper p-3">
              <p className="text-[14px] font-medium text-ink">
                {depose ? "✓ " : ""}
                {k.label}
              </p>
              <p className="text-[12px] text-muted">{k.detail}</p>
              <div className="mt-2 grid gap-2">
                <FileLine p={p} slot={slot} canManage />
                <PieceUpload dealId={id} slot={slot} replace={depose} />
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  const kycReview = /^kyc-review-(seller|buyer)$/.exec(task.key);
  if (kycReview) {
    const cote = kycReview[1] as Side;
    return (
      <div className="grid gap-3">
        <ul className="grid gap-1.5">
          {KYC_PIECES.map((k) => (
            <li key={k.kind} className="flex flex-wrap items-baseline gap-x-3">
              <span className="text-[13px] text-muted">{k.label} :</span>
              <FileLine p={p} slot={kycSlot(cote, k.kind)} canManage={false} />
            </li>
          ))}
        </ul>
        <CommitForm
          dealId={id}
          action={reviewKycAction}
          consentLabel={`J’ai contrôlé les pièces ${cote === "seller" ? "du cédant" : "de l’acquéreur"} : raison sociale, SIREN, représentant et immatriculation ORIAS concordent.`}
          submitLabel="Valider le contrôle"
        />
      </div>
    );
  }

  if (task.key.startsWith("deed-identity-")) {
    return (
      <Link href="/app/profil" className={lien}>
        Compléter le profil du cabinet
      </Link>
    );
  }

  if (task.key === "deed-carriers") {
    return <CarrierCodesForm dealId={id} carriers={p.carriers} />;
  }

  if (task.key.startsWith("deed-approve-")) {
    return (
      <div className="grid gap-3">
        <Link href={pieceLink(id, "protocole")} className={lien}>
          Relire le protocole de cession
        </Link>
        <CommitForm
          dealId={id}
          action={approveDeedAction}
          consentLabel="J’ai relu le protocole de cession et j’en approuve les termes, annexe des compagnies comprise."
          submitLabel="Approuver le protocole"
        />
      </div>
    );
  }

  if (task.key.startsWith("sign-")) {
    return (
      <div className="grid gap-3">
        <Link href={pieceLink(id, "protocole")} className={lien}>
          Relire le protocole avant de signer
        </Link>
        <SignDeedForm dealId={id} representative={p.parties[side].representative} />
      </div>
    );
  }

  if (task.key === "escrow-fund") {
    return (
      <div className="grid gap-3">
        <p className="text-[14px] text-ink">
          Montant à séquestrer : <span className="tabular font-bold">{formatEuro(Number(deal.upfrontAmount))}</span>
        </p>
        {!escrowLive ? (
          <p className="rounded-xl border border-warn/30 bg-warn/5 px-3 py-2 text-[13px] text-ink">
            Le compte séquestre Trustap n’est pas encore branché : le versement est enregistré dans le dossier, sans
            mouvement d’argent.
          </p>
        ) : null}
        <CommitForm
          dealId={id}
          action={fundEscrowAction}
          consentLabel={`Je verse ${formatEuro(Number(deal.upfrontAmount))} sur le compte séquestre. Les fonds restent bloqués jusqu’à la clôture.`}
          submitLabel="Verser au séquestre"
        />
      </div>
    );
  }

  if (task.key === "transfer-attestations") {
    return (
      <ul className="grid gap-3">
        {p.carriers.map((c, i) => {
          const slot = transferSlot(c.name);
          const depose = p.deal.documents.some((d) => d.slot === slot);
          return (
            <li key={c.name} className="rounded-xl border border-line bg-paper p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[14px] font-medium text-ink">
                  {depose ? "✓ " : ""}
                  {c.name} <span className="text-[12px] font-normal text-muted">code {c.code || "—"}</span>
                </p>
                <Link href={pieceLink(id, certificateKey(i))} className="text-[13px] font-medium text-indigo-dark hover:underline">
                  Imprimer l’attestation
                </Link>
              </div>
              <div className="mt-2 grid gap-2">
                <FileLine p={p} slot={slot} canManage />
                <PieceUpload dealId={id} slot={slot} label="Déposer la version signée" replace={depose} />
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  if (task.key === "transfer-confirm") {
    return (
      <div className="grid gap-3">
        <ul className="grid gap-1.5">
          {p.carriers.map((c) => (
            <li key={c.name} className="flex flex-wrap items-baseline gap-x-3">
              <span className="text-[13px] text-muted">{c.name} :</span>
              <FileLine p={p} slot={transferSlot(c.name)} canManage={false} />
            </li>
          ))}
        </ul>
        <CommitForm
          dealId={id}
          action={confirmCarrierTransferAction}
          consentLabel="Les compagnies ont rattaché les contrats et les commissions du portefeuille à mon code courtier."
          submitLabel="Confirmer le transfert"
        />
      </div>
    );
  }

  if (task.key === "retention-report") {
    return (
      <Link href={`/app/dossiers/${id}/retention`} className={lien}>
        Déclarer la conservation
      </Link>
    );
  }

  if (task.key === "retention-accept") {
    const releve = deal.retentionReports.find((r) => r.monthIndex === 12);
    if (!releve) return null;
    const solde = adjustedDeferredAmount({
      deferredAmount: Number(deal.deferredAmount),
      retentionRate: Number(releve.retentionRate),
      targetRate: Number(deal.retentionTargetRate),
    });
    return (
      <div className="grid gap-4">
        <dl className="grid gap-3 rounded-2xl bg-surface-alt p-4 sm:grid-cols-3">
          <div>
            <dt className="text-[12px] uppercase tracking-wide text-muted">Contrats conservés</dt>
            <dd className="tabular text-[15px] font-semibold text-ink">
              {releve.contractsRetained} / {releve.contractsTransferred} · {formatPercent(Number(releve.retentionRate) * 100)}
            </dd>
          </div>
          <div>
            <dt className="text-[12px] uppercase tracking-wide text-muted">Commissions encaissées</dt>
            <dd className="tabular text-[15px] font-semibold text-ink">{formatEuro(Number(releve.actualCommissions))}</dd>
          </div>
          <div>
            <dt className="text-[12px] uppercase tracking-wide text-muted">Solde libéré</dt>
            <dd className="tabular text-[15px] font-semibold text-ink">
              {formatEuro(solde)} <span className="text-[12px] font-normal text-muted">sur {formatEuro(Number(deal.deferredAmount))}</span>
            </dd>
          </div>
        </dl>
        <CommitForm
          dealId={id}
          action={acceptRetentionAction}
          consentLabel="Je valide la déclaration de conservation. Le séquestre et le solde ajusté sont libérés, la cession est close."
          submitLabel="Valider et clore la cession"
        />
      </div>
    );
  }

  return null;
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
          Prix {formatEuro(Number(deal.agreedPrice))}. Séquestre libéré
          {deal.adjustedDeferredAmount ? `, solde ajusté à ${formatEuro(Number(deal.adjustedDeferredAmount))}` : ""}. Toutes les
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
          <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-muted">{STAGE_INTRO[deal.stage]}</p>
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
    </section>
  );
}

const ARCHIVES: Record<string, string> = {
  "generated:confidentialite": "accord de confidentialité signé",
  "generated:lettre-intention": "lettre d’intention acceptée",
  "generated:protocole": "protocole de cession signé",
};

/** Journal du dossier : chaque engagement, qui, quand. */
export function DealJournal({ p }: { p: DealProcess }) {
  const { deal } = p;
  const lignes = [
    ...deal.signoffs.map((s) => ({
      at: s.createdAt,
      text: `${s.userId === deal.sellerId ? "Le cédant" : "L’acquéreur"} ${SIGNOFF_LABELS[s.kind as SignoffKind] ?? s.kind}${s.signatureName ? ` (${s.signatureName})` : ""}.`,
    })),
    ...(deal.loiProposedAt ? [{ at: deal.loiProposedAt, text: `L’acquéreur a proposé une lettre d’intention à ${formatEuro(Number(deal.loiPrice ?? 0))}.` }] : []),
    ...(deal.loiDeclinedAt ? [{ at: deal.loiDeclinedAt, text: `Le cédant a refusé une lettre d’intention${deal.loiDeclineReason ? ` : « ${deal.loiDeclineReason} »` : ""}.` }] : []),
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
