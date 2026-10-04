import Link from "next/link";
import { PasswordResetForm } from "@/components/auth/password-reset-forms";
import { checkPasswordResetToken } from "@/lib/auth/password-reset";

export const metadata = { title: "Nouveau mot de passe" };

export default async function NewPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; token?: string }>;
}) {
  const { email, token } = await searchParams;
  const valide = email && token ? await checkPasswordResetToken(email, token) : false;

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold tracking-tight text-ink">Nouveau mot de passe</h1>
      {valide ? (
        <>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">
            Choisissez un mot de passe d’au moins dix caractères, avec une lettre et un chiffre.
          </p>
          <div className="mt-6 rounded-2xl border border-line bg-paper p-5">
            <PasswordResetForm email={email!} token={token!} />
          </div>
        </>
      ) : (
        <>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">
            Ce lien a expiré ou a déjà servi. Demandez-en un nouveau, il arrive aussitôt.
          </p>
          <Link
            href="/connexion/mot-de-passe"
            className="mt-6 inline-block text-[15px] font-medium text-indigo-dark hover:underline"
          >
            Demander un nouveau lien
          </Link>
        </>
      )}
    </main>
  );
}
