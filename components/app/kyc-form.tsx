"use client";

import { useActionState } from "react";
import { submitKycAction, type KycFormState } from "@/app/actions/kyc";
import { Button } from "@/components/ui/button";

const initial: KycFormState = {};

export function KycSubmitForm({ status }: { status: "NONE" | "PENDING" | "VERIFIED" | "REJECTED" }) {
  const [state, action, pending] = useActionState(submitKycAction, initial);

  if (status === "VERIFIED") {
    return <p className="text-[15px] text-ok">Identité professionnelle vérifiée.</p>;
  }
  if (status === "PENDING") {
    return (
      <p className="text-[15px] text-muted">
        Dossier transmis. Aucun prestataire de paiement n’est branché : un administrateur
        confirme manuellement.
      </p>
    );
  }

  return (
    <form action={action} className="grid gap-3">
      <p className="text-[15px] leading-relaxed text-muted">
        Déclarez être le représentant du compte. Aucune pièce d’identité n’est envoyée à un
        prestataire externe. Cette étape prépare l’ouverture d’un paiement agréé, sans le
        brancher aujourd’hui.
      </p>
      <Button type="submit" disabled={pending}>
        {pending ? "Transmission…" : "Transmettre le dossier"}
      </Button>
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      {state.ok ? <p className="text-sm text-ok">{state.ok}</p> : null}
    </form>
  );
}
