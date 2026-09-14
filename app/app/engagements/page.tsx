import Link from "next/link";
import { redirect } from "next/navigation";
import { DeskPageHeader } from "@/components/app/desk";
import { AgreementsSignForm } from "@/components/account/agreements-sign-form";
import { AGREEMENTS } from "@/lib/account/agreements";
import { loadAgreementsStatus } from "@/lib/account/agreements-load";
import { getActor, isOriasVerified } from "@/lib/authz";
import { formatDate } from "@/lib/format/fr";
import { safeInternalPath } from "@/lib/nav/safe-next";

export const metadata = { title: "Mes engagements" };

function retourSur(next: string | undefined): string | null {
  // Seules les adresses internes sont suivies : un lien extérieur ne sert pas de retour.
  return safeInternalPath(next);
}

export default async function AgreementsPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const actor = await getActor();
  if (!actor) redirect("/connexion?next=/app/engagements");
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");
  const { next } = await searchParams;
  const statut = await loadAgreementsStatus(actor);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <DeskPageHeader
        back={{ href: "/app/profil", label: "Mon compte" }}
        kicker="Engagements"
        title={statut.valid ? "Vos engagements sont signés" : "Signez une fois, pour toute la durée de votre ORIAS"}
        subtitle={
          <>
            Confidentialité et contrat d’intermédiation : les mêmes pour toutes vos annonces, prises de position et
            cessions. ORIAS n° {actor.oriasNumber ?? "—"}.
          </>
        }
      />

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        {AGREEMENTS.map((a) => {
          const s = statut.signed[a.kind];
          return (
            <article key={a.kind} className="rounded-3xl border border-line bg-paper p-5">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-indigo-dark">{a.short}</p>
              <h2 className="mt-1 text-lg font-semibold text-ink">{a.title}</h2>
              <p className={`mt-2 text-[14px] font-medium ${s ? "text-ok" : "text-muted"}`}>
                {s ? `✓ Signé le ${formatDate(s.signedAt)}` : "À signer"}
              </p>
              <Link href={`/app/engagements/${a.kind === "NDA" ? "confidentialite" : "intermediation"}`} className="mt-3 inline-block text-[14px] font-medium text-indigo-dark underline-offset-2 hover:underline">
                Lire le texte complet
              </Link>
            </article>
          );
        })}
      </section>

      {!statut.valid ? (
        <section className="mt-6 rounded-3xl border border-indigo-line bg-paper p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-ink">Signature</h2>
          <p className="mt-1 text-[14px] text-muted">
            Signature électronique simple : votre nom, la date, l’adresse IP et l’empreinte des textes sont conservés.
          </p>
          <div className="mt-4">
            <AgreementsSignForm representative={actor.fullName} next={retourSur(next)} />
          </div>
        </section>
      ) : retourSur(next) ? (
        <p className="mt-6">
          <Link href={retourSur(next)!} className="inline-flex h-10 items-center rounded-full bg-indigo px-4 text-[14px] font-semibold !text-white hover:bg-indigo-dark">
            Reprendre là où j’en étais
          </Link>
        </p>
      ) : null}
    </main>
  );
}
