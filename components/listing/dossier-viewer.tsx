"use client";

import Link from "next/link";
import { useRef, useState } from "react";

/**
 * Lecture du dossier de présentation dans l'application.
 *
 * Le PDF s'affiche en grand, avec trois gestes : revenir à l'annonce,
 * imprimer, télécharger. L'impression passe par le PDF lui-même : le papier
 * reproduit exactement les pages du dossier.
 */
export function DossierViewer({
  publicNumber,
  pdfHref,
  listingHref,
}: {
  publicNumber: number;
  pdfHref: string;
  listingHref: string;
}) {
  const cadre = useRef<HTMLIFrameElement>(null);
  const [pret, setPret] = useState(false);

  function imprimer() {
    const fenetre = cadre.current?.contentWindow;
    try {
      if (!fenetre) throw new Error("absent");
      fenetre.focus();
      fenetre.print();
    } catch {
      // Navigateur qui n'imprime pas un PDF intégré : on l'ouvre seul.
      window.open(pdfHref, "_blank", "noopener");
    }
  }

  return (
    <div className="flex h-[100dvh] flex-col bg-surface-alt">
      <header className="flex flex-wrap items-center gap-3 border-b border-line bg-paper px-4 py-3 sm:px-6">
        <Link href={listingHref} className="text-[14px] font-medium text-indigo-dark hover:underline">
          Retour à l&apos;annonce
        </Link>
        <h1 className="text-[15px] font-semibold text-ink sm:ml-4">Dossier de présentation n° {publicNumber}</h1>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={imprimer}
            disabled={!pret}
            className="inline-flex h-10 items-center rounded-full bg-indigo px-5 text-[14px] font-semibold text-white hover:bg-indigo-dark disabled:opacity-60"
          >
            Imprimer
          </button>
          <a
            href={`${pdfHref}?telecharger=1`}
            className="inline-flex h-10 items-center rounded-full border border-indigo-line bg-indigo-soft px-5 text-[14px] font-semibold text-indigo-dark hover:bg-indigo-soft/70"
          >
            Télécharger
          </a>
        </div>
      </header>

      {!pret ? (
        <p className="px-6 pt-6 text-center text-[14px] text-muted">Préparation du dossier, quelques secondes…</p>
      ) : null}

      <iframe
        ref={cadre}
        src={`${pdfHref}#view=Fit`}
        title={`Dossier de présentation n° ${publicNumber}`}
        onLoad={() => setPret(true)}
        className="hidden w-full flex-1 border-0 sm:block"
      />

      {/* Sur téléphone, le lecteur PDF du système est plus confortable. */}
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 sm:hidden">
        <a
          href={pdfHref}
          className="inline-flex h-12 items-center rounded-full bg-indigo px-6 text-[15px] font-semibold text-white"
        >
          Ouvrir le dossier
        </a>
        <p className="text-center text-[13px] text-muted">Le dossier s&apos;ouvre en plein écran. Vous pourrez l&apos;imprimer ou l&apos;enregistrer depuis votre téléphone.</p>
      </div>
    </div>
  );
}
