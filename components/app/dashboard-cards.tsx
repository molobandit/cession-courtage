import Link from "next/link";
import { formatEuroWhole } from "@/lib/format/number";
import type { PublicListingCard } from "@/lib/listing/public-card";
import { cn } from "@/lib/utils";

function windowLabel(daysLeft: number | null): string | null {
  if (daysLeft === null) return null;
  if (daysLeft < 0) return "Fenêtre close";
  if (daysLeft === 0) return "Clôture aujourd’hui";
  if (daysLeft === 1) return "Clôture demain";
  return `${daysLeft} jours restants`;
}

export function MarketplaceHero() {
  return (
    <section className="overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-indigo via-indigo-mid to-indigo-dark p-5 text-white shadow-sm sm:p-8">
      <p className="text-[13px] font-medium text-white/80">Place de marché</p>
      <h2 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">
        Portefeuilles et demandes d’acquisition
      </h2>
      <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-white/80">
        Alias jusqu’au dépôt. Montants d’offre masqués tant que la fenêtre
        n’est pas close.
      </p>
      <Link
        href="/annonces"
        className="mt-5 flex min-h-12 w-full items-center justify-center rounded-full bg-white px-5 text-[15px] font-semibold text-indigo hover:bg-indigo-soft sm:max-w-xs"
      >
        Parcourir les annonces
      </Link>
    </section>
  );
}

