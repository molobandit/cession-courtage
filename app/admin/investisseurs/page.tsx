import Link from "next/link";
import { redirect } from "next/navigation";
import { InquiryReadActions } from "@/components/admin/inquiry-read-actions";
import { getActor, isAdmin, listInvestorInquiries } from "@/lib/authz";
import { formatDate, formatDateTime } from "@/lib/format/fr";
import { formatEuroWhole } from "@/lib/format/number";
import { LISTING_STATUS_LABELS } from "@/lib/labels";
import { listAllInvestorPositions } from "@/lib/investor/positions";
import {
  formatInvestorTicket,
  investorInterventionLabel,
  investorTypeLabel,
} from "@/lib/investor/labels";

export const metadata = { title: "Demandes investisseurs" };

export default async function AdminInvestisseursPage() {
  const actor = await getActor();
  if (!actor) redirect("/connexion?next=/admin/investisseurs");
  if (!isAdmin(actor)) redirect("/app");
  const inquiries = await listInvestorInquiries(actor);
  const positions = await listAllInvestorPositions(actor);
  const unread = inquiries.filter((row) => row.readAt == null).length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="font-serif text-2xl text-navy">Demandes investisseurs</h1>
      <p className="mt-1 text-sm text-muted">
        {unread === 0
          ? `${inquiries.length} demande${inquiries.length > 1 ? "s" : ""} · tout est lu.`
          : `${unread} non lue${unread > 1 ? "s" : ""} sur ${inquiries.length}.`}
      </p>
      <div className="mt-4 overflow-x-auto border border-line bg-paper">
        <table className="w-full min-w-[72rem] text-sm">
          <thead className="bg-surface-alt text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-2 py-1.5 font-medium">État</th>
              <th className="px-2 py-1.5 font-medium">Organisation</th>
              <th className="px-2 py-1.5 font-medium">Contact</th>
              <th className="px-2 py-1.5 font-medium">Type</th>
              <th className="px-2 py-1.5 font-medium">Ticket</th>
              <th className="px-2 py-1.5 font-medium">Zones</th>
              <th className="px-2 py-1.5 font-medium">Secteurs</th>
              <th className="px-2 py-1.5 font-medium">Intervention</th>
              <th className="px-2 py-1.5 font-medium">Annonce</th>
              <th className="px-2 py-1.5 font-medium">Date</th>
              <th className="px-2 py-1.5 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {inquiries.length === 0 ? (
              <tr>
                <td className="px-2 py-3 text-muted" colSpan={11}>
                  Aucune manifestation d’intérêt pour le moment.
                </td>
              </tr>
            ) : (
              inquiries.map((row) => {
                const unreadRow = row.readAt == null;
                return (
                  <tr
                    key={row.id}
                    className={`border-t border-line align-top ${unreadRow ? "bg-indigo-soft/40" : ""}`}
                  >
                    <td className="px-2 py-2">
                      <span className={unreadRow ? "font-semibold text-ink" : "text-muted"}>
                        {unreadRow ? "Non lu" : "Lu"}
                      </span>
                    </td>
                    <td className="px-2 py-2 font-medium text-ink">{row.organisation}</td>
                    <td className="px-2 py-2">
                      <div className="font-medium text-ink">{row.fullName}</div>
                      <div className="text-xs text-muted">{row.jobTitle || "Fonction non renseignée"}</div>
                      <div className="text-xs text-muted">{row.email}</div>
                      <div className="text-xs text-muted">{row.phone || "Téléphone non renseigné"}</div>
                    </td>
                    <td className="px-2 py-2">{investorTypeLabel(row.investorType)}</td>
                    <td className="px-2 py-2 tabular-nums">
                      {formatInvestorTicket(row.ticketMinEur, row.ticketMaxEur)}
                    </td>
                    <td className="px-2 py-2">{row.zones}</td>
                    <td className="px-2 py-2">{row.sectors || "Non renseigné"}</td>
                    <td className="px-2 py-2">{investorInterventionLabel(row.intervention)}</td>
                    <td className="px-2 py-2">
                      {row.listing ? (
                        <Link
                          href={`/annonces/${row.listing.publicNumber}`}
                          className="underline-offset-2 hover:underline"
                        >
                          Dossier n° {row.listing.publicNumber}
                        </Link>
                      ) : row.listingId ? (
                        row.listingId
                      ) : (
                        "Aucune"
                      )}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">{formatDateTime(row.createdAt)}</td>
                    <td className="px-2 py-2">
                      <InquiryReadActions inquiryId={row.id} read={!unreadRow} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 font-serif text-xl text-navy">Dossiers suivis (dépôt 2,5 %)</h2>
      <p className="mt-1 text-sm text-muted">
        Intérêt qualifié après dépôt. Pas une prise de participation.
      </p>
      <div className="mt-4 overflow-x-auto border border-line bg-paper">
        <table className="w-full text-sm">
          <thead className="bg-surface-alt text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-2 py-1.5 font-medium">Investisseur</th>
              <th className="px-2 py-1.5 font-medium">Dossier</th>
              <th className="px-2 py-1.5 font-medium">Avancement</th>
              <th className="px-2 py-1.5 font-medium">Dépôt</th>
              <th className="px-2 py-1.5 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {positions.length === 0 ? (
              <tr>
                <td className="px-2 py-3 text-muted" colSpan={5}>
                  Aucun dossier suivi.
                </td>
              </tr>
            ) : (
              positions.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="px-2 py-2">
                    <div>{row.investor.fullName ?? "Non renseigné"}</div>
                    <div className="text-xs text-muted">{row.investor.email}</div>
                  </td>
                  <td className="px-2 py-2">
                    <Link
                      href={`/annonces/${row.listing.publicNumber}`}
                      className="underline-offset-2 hover:underline"
                    >
                      Dossier n° {row.listing.publicNumber}
                    </Link>
                  </td>
                  <td className="px-2 py-2">
                    {LISTING_STATUS_LABELS[row.listing.status] ?? row.listing.status}
                  </td>
                  <td className="px-2 py-2 tabular-nums">{formatEuroWhole(Number(row.depositAmount))}</td>
                  <td className="px-2 py-2 whitespace-nowrap">{formatDate(row.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
