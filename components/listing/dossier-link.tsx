"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Un lien vers un dossier, qui va chercher le PDF avant le clic.
 *
 * Le lecteur PDF du navigateur demande le fichier deux fois et met quelques
 * secondes entre les deux. En lançant la requête dès que le pointeur arrive
 * sur le lien, le fichier est déjà dans le cache du navigateur quand la page
 * du lecteur s'ouvre : les deux demandes sont alors servies sans réseau.
 *
 * Rien n'en dépend : si le survol n'a pas lieu, ou si la requête échoue, la
 * page du lecteur va le chercher comme avant.
 */
export function DossierLink({
  href,
  pdfHref,
  className,
  children,
}: {
  /** La page du lecteur. */
  href: string;
  /** Le PDF qu'elle affichera. */
  pdfHref: string;
  className?: string;
  children: ReactNode;
}) {
  let lance = false;
  const prefetch = () => {
    if (lance) return;
    lance = true;
    void fetch(pdfHref, { credentials: "include" }).catch(() => undefined);
  };

  return (
    <Link
      href={href}
      className={className}
      onPointerEnter={prefetch}
      onFocus={prefetch}
      onTouchStart={prefetch}
    >
      {children}
    </Link>
  );
}
