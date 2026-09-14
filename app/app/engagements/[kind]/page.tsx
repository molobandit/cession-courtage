import { notFound, redirect } from "next/navigation";
import { GeneratedDocumentView } from "@/components/documents/generated-document";
import { buildAgreement, type AgreementKind } from "@/lib/account/agreements";
import { loadAgreementsStatus } from "@/lib/account/agreements-load";
import { getActor, isOriasVerified } from "@/lib/authz";
import { loadDocumentParty } from "@/lib/direct/parties";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Engagement" };

const KINDS: Record<string, AgreementKind> = { confidentialite: "NDA", intermediation: "INTERMEDIATION" };

export default async function AgreementTextPage({ params }: { params: Promise<{ kind: string }> }) {
  const actor = await getActor();
  if (!actor) redirect("/connexion?next=/app/engagements");
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");
  const { kind } = await params;
  const k = KINDS[kind];
  if (!k) notFound();

  const [party, statut] = await Promise.all([loadDocumentParty(actor.id), loadAgreementsStatus(actor)]);
  const signe = statut.signed[k];
  const doc = buildAgreement(k, party, actor.oriasNumber ?? "", signe?.signedAt ?? new Date());
  const trace = signe
    ? await prisma.userAgreement.findFirst({
        where: { userId: actor.id, kind: k, version: signe.version, oriasNumber: signe.oriasNumber },
        select: { signatureName: true, contentHash: true, signedAt: true },
      })
    : null;

  return (
    <GeneratedDocumentView
      doc={doc}
      issuedAt={signe?.signedAt ?? new Date()}
      backHref="/app/engagements"
      backLabel="Retour à mes engagements"
      electronic
      signatures={trace ? [{ label: "Le courtier", name: trace.signatureName, signedAt: trace.signedAt, hash: trace.contentHash }] : []}
    />
  );
}
