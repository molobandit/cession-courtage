import { LAST_UPDATED, legalIdentityIncomplete } from "@/lib/legal/entity";

export function LegalNotice() {
  if (!legalIdentityIncomplete()) return null;
  return (
    <div className="mb-8 rounded-3xl border border-danger/40 bg-danger/5 p-5">
      <p className="text-[15px] font-medium text-danger">
        Identité de l’éditeur non renseignée
      </p>
      <p className="mt-2 text-[15px] leading-relaxed text-ink">
        Les mentions obligatoires sont encore des espaces réservés. Renseignez
        <code className="mx-1 rounded bg-surface-alt px-1.5 py-0.5 text-sm">lib/legal/entity.ts</code>
        avant toute mise en ligne publique : l’article 6-III de la loi pour la
        confiance dans l’économie numérique impose que l’éditeur soit identifiable.
      </p>
    </div>
  );
}

export function LegalLayout({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <main>
      <section className="border-y border-line bg-indigo-soft text-ink">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-indigo-dark">
            {eyebrow}
          </p>
          <h1 className="mt-4 max-w-3xl font-serif text-4xl font-semibold leading-tight">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] text-muted">{intro}</p>
          <p className="mt-4 text-sm text-muted">
            Dernière mise à jour : {LAST_UPDATED}
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-4 py-12">
        <LegalNotice />
        <div className="space-y-8">{children}</div>
      </section>
    </main>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-line bg-paper p-6">
      <h2 className="font-serif text-xl font-semibold text-ink">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-muted">{children}</div>
    </section>
  );
}

export function LegalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-line py-2 last:border-b-0 sm:flex-row sm:gap-6">
      <span className="w-56 shrink-0 text-[15px] font-medium text-ink">{label}</span>
      <span className="text-[15px] text-muted">{value}</span>
    </div>
  );
}
