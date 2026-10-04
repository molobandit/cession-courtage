import Link from "next/link";

export const metadata = { title: "Lien envoyé" };

export default async function PasswordResetSentPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold tracking-tight text-ink">Vérifiez votre boîte</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">
        Si un compte existe pour {email ? <span className="font-medium text-ink">{email}</span> : "cette adresse"}, un
        lien vient d’être envoyé. Il est valable une heure et ne sert qu’une fois.
      </p>
      <Link href="/connexion" className="mt-6 inline-block text-[15px] font-medium text-indigo-dark hover:underline">
        Revenir à la connexion
      </Link>
    </main>
  );
}
