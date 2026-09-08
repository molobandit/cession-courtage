"use client";

import { useActionState } from "react";
import { formatCount } from "@/lib/format/number";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type DueDiligenceCategory,
} from "@/lib/deal/due-diligence";
import {
  toggleDueDiligenceItemAction,
  type DueDiligenceState,
} from "@/app/actions/due-diligence";

export type ChecklistItem = {
  id: string;
  category: DueDiligenceCategory;
  label: string;
  required: boolean;
  providedAt: Date | null;
};

/**
 * Bordereau des pièces réclamées en vérification préalable.
 *
 * Une base mal documentée est le deuxième motif d'échec d'une cession, après le
 * refus des compagnies. Rendre l'avancement visible des deux parties évite la
 * relance par courriel et raccourcit la négociation.
 */
export function DueDiligencePanel({
  items,
  canEdit,
  progress,
}: {
  items: ChecklistItem[];
  canEdit: boolean;
  progress: { requiredProvided: number; requiredTotal: number; share: number; complete: boolean };
}) {
  const [state, action, pending] = useActionState<DueDiligenceState, FormData>(
    toggleDueDiligenceItemAction,
    {},
  );

  const percent = Math.round(progress.share * 100);

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-serif text-2xl font-semibold text-ink">
          Bordereau de pièces
        </h2>
        <p className="tabular text-[15px] text-muted">
          {formatCount(progress.requiredProvided)} sur{" "}
          {formatCount(progress.requiredTotal)} pièces obligatoires
        </p>
      </div>
      <p className="mt-1.5 max-w-3xl text-[15px] leading-relaxed text-muted">
        Les pièces réclamées en vérification préalable, adaptées à la composition
        du portefeuille. {canEdit ? "Cochez-les à mesure que vous les déposez." : "Le cédant les dépose à mesure."}
      </p>

      <div
        className="mt-4 h-2.5 w-full max-w-2xl rounded-full bg-surface-alt"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label="Avancement du bordereau"
      >
        <div
          className={progress.complete ? "h-full rounded-full bg-ok" : "h-full rounded-full bg-indigo"}
          style={{ width: `${percent}%` }}
        />
      </div>

      {progress.complete ? (
        <p className="mt-3 text-[15px] font-medium text-ok">
          Toutes les pièces obligatoires sont déposées.
        </p>
      ) : null}

      {state.error ? (
        <p className="mt-4 rounded-3xl border border-danger/40 bg-danger/5 p-4 text-[15px] text-ink">
          {state.error}
        </p>
      ) : null}

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {CATEGORY_ORDER.map((category) => {
          const group = items.filter((item) => item.category === category);
          if (group.length === 0) return null;
          const done = group.filter((i) => i.providedAt !== null).length;

          return (
            <div key={category} className="rounded-3xl border border-line bg-paper p-6">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-serif text-lg font-semibold text-ink">
                  {CATEGORY_LABELS[category]}
                </h3>
                <span className="tabular text-sm text-muted">
                  {done} / {group.length}
                </span>
              </div>

              <ul className="mt-4 space-y-2.5">
                {group.map((item) => {
                  const provided = item.providedAt !== null;
                  return (
                    <li key={item.id} className="flex items-start gap-3">
                      {canEdit ? (
                        <form action={action} className="flex items-start gap-3">
                          <input type="hidden" name="itemId" value={item.id} />
                          <input
                            type="hidden"
                            name="provided"
                            value={provided ? "false" : "true"}
                          />
                          <button
                            type="submit"
                            disabled={pending}
                            aria-pressed={provided}
                            className={
                              provided
                                ? "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ok text-sm text-white"
                                : "mt-0.5 h-6 w-6 shrink-0 rounded-full border border-line bg-surface-alt"
                            }
                          >
                            <span aria-hidden="true">{provided ? "✓" : ""}</span>
                            <span className="sr-only">
                              {provided ? "Retirer" : "Marquer comme déposée"} : {item.label}
                            </span>
                          </button>
                          <span className={provided ? "text-[15px] text-muted" : "text-[15px] text-ink"}>
                            {item.label}
                            {item.required ? null : (
                              <span className="ml-2 text-sm text-muted">facultative</span>
                            )}
                          </span>
                        </form>
                      ) : (
                        <>
                          <span
                            aria-hidden="true"
                            className={
                              provided
                                ? "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ok text-sm text-white"
                                : "mt-0.5 h-6 w-6 shrink-0 rounded-full border border-line bg-surface-alt"
                            }
                          >
                            {provided ? "✓" : ""}
                          </span>
                          <span className={provided ? "text-[15px] text-muted" : "text-[15px] text-ink"}>
                            {item.label}
                            <span className="sr-only">
                              {provided ? " : déposée" : " : en attente"}
                            </span>
                            {item.required ? null : (
                              <span className="ml-2 text-sm text-muted">facultative</span>
                            )}
                          </span>
                        </>
                      )}
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
