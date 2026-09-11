import { NextResponse } from "next/server";
import { actorCanReadCompanyDocs, findCompanyDoc } from "@/lib/listing/company-docs";
import { getObject } from "@/lib/storage/objects";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ listingId: string; docId: string }> },
) {
  const { listingId, docId } = await params;
  if (!(await actorCanReadCompanyDocs(listingId))) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 404 });
  }
  const doc = await findCompanyDoc(listingId, docId);
  if (!doc) return NextResponse.json({ error: "Pièce introuvable." }, { status: 404 });
  try {
    const bytes = await getObject(doc.storageKey);
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${doc.fileName.replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  }
}
