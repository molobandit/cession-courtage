import Link from "next/link";
import { notFound } from "next/navigation";
import { isDemoInboxEnabled } from "@/lib/integrations/mailer";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Boîte démo" };

export default async function DemoInboxPage() {
  if (!isDemoInboxEnabled()) notFound();

  const rows = await prisma.outboundEmail.findMany({
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-serif text-2xl text-navy">Boîte de démonstration</h1>
      <p className="mt-2 text-sm text-muted">
        Aucun e-mail réel n&apos;est envoyé. Les liens magiques et messages transactionnels
        mockés apparaissent ici tant que <code>DEMO_INBOX=true</code>.
      </p>
      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-muted">Aucun message pour le moment.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="border border-line bg-paper p-3 text-sm">
              <p className="text-xs uppercase tracking-wide text-muted">
                {row.purpose} · {row.to}
              </p>
              <p className="mt-1 font-medium text-navy">{row.subject}</p>
              <pre className="mt-2 whitespace-pre-wrap break-all text-xs text-ink/85">{row.bodyText}</pre>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6 text-sm">
        <Link href="/connexion" className="underline-offset-2 hover:underline">
          Retour à la connexion
        </Link>
      </p>
    </main>
  );
}
