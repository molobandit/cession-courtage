import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CertificationDocActions } from "@/components/admin/certification-doc-actions";
import { getActor, getCertificationDossier, isAdmin } from "@/lib/authz";
import { formatDate } from "@/lib/format/fr";
import { resteAFaire } from "@/lib/listing/certification-decision";
import { certificationDocStatusLabel } from "@/lib/listing/certification-labels";

export const metadata = { title: "Contrôle de certification" };

const STATUT_ANNONCE: Record<string, string> = {
  NONE: "Non certifiée",
  PENDING: "En cours d’instruction",
  CERTIFIED: "Certifiée",
  REJECTED: "Refusée",
};

/**
 * Contrôle pièce par pièce d'une demande de certification.
 *
 * Le statut de l'annonce n'est pas modifiable ici, et c'est voulu : il découle
 * des pièces validées. Accorder le label à la main reviendrait à certifier sans
 * avoir contrôlé.
 */
export default async function AdminCertificationDossierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await getActor();
  const { id } = await params;
  if (!actor) redirect(`/connexion?next=/admin/certifications/${id}`);
  if (!isAdmin(actor)) redirect("/app");

  const dossier = await getCertificationDossier(actor, id);
  if (!dossier) notFound();

  const pieces = dossier.certificationDocs;
  const reste = resteAFaire(pieces);

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <p className="text-sm text-muted">
        <Link href="/admin/certifications" className="underline-offset-2 hover:underline">
          Demandes de certification
        </Link>
      </p>
      <h1 className="mt-2 font-serif text-2xl text-ink">
        Dossier n° {dossier.publicNumber}
      </h1>
      <p className="mt-1 text-sm text-muted">
        {dossier.displayedZone} · {STATUT_ANNONCE[dossier.certificationStatus] ?? dossier.certificationStatus}
        {" · "}mise à jour {formatDate(dossier.updatedAt)}
      </p>

      <div className="mt-4 rounded-xl border border-line bg-surface-alt px-4 py-3">
        {reste.length === 0 ? (
          <p className="text-[15px] text-ink">
            Toutes les pièces obligatoires sont validées : le label est acquis.
          </p>
        ) : (
          <>
            <p className="text-[15px] text-ink">
              Il reste {reste.length} pièce{reste.length > 1 ? "s" : ""} obligatoire
              {reste.length > 1 ? "s" : ""} avant le label.
            </p>
            <ul className="mt-2 grid gap-1 text-[13px] text-muted">
              {reste.map((ligne) => (
                <li key={ligne}>{ligne}</li>
              ))}
            </ul>
          </>
        )}
      </div>

      <ul className="mt-6 grid gap-4">
        {pieces.map((piece) => {
          const deposee = piece.status === "RECEIVED" || piece.status === "VALIDATED" || piece.status === "REJECTED";
          return (
            <li key={piece.id} className="rounded-xl border border-line bg-surface px-4 py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium text-ink">{piece.label}</span>
                <span className="text-[13px] text-muted">
                  {piece.required ? "Obligatoire" : "Facultative"} ·{" "}
                  {certificationDocStatusLabel(piece.status)}
                </span>
              </div>

              {piece.fileName ? (
                <p className="mt-2 text-[13px]">
                  <a
                    href={`/api/admin/certification/${piece.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo underline-offset-2 hover:underline"
                  >
                    Ouvrir {piece.fileName}
                  </a>
                  {piece.uploadedAt ? (
                    <span className="text-muted"> · déposée le {formatDate(piece.uploadedAt)}</span>
                  ) : null}
                </p>
              ) : null}

              {piece.teamComment ? (
                <p className="mt-1 text-[13px] text-muted">Note : {piece.teamComment}</p>
              ) : null}

              <div className="mt-3">
                <CertificationDocActions documentId={piece.id} deposee={deposee} />
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
