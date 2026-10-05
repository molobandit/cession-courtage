"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Lecture du dossier de présentation dans l'application.
 *
 * Le PDF s'affiche en grand, avec trois gestes : revenir à l'annonce,
 * imprimer, télécharger. L'impression passe par une page dédiée qui ne
 * contient que les pages du dossier : le papier
 * reproduit exactement les pages du dossier.
 *
 * Le fichier est d'abord téléchargé ici, puis donné au lecteur sous forme
 * d'adresse locale. En lui donnant l'adresse du serveur, le lecteur PDF de
 * Chrome abandonnait sa première requête et la rejouait quelques secondes
 * plus tard, et l'écran restait noir pendant ce temps. Une adresse locale ne
 * se rejoue pas : le fichier est déjà en mémoire.
 */
export function DossierViewer({
  publicNumber,
  pdfHref,
  listingHref,
  title = `Dossier de présentation n° ${publicNumber}`,
}: {
  publicNumber: number;
  pdfHref: string;
  listingHref: string;
  title?: string;
}) {
  const [pret, setPret] = useState(false);
  const [source, setSource] = useState<string | null>(null);
  /** Téléchargement impossible : on laisse le lecteur aller le chercher lui même. */
  const [echec, setEchec] = useState(false);

  useEffect(() => {
    /*
     * Sur téléphone, le lecteur du système ouvre le fichier depuis son
     * adresse : inutile de le télécharger deux fois.
     */
    if (!window.matchMedia("(min-width: 640px)").matches) return;

    let vivant = true;
    let adresse: string | null = null;
    void (async () => {
      try {
        const reponse = await fetch(pdfHref, { credentials: "include" });
        const type = reponse.headers.get("content-type") ?? "";
        if (!reponse.ok || !type.includes("application/pdf")) throw new Error(String(reponse.status));
        const blob = await reponse.blob();
        if (!vivant) return;
        adresse = URL.createObjectURL(blob);
        setSource(adresse);
      } catch {
        if (vivant) setEchec(true);
      }
    })();

    return () => {
      vivant = false;
      if (adresse) URL.revokeObjectURL(adresse);
    };
  }, [pdfHref]);

  const adresseLecteur = source ?? (echec ? pdfHref : null);

  return (
    <div className="flex h-[calc(100dvh-4.1rem)] flex-col bg-surface-alt">
      <header className="flex flex-wrap items-center gap-3 border-b border-line bg-paper px-4 py-3 sm:px-6">
        <Link
          href={listingHref}
          onClick={(e) => {
            // Revenir là d'où l'on vient (annonce, dossier de cession), sinon à l'annonce.
            if (window.history.length > 1) {
              e.preventDefault();
              window.history.back();
            }
          }}
          className="text-[14px] font-medium text-indigo-dark hover:underline"
        >
          Retour
        </Link>
        <h1 className="text-[15px] font-semibold text-ink sm:ml-4">{title}</h1>
        <div className="ml-auto flex gap-2">
          {/* Page à imprimer : seules les pages du dossier partent à l'imprimante. */}
          <a
            href={`${pdfHref}?impression=1`}
            className="inline-flex h-10 items-center rounded-full bg-indigo px-5 text-[14px] font-semibold text-white hover:bg-indigo-dark"
          >
            Imprimer
          </a>
          <a
            href={`${pdfHref}?telecharger=1`}
            download
            className="inline-flex h-10 items-center rounded-full border border-indigo-line bg-indigo-soft px-5 text-[14px] font-semibold text-indigo-dark hover:bg-indigo-soft/70"
          >
            Télécharger
          </a>
        </div>
      </header>

      {/*
        Le message n'a de sens que là où le dossier s'affiche dans la page. Sur
        téléphone, le bouton plus bas ouvre le lecteur du système, et il n'y a
        rien à préparer.
      */}
      {!pret ? (
        <p className="hidden px-6 pt-6 text-center text-[14px] text-muted sm:block">
          Préparation du dossier, quelques secondes…
        </p>
      ) : null}

      {adresseLecteur ? (
        <iframe
          src={`${adresseLecteur}#navpanes=0&view=Fit`}
          title={title}
          onLoad={() => setPret(true)}
          className="hidden w-full flex-1 border-0 sm:block"
        />
      ) : (
        <div className="hidden flex-1 sm:block" />
      )}

      {/* Sur téléphone, le lecteur PDF du système est plus confortable. */}
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 sm:hidden">
        <a
          href={pdfHref}
          className="inline-flex h-12 items-center rounded-full bg-indigo px-6 text-[15px] font-semibold text-white"
        >
          Ouvrir le dossier
        </a>
        <p className="text-center text-[13px] text-muted">Le dossier s&apos;ouvre en plein écran. Pour l&apos;imprimer ou l&apos;enregistrer, utilisez les boutons en haut de cette page.</p>
      </div>
    </div>
  );
}
