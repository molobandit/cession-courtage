import { redirect } from "next/navigation";
import { serviceByFilter, serviceByKey, serviceCreateHref, serviceListHref } from "@/lib/direct/services";

/**
 * Ancienne entrée des services à la carte.
 *
 * Les liens déjà envoyés — invitations, favoris — continuent de mener au bon
 * endroit : la création d'un service, sa liste, ou le tableau de bord.
 */
export default async function FormaliserPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string; dossiers?: string }>;
}) {
  const params = await searchParams;
  const service = serviceByKey(params.service);
  if (service) redirect(serviceCreateHref(service));
  const liste = serviceByFilter(params.dossiers);
  if (liste) redirect(serviceListHref(liste));
  redirect("/app#actions-rapides");
}
