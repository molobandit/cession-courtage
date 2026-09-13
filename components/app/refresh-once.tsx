"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Rafraîchit la page une fois affichée.
 *
 * La pastille de la cloche est calculée par la mise en page, en même temps que
 * la page qui marque les notifications comme lues : sans ce second passage,
 * elle affichait encore l'ancien nombre.
 */
export function RefreshOnce({ when }: { when: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (when) router.refresh();
  }, [when, router]);
  return null;
}
