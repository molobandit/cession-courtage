import Link from "next/link";
import { redirect } from "next/navigation";
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
    <main className="mx-auto max-w-6xl px-4 py-6">
      <p className="text-sm text-muted">
        <Link href="/app" className="underline-offset-2 hover:underline">
          Espace membre
        </Link>
        {" / "}
        Import
      </p>
      <h1 className="mt-1 font-serif text-2xl text-navy">Importer un portefeuille</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Déposez un bordereau anonymisé. Le grain le plus fin autorisé est le code postal : toute
        colonne de nom, d&apos;e-mail, d&apos;adresse ou de téléphone entraîne un refus immédiat, et le
        fichier n&apos;est pas conservé.
      </p>

      <section className="mt-6 border border-line bg-paper p-4">
        <h2 className="font-serif text-lg text-navy">Nouveau fichier</h2>
        <div className="mt-3">
          <UploadPortfolioForm />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-lg text-navy">Imports récents</h2>
        <div className="mt-2 overflow-x-auto border border-line bg-paper">
          <table className="w-full text-sm">
            <thead className="bg-cream text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-2 py-1.5 font-medium">Fichier</th>
                <th className="px-2 py-1.5 font-medium">Statut</th>
                <th className="px-2 py-1.5 font-medium">Portefeuille</th>
                <th className="px-2 py-1.5 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {imports.length === 0 ? (
                <tr>
                  <td className="px-2 py-3 text-muted" colSpan={4}>
                    Aucun import pour le moment.
                  </td>
                </tr>
              ) : (
                imports.map((item) => (
                  <tr key={item.id} className="border-t border-line">
                    <td className="px-2 py-1.5">
                      <Link href={`/app/import/${item.id}`} className="underline-offset-2 hover:underline">
                        {item.originalFileName}
                      </Link>
                    </td>
                    <td className="px-2 py-1.5">{STATUS_LABEL[item.status] ?? item.status}</td>
                    <td className="px-2 py-1.5">{item.portfolio?.label ?? "Non associé"}</td>
                    <td className="px-2 py-1.5">{formatDate(item.createdAt)}</td>
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
