import Link from "next/link";
import { redirect } from "next/navigation";
import { ToolIcon } from "@/components/app/toolbox";
import { ServiceWizard } from "@/components/direct/service-wizard";
import { getActor, isOriasVerified } from "@/lib/authz";
import { serviceByKey, serviceListHref } from "@/lib/direct/services";

export const metadata = { title: "Créer un service" };

export default async function CreateServicePage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string }>;
}) {
  const { service: demande } = await searchParams;
  const actor = await getActor();
  if (!actor) redirect(`/connexion?next=/app/services/creer?service=${demande ?? "kit"}`);
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");

  const service = serviceByKey(demande);
  if (!service) redirect("/app/services/creer?service=kit");

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href={serviceListHref(service)}
        className="mb-5 inline-flex items-center gap-2 text-[14px] text-muted hover:text-ink"
      >
        <ToolIcon name="arrow-left" className="h-4 w-4" />
        {service.listTitle}
      </Link>
      <ServiceWizard key={service.key} service={service.key} title={service.heading} />
    </main>
  );
}
