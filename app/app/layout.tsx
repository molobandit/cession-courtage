import { redirect } from "next/navigation";
import { MemberShell } from "@/components/app/member-shell";
import { canBuy, canSell, isAdmin, isOriasVerified, requireActor } from "@/lib/authz";
import { hasContactSubscription } from "@/lib/billing/contact-access";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireActor().catch(() => null);
  if (!actor) redirect("/connexion?next=/app");
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");
  if (isAdmin(actor)) redirect("/admin/orias");

  const subscribed = await hasContactSubscription(actor);
  const firstName = actor.fullName?.split(" ")[0] ?? "Courtier";

  return (
    <MemberShell
      firstName={firstName}
      alias={actor.publicAlias}
      orias={actor.oriasNumber}
      canSell={canSell(actor)}
      canBuy={canBuy(actor)}
      subscribed={subscribed}
    >
      {children}
    </MemberShell>
  );
}
