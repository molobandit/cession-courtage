import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
        Place de marché B2B · courtiers ORIAS
      </p>
      <h1 className="mt-2 max-w-3xl font-serif text-3xl font-semibold leading-tight text-navy">
        Cédez ou acquérez un portefeuille de courtage, sans exposer la clientèle.
      </h1>
      <p className="mt-4 max-w-2xl text-[15px] text-ink/85">
        Valorisation par branche, anonymat jusqu&apos;à la lettre d&apos;intention, offres
        scellées pendant 21 jours. Réservé aux intermédiaires immatriculés à l&apos;ORIAS.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href="/inscription"
          className="inline-flex h-9 items-center rounded-sm bg-navy px-3.5 text-sm font-medium text-cream"
        >
          Ouvrir un compte
        </Link>
        <Link
          href="/annonces"
          className="inline-flex h-9 items-center rounded-sm border border-line bg-paper px-3.5 text-sm font-medium"
        >
          Voir les annonces
        </Link>
        <Link
          href="/connexion"
          className="inline-flex h-9 items-center rounded-sm border border-line bg-paper px-3.5 text-sm font-medium"
        >
          Connexion
        </Link>
      </div>
      <ol className="mt-10 grid gap-3 sm:grid-cols-3">
        {[
          { n: "01", t: "Importer", d: "Déposez un bordereau anonymisé. Les colonnes nominatives sont rejetées." },
          { n: "02", t: "Valoriser", d: "Multiple par risque, correctifs de concentration, fourchette basse / médiane / haute." },
          { n: "03", t: "Céder", d: "Fenêtre d'offres scellées, puis tunnel NDA, salle de données et séquestre." },
        ].map((step) => (
          <li key={step.n} className="border border-line bg-paper p-4">
            <p className="text-xs text-copper">{step.n}</p>
            <h2 className="mt-1 font-serif text-lg text-navy">{step.t}</h2>
            <p className="mt-1 text-sm text-muted">{step.d}</p>
          </li>
        ))}
      </ol>
    </main>
  );
}
