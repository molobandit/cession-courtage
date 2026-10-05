import type { CedantIdentity } from "@/lib/listing/cedant-identity";

export function CedantIdentityCard({ identity }: { identity: CedantIdentity }) {
  /*
   * Une case vide ne dit rien : elle fait seulement douter du dossier. Les
   * lignes sans valeur sont retirées plutôt qu'affichées « Non renseigné ».
   */
  const rows = [
    { label: "Cabinet", value: `${identity.legalName} (${identity.legalForm})` },
    { label: "Siège", value: `${identity.address}, ${identity.postalCode} ${identity.city}` },
    { label: "ORIAS", value: identity.oriasNumber },
    { label: "Interlocuteur", value: identity.fullName },
    { label: "E-mail", value: identity.email },
    { label: "Téléphone", value: identity.phone },
  ].filter((row): row is { label: string; value: string } => Boolean(row.value?.trim()));

  return (
    <section className="rounded-[1.75rem] border border-indigo-line bg-indigo-soft p-5 sm:p-7">
      <h2 className="text-lg font-bold tracking-tight text-ink">Coordonnées du cédant</h2>
      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-[12px] font-medium uppercase tracking-wide text-muted">{row.label}</dt>
            <dd className="mt-1 text-[15px] font-medium text-ink">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
