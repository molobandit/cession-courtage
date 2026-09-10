"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  toggleMandatePublicationAction,
  type MandatePublicationState,
} from "@/app/actions/mandate-publication";
import { Button } from "@/components/ui/button";

const initial: MandatePublicationState = {};

/**
 * Publie ou retire une demande d'acquisition du catalogue.
 *
 * Le droit est verifie par l'action serveur, pas ici : ce bouton n'est qu'un
 * declencheur. Un mandat deja publie garde son numero public lorsqu'il est
 * retire, la reference reste donc stable.
 */
export function MandatePublishButton({
  mandateId,
  isPublic,
}: {
  mandateId: string;
  isPublic: boolean;
}) {
  const [state, action, pending] = useActionState(toggleMandatePublicationAction, initial);
  const router = useRouter();

  /*
   * `revalidatePath` cote serveur ne suffit pas a rafraichir la vue ici : le
   * basculement aboutissait en base sans que la ligne change a l'ecran, ce qui
   * pousse a recliquer. On force donc le rafraichissement une fois l'action
   * terminee et sans erreur.
   */
  useEffect(() => {
    if (!pending && !state.error) router.refresh();
  }, [pending, state, router]);

  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="mandateId" value={mandateId} />
      <input type="hidden" name="publish" value={isPublic ? "false" : "true"} />
      <Button
        type="submit"
        size="sm"
        variant={isPublic ? "outline" : "default"}
        disabled={pending}
      >
        {pending ? "En cours…" : isPublic ? "Retirer du catalogue" : "Publier au catalogue"}
      </Button>
      {state.error ? (
        <p role="alert" className="text-right text-[13px] text-danger">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
