import { redirect } from "next/navigation";
import { isAdmin, requireActor } from "@/lib/authz";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireActor().catch(() => null);
  if (!actor) redirect("/connexion?next=/admin/orias");
  if (!isAdmin(actor)) redirect("/app");
  return children;
}
