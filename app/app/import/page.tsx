import Link from "next/link";
import { redirect } from "next/navigation";
import { MemberPageHeader } from "@/components/app/member-page-header";
import { UploadPortfolioForm } from "@/components/import/upload-form";
import { canSell, getActor, isOriasVerified, listMyImports } from "@/lib/authz";
import { formatDate } from "@/lib/format/fr";

export const metadata = { title: "Importer un portefeuille" };

const STATUS_LABEL: Record<string, string> = {
  UPLOADED: "Déposé",
  REJECTED_PII: "Refusé (données nominatives)",
  MAPPED: "Correspondance",
  COMPLETED: "Terminé",
};

export default async function ImportIndexPage() {
  const actor = await getActor();
  if (!actor) redirect("/connexion?next=/app/import");
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");
  if (!canSell(actor)) redirect("/app");

  const imports = await listMyImports(actor);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <MemberPageHeader title="Importer un portefeuille">
        Déposez un bordereau anonymisé. Le grain le plus fin autorisé est le
        code postal : toute colonne de nom, d’e-mail, d’adresse ou de téléphone
        entraîne un refus, et le fichier n’est pas conservé.
      </MemberPageHeader>

      <section className="rounded-3xl border border-line bg-paper p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Nouveau fichier</h2>
        <div className="mt-3">
          <UploadPortfolioForm />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink">Imports récents</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-paper">
          <table className="w-full text-[14px]">
            <thead className="bg-surface-alt text-left text-[12px] text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Fichier</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Portefeuille</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {imports.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-muted" colSpan={4}>
                    Aucun import pour le moment.
                  </td>
                </tr>
              ) : (
                imports.map((item) => (
                  <tr key={item.id} className="border-t border-line">
                    <td className="px-4 py-3">
                      <Link href={`/app/import/${item.id}`} className="font-medium text-indigo-dark">
                        {item.originalFileName}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{STATUS_LABEL[item.status] ?? item.status}</td>
                    <td className="px-4 py-3">{item.portfolio?.label ?? "Non associé"}</td>
                    <td className="px-4 py-3">{formatDate(item.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
