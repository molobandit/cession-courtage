import "server-only";
import { loadAgreementsStatus } from "@/lib/account/agreements-load";
import { checkFinancing } from "@/lib/buyer/financing-load";
import type { EngagementReadiness } from "@/components/offer/engagement-readiness";

/** Ce qui manque à un acquéreur pour s'engager sur une annonce, pour l'afficher avant qu'il ne remplisse le formulaire. */
export async function loadEngagementReadiness(
  buyer: { id: string; oriasNumber: string | null },
  montantVise: number,
  returnTo: string,
): Promise<EngagementReadiness> {
  const [engagements, financement] = await Promise.all([loadAgreementsStatus(buyer), checkFinancing(buyer.id, montantVise)]);
  return {
    agreements: engagements.valid,
    financing: financement.ok ? { ok: true } : { ok: false, raison: financement.raison },
    returnTo,
  };
}