export function CompactListingCard({ item }: { item: PublicListingCard }) {
  const zone = item.isNationwide ? "France entière" : item.zone;
  const branches = item.riskTypes.slice(0, 4).join(", ");
  const closing = windowLabel(item.daysLeft);

  return (
    <li>
      <Link href={`/annonces/${item.publicNumber}`} className="lift block rounded-2xl border border-line bg-surface p-4 hover:border-indigo sm:p-5">
        <div className="flex flex-wrap gap-2">
          <Pill>{item.statusLabel}</Pill>
          {item.certified ? <Pill tone="ok">Vérifié</Pill> : null}
          {closing ? <Pill tone="warn">{closing}</Pill> : null}
        </div>
        <p className="mt-3 text-[16px] font-semibold text-ink">Dossier n° {item.publicNumber}</p>
        {branches ? <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-muted">{branches}</p> : null}
        <p className="mt-1 text-[13px] text-muted">{zone}</p>
        {item.carriers[0] ? (
          <p className="mt-1 line-clamp-1 text-[13px] text-muted">{item.carriers.slice(0, 3).join(", ")}</p>
        ) : null}
        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3">
          <div>
            <dt className="text-[12px] text-muted">Commissions</dt>
            <dd className="tabular mt-0.5 text-[15px] font-semibold text-ink">
              {formatEuroWhole(item.annualCommissions)}
            </dd>
          </div>
          <div>
            <dt className="text-[12px] text-muted">Prix demandé</dt>
            <dd className="tabular mt-0.5 text-[15px] font-semibold text-ink">
              {formatEuroWhole(item.askingPrice)}
            </dd>
          </div>
        </dl>
        <span className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-full bg-indigo text-[14px] font-semibold !text-white">
          Voir l’annonce
        </span>
      </Link>
    </li>
  );
}

export function CompactMandateCard({
  href,
  number,
  alias,
  zone,
  branches,
  budget,
  commissions,
}: {
  href: string;
  number: number;
  alias: string;
  zone: string;
  branches: string;
  budget: string;
  commissions?: string;
}) {
  return (
    <li>
      <Link href={href} className="lift block rounded-2xl border border-line bg-surface p-4 hover:border-indigo sm:p-5">
        <Pill tone="mute">Demande d’acquisition</Pill>
        <p className="mt-3 text-[16px] font-semibold text-ink">Demande n° {number}</p>
        <p className="mt-1 text-[13px] text-muted">{alias}</p>
        {branches ? <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-muted">{branches}</p> : null}
        <p className="mt-1 text-[13px] text-muted">{zone}</p>
        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3">
          <div>
            <dt className="text-[12px] text-muted">Budget max.</dt>
            <dd className="tabular mt-0.5 text-[15px] font-semibold text-ink">{budget}</dd>
          </div>
          {commissions ? (
            <div>
              <dt className="text-[12px] text-muted">Commissions</dt>
              <dd className="tabular mt-0.5 text-[15px] font-semibold text-ink">{commissions}</dd>
            </div>
          ) : null}
        </dl>
        <span className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-full border border-line bg-paper text-[14px] font-semibold text-indigo-dark">
          Voir la demande
        </span>
      </Link>
    </li>
  );
}

export function GlanceTiles({
  items,
}: {
  items: { href: string; label: string; value: string }[];
}) {
  return (
    <section aria-label="Vos dossiers en un coup d’œil">
      <h2 className="text-xl font-bold tracking-tight text-ink">En un coup d’œil</h2>
      <ul className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {items.map((item) => (
          <li key={item.label}>
            <Link
              href={item.href}
              className="lift flex min-h-[6.25rem] flex-col justify-center rounded-[1.25rem] border border-line bg-paper px-4 py-4 hover:border-indigo"
            >
              <p className="tabular text-2xl font-bold tracking-tight text-ink">{item.value}</p>
              <p className="mt-1 text-[13px] leading-snug text-muted">{item.label}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Panel({
  title,
  href,
  action,
  children,
  count,
}: {
  title: string;
  href?: string;
  action?: string;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <section className="rounded-[1.75rem] border border-line bg-paper p-4 shadow-sm sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-bold tracking-tight text-ink sm:text-xl">
          {title}
          {typeof count === "number" ? (
            <span className="tabular ml-2 text-[15px] font-normal text-muted">{count}</span>
          ) : null}
        </h2>
        {href && action ? (
          <Link href={href} className="shrink-0 text-[14px] font-medium text-indigo-dark">
            {action}
          </Link>
        ) : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function EmptyHint({
  text,
  href,
  label,
}: {
  text: string;
  href: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-surface-alt/60 px-4 py-5">
      <p className="text-[14px] leading-relaxed text-muted">{text}</p>
      <Link href={href} className="mt-3 inline-flex min-h-11 items-center text-[14px] font-medium text-indigo-dark">
        {label}
      </Link>
    </div>
  );
}

const BADGE = {
  indigo: "bg-indigo-soft text-indigo-dark",
  ok: "bg-ok/10 text-ok",
  warn: "bg-warn/10 text-warn",
  mute: "bg-surface-alt text-ink",
} as const;

export function Pill({
  children,
  tone = "indigo",
}: {
  children: React.ReactNode;
  tone?: keyof typeof BADGE;
}) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[12px] font-medium", BADGE[tone])}>
      {children}
    </span>
  );
}

export function ActivityCard({
  href,
  kicker,
  kickerTone = "indigo",
  title,
  facts,
  cta = "Ouvrir",
}: {
  href: string;
  kicker: string;
  kickerTone?: keyof typeof BADGE;
  title: string;
  facts: { label: string; value: string }[];
  cta?: string;
}) {
  return (
    <li>
      <Link href={href} className="lift block rounded-2xl border border-line bg-surface p-4 hover:border-indigo sm:p-5">
        <Pill tone={kickerTone}>{kicker}</Pill>
        <p className="mt-3 text-[16px] font-semibold text-ink">{title}</p>
        <dl className="mt-3 grid grid-cols-2 gap-3">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt className="text-[12px] text-muted">{fact.label}</dt>
              <dd className="tabular mt-0.5 text-[14px] font-medium text-ink">{fact.value}</dd>
            </div>
          ))}
        </dl>
        <span className="mt-3 inline-block text-[14px] font-medium text-indigo-dark">{cta}</span>
      </Link>
    </li>
  );
}

export function ShortcutCard({
  kicker,
  title,
  detail,
  href,
  cta,
}: {
  kicker: string;
  title: string;
  detail: string;
  href: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="lift flex h-full min-h-[11rem] flex-col rounded-[1.5rem] border border-line bg-paper p-5 hover:border-indigo sm:p-6"
    >
      <p className="text-[12px] font-semibold uppercase tracking-wide text-indigo-dark">{kicker}</p>
      <p className="mt-2 text-[16px] font-semibold leading-snug text-ink">{title}</p>
      <p className="mt-2 flex-1 text-[14px] leading-relaxed text-muted">{detail}</p>
      <span className="mt-4 text-[14px] font-medium text-indigo-dark">{cta}</span>
    </Link>
  );
}

export function ToolTeaser({
  href,
  title,
  detail,
}: {
  href: string;
  title: string;
  detail: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="lift flex h-full flex-col rounded-2xl border border-line bg-surface p-5 hover:border-indigo"
      >
        <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
        <p className="mt-2 flex-1 text-[13px] leading-relaxed text-muted">{detail}</p>
        <span className="mt-4 text-[14px] font-medium text-indigo-dark">Ouvrir</span>
      </Link>
    </li>
  );
}

export function PublishBanner({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-2xl bg-indigo-soft px-4 py-3 text-[14px] text-indigo-dark hover:bg-indigo-line/40 sm:px-5"
    >
      <span>
        <span className="font-semibold">Publier une annonce est gratuit.</span>{" "}
        L’alias masque le cabinet jusqu’au dépôt.
      </span>
      <span className="hidden shrink-0 font-semibold sm:inline">Déposer</span>
    </Link>
  );
}

