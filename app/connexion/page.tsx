import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getActor, isAdmin, isInvestor, isOriasVerified } from "@/lib/authz";
import { safeInternalPath } from "@/lib/nav/safe-next";

export const metadata = { title: "Connexion" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; callbackUrl?: string; error?: string; reinitialise?: string }>;
}) {
  const params = await searchParams;
  const rawNext = params.next ?? params.callbackUrl ?? "/app";
  let nextPath = "/app";
  try {
    if (rawNext.startsWith("/")) {
      nextPath = rawNext;
    } else {
      const url = new URL(rawNext);
      if (url.origin === (process.env.AUTH_URL ?? "http://localhost:3000")) {
        nextPath = `${url.pathname}${url.search}`;
      }
    }
  } catch {
    nextPath = "/app";
  }
  nextPath = safeInternalPath(nextPath) ?? "/app";
  const invalidLink = params.error === "lien-invalide";
  const reinitialise = params.reinitialise === "1";

  const actor = await getActor();
  if (actor) {
    if (!isOriasVerified(actor)) redirect("/en-attente-orias");
    if (isAdmin(actor)) redirect("/admin/orias");
    if (isInvestor(actor)) {
      redirect(
        nextPath.startsWith("/app") || nextPath.startsWith("/annonces") || nextPath.startsWith("/investisseurs")
          ? nextPath
          : "/app/mes-dossiers",
      );
    }
    redirect(nextPath.startsWith("/app") || nextPath.startsWith("/annonces") ? nextPath : "/app");
  }

  return (
    <main className="mx-auto max-w-md px-4 py-14">
      <h1 className="text-3xl font-bold tracking-tight text-ink">Connexion</h1>
      <p className="mt-2 text-[15px] text-muted">
        Courtiers immatriculés ORIAS et investisseurs.
      </p>
      {invalidLink ? (
        <p className="mt-4 rounded-2xl border border-danger/30 bg-paper px-4 py-3 text-sm text-danger">
          Ce lien de connexion est invalide ou expiré. Demandez-en un nouveau.
        </p>
      ) : null}
      {reinitialise ? (
        <p className="mt-4 rounded-2xl border border-ok/30 bg-paper px-4 py-3 text-sm text-ink">
          Votre mot de passe est enregistré. Connectez-vous avec.
        </p>
      ) : null}
      <div className="mt-6 rounded-2xl border border-line bg-paper p-6">
        <LoginForm nextPath={nextPath} />
      </div>
    </main>
  );
}
