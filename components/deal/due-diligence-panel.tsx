import { PieceUpload, RemovePiece } from "@/components/deal/process-forms";
import { formatDate } from "@/lib/format/fr";
import { formatCount } from "@/lib/format/number";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type DueDiligenceCategory,
} from "@/lib/deal/due-diligence";
import { dueDiligenceSlot } from "@/lib/deal/process";

export type ChecklistItem = {
  id: string;
  category: DueDiligenceCategory;
  label: string;
  detail?: string;
  required: boolean;
};

export type ChecklistFile = { id: string; slot: string | null; fileName: string; createdAt: Date; uploadedById: string };

/**
 * Bordereau des pièces réclamées en vérification préalable.
 *
 * Une ligne ne se coche plus à la main : elle est fournie quand un fichier y
 * est déposé. L'acquéreur ouvre chaque pièce depuis la même ligne, et chaque
 * ouverture est journalisée.
 */
export function DueDiligencePanel({
  dealId,
  items,
  files,
  canUpload,
  actorId,
}: {
  dealId: string;
  items: ChecklistItem[];
  files: ChecklistFile[];
  canUpload: boolean;
  actorId: string;
}) {
  const fichierDe = (itemId: string) => [...files].reverse().find((f) => f.slot === dueDiligenceSlot(itemId)) ?? null;
  const obligatoires = items.filter((i) => i.required);
  const fournies = obligatoires.filter((i) => fichierDe(i.id)).length;
  const percent = obligatoires.length ? Math.round((fournies / obligatoires.length) * 100) : 100;
  const complet = obligatoires.length > 0 && fournies === obligatoires.length;

  return (
    <section className="rounded-3xl border border-line bg-paper p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink">Bordereau de pièces</h2>
        <p className="tabular text-[14px] text-muted">
          {formatCount(fournies)} sur {formatCount(obligatoires.length)} pièces obligatoires
        </p>
      </div>
      <p className="mt-1 max-w-3xl text-[14px] leading-relaxed text-muted">
        Adapté à la composition du portefeuille. {canUpload ? "Déposez un fichier par ligne (PDF, JPG ou PNG, 10 Mo au maximum)." : "Le cédant dépose les pièces ; ouvrez-les depuis chaque ligne."} Aucune donnée
        nominative d’assuré.
      </p>
      <div className="mt-3 h-2 w-full max-w-2xl overflow-hidden rounded-full bg-surface-alt" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Avancement du bordereau">
        <div className={complet ? "h-full rounded-full bg-ok" : "h-full rounded-full bg-indigo"} style={{ width: `${percent}%` }} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {CATEGORY_ORDER.map((category) => {
          const groupe = items.filter((i) => i.category === category);
          if (groupe.length === 0) return null;
          const faits = groupe.filter((i) => fichierDe(i.id)).length;
          return (
            <div key={category} className="rounded-2xl border border-line p-4">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-[15px] font-semibold text-ink">{CATEGORY_LABELS[category]}</h3>
                <span className="tabular text-[13px] text-muted">
                  {faits} / {groupe.length}
                </span>
              </div>
              <ul className="mt-3 divide-y divide-line">
                {groupe.map((item) => {
                  const f = fichierDe(item.id);
                  return (
                    <li key={item.id} className="flex items-start gap-3 py-3">
                      <span
                        aria-hidden="true"
                        className={
                          f
                            ? "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ok text-[11px] text-white"
                            : "mt-0.5 h-5 w-5 shrink-0 rounded-full border border-line bg-surface-alt"
                        }
                      >
                        {f ? "✓" : ""}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-medium text-ink">
                          {item.label}
                          {item.required ? null : <span className="ml-2 text-[12px] font-normal text-muted">facultative</span>}
                          <span className="sr-only">{f ? " : déposée" : " : en attente"}</span>
                        </p>
                        {item.detail ? <p className="text-[12px] text-muted">{item.detail}</p> : null}
                        {f ? (
                          <p className="mt-1 flex flex-wrap items-center gap-x-3 text-[13px]">
                            <a href={`/api/dossiers/${dealId}/${f.id}`} target="_blank" rel="noreferrer" className="font-medium text-indigo-dark underline-offset-2 hover:underline">
                              {f.fileName}
                            </a>
                            <span className="text-muted">{formatDate(f.createdAt)}</span>
                            {canUpload && f.uploadedById === actorId ? <RemovePiece dealId={dealId} documentId={f.id} /> : null}
                          </p>
                        ) : !canUpload ? (
                          <p className="mt-1 text-[13px] text-muted">En attente du cédant</p>
                        ) : null}
                        {canUpload ? (
                          <div className="mt-2">
                            <PieceUpload dealId={dealId} slot={dueDiligenceSlot(item.id)} replace={Boolean(f)} />
                          </div>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
