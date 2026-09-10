import { RegisterForm } from "@/components/auth/register-form";

export const metadata = { title: "Inscription" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ voie?: string }>;
}) {
  const { voie } = await searchParams;
  const certify = voie === "certifie";
  const defaultRole = voie === "acheter" ? "BUYER" : "SELLER";

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight text-ink">Créer votre compte</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">
        {certify
          ? "Vous demandez une certification. Après validation ORIAS, vous déposerez les pièces dans l’espace documentaire."
          : "Renseignez votre société et vos coordonnées professionnelles. Aucune donnée nominative de client final n’est collectée."}
      </p>
      <div className="mt-6 border border-line bg-paper p-5">
        <RegisterForm defaultRole={defaultRole} />
      </div>
    </main>
  );
}
