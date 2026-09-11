import { redirect } from "next/navigation";
import { isAdmin, isOriasVerified, requireActor } from "@/lib/authz";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireActor().catch(() => null);
  if (!actor) redirect("/connexion?next=/app");
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");
  if (isAdmin(actor)) redirect("/admin/orias");
  return children;
}
