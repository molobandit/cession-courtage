"use client";

import { Button } from "@/components/ui/button";

/** Impression ou « Enregistrer en PDF », selon ce que propose le navigateur. */
export function PrintButton() {
  return (
    <Button type="button" variant="primary" onClick={() => window.print()}>
      Imprimer ou enregistrer en PDF
    </Button>
  );
}
