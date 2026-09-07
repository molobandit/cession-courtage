import { RegisterForm } from "@/components/auth/register-form";

export const metadata = { title: "Inscription" };

export default function RegisterPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="font-serif text-2xl text-navy">Ouvrir un compte</h1>
      <p className="mt-1 text-sm text-muted">
        Le compte reste en attente jusqu&apos;à validation de votre numéro ORIAS par un
        administrateur. Aucune donnée nominative de client final n&apos;est collectée.
      </p>
      <div className="mt-6 border border-line bg-paper p-4">
        <RegisterForm />
      </div>
    </main>
  );
}
