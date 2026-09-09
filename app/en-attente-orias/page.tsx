import { redirect } from "next/navigation";
import { getActor, isAdmin, isOriasVerified } from "@/lib/authz";

export default async function PendingOriasPage() {
  const actor = await getActor();
  if (!actor) redirect("/connexion?next=/en-attente-orias");
  if (isOriasVerified(actor)) redirect(isAdmin(actor) ? "/admin/orias" : "/app");

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <p className="text-xs uppercase tracking-[0.14em] text-copper">Compte en attente</p>
      <h1 className="mt-2 font-serif text-2xl text-navy">Validation ORIAS en cours</h1>
      <p className="mt-3 text-sm text-ink/85">
        Votre inscription est enregistrée. L&apos;accès à l&apos;espace membre sera ouvert dès
        qu&apos;un administrateur aura vérifié le numéro ORIAS{" "}
        <span className="font-medium">{actor.oriasNumber}</span>.
      </p>
      <dl className="mt-6 grid grid-cols-[8rem_1fr] gap-y-2 border border-line bg-paper px-4 py-3 text-sm">
        <dt className="text-muted">Alias</dt>
        <dd>{actor.publicAlias}</dd>
        <dt className="text-muted">E-mail</dt>
        <dd>{actor.email}</dd>
        <dt className="text-muted">Rôle</dt>
        <dd>
          {actor.role === "SELLER" ? "Cédant" : actor.role === "BUYER" ? "Acquéreur" : "Cédant et acquéreur"}
        </dd>
      </dl>
    </main>
  );
}
