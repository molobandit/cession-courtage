import { MagicLinkForm } from "@/components/auth/magic-link-form";

export const metadata = { title: "Recevoir un code par e-mail" };

export default function MagicLinkRequestPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight text-ink">Recevoir un code par e-mail</h1>
      <p className="mt-1 text-sm text-muted">
        Si un compte existe pour cet e-mail, un code à six chiffres et un lien
        de connexion valables 15 minutes vous sont adressés. Aucun mot de passe
        n&apos;est demandé.
      </p>
      <div className="mt-6 border border-line bg-paper p-4">
        <MagicLinkForm />
      </div>
    </main>
  );
}
