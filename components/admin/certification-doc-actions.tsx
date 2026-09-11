"use client";

import { useActionState } from "react";
import { trancherPieceAction, type ReviewState } from "@/app/actions/certification-review";
import { Button } from "@/components/ui/button";

const initial: ReviewState = {};

/**
 * Décision de l'éditeur sur une pièce déposée.
 *
 * C'est le seul geste humain de la chaîne : le statut de l'annonce n'est jamais
 * saisi, il se recalcule après cette décision. Le motif est exigé pour un refus,
 * sinon le cédant doit deviner ce qu'il faut corriger.
 */
export function CertificationDocActions({
  documentId,
  deposee,
}: {
  documentId: string;
  deposee: boolean;
}) {
  const [state, action, pending] = useActionState(trancherPieceAction, initial);

  if (!deposee) {
    return <p className="text-[13px] text-muted">En attente du dépôt par le cédant.</p>;
  }

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="documentId" value={documentId} />
      <input
        name="comment"
        type="text"
        placeholder="Motif du refus, ou note de contrôle"
        className="h-9 w-full max-w-sm rounded-full border border-line bg-surface px-3 text-[13px] text-ink"
      />
      <div className="flex gap-2">
        <Button type="submit" name="decision" value="VALIDATED" size="sm" disabled={pending}>
          {pending ? "…" : "Valider"}
        </Button>
        <Button
          type="submit"
          name="decision"
          value="REJECTED"
          size="sm"
          variant="outline"
          disabled={pending}
        >
          Refuser
        </Button>
      </div>
      {state.error ? (
        <p role="alert" className="text-[13px] text-danger">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
