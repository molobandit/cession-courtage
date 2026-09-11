import Link from "next/link";
import { redirect } from "next/navigation";
import { getActor, isAdmin, listCertificationRequests } from "@/lib/authz";
import { formatDate } from "@/lib/format/fr";
import { LISTING_STATUS_LABELS } from "@/lib/labels";
import { summarizeCertificationSlots } from "@/lib/listing/certification-slots";

export const metadata = { title: "Certifications" };

const CERTIFICATION_STATUS_LABELS: Record<string, string> = {
  NONE: "Non certifié",
  PENDING: "En cours",
  CERTIFIED: "Certifié",
};

function certificationStatusLabel(value: string): string {
  return CERTIFICATION_STATUS_LABELS[value] ?? value;
}

export default async function AdminCertificationsPage() {
  const actor = await getActor();
  if (!actor) redirect("/connexion?next=/admin/certifications");
  if (!isAdmin(actor)) redirect("/app");
  const listings = await listCertificationRequests(actor);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="font-serif text-2xl text-navy">Demandes de certification</h1>
      <p className="mt-1 text-sm text-muted">
        Annonces dont le cédant a demandé la certification, avec l’avancement des 8 pièces.
      </p>
      <div className="mt-4 overflow-x-auto border border-line bg-paper">
        <table className="w-full text-sm">
          <thead className="bg-surface-alt text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-2 py-1.5 font-medium">Annonce</th>
              <th className="px-2 py-1.5 font-medium">Zone</th>
              <th className="px-2 py-1.5 font-medium">Statut</th>
              <th className="px-2 py-1.5 font-medium">Certification</th>
              <th className="px-2 py-1.5 font-medium">Reçues</th>
              <th className="px-2 py-1.5 font-medium">Validées</th>
              <th className="px-2 py-1.5 font-medium">Obligatoires manquantes</th>
              <th className="px-2 py-1.5 font-medium">Mise à jour</th>
            </tr>
          </thead>
          <tbody>
            {listings.length === 0 ? (
              <tr>
                <td className="px-2 py-3 text-muted" colSpan={8}>
                  Aucune demande de certification.
                </td>
              </tr>
            ) : (
              listings.map((listing) => {
                const progress = summarizeCertificationSlots(listing.certificationDocs);
                return (
                  <tr key={listing.id} className="border-t border-line align-top">
                    <td className="px-2 py-2">
                      <Link
                        href={`/annonces/${listing.publicNumber}`}
                        className="font-medium underline-offset-2 hover:underline"
                      >
                        Dossier n° {listing.publicNumber}
                      </Link>
                    </td>
                    <td className="px-2 py-2">{listing.displayedZone}</td>
                    <td className="px-2 py-2">
                      {LISTING_STATUS_LABELS[listing.status] ?? listing.status}
                    </td>
                    <td className="px-2 py-2">{certificationStatusLabel(listing.certificationStatus)}</td>
                    <td className="px-2 py-2 tabular-nums">
                      {progress.received} / {progress.slotCount}
                    </td>
                    <td className="px-2 py-2 tabular-nums">
                      {progress.validated} / {progress.slotCount}
                    </td>
                    <td className="px-2 py-2 tabular-nums font-medium">
                      {progress.requiredMissing}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">{formatDate(listing.updatedAt)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
