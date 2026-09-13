"use client";

import { startTransition, type FormEvent } from "react";

/**
 * Envoie un formulaire à une action serveur sans le vider.
 *
 * Passée en `action`, une action serveur fait réinitialiser le formulaire par
 * React une fois terminée, erreur comprise : la case d'engagement se décoche
 * dans le navigateur alors que l'état du composant la croit cochée, et le
 * second envoi part sans consentement. Avec ce gestionnaire, la saisie reste
 * en place et l'erreur se corrige sans tout retaper.
 */
export function keepFormSubmit(dispatch: (data: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => dispatch(data));
  };
}
