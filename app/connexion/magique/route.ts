import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = url.searchParams.get("email");
  const token = url.searchParams.get("token");
  if (!email || !token) {
    redirect("/connexion?error=lien-invalide");
  }
  try {
    await signIn("magic-link", {
      email,
      token,
      redirectTo: "/app",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/connexion?error=lien-invalide");
    }
    throw error;
  }
}
