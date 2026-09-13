import { notFound, redirect } from "next/navigation";
import { GeneratedDocumentView, type ElectronicSignature } from "@/components/documents/generated-document";
import { getActor, isOriasVerified } from "@/lib/authz";
import { isDealParticipant } from "@/lib/authz/policies";
import { dealPieces } from "@/lib/deal/pieces";
import { documentHash, loadDealProcess } from "@/lib/deal/process-load";
import { buildDocument, buildLetterOfIntent } from "@/lib/direct/documents";

export const metadata = { title: "Pièce du dossier" };

export default async function DealPiecePage({ params }: { params: Promise<{ id: string; piece: string }> }) {
  const actor = await getActor();
  const { id, piece } = await params;
  if (!actor) redirect(`/connexion?next=/app/dossiers/${id}/pieces/${piece}`);
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");

  const p = await loadDealProcess(id);
  if (!p || !isDealParticipant(actor, p.deal)) notFound();
  const { deal } = p;

  // Une pièce qui n'est pas encore ouverte n'existe pas, même en tapant l'adresse.
  const disponible = dealPieces({ stage: deal.stage, loiProposed: Boolean(deal.loiProposedAt), carriers: p.carriers }).find(
    (x) => x.key === piece,
  );
  if (!disponible?.available) notFound();

  const ctx = p.context(actor.id);
  const doc = piece === "lettre-intention" ? buildLetterOfIntent(ctx) : buildDocument(piece, ctx);
  if (!doc) notFound();

  const nom = (userId: string) => (userId === deal.sellerId ? p.parties.seller : p.parties.buyer).representative ?? "—";
  const libelle = (userId: string) =>
    userId === deal.sellerId ? "Le cédant" : piece === "lettre-intention" ? "L’acquéreur" : "Le cessionnaire";

  let signatures: ElectronicSignature[] = [];
  if (piece === "protocole") {
    const hash = documentHash(doc);
    signatures = deal.signoffs
      .filter((s) => s.kind === "DEED_SIGNED" && s.contentHash === hash)
      .map((s) => ({ label: libelle(s.userId), name: s.signatureName ?? nom(s.userId), signedAt: s.createdAt, hash: s.contentHash }));
  } else if (piece === "confidentialite") {
    signatures = deal.signoffs
      .filter((s) => s.kind === "NDA_SIGNED")
      .map((s) => ({ label: libelle(s.userId), name: nom(s.userId), signedAt: s.createdAt, hash: null }));
  } else if (piece === "lettre-intention") {
    const proposition = deal.loiProposedAt;
    const acceptation = deal.signoffs.find((s) => s.kind === "LOI_ACCEPTED" && (!proposition || s.createdAt >= proposition));
    const lettre = deal.documents.find((d) => d.slot === "generated:lettre-intention");
    if (proposition || lettre) {
      signatures.push({ label: "L’acquéreur", name: nom(deal.buyerId), signedAt: proposition ?? lettre!.createdAt, hash: null });
    }
    if (acceptation) signatures.push({ label: "Le cédant", name: nom(deal.sellerId), signedAt: acceptation.createdAt, hash: null });
  }

  return (
    <GeneratedDocumentView
      doc={doc}
      issuedAt={ctx.issuedAt}
      backHref={`/app/dossiers/${deal.id}`}
      signatures={signatures}
      banner={
        doc.signedAt === null && piece.startsWith("attestation-") ? (
          <p className="rounded-xl border border-indigo-line bg-indigo-soft px-4 py-3 text-[14px] text-ink">
            Imprimez l’attestation, faites-la signer par les deux parties, adressez-la à la compagnie, puis déposez la
            version signée dans le dossier.
          </p>
        ) : null
      }
    />
  );
}
