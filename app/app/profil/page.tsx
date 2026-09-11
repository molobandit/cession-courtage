import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountNav } from "@/components/app/account-nav";
import { DeuxFacteurs } from "@/components/app/deux-facteurs";
import { EffacementForm } from "@/components/app/effacement-form";
import { NotifyForm } from "@/components/app/notify-form";
import { PasswordForm } from "@/components/app/password-form";
import { KycSubmitForm } from "@/components/app/kyc-form";
import { SubscribeButton } from "@/components/billing/subscribe-button";
import { confirmGrowthCheckout } from "@/app/actions/billing";
import { codesDeSecoursRestants, secondFacteurActif } from "@/lib/auth/second-facteur";
import { canBuy, getActor, isInvestor, isOriasVerified } from "@/lib/authz";
import { CapacityForm } from "@/components/app/capacity-form";
import { libelleCapacite } from "@/lib/buyer/financial-capacity";
import { SearchPrefsForm } from "@/components/app/search-prefs-form";
import { parseNotifyPrefs } from "@/lib/account/notify-prefs";
import { parseSearchPrefs } from "@/lib/account/search-prefs";
import { hasContactSubscription } from "@/lib/billing/contact-access";
import { GROWTH_PLAN_ANNUAL_EUR, INTEREST_DEPOSIT_LABEL, growthPlanAnnualTtcEur } from "@/lib/billing/rates";
import { formatDate, formatEuroPrecise } from "@/lib/format/fr";
import { formatEuroWhole } from "@/lib/format/number";
import { DOCUMENT_TYPE_LABELS, KYC_STATUS_LABELS, ROLE_LABELS } from "@/lib/labels";
import { ProfileForm } from "@/components/app/profile-form";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Mon compte" };

const card = "mt-6 rounded-[1.75rem] border border-line bg-paper p-5 shadow-sm sm:p-8";

