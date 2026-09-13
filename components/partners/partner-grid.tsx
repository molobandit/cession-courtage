import Link from "next/link";
import { PAYMENT_FAQ_ANCHOR } from "@/lib/partners/faq";
import type { PresentedPartner } from "@/lib/partners/status";

export function PartnerGrid({ partners }: { partners: PresentedPartner[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {partners.map((partner) => (
        <li
          key={partner.id}
          id={partner.id}
          className="rounded-3xl border border-line bg-paper p-6 shadow-sm"
        >
          <p className="text-[12px] font-semibold uppercase tracking-wide text-indigo-dark">
            {partner.role}
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink">{partner.name}</h2>
          <p
            className={`mt-2 inline-flex rounded-full px-3 py-1 text-[12px] font-medium ${
              partner.live ? "bg-ok/15 text-ink" : "bg-surface-alt text-muted"
            }`}
          >
            {partner.badge}
          </p>
          <p className="mt-4 text-[15px] font-medium leading-relaxed text-ink">{partner.purpose}</p>
          <p className="mt-3 text-[14px] leading-relaxed text-muted">{partner.detail}</p>
          {partner.termsUrl ? (
            <p className="mt-4">
              <a
                href={partner.termsUrl}
                className="text-[13px] font-medium text-indigo-dark underline-offset-2 hover:underline"
                rel="noreferrer"
                target="_blank"
              >
                Conditions du prestataire
              </a>
            </p>
          ) : null}
        </li>
      ))}
      <li className="sm:col-span-2">
        <Link
          href={`/faq#${PAYMENT_FAQ_ANCHOR}`}
          className="block rounded-3xl border border-indigo-line bg-indigo-soft px-6 py-5 text-[15px] font-medium text-ink hover:bg-indigo-soft/80"
        >
          Questions sur le dépôt, le séquestre et la signature
        </Link>
      </li>
    </ul>
  );
}

export function PartnerStrip({ partners }: { partners: PresentedPartner[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {partners.map((partner) => (
        <li key={partner.id}>
          <Link
            href={`/partenaires#${partner.id}`}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-3 py-1.5 text-[13px] font-medium text-ink hover:border-indigo"
          >
            <span>{partner.name}</span>
            <span className={`h-1.5 w-1.5 rounded-full ${partner.live ? "bg-ok" : "bg-muted"}`} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
