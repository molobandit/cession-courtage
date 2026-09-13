import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdvanceStep } from "@/components/direct/advance-step";
import { DeskPageHeader } from "@/components/app/desk";
import { CarriersForm } from "@/components/direct/carriers-form";
import { PayFees } from "@/components/direct/pay-fees";
import { getActor, isOriasVerified } from "@/lib/authz";
import { stripeConfigured } from "@/lib/billing/stripe";
import { documentsFor, formatLongDate, missingPartyFields } from "@/lib/direct/documents";
import { confirmDirectFeesCheckout } from "@/lib/direct/fees-payment";
import { findMyDirectDeal } from "@/lib/direct/load";
import { loadDocumentParty } from "@/lib/direct/parties";
import { feeLines, feesTotal } from "@/lib/direct/fees";
import {
  carriersEditable,
  carriersToLines,
  feesTtcCents,
  readTransferCarriers,
  serviceByKey,
  serviceListHref,
  transferBlockers,
} from "@/lib/direct/services";
import {
  DIRECT_STEPS,
  nextStage,
  progressPercent,
  stagesFor,
  stepByKey,
  type DirectStage,
} from "@/lib/direct/stages";
import { formatEuroWhole } from "@/lib/format/number";
import { formatDate } from "@/lib/format/fr";

const ESCROW_STAGE_LABEL: Record<string, string> = {
  NONE: "Aucun fonds bloqué",
  FUNDS_HELD: "Fonds bloqués sur le compte séquestre",
  RELEASED: "Fonds libérés au cédant",
};

export const metadata = { title: "Dossier de gré à gré" };

