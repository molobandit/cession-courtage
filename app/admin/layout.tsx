import { AdminNav } from "@/components/admin/admin-nav";
import { countUnreadInvestorInquiries, isAdmin, requireActor } from "@/lib/authz";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireActor().catch(() => null);
  if (!actor) redirect("/connexion?next=/admin/orias");
  if (!isAdmin(actor)) redirect("/app");
  const unreadInquiries = await countUnreadInvestorInquiries(actor);

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">Administration</p>
        <AdminNav unreadInquiries={unreadInquiries} />
      </div>
      {children}
    </>
  );
}
