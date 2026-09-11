import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { MemberShell } from "@/components/app/member-shell";
import { PendingShell } from "@/components/app/pending-shell";
import { canBuy, canSell, getActor, isAdmin, isInvestor, isOriasVerified } from "@/lib/authz";
import { hasContactSubscription } from "@/lib/billing/contact-access";

export async function MemberChrome({ children }: { children: React.ReactNode }) {
  const actor = await getActor();

  if (!actor || isAdmin(actor)) {
    return (
      <>
        <SiteHeader />
        {children}
        <SiteFooter />
      </>
    );
  }

  if (!isOriasVerified(actor)) {
    const firstName = actor.fullName?.split(" ")[0] ?? "Courtier";
    return <PendingShell firstName={firstName}>{children}</PendingShell>;
  }

  const subscribed = await hasContactSubscription(actor);
  const firstName = actor.fullName?.split(" ")[0] ?? (isInvestor(actor) ? "Investisseur" : "Courtier");

  return (
    <MemberShell
      firstName={firstName}
      alias={actor.publicAlias}
      orias={actor.oriasNumber}
      canSell={canSell(actor)}
      canBuy={canBuy(actor)}
      isInvestor={isInvestor(actor)}
      subscribed={subscribed}
    >
      {children}
    </MemberShell>
  );
}
