/**
 * Place de marché alignée : engagements signés une fois, annonces relues avant
 * publication, cote publique des offres, sur la vraie base D1 locale.
 *
 * Prérequis : `npm run db:migrate && npm run db:seed`.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ListingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { disposePlatformProxy } from "./setup/prisma-test";
import { connecterUtilisateur } from "./setup/auth-stub";
import { signAgreementsAction } from "@/app/actions/agreements";
import { reviewListingAction } from "@/app/actions/listing-review";
import { publishListingAction, updateListingAction } from "@/app/actions/listings";
import { getListingByPublicNumber } from "@/lib/authz";
import { listingQuotes } from "@/lib/offer/quote";
import { restaurer, sauvegarder } from "./setup/engagements";

const LISTING = "lst_01";
let brief: { askingPrice: unknown; presentation: string | null };
const debut = new Date(Date.now() - 1000);
let cedant: string;
let admin: string;
let initial: { status: ListingStatus; publishedAt: Date | null; offerWindowClosesAt: Date | null };
let sauvegarde: Awaited<ReturnType<typeof sauvegarder>>;

function form(champs: Record<string, string>): FormData {
  const data = new FormData();
  for (const [c, v] of Object.entries(champs)) data.set(c, v);
  return data;
}

beforeAll(async () => {
  const l = await prisma.listing.findUniqueOrThrow({
    where: { id: LISTING },
    select: { status: true, publishedAt: true, offerWindowClosesAt: true, portfolio: { select: { firm: { select: { users: { select: { id: true }, where: { role: { in: ["SELLER", "BOTH"] } } } } } } } },
  });
  initial = { status: l.status, publishedAt: l.publishedAt, offerWindowClosesAt: l.offerWindowClosesAt };
  brief = await prisma.listing.findUniqueOrThrow({ where: { id: LISTING }, select: { askingPrice: true, presentation: true } });
  cedant = l.portfolio.firm.users[0]!.id;
  admin = (await prisma.user.findFirstOrThrow({ where: { role: "ADMIN" }, select: { id: true } })).id;
  sauvegarde = await sauvegarder([cedant]);
  await prisma.listing.update({ where: { id: LISTING }, data: { status: ListingStatus.DRAFT } });
});

afterAll(async () => {
  connecterUtilisateur(null);
  await prisma.listing.update({
    where: { id: LISTING },
    data: { ...initial, ...brief, askingPrice: String(brief.askingPrice), submittedForReviewAt: null, reviewedAt: null, reviewNote: null },
  });
  await restaurer(sauvegarde);
  await prisma.notification.deleteMany({ where: { createdAt: { gte: debut } } });
  await prisma.outboundEmail.deleteMany({ where: { createdAt: { gte: debut } } });
  await disposePlatformProxy();
});

describe("engagements signés une fois", () => {
  it("refusent la publication tant qu’ils ne sont pas signés", async () => {
    connecterUtilisateur(cedant);
    const r = await publishListingAction({}, form({ listingId: LISTING }));
    expect(r.error).toContain("engagements");
  });

  it("se signent au nom du titulaire du compte, et valent sous son ORIAS", async () => {
    connecterUtilisateur(cedant);
    expect((await signAgreementsAction({}, form({ consent: "on", signatureName: "Quelqu’un d’autre" }))).error).toContain("titulaire");
    const u = await prisma.user.findUniqueOrThrow({ where: { id: cedant }, select: { fullName: true, oriasNumber: true } });
    expect((await signAgreementsAction({}, form({ consent: "on", signatureName: u.fullName ?? "" }))).ok).toBeTruthy();
    const rows = await prisma.userAgreement.findMany({ where: { userId: cedant }, select: { kind: true, oriasNumber: true, contentHash: true } });
    expect(rows.map((r) => r.kind).sort()).toEqual(["INTERMEDIATION", "NDA"]);
    expect(rows.every((r) => r.oriasNumber === u.oriasNumber && r.contentHash.length === 64)).toBe(true);
  });
});

describe("mise en vente gratuite, relue avant publication", () => {
  it("passe en cotation, invisible du public jusqu’à la décision", async () => {
    connecterUtilisateur(cedant);
    expect(await publishListingAction({}, form({ listingId: LISTING }))).toEqual({});
    const l = await prisma.listing.findUniqueOrThrow({ where: { id: LISTING }, select: { status: true, publicNumber: true, submittedForReviewAt: true } });
    expect(l.status).toBe(ListingStatus.PENDING_REVIEW);
    expect(l.submittedForReviewAt).not.toBeNull();
    expect(await getListingByPublicNumber(l.publicNumber, null)).toBeNull();
    expect(await prisma.notification.count({ where: { userId: admin, title: { startsWith: "Annonce à relire" }, createdAt: { gte: debut } } })).toBeGreaterThan(0);
  });

  it("un renvoi exige un motif et rend l’annonce au cédant", async () => {
    connecterUtilisateur(cedant);
    expect((await reviewListingAction({}, form({ listingId: LISTING, decision: "approve" }))).error).toContain("administrateurs");
    connecterUtilisateur(admin);
    expect((await reviewListingAction({}, form({ listingId: LISTING, decision: "reject", note: "court" }))).error).toContain("motif");
    expect((await reviewListingAction({}, form({ listingId: LISTING, decision: "reject", note: "Raison sociale citée dans la présentation." }))).ok).toBeTruthy();
    const l = await prisma.listing.findUniqueOrThrow({ where: { id: LISTING }, select: { status: true, reviewNote: true } });
    expect(l.status).toBe(ListingStatus.DRAFT);
    expect(l.reviewNote).toContain("Raison sociale");
  });

  it("renvoyée, elle se corrige ; en relecture, elle ne se modifie plus", async () => {
    connecterUtilisateur(cedant);
    const correction = form({ listingId: LISTING, askingPrice: "12 500", presentation: "Portefeuille santé en agence, sans nom de cabinet.", negotiable: "yes", sellerSupportMonths: "3" });
    await expect(updateListingAction({}, correction)).rejects.toThrow(/NEXT_REDIRECT/);
    const l = await prisma.listing.findUniqueOrThrow({ where: { id: LISTING }, select: { status: true, askingPrice: true, presentation: true } });
    expect(l.status).toBe(ListingStatus.DRAFT);
    expect(Number(l.askingPrice)).toBe(12500);
    expect(l.presentation).toContain("sans nom de cabinet");
    expect((await updateListingAction({}, form({ listingId: LISTING, askingPrice: "500" }))).error).toContain("prix");

    expect(await publishListingAction({}, form({ listingId: LISTING }))).toEqual({});
    expect((await updateListingAction({}, form({ listingId: LISTING, askingPrice: "13 000" }))).error).toContain("brouillon");
    connecterUtilisateur(admin);
    expect((await reviewListingAction({}, form({ listingId: LISTING, decision: "reject", note: "Précisez la part du récurrent." }))).ok).toBeTruthy();
  });

  it("publiée, elle ouvre sa séance de 21 jours et prévient le cédant", async () => {
    connecterUtilisateur(cedant);
    await publishListingAction({}, form({ listingId: LISTING }));
    connecterUtilisateur(admin);
    expect((await reviewListingAction({}, form({ listingId: LISTING, decision: "approve" }))).ok).toBeTruthy();
    const l = await prisma.listing.findUniqueOrThrow({ where: { id: LISTING }, select: { status: true, offerWindowClosesAt: true, publicNumber: true } });
    expect(l.status).toBe(ListingStatus.OFFERS_OPEN);
    const jours = (l.offerWindowClosesAt!.getTime() - Date.now()) / 86_400_000;
    expect(jours).toBeGreaterThan(20.9);
    expect(await getListingByPublicNumber(l.publicNumber, null)).not.toBeNull();
    expect(await prisma.notification.count({ where: { userId: cedant, title: { startsWith: "Annonce en ligne" }, createdAt: { gte: debut } } })).toBe(1);
  });
});

describe("cote publique", () => {
  it("donne la meilleure offre et le nombre d’offres en cours", async () => {
    const offres = await prisma.offer.findMany({ where: { status: { in: ["SUBMITTED", "ACCEPTED"] } }, select: { listingId: true, amount: true } });
    const annonce = offres[0]!.listingId;
    const attendues = offres.filter((o) => o.listingId === annonce);
    const cote = (await listingQuotes([annonce])).get(annonce)!;
    expect(cote.offerCount).toBe(attendues.length);
    expect(cote.bestOffer).toBe(Math.max(...attendues.map((o) => Number(o.amount))));
  });
});
