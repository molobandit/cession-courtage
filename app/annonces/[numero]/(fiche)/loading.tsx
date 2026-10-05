/**
 * Écran d'attente de la fiche.
 *
 * La fiche interroge la base avant de s'afficher : sans cet écran, le clic
 * restait sans effet pendant une seconde ou deux, et le lecteur recliquait.
 */
export default function Loading() {
  return (
    <main className="bg-page pb-16">
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <p className="text-[13px] text-muted">Salle de marché</p>
        <div className="mt-5 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-3xl border border-line bg-paper p-6 shadow-sm sm:p-8">
            <div className="h-5 w-40 animate-pulse rounded bg-surface-alt" />
            <div className="mt-5 h-9 w-72 max-w-full animate-pulse rounded bg-surface-alt" />
            <div className="mt-3 h-4 w-56 max-w-full animate-pulse rounded bg-surface-alt" />
            <div className="mt-7 grid gap-3 sm:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface-alt" />
              ))}
            </div>
          </div>
          <aside className="h-48 animate-pulse rounded-3xl bg-deep-soft/60" />
        </div>
        <p className="mt-6 text-[14px] text-muted">Ouverture du dossier…</p>
      </div>
    </main>
  );
}
