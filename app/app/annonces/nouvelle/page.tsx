import Link from "next/link";
import { redirect } from "next/navigation";
import { MemberPageHeader } from "@/components/app/member-page-header";
import { CreateListingForm } from "@/components/listing/listing-forms";
import { canSell, findMyPortfolio, getActor, isOriasVerified, listMyPortfolios } from "@/lib/authz";
import { formatEuro } from "@/lib/format/fr";
import { readFirmProfile } from "@/lib/firm/profile";
import { defaultsFromFirmProfile } from "@/lib/listing/form-defaults";
import { listingCommissionShares } from "@/lib/listing/lot-totals";
import { precompteFromContracts } from "@/lib/listing/perception";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Nouvelle annonce" };

export default async function NewListingPage({
  searchParams,
}: {
  searchParams: Promise<{ portfolio?: string; certifier?: string }>;
}) {
  const actor = await getActor();
  if (!actor) redirect("/connexion?next=/app/annonces/nouvelle");
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");
  if (!canSell(actor)) redirect("/app");
  const { portfolio: portfolioId, certifier } = await searchParams;
  const portfolios = await listMyPortfolios(actor);
  const selected = portfolioId
    ? await findMyPortfolio(portfolioId, actor)
    : portfolios[0]
      ? await findMyPortfolio(portfolios[0].id, actor)
      : null;
  if (!selected) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <MemberPageHeader title="Proposer un portefeuille à la vente">
          Commencez par importer votre bordereau. Notre équipe réalise ensuite l’étude du portefeuille, puis met l’annonce en ligne sous alias.
        </MemberPageHeader>
        <Link
          href="/app/import"
          className="inline-flex min-h-11 items-center rounded-full bg-indigo px-5 text-[14px] font-semibold !text-white"
        >
          Importer un bordereau
        </Link>
      </main>
    );
  }
  const firm = actor.firmId
    ? await prisma.firm.findUnique({ where: { id: actor.firmId }, select: { profileJson: true } })
    : null;
  const parts = await listingCommissionShares([{ id: selected.id, portfolioId: selected.id, isPartial: false }]);
  const lu = precompteFromContracts(null, parts.get(selected.id)?.advanced ?? 0, parts.get(selected.id)?.total ?? 0);
  const profil = {
    ...defaultsFromFirmProfile(readFirmProfile(firm?.profileJson)),
    ...(lu === null ? {} : { precompte: lu ? "yes" : "no" }),
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <MemberPageHeader title="Proposer un portefeuille à la vente">
        {selected.label} · commissions {formatEuro(selected.annualCommissions)} / an. Le profil de votre cabinet
        pré-remplit l’organisation et la conformité : vérifiez, complétez, enregistrez. Notre équipe réalise
        ensuite l’étude du portefeuille et détermine le montant de mise en ligne.
      </MemberPageHeader>
      {portfolios.length > 1 ? (
        <p className="mt-2 text-sm">
          {portfolios.map((p) => (
            <Link key={p.id} href={`/app/annonces/nouvelle?portfolio=${p.id}`} className="mr-3 underline-offset-2 hover:underline">
              {p.label}
            </Link>
          ))}
        </p>
      ) : null}
      <div className="mt-4">
        <CreateListingForm
          portfolioId={selected.id}
          defaultCertify={certifier === "1"}
          defaults={profil}
          qualityDefaults={{
            commissionsYear1:
              selected.commissionsYear1 != null ? String(Number(selected.commissionsYear1)) : "",
            commissionsYear2:
              selected.commissionsYear2 != null ? String(Number(selected.commissionsYear2)) : "",
            commissionsYear3:
              selected.commissionsYear3 != null ? String(Number(selected.commissionsYear3)) : "",
            recurrentSharePercent:
              selected.recurrentCommissionShare != null
                ? String(Math.round(Number(selected.recurrentCommissionShare) * 100))
                : "",
            managedAnnualPremium:
              selected.managedAnnualPremium != null
                ? String(Number(selected.managedAnnualPremium))
                : "",
          }}
        />
      </div>
    </main>
  );
}
