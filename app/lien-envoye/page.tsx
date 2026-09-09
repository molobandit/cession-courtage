import Link from "next/link";
import { findLatestDemoLink } from "@/lib/integrations/mailer";

export const metadata = { title: "Lien envoyé" };

export default async function LinkSentPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  const demoLink = email ? await findLatestDemoLink(email) : null;

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="font-serif text-2xl text-navy">Vérifiez votre messagerie</h1>
      <p className="mt-2 text-sm text-muted">
        Si un compte correspond à{" "}
        <span className="text-ink">{email ?? "cette adresse"}</span>, un lien de
        connexion a été émis. Il expire dans 15 minutes.
      </p>
      {demoLink ? (
        <div className="mt-6 border border-line bg-paper p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Mode démonstration</p>
          <p className="mt-1 text-sm">
            Aucun SMTP n&apos;est configuré. Utilisez ce lien pour vous connecter :
          </p>
          <a href={demoLink} className="mt-2 block break-all text-sm text-navy underline">
            {demoLink}
          </a>
        </div>
      ) : null}
      <p className="mt-6 text-sm">
        <Link href="/boite-demo" className="underline-offset-2 hover:underline">
          Ouvrir la boîte démo
        </Link>
      </p>
    </main>
  );
}
