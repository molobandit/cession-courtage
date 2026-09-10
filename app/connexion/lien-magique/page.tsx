import { MagicLinkForm } from "@/components/auth/magic-link-form";

export const metadata = { title: "Lien magique" };

export default function MagicLinkRequestPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="font-serif text-2xl text-navy">Lien magique</h1>
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
