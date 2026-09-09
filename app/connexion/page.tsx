import { LoginForm } from "@/components/auth/login-form";

export const metadata = { title: "Connexion" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; callbackUrl?: string; error?: string }>;
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
  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) nextPath = "/app";
  const invalidLink = params.error === "lien-invalide";

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="font-serif text-2xl text-navy">Connexion</h1>
      <p className="mt-1 text-sm text-muted">
        Réservé aux courtiers immatriculés à l&apos;ORIAS.
      </p>
      {invalidLink ? (
        <p className="mt-3 border border-danger/30 bg-paper px-3 py-2 text-sm text-danger">
          Ce lien magique est invalide ou expiré. Demandez-en un nouveau.
        </p>
      ) : null}
      <div className="mt-6 border border-line bg-paper p-4">
        <LoginForm nextPath={nextPath} />
      </div>
    </main>
  );
}
