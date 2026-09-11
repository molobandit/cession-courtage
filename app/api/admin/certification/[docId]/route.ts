import { NextResponse } from "next/server";
import { findCertificationDocForAdmin, getActor, isAdmin } from "@/lib/authz";
import { getObject } from "@/lib/storage/objects";

/**
 * Sert une pièce de certification à l'éditeur qui doit la contrôler.
 *
 * Sans elle, valider reviendrait à se fier au seul nom du fichier : le label
 * certifierait l'existence d'un envoi, pas son contenu.
 *
 * 404 et non 403 sur un accès refusé : un 403 confirmerait que la pièce existe.
 */
function typeParExtension(fileName: string): string {
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  return "application/pdf";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ docId: string }> },
) {
  const actor = await getActor();
  if (!actor || !isAdmin(actor)) {
    return NextResponse.json({ error: "Pièce introuvable." }, { status: 404 });
  }

  const { docId } = await params;
  const doc = await findCertificationDocForAdmin(actor, docId);
  if (!doc?.storageKey || !doc.fileName) {
    return NextResponse.json({ error: "Pièce introuvable." }, { status: 404 });
  }

  try {
    const bytes = await getObject(doc.storageKey);
    // Le moteur accepte un Uint8Array ; les types du DOM ne le declarent pas.
    return new NextResponse(bytes.buffer as ArrayBuffer, {
      headers: {
        "Content-Type": typeParExtension(doc.fileName),
        "Content-Disposition": `inline; filename="${doc.fileName.replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  }
}
