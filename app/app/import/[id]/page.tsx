import Link from "next/link";
import { ImportStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { MappingForm } from "@/components/import/mapping-form";
import { canSell, findMyImport, getActor, isOriasVerified } from "@/lib/authz";
import { applyMapping } from "@/lib/import/apply-mapping";
import { PREVIEW_ROWS } from "@/lib/import/constants";
import { mappingIsComplete, parseStoredMapping } from "@/lib/import/mapping";
import { parseUploadedTable } from "@/lib/import/parse-file";
import { readImportFile } from "@/lib/import/persist";
import { formatDate, formatEuro } from "@/lib/format/fr";

export const metadata = { title: "Correspondance des colonnes" };

export default async function ImportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await getActor();
  if (!actor) redirect("/connexion?next=/app/import");
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");
  if (!canSell(actor)) redirect("/app");

  const { id } = await params;
  const record = await findMyImport(id, actor);
  if (!record) redirect("/app/import");

  if (record.status === ImportStatus.REJECTED_PII) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-6">
        <p className="text-sm text-muted">
          <Link href="/app/import" className="underline-offset-2 hover:underline">
            Import
          </Link>
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">Import refusé</h1>
        <div className="mt-4 border border-danger/40 bg-paper p-4 text-sm text-danger">
          {record.rejectionReason ??
            "Le fichier contient des données nominatives de clients. Le grain le plus fin autorisé est le code postal."}
        </div>
        <p className="mt-3 text-sm text-muted">
          Fichier : {record.originalFileName}. Il n&apos;a pas été conservé. Aucune ligne de contrat
          n&apos;a été créée.
        </p>
        <p className="mt-4">
          <Link href="/app/import" className="text-sm underline-offset-2 hover:underline">
            Déposer un bordereau anonymisé
          </Link>
        </p>
      </main>
    );
  }

  if (record.status === ImportStatus.COMPLETED) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Import terminé</h1>
        <p className="mt-2 text-sm text-muted">
          {record.originalFileName} a été intégré
          {record.completedAt ? ` le ${formatDate(record.completedAt)}` : ""}.
        </p>
        <p className="mt-4">
          <Link href="/app" className="text-sm underline-offset-2 hover:underline">
            Retour à l&apos;espace membre
          </Link>
        </p>
      </main>
    );
  }

  if (record.storageKey === "deleted") {
    redirect("/app/import");
  }

  let table;
  try {
    const buffer = await readImportFile(record.storageKey);
    table = parseUploadedTable(buffer, record.originalFileName);
  } catch {
    return (
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Fichier introuvable</h1>
        <p className="mt-2 text-sm text-muted">Réimportez le bordereau.</p>
        <Link href="/app/import" className="mt-4 inline-block text-sm underline-offset-2 hover:underline">
          Nouvel import
        </Link>
      </main>
    );
  }

  const mapping = parseStoredMapping(record.columnMapping);
  const mappingError = mappingIsComplete(mapping);
  const mapped = mappingError ? null : applyMapping(table.headers, table.rows, mapping, record.id);
  const previewSource = table.rows.slice(0, PREVIEW_ROWS);
  const mappedPreview = mapped?.lines.slice(0, PREVIEW_ROWS) ?? [];
  const defaultLabel = record.originalFileName.replace(/\.(csv|xlsx|xls)$/i, "");

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <p className="text-sm text-muted">
        <Link href="/app/import" className="underline-offset-2 hover:underline">
          Import
        </Link>
        {" / "}
        Correspondance
      </p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">Correspondance des colonnes</h1>
      <p className="mt-1 text-sm text-muted">
        {record.originalFileName} · {table.rows.length.toLocaleString("fr-FR")} lignes · encodage{" "}
        {table.encoding}
        {table.delimiter === "xlsx" ? " · Excel" : ` · séparateur « ${table.delimiter} »`}
      </p>

      <section className="mt-6 border border-line bg-paper p-4">
        <MappingForm
          importId={record.id}
          headers={table.headers}
          mapping={mapping}
          defaultLabel={defaultLabel}
          canConfirm={!mappingError}
        />
      </section>

      {mapped ? (
        <p className="mt-4 text-sm">
          <span className="text-ok">{mapped.lines.length.toLocaleString("fr-FR")} lignes valides</span>
          {mapped.errors.length > 0 ? (
            <span className="text-danger">
              {" "}
              · {mapped.errors.length.toLocaleString("fr-FR")} ligne(s) ignorée(s)
            </span>
          ) : null}
          {mapped.warnings.map((warning) => (
            <span key={warning} className="block text-muted">
              {warning}
            </span>
          ))}
        </p>
      ) : (
        <p className="mt-4 text-sm text-danger">{mappingError}</p>
      )}

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-ink">Aperçu (20 premières lignes)</h2>
        <div className="mt-2 overflow-x-auto border border-line bg-paper">
          <table className="w-full text-xs">
            <thead className="bg-surface-alt text-left uppercase tracking-wide text-muted">
              <tr>
                {table.headers.map((header) => (
                  <th key={header} className="whitespace-nowrap px-2 py-1.5 font-medium">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewSource.map((row, index) => (
                <tr key={index} className="border-t border-line">
                  {table.headers.map((_, col) => (
                    <td key={col} className="whitespace-nowrap px-2 py-1">
                      {row[col] ?? ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {mappedPreview.length > 0 ? (
        <section className="mt-6">
          <h2 className="text-lg font-semibold text-ink">Aperçu après correspondance</h2>
          <div className="mt-2 overflow-x-auto border border-line bg-paper">
            <table className="w-full text-xs">
              <thead className="bg-surface-alt text-left uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-2 py-1.5 font-medium">Compagnie</th>
                  <th className="px-2 py-1.5 font-medium">Risque</th>
                  <th className="px-2 py-1.5 text-right font-medium">Prime</th>
                  <th className="px-2 py-1.5 text-right font-medium">Commission</th>
                  <th className="px-2 py-1.5 font-medium">Effet</th>
                  <th className="px-2 py-1.5 font-medium">CP</th>
                  <th className="px-2 py-1.5 font-medium">Dép.</th>
                </tr>
              </thead>
              <tbody>
                {mappedPreview.map((line, index) => (
                  <tr key={index} className="border-t border-line">
                    <td className="px-2 py-1">{line.carrier}</td>
                    <td className="px-2 py-1">{line.riskType}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{formatEuro(Number(line.premium))}</td>
                    <td className="px-2 py-1 text-right tabular-nums">
                      {formatEuro(Number(line.annualCommission))}
                    </td>
                    <td className="px-2 py-1">{formatDate(line.effectiveDate as Date)}</td>
                    <td className="px-2 py-1">{line.postalCode}</td>
                    <td className="px-2 py-1">{line.department}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {mapped && mapped.errors.length > 0 ? (
        <section className="mt-6">
          <h2 className="text-lg font-semibold text-ink">Lignes ignorées</h2>
          <ul className="mt-2 list-disc pl-5 text-sm text-danger">
            {mapped.errors.slice(0, 20).map((issue) => (
              <li key={`${issue.row}-${issue.message}`}>
                Ligne {issue.row} : {issue.message}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
