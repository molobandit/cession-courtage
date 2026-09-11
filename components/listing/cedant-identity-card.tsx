import type { CedantIdentity } from "@/lib/listing/cedant-identity";
import { INTEREST_DEPOSIT_LABEL } from "@/lib/billing/rates";

export function CedantIdentityCard({ identity }: { identity: CedantIdentity }) {
  const rows = [
    { label: "Cabinet", value: `${identity.legalName} (${identity.legalForm})` },
    { label: "Siège", value: `${identity.address}, ${identity.postalCode} ${identity.city}` },
    { label: "ORIAS", value: identity.oriasNumber },
    { label: "Interlocuteur", value: identity.fullName ?? "Non renseigné" },
    { label: "E-mail", value: identity.email },
    { label: "Téléphone", value: identity.phone ?? "Non renseigné" },
  ];

  return (
    <section className="rounded-[1.75rem] border border-indigo-line bg-indigo-soft p-5 sm:p-7">
      <h2 className="text-lg font-bold tracking-tight text-ink">Coordonnées du cédant</h2>
      <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
        Ouvertes par votre dépôt de {INTEREST_DEPOSIT_LABEL} du prix. Les assurés du
        portefeuille restent anonymes : aucun nom, courriel ni téléphone de client
        final n’est transmis à cette étape.
      </p>
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