export default async function ProfilPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const actor = await getActor();
  if (!actor) redirect("/connexion?next=/app/profil");
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");
  const { session_id: sessionId } = await searchParams;
  const checkoutConfirmed = sessionId
    ? await confirmGrowthCheckout(sessionId, actor.id)
    : false;

  const [
    firmRow,
    subscribed,
    deuxFacteursActif,
    codesRestants,
    phoneRow,
    subscriptions,
    deposits,
    investorPositions,
    signedDocs,
    ndas,
  ] =
    await Promise.all([
      actor.firmId
        ? prisma.firm.findUnique({
            where: { id: actor.firmId },
            select: {
              legalName: true,
              legalForm: true,
              city: true,
              address: true,
              postalCode: true,
              siren: true,
              foundedAt: true,
              headcount: true,
              distributionMode: true,
              website: true,
            },
          })
        : Promise.resolve(null),
      hasContactSubscription(actor),
      secondFacteurActif(actor.id),
      codesDeSecoursRestants(actor.id),
      prisma.user.findUnique({
        where: { id: actor.id },
        select: {
          phone: true,
          createdAt: true,
          jobTitle: true,
          notifyPrefs: true,
          searchPrefs: true,
          financialCapacityEur: true,
          financialCapacityStatus: true,
          financialCapacityAt: true,
          financialCapacityNote: true,
        },
      }),
      prisma.subscription.findMany({
        where: { userId: actor.id },
        orderBy: { id: "desc" },
        select: { id: true, plan: true, status: true, renewsAt: true, feeRate: true },
      }),
      prisma.interestDeposit.findMany({
        where: { buyerId: actor.id },
        orderBy: { placedAt: "desc" },
        select: {
          id: true,
          amount: true,
          placedAt: true,
          listing: { select: { publicNumber: true } },
        },
      }),
      prisma.investorPosition.findMany({
        where: { investorId: actor.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          depositAmount: true,
          createdAt: true,
          listing: { select: { publicNumber: true } },
        },
      }),
      prisma.document.findMany({
        where: {
          signedAt: { not: null },
          deal: { OR: [{ sellerId: actor.id }, { buyerId: actor.id }] },
        },
        orderBy: { signedAt: "desc" },
        select: {
          id: true,
          type: true,
          fileName: true,
          signedAt: true,
          deal: { select: { listing: { select: { publicNumber: true } } } },
        },
      }),
      prisma.deal.findMany({
        where: {
          OR: [{ sellerId: actor.id }, { buyerId: actor.id }],
          ndaAcceptedAt: { not: null },
        },
        orderBy: { ndaAcceptedAt: "desc" },
        select: {
          id: true,
          ndaAcceptedAt: true,
          listing: { select: { publicNumber: true } },
        },
      }),
    ]);

  const names = (actor.fullName ?? "").trim().split(/\s+/);
  const firstName = names[0] ?? "";
  const lastName = names.slice(1).join(" ");
  const initial = (firstName.charAt(0) || "C").toLocaleUpperCase("fr-FR");
  const jobTitle = phoneRow?.jobTitle ?? "";
  const website = firmRow?.website ?? "";
  const prefs = parseNotifyPrefs(phoneRow?.notifyPrefs);
  const searchPrefs = parseSearchPrefs(phoneRow?.searchPrefs);

  const invoices: Array<{ id: string; label: string; date: Date | null; amount: string; status: string }> = [
    ...subscriptions.map((item) => ({
      id: item.id,
      label: item.plan === "GROWTH" ? "Abonnement annuel" : "Sans frais",
      date: item.renewsAt,
      amount: item.plan === "GROWTH" ? formatEuroWhole(GROWTH_PLAN_ANNUAL_EUR) : formatEuroWhole(0),
      status: item.status === "ACTIVE" ? "Active" : item.status === "CANCELLED" ? "Résiliée" : "Expirée",
    })),
    ...deposits.map((item) => ({
      id: item.id,
      label: `Dépôt ${INTEREST_DEPOSIT_LABEL} · dossier n° ${item.listing.publicNumber}`,
      date: item.placedAt,
      amount: formatEuroPrecise(item.amount),
      status: "Engagement (démo)",
    })),
    ...investorPositions.map((item) => ({
      id: item.id,
      label: `Dépôt ${INTEREST_DEPOSIT_LABEL} · dossier n° ${item.listing.publicNumber}`,
      date: item.createdAt,
      amount: formatEuroPrecise(item.depositAmount),
      status: "Intérêt enregistré (démo)",
    })),
  ];

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
      <section className="rounded-[1.75rem] bg-indigo-soft p-5 sm:p-8">
        <div className="flex items-start gap-4">
          <span
            className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo text-lg font-semibold text-white"
            aria-hidden="true"
          >
            {initial}
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-indigo-dark">Espace membre</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">Mon compte</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">
              {ROLE_LABELS[actor.role]} · {KYC_STATUS_LABELS[actor.kycStatus]} · identifiant{" "}
              {actor.publicAlias.replace(/^#/, "")}
            </p>
          </div>
        </div>
        <AccountNav />
        {checkoutConfirmed ? (
          <p className="mt-5 rounded-2xl bg-white px-4 py-3 text-[15px] font-medium text-ink">
            Paiement confirmé. L’abonnement 250 € HT est actif.
          </p>
        ) : null}
      </section>

      <section className={card}>
        <ProfileForm
          firstName={firstName}
          lastName={lastName}
          phone={phoneRow?.phone ?? ""}
          jobTitle={jobTitle}
          email={actor.email}
          orias={isInvestor(actor) ? "" : (actor.oriasNumber ?? "")}
          firm={
            firmRow
              ? {
                  legalName: firmRow.legalName,
                  legalForm: firmRow.legalForm,
                  address: firmRow.address,
                  postalCode: firmRow.postalCode,
                  city: firmRow.city,
                  website,
                  siren: firmRow.siren,
                  foundedYear: firmRow.foundedAt ? String(firmRow.foundedAt.getFullYear()) : "",
                  headcount: firmRow.headcount != null ? String(firmRow.headcount) : "",
                  distributionMode: firmRow.distributionMode,
                }
              : null
          }
        />
      </section>

      <section id="recherche" className={card}>
        <h2 className="text-lg font-semibold text-ink">Critères de recherche</h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
          Zone, branches et budget. Appliqués dans la salle de marché, jamais affichés
          aux visiteurs.
        </p>
        <div className="mt-5">
          <SearchPrefsForm prefs={searchPrefs} />
        </div>
      </section>

      <section id="identite" className={card}>
        <h2 className="text-lg font-semibold text-ink">Identité professionnelle</h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
          Prépare l’entrée chez un prestataire de paiement agréé. Rien n’est
          envoyé à un tiers aujourd’hui.
        </p>
        <div className="mt-5">
          <KycSubmitForm status={actor.kycStatus} />
        </div>
      </section>

      <section id="mot-de-passe" className={card}>
        <h2 className="text-lg font-semibold text-ink">Mot de passe</h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
          Changez-le depuis cet écran. Dix caractères minimum, une lettre et un chiffre.
        </p>
        <div className="mt-5">
          <PasswordForm />
        </div>
      </section>

      <section id="notifications" className={card}>
        <h2 className="text-lg font-semibold text-ink">Notifications</h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
          Choisissez les e-mails que vous recevez. Rien n’est envoyé aux assurés
          du portefeuille.
        </p>
        <div className="mt-5">
          <NotifyForm prefs={prefs} />
        </div>
      </section>

      <section id="factures" className={card}>
        <h2 className="text-lg font-semibold text-ink">Factures et engagements</h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
          Abonnement annuel {formatEuroWhole(GROWTH_PLAN_ANNUAL_EUR)} HT (
          {formatEuroWhole(growthPlanAnnualTtcEur())} TTC), réglé par carte via Stripe.
          Les dépôts de {INTEREST_DEPOSIT_LABEL} restent un engagement de démo, sans
          encaissement.
        </p>
        {invoices.length > 0 ? (
          <ul className="mt-5 divide-y divide-line">
            {invoices.map((item) => (
              <li key={item.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
                <div>
                  <p className="text-[15px] font-medium text-ink">{item.label}</p>
                  <p className="text-[13px] text-muted">
                    {item.date ? formatDate(item.date) : "Sans échéance"} · {item.status}
                  </p>
                </div>
                <p className="tabular text-[15px] font-semibold text-ink">{item.amount}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-[15px] text-muted">Aucune ligne pour le moment.</p>
        )}
        {subscribed ? (
          <p className="mt-4 text-[15px] text-ink">Abonnement actif.</p>
        ) : isInvestor(actor) ? null : (
          <div className="mt-5 max-w-sm">
            <SubscribeButton label={`Payer ${GROWTH_PLAN_ANNUAL_EUR} € HT (${formatEuroWhole(growthPlanAnnualTtcEur())} TTC)`} />
          </div>
        )}
      </section>

      <section id="pieces" className={card}>
        <h2 className="text-lg font-semibold text-ink">Pièces signées</h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
          Accords et actes liés à vos dossiers. Les bordereaux nominatifs d’assurés
          n’apparaissent jamais ici.
        </p>
        <ul className="mt-5 divide-y divide-line">
          <li className="py-3">
            <p className="text-[15px] font-medium text-ink">Conditions générales</p>
            <p className="text-[13px] text-muted">Acceptées à la création du compte · {formatDate(phoneRow?.createdAt ?? new Date())}</p>
          </li>
          {ndas.map((item) => (
            <li key={item.id} className="py-3">
              <p className="text-[15px] font-medium text-ink">Accord de confidentialité</p>
              <p className="text-[13px] text-muted">
                Dossier n° {item.listing.publicNumber}
                {item.ndaAcceptedAt ? ` · ${formatDate(item.ndaAcceptedAt)}` : ""}
              </p>
            </li>
          ))}
          {signedDocs.map((item) => (
            <li key={item.id} className="py-3">
              <p className="text-[15px] font-medium text-ink">
                {DOCUMENT_TYPE_LABELS[item.type] ?? item.fileName}
              </p>
              <p className="text-[13px] text-muted">
                Dossier n° {item.deal.listing.publicNumber}
                {item.signedAt ? ` · ${formatDate(item.signedAt)}` : ""}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {canBuy(actor) ? (
        <section id="capacite" className={card}>
          <h2 className="text-lg font-semibold text-ink">Capacité d’acquisition</h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
            Le site indique aux cédants que la capacité financière des acquéreurs
            est vérifiée. Déclarez le montant que vous pouvez engager : notre
            équipe le contrôle avant qu’il ne soit porté à la connaissance d’un
            cédant. Une vérification vaut douze mois.
          </p>
          <CapacityForm
            montantActuel={phoneRow?.financialCapacityEur ? Number(phoneRow.financialCapacityEur) : null}
            libelle={libelleCapacite({
              montantEur: phoneRow?.financialCapacityEur ? Number(phoneRow.financialCapacityEur) : null,
              statut: phoneRow?.financialCapacityStatus ?? "NONE",
              verifieeLe: phoneRow?.financialCapacityAt ?? null,
            })}
            note={phoneRow?.financialCapacityNote ?? null}
          />
        </section>
      ) : null}

      <section id="securite" className={card}>
        <h2 className="text-lg font-semibold text-ink">Sécurité de la connexion</h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
          Un mot de passe seul reste léger pour un compte qui donne accès à des
          cessions importantes. Le second facteur ajoute un code à six chiffres.
        </p>
        <DeuxFacteurs actif={deuxFacteursActif} codesRestants={codesRestants} />
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold text-ink">Vos données</h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
          Vous pouvez récupérer l’intégralité de vos données, et demander la
          fermeture du compte.
        </p>
        <a
          href="/api/mes-donnees"
          className="mt-4 inline-flex min-h-11 items-center rounded-full bg-indigo px-5 text-[14px] font-semibold !text-white"
        >
          Télécharger mes données
        </a>
        <div className="mt-8 border-t border-line pt-6">
          <h3 className="text-[15px] font-semibold text-ink">Supprimer mon compte</h3>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
            Votre identité est retirée. Un dossier encore ouvert suspend la demande.
          </p>
          <EffacementForm />
        </div>
      </section>
    </main>
  );
}
