import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/register-form";
import { InvestorRegisterForm } from "@/components/auth/investor-register-form";
import { getActor, isAdmin, isInvestor, isOriasVerified } from "@/lib/authz";

export const metadata = { title: "Inscription" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ voie?: string }>;
}) {
  const { voie } = await searchParams;
  const actor = await getActor();
  if (actor) {
    if (isInvestor(actor)) redirect("/app/mes-dossiers");
    if (!isOriasVerified(actor)) redirect("/en-attente-orias");
    if (isAdmin(actor)) redirect("/admin/orias");
    redirect("/app");
  }
  const certify = voie === "certifie";
  const investor = voie === "investir";
  const defaultRole = voie === "acheter" ? "BUYER" : "SELLER";

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight text-ink">
        {investor ? "Compte investisseur" : "Créer votre compte"}
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">
        {investor
          ? "Pas de numéro ORIAS ni de société de courtage. Vous suivez des dossiers sous alias. Les assurés restent anonymes."
          : certify
            ? "Vous demandez une certification. Après validation ORIAS, vous déposerez les pièces dans l’espace documentaire."
            : "Renseignez votre société et vos coordonnées professionnelles. Aucune donnée nominative de client final n’est collectée."}
      </p>
      <div className="mt-6 border border-line bg-paper p-5">
        {investor ? <InvestorRegisterForm /> : <RegisterForm defaultRole={defaultRole} />}
      </div>
    </main>
  );
}
