import { PasswordResetRequestForm } from "@/components/auth/password-reset-forms";

export const metadata = { title: "Mot de passe oublié" };

export default function PasswordResetRequestPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold tracking-tight text-ink">Mot de passe oublié</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">
        Indiquez l’adresse de votre compte. Si elle est connue, vous recevez un lien pour
        choisir un nouveau mot de passe, valable une heure.
      </p>
      <div className="mt-6 rounded-2xl border border-line bg-paper p-5">
        <PasswordResetRequestForm />
      </div>
    </main>
  );
}
