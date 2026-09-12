/**
 * Sceau de certification.
 *
 * Un cachet rouge incliné disait « tampon administratif » ; ce sceau dit
 * « label décerné ». La différence compte : la certification engage l'éditeur
 * devant l'acquéreur, elle doit en avoir l'apparence.
 *
 * Dessiné en SVG plutôt qu'en image : il reste net à toute taille, suit la
 * couleur du thème et ne coûte aucune requête.
 */
export function CertificationSeal({
  size = "md",
  withLabel = true,
}: {
  size?: "sm" | "md" | "lg";
  withLabel?: boolean;
}) {
  const px = size === "lg" ? 56 : size === "sm" ? 28 : 40;
  const texte =
    size === "lg" ? "text-[13px]" : size === "sm" ? "text-[10px]" : "text-[11px]";

  return (
    <span
      className="inline-flex items-center gap-2"
      title="Certifié"
    >
      <svg
        width={px}
        height={px}
        viewBox="0 0 48 48"
        role="img"
        aria-label="Certifié"
        className="shrink-0"
      >
        {/* Couronne dentelée : la silhouette d'un sceau, sans imiter un cachet. */}
        <path
          d="M24 1.5 27.6 4l4.3-.9 2.3 3.8 4.2 1.3.5 4.4 3.4 2.8-1.4 4.2 2 3.9-2.9 3.3.4 4.4-4 1.8-1.6 4.1-4.4.3L27 40.6l-3-.2-3 .2-3.4-2.8-4.4-.3-1.6-4.1-4-1.8.4-4.4L5.1 24l2-3.9-1.4-4.2L9.1 13l.5-4.4 4.2-1.3L16.1 3.5l4.3.9L24 1.5Z"
          className="fill-indigo"
        />
        <circle cx="24" cy="24" r="15.5" className="fill-surface" />
        <circle
          cx="24"
          cy="24"
          r="15.5"
          fill="none"
          strokeWidth="1.5"
          className="stroke-indigo"
        />
        <path
          d="m17 24.4 4.8 4.8L31.4 19.6"
          fill="none"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-indigo"
        />
      </svg>
      {withLabel ? (
        <span className={`font-semibold uppercase tracking-[0.14em] text-indigo ${texte}`}>
          Certifié
        </span>
      ) : null}
    </span>
  );
}
