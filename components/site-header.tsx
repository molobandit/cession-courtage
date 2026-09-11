import { getActor, isAdmin, isInvestor, isOriasVerified } from "@/lib/authz";
import { SiteHeaderBar } from "@/components/site-header-bar";

export async function SiteHeader() {
  const actor = await getActor();
  const session = actor
    ? {
        label: actor.fullName ?? actor.email,
        memberHref: isOriasVerified(actor)
          ? isAdmin(actor)
            ? "/admin/orias"
            : isInvestor(actor)
              ? "/app/mes-dossiers"
              : "/app"
          : "/en-attente-orias",
        memberLabel: isAdmin(actor) ? "Administration" : "Espace membre",
      }
    : null;

  return <SiteHeaderBar session={session} />;
}
