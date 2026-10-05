import { NextResponse } from "next/server";
import { actorCanReadCompanyDocs, findCompanyDoc } from "@/lib/listing/company-docs";
import { getActor } from "@/lib/authz/actor";
import { prisma } from "@/lib/prisma";
import { getObject } from "@/lib/storage/objects";
import { documentUnavailable } from "@/lib/http/document-unavailable";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ listingId: string; docId: string }> },
) {
  const { listingId, docId } = await params;
  if (!(await actorCanReadCompanyDocs(listingId))) {
    return documentUnavailable();
  }
  const doc = await findCompanyDoc(listingId, docId);
  if (!doc) return documentUnavailable();
  // L'acquéreur d'un dossier ouvert sur l'annonce : son examen des pièces est journalisé.
  const actor = await getActor();
  if (actor) {
    const deal = await prisma.deal.findFirst({ where: { listingId, buyerId: actor.id }, select: { id: true } });
    if (deal) {
      await prisma.dataRoomView.create({ data: { dealId: deal.id, viewerId: actor.id, documentId: doc.id } }).catch(() => undefined);
    }
  }
  try {
    const bytes = await getObject(doc.storageKey);
    // Le moteur accepte un Uint8Array comme corps de reponse, les types du DOM
    // ne le declarent pas. On expose le tampon sous-jacent : meme contenu,
    // aucune copie, et le type attendu est respecte.
    return new NextResponse(bytes.buffer as ArrayBuffer, {
      headers: {
        "Content-Type": /\.png$/i.test(doc.fileName) ? "image/png" : /\.jpe?g$/i.test(doc.fileName) ? "image/jpeg" : "application/pdf",
        "Content-Disposition": `inline; filename="${doc.fileName.replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return documentUnavailable();
  }
}
