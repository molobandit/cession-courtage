import Link from "next/link";
import { PARTNERS, type PartnerCopy } from "@/lib/partners/catalog";

function LogoCard({
  partner,
  onDark,
}: {
  partner: PartnerCopy;
  onDark?: boolean;
}) {
  return (
    <Link
      href={`/partenaires#${partner.id}`}
      className={
        onDark
          ? "flex h-[88px] w-[150px] shrink-0 items-center justify-center rounded-2xl bg-white px-4 shadow-sm"
          : "flex h-16 w-[140px] shrink-0 items-center justify-center rounded-xl border border-line bg-paper px-3"
      }
      title={partner.name}
    >
      {/* SVG locaux : img, pas next/image (config SVG). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={partner.logoSrc}
        alt={partner.name}
        width={140}
        height={36}
        className="h-8 w-auto max-w-[128px] object-contain"
      />
    </Link>
  );
}

/** Cartes blanches type Assurdeal « Propulsé par », pour le pied de page. */
export function PartnerFooterLogos() {
  return (
    <div>
      <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-indigo-line">
        Propulsé par
      </p>
      <ul className="mt-3 flex flex-wrap gap-3">
        {PARTNERS.map((partner) => (
          <li key={partner.id}>
            <LogoCard partner={partner} onDark />
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[13px] text-white/65">Paiements sécurisés</p>
    </div>
  );
}

/** Bandeau défilant pour l’accueil, comme le carrousel de logos Assurdeal. */
export function PartnerHomeMarquee() {
  const loop = [...PARTNERS, ...PARTNERS];
  return (
    <section className="border-y border-line bg-paper">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="text-center">
          <p className="inline-flex rounded-full bg-indigo-soft px-3 py-1 text-[12px] font-semibold text-indigo">
            Circuit de confiance
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Paiement sécurisé et <span className="text-indigo">signatures</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-[15px] text-muted">
            Stripe, Trustap, Yousign, DocuSign, Ondorse et CrediPro. La bourse du
            portefeuille ne reçoit pas le prix de cession.
          </p>
        </div>
        <div className="relative mt-8 overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-paper to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-paper to-transparent" />
          <ul className="partner-marquee-track flex w-max gap-4 pr-4">
            {loop.map((partner, index) => (
              <li key={`${partner.id}-${index}`}>
                <LogoCard partner={partner} />
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-6 text-center">
          <Link
            href="/partenaires"
            className="text-[14px] font-medium text-indigo-dark underline-offset-2 hover:underline"
          >
            Voir le circuit
          </Link>
        </p>
      </div>
    </section>
  );
}