export default async function DirectDealPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const actor = await getActor();
  const { id } = await params;
  if (!actor) redirect(`/connexion?next=/app/formaliser/${id}`);
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");

  const avant = await findMyDirectDeal(id, actor.id, actor.email);
  if (!avant) notFound();

  // Retour de Stripe : on confirme sans attendre le webhook, puis on relit.
  const { session_id: sessionId } = await searchParams;
  const paiementConfirme =
    sessionId && !avant.feesPaidAt ? await confirmDirectFeesCheckout(sessionId, avant.id) : false;
  const deal = paiementConfirme ? ((await findMyDirectDeal(id, actor.id, actor.email)) ?? avant) : avant;

  const services = { kit: deal.kit, escrow: deal.escrow, attestations: deal.attestations };
  const etape = deal.stage as DirectStage;
  const applicables = stagesFor(services);
  const avancement = progressPercent(etape, services);
  const suivante = nextStage(etape, services);

  const prix = Number(deal.salePrice);
  const sequestre = Math.round(prix * (Number(deal.upfrontPercent) / 100) * 100) / 100;
  const lignes = feeLines({ services, salePrice: prix, escrowedAmount: sequestre });
  const totalHt = feesTotal(lignes);

  const estOuvreur = deal.openedById === actor.id;
  const paiementOuvert = stripeConfigured();
  const honorairesDus = paiementOuvert && !deal.feesPaidAt;

  const carriers = readTransferCarriers(deal.carriers);
  const avecAttestations = deal.kit || deal.attestations;
  const pieces = documentsFor({ stage: etape, services, carriers });

  // Qui cède, qui reprend : l'ouvreur a déclaré son rôle, la contrepartie tient l'autre.
  const vendeurId = deal.openerRole === "SELLER" ? deal.openedById : deal.counterpartyUserId;
  const acheteurId = deal.openerRole === "SELLER" ? deal.counterpartyUserId : deal.openedById;
  const [vendeur, acheteur] = pieces.length
    ? await Promise.all([loadDocumentParty(vendeurId), loadDocumentParty(acheteurId)])
    : [null, null];
  const manques = [
    ...(vendeur ? missingPartyFields(vendeur).map((c) => `cédant : ${c}`) : []),
    ...(acheteur && deal.counterpartyUserId ? missingPartyFields(acheteur).map((c) => `cessionnaire : ${c}`) : []),
  ];

  const blocagesTransfert =
    suivante === "TRANSFER"
      ? transferBlockers({ carriers, effectiveDate: deal.transferEffectiveDate })
      : [];

  /*
   * Ce que la personne peut faire maintenant. Un bouton qu'elle n'a pas le
   * droit d'utiliser n'est pas affiché : l'accord revient à la contrepartie,
   * et rien n'avance tant que les honoraires sont dus.
   */
  let prochaineAction: React.ReactNode = null;
  if (suivante === "ACCEPTED" && estOuvreur) {
    prochaineAction = (
      <p className="text-[14px] text-muted">
        En attente de l’accord de {deal.counterpartyEmail}. L’invitation lui a été envoyée par
        e-mail.
      </p>
    );
  } else if (suivante && suivante !== "ACCEPTED" && honorairesDus) {
    prochaineAction = (
      <div>
        <p className="mb-3 text-[14px] text-muted">
          Réglez les honoraires ({formatEuroWhole(feesTtcCents(totalHt) / 100)} TTC) pour
          déclencher l’étape « {stepByKey(suivante).label} ».
        </p>
        <PayFees dealId={deal.id} label="Régler les honoraires" />
      </div>
    );
  } else if (suivante && blocagesTransfert.length > 0) {
    prochaineAction = (
      <p className="text-[14px] text-muted">
        Pour émettre les attestations, renseignez {blocagesTransfert.join(" et ")} ci-dessous.
      </p>
    );
  } else if (suivante) {
    prochaineAction = (
      <AdvanceStep
        dealId={deal.id}
        stage={suivante}
        label={suivante === "ACCEPTED" ? "Confirmer les conditions" : stepByKey(suivante).label}
      />
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <DeskPageHeader
        back={{
          href: serviceListHref(serviceByKey(deal.kit ? "kit" : deal.escrow ? "escrow" : "attestations")!),
          label: serviceByKey(deal.kit ? "kit" : deal.escrow ? "escrow" : "attestations")!.listTitle,
        }}
        kicker="Service à la carte"
        title={`${deal.portfolioLabel} — ${stepByKey(etape).label}`}
        subtitle={<>Avec {deal.counterpartyEmail}. {stepByKey(etape).summary}</>}
        progress={{ percent: avancement, tone: etape === "CLOSED" ? "closed" : "active" }}
        figures={[
          { label: "Prix", value: prix > 0 ? formatEuroWhole(prix) : "—" },
          { label: "Comptant", value: `${Number(deal.upfrontPercent)} %` },
          { label: "Honoraires", value: `${formatEuroWhole(totalHt)} HT`, note: deal.feesPaidAt ? "Réglés" : "À régler", accent: !deal.feesPaidAt && totalHt > 0 },
        ]}
      />

      {paiementConfirme ? (
        <p role="status" className="mt-4 rounded-xl border border-ok/30 bg-ok/10 px-4 py-3 text-[14px] text-ink">
          Paiement reçu. Le dossier peut avancer.
        </p>
      ) : null}

      {/* L'avancement est dans l'en-tête ; ici, seulement ce qu'il y a à faire. */}
      <div className="mt-6 rounded-2xl border border-line bg-paper p-5 shadow-sm">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-indigo-dark">À faire maintenant</p>
        {prochaineAction ? (
          <div className="mt-3">{prochaineAction}</div>
        ) : (
          <p className="mt-2 text-[15px] text-muted">Formalisation terminée. Les pièces restent disponibles ci-dessous.</p>
        )}
        {deal.escrow ? (
          <p className="mt-4 border-t border-line pt-3 text-[13px] text-muted">
            Séquestre : {ESCROW_STAGE_LABEL[deal.escrowStage] ?? deal.escrowStage}
          </p>
        ) : null}
      </div>

      <section className="mt-8">
        <h2 className="text-xl font-semibold text-ink">Parcours</h2>
        <ol className="mt-4 grid gap-2">
          {DIRECT_STEPS.filter((s) => applicables.includes(s.key)).map((s) => {
            const rang = applicables.indexOf(s.key);
            const courant = applicables.indexOf(etape);
            const franchie = rang < courant;
            return (
              <li
                key={s.key}
                className={`rounded-xl border px-4 py-3 ${
                  s.key === etape
                    ? "border-indigo bg-indigo-soft/50"
                    : franchie
                      ? "border-line bg-surface-alt"
                      : "border-line bg-paper"
                }`}
              >
                <p className={`text-[15px] font-medium ${franchie ? "text-muted" : "text-ink"}`}>
                  {s.label}
                  {franchie ? " · fait" : ""}
                </p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{s.summary}</p>
              </li>
            );
          })}
        </ol>
      </section>

      {pieces.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-xl font-semibold text-ink">Pièces du dossier</h2>
          <p className="mt-1 text-[14px] text-muted">
            Établies à partir du dossier et des comptes des deux cabinets. Rien à ressaisir.
          </p>
          {manques.length > 0 ? (
            <p className="mt-3 rounded-xl border border-warn/30 bg-warn/10 px-4 py-3 text-[13px] text-ink">
              Informations absentes, signalées « [à compléter] » dans les pièces :{" "}
              {manques.join(", ")}. Complétez-les dans{" "}
              <Link href="/app/profil" className="font-medium text-indigo-dark underline-offset-2 hover:underline">
                votre compte
              </Link>
              .
            </p>
          ) : null}
          <ul className="mt-4 grid gap-2">
            {pieces.map((piece) => (
              <li
                key={piece.key}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-paper px-4 py-3"
              >
                <span className="min-w-0">
                  <span className="block text-[15px] font-medium text-ink">{piece.title}</span>
                  <span className="block text-[13px] text-muted">{piece.hint}</span>
                </span>
                {piece.available ? (
                  <Link
                    href={`/app/formaliser/${deal.id}/pieces/${piece.key}`}
                    className="inline-flex min-h-10 items-center rounded-full border border-line bg-surface px-4 text-[14px] font-medium text-ink hover:border-indigo"
                  >
                    Ouvrir
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {avecAttestations ? (
        <section className="mt-8 rounded-2xl border border-line bg-paper p-5">
          <h2 className="text-[15px] font-semibold text-ink">Compagnies à transférer</h2>
          {carriersEditable(etape, services) ? (
            <div className="mt-4">
              <CarriersForm
                dealId={deal.id}
                initialLines={carriersToLines(carriers)}
                initialDate={deal.transferEffectiveDate ? deal.transferEffectiveDate.toISOString().slice(0, 10) : ""}
              />
            </div>
          ) : (
            <>
              <p className="mt-1 text-[13px] text-muted">
                Liste figée depuis l’émission des attestations · effet au{" "}
                {formatLongDate(deal.transferEffectiveDate)}
              </p>
              <ul className="mt-3 grid gap-1 text-[14px]">
                {carriers.map((c) => (
                  <li key={c.name} className="flex justify-between gap-4">
                    <span className="text-ink">{c.name}</span>
                    <span className="tabular text-muted">{c.code || "code non renseigné"}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      ) : null}

      <section className="mt-8 rounded-2xl border border-line bg-paper p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[15px] font-semibold text-ink">Honoraires</h2>
          <span className="text-[13px] font-medium">
            {deal.feesPaidAt ? (
              <span className="text-ok">
                Réglés le {formatDate(deal.feesPaidAt)}
                {deal.feesAmountCents ? ` · ${formatEuroWhole(deal.feesAmountCents / 100)} TTC` : ""}
              </span>
            ) : paiementOuvert ? (
              <span className="text-warn">À régler</span>
            ) : (
              <span className="text-muted">Paiement en ligne bientôt ouvert</span>
            )}
          </span>
        </div>
        <ul className="mt-3 grid gap-1 text-[14px]">
          {lignes.map((l) => (
            <li key={l.key} className="flex justify-between gap-4">
              <span className="text-muted">
                {l.label} <span className="text-[12px]">· {l.detail}</span>
              </span>
              <span className="tabular text-ink">{formatEuroWhole(l.amount)} HT</span>
            </li>
          ))}
          <li className="mt-1 flex justify-between gap-4 border-t border-line pt-1 font-semibold">
            <span className="text-ink">Total</span>
            <span className="tabular text-ink">{formatEuroWhole(totalHt)} HT</span>
          </li>
          <li className="flex justify-between gap-4 text-[13px] text-muted">
            <span>TVA 20 % incluse</span>
            <span className="tabular">{formatEuroWhole(feesTtcCents(totalHt) / 100)} TTC</span>
          </li>
        </ul>
        {honorairesDus && etape === "INVITED" ? (
          <p className="mt-3 text-[13px] text-muted">
            Réglables par carte dès que la contrepartie a confirmé les conditions, par l’une ou
            l’autre partie.
          </p>
        ) : null}
      </section>
    </main>
  );
}
