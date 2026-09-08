export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-20" aria-busy="true" aria-live="polite">
      <p className="text-[15px] text-muted">Chargement en cours.</p>
      <div className="mt-6 space-y-3" aria-hidden="true">
        <div className="h-9 w-2/3 rounded-full bg-line/60" />
        <div className="h-5 w-1/2 rounded-full bg-line/40" />
        <div className="h-5 w-1/3 rounded-full bg-line/40" />
      </div>
    </main>
  );
}
