import Link from "next/link";
import { ToolIcon, type ToolIconName } from "@/components/app/toolbox";
import { formatEuroWhole } from "@/lib/format/number";
import type { PublicListingCard } from "@/lib/listing/public-card";
import { formatMultiple, listingMultiple } from "@/lib/market/indices";
import { cn } from "@/lib/utils";

/**
 * Poste de marché : les briques de l'espace membre.
 *
 * Même grammaire que l'accueil — bandeau sombre, chiffres en grand, pastilles
 * de cotation — pour que l'intérieur du site se lise comme la salle qu'il
 * promet : ce qui est en séance, ce qui vous attend, où en sont vos positions.
 */

/**
 * Bandeau d'en-tête en dégradé bleu, la couleur de la marque.
 *
 * Un premier essai en fond sombre a été écarté : l'intérieur reste bleu, comme
 * l'encart « Place de marché » qu'il remplace.
 */
export function DeskBand({ children }: { children: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-indigo via-indigo-mid to-indigo-dark text-white shadow-[0_24px_60px_-30px_rgba(37,99,235,0.7)]">
      <div className="pointer-events-none absolute -left-24 -top-28 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 right-0 h-64 w-64 rounded-full bg-sky-300/20 blur-3xl" />
      <div className="relative">{children}</div>
    </section>
  );
}

export function LivePill({ label = "En séance" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-[12px] font-semibold text-white">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70 motion-reduce:hidden" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
      </span>
      {label}
    </span>
  );
}

/** Indice ou compteur du bandeau. */
export function DeskKpi({
  label,
  value,
  note,
  href,
  accent = false,
}: {
  label: string;
  value: string;
  note?: string;
  href?: string;
  accent?: boolean;
}) {
  const contenu = (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/75">{label}</p>
      <p className={cn("tabular mt-2 text-[1.9rem] font-bold leading-none tracking-tight", accent ? "text-emerald-300" : "text-white")}>
        {value}
      </p>
      {note ? <p className="mt-2 text-[12px] leading-snug text-white/70">{note}</p> : null}
    </>
  );
  const classe = "block h-full rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm transition";
  return href ? (
    <Link href={href} className={cn(classe, "hover:border-white/40 hover:bg-white/15")}>
      {contenu}
    </Link>
  ) : (
    <div className={classe}>{contenu}</div>
  );
}

/**
 * Bande défilante des titres en séance.
 *
 * Données réelles uniquement — numéro, branche, prix, multiple, statut — et
 * aucune variation inventée : un portefeuille n'a pas de cours minute par
 * minute, et en simuler un ruinerait la confiance que le reste du site gagne.
 */
export function MarketTicker({ items }: { items: PublicListingCard[] }) {
  if (items.length === 0) return null;
  const ligne = (suffixe: string) =>
    items.map((item) => (
      <Link
        key={`${item.id}-${suffixe}`}
        href={`/annonces/${item.publicNumber}`}
        className="flex shrink-0 items-center gap-2 px-5 text-[13px] text-white/80 hover:text-white"
        tabIndex={suffixe === "b" ? -1 : undefined}
      >
        <span className="font-semibold text-white">N° {item.publicNumber}</span>
        <span className="text-white/65">{item.riskTypes[0] ?? "Portefeuille"}</span>
        <span className="tabular font-semibold text-white">{formatEuroWhole(item.askingPrice)}</span>
        <span className="tabular text-sky-100">{formatMultiple(listingMultiple(item.askingPrice, item.annualCommissions))}</span>
        <span className={cn("text-[12px] font-semibold", item.marketTone === "sealed" ? "text-sky-100" : "text-emerald-200")}>
          {item.marketTone === "sealed" ? (item.marketDetail ?? item.statusLabel) : item.statusLabel}
        </span>
        <span className="text-white/30">│</span>
      </Link>
    ));
  return (
    <div className="relative overflow-hidden border-t border-white/15 bg-indigo-dark/40 py-2.5" aria-label="Titres en séance">
      <div className="market-ticker-track flex w-max">
        {ligne("a")}
        <span aria-hidden="true" className="flex">
          {ligne("b")}
        </span>
      </div>
    </div>
  );
}

export type TodoItem = {
  key: string;
  href: string;
  icon: ToolIconName;
  title: string;
  detail: string;
  cta: string;
  urgent?: boolean;
};

/** Ce qui attend l'utilisateur, dans l'ordre où il doit le faire. */
export function TodoList({ items, waiting = 0 }: { items: TodoItem[]; waiting?: number }) {
  if (items.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-paper p-5 text-[15px] text-muted">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ok/10 text-ok">✓</span>
        {waiting > 0
          ? `Rien à faire de votre côté : ${waiting} offre${waiting > 1 ? "s attendent" : " attend"} la réponse du cédant. Vous serez prévenu.`
          : "Rien ne vous attend. Parcourez la salle de marché ou mettez un portefeuille en vente."}
      </div>
    );
  }
  return (
    <ul className="grid gap-2">
      {items.map((item) => (
        <li key={item.key}>
          <Link
            href={item.href}
            className={cn(
              "group flex items-center gap-4 rounded-2xl border bg-paper p-4 transition hover:border-indigo hover:shadow-sm",
              item.urgent ? "border-indigo-line" : "border-line",
            )}
          >
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                item.urgent ? "bg-indigo text-white" : "bg-indigo-soft text-indigo-dark",
              )}
            >
              <ToolIcon name={item.icon} className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-ink">{item.title}</span>
              <span className="block truncate text-[13px] text-muted">{item.detail}</span>
            </span>
            <span className="hidden shrink-0 items-center gap-1 text-[14px] font-semibold text-indigo-dark sm:inline-flex">
              {item.cta}
              <ToolIcon name="arrow-right" className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export type PositionRow = {
  key: string;
  href: string;
  side: "Achat" | "Vente" | "Demande";
  numero: string;
  libelle: string;
  etape: string;
  percent: number | null;
  montant: string;
  multiple: string;
  issue?: "active" | "closed" | "lost" | "withdrawn";
};

const SIDE: Record<PositionRow["side"], string> = {
  Achat: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Vente: "bg-rose-50 text-rose-700 border-rose-200",
  Demande: "bg-indigo-soft text-indigo-dark border-indigo-line",
};

/** Tableau des positions : une ligne par dossier, lue comme un carnet d'ordres. */
export function PositionsTable({ rows, empty }: { rows: PositionRow[]; empty: React.ReactNode }) {
  if (rows.length === 0) return <div className="px-5 py-10 text-center text-[15px] text-muted">{empty}</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] text-[14px]">
        <thead>
          <tr className="border-b border-line text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
            <th className="px-5 py-3">Sens</th>
            <th className="px-3 py-3">Dossier</th>
            <th className="px-3 py-3">Étape</th>
            <th className="px-3 py-3 text-right">Montant</th>
            <th className="px-3 py-3 text-right">Multiple</th>
            <th className="px-5 py-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="group border-b border-line last:border-0 hover:bg-surface-alt/60">
              <td className="px-5 py-3">
                <span className={cn("inline-flex rounded-md border px-2 py-0.5 text-[12px] font-semibold", SIDE[row.side])}>
                  {row.side}
                </span>
              </td>
              <td className="px-3 py-3">
                <Link href={row.href} className="font-semibold text-ink hover:text-indigo-dark">
                  N° {row.numero}
                </Link>
                <span className="block max-w-[14rem] truncate text-[12px] text-muted">{row.libelle}</span>
              </td>
              <td className="px-3 py-3">
                <span className={cn("block text-[13px] font-medium", row.issue === "lost" || row.issue === "withdrawn" ? "text-muted" : "text-ink")}>
                  {row.etape}
                </span>
                {row.percent !== null ? (
                  <span className="mt-1.5 flex items-center gap-2">
                    <span className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-alt">
                      <span
                        className={cn(
                          "block h-full rounded-full",
                          row.issue === "closed" ? "bg-ok" : row.issue === "lost" || row.issue === "withdrawn" ? "bg-muted/40" : "bg-indigo",
                        )}
                        style={{ width: `${Math.max(row.percent, 3)}%` }}
                      />
                    </span>
                    <span className="tabular text-[12px] font-semibold text-muted">{row.percent} %</span>
                  </span>
                ) : null}
              </td>
              <td className="tabular px-3 py-3 text-right font-semibold text-ink">{row.montant}</td>
              <td className="tabular px-3 py-3 text-right text-muted">{row.multiple}</td>
              <td className="px-5 py-3 text-right">
                <Link href={row.href} className="inline-flex items-center gap-1 text-[13px] font-semibold text-indigo-dark">
                  Ouvrir
                  <ToolIcon name="chevron-right" className="h-4 w-4" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Cote de la salle : les titres à surveiller, avec leur multiple et leur statut. */
export function QuoteTable({ items }: { items: PublicListingCard[] }) {
  if (items.length === 0) {
    return <div className="px-5 py-10 text-center text-[15px] text-muted">Aucun portefeuille en séance pour le moment.</div>;
  }
  return (
    <ul className="divide-y divide-line">
      {items.map((item) => (
        <li key={item.id}>
          <Link href={`/annonces/${item.publicNumber}`} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-alt/60">
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="whitespace-nowrap font-semibold text-ink">N° {item.publicNumber}</span>
                {item.certified ? (
                  <span title="Portefeuille certifié" className="text-indigo-dark">
                    <ToolIcon name="shield" className="h-4 w-4" />
                  </span>
                ) : null}
                <span className="truncate text-[12px] text-muted">{item.riskTypes[0] ?? "Portefeuille"}</span>
              </span>
              <span className="mt-0.5 flex items-center gap-1.5 text-[12px]">
                <span
                  className={cn(
                    "h-1.5 w-1.5 shrink-0 rounded-full",
                    item.marketTone === "sealed" ? "bg-indigo" : "bg-ok",
                  )}
                />
                <span className={cn("truncate font-medium", item.marketTone === "sealed" ? "text-indigo-dark" : "text-ok")}>
                  {item.marketTone === "sealed" ? item.marketDetail : "Offres ouvertes"}
                </span>
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span className="tabular block font-bold text-ink">{formatEuroWhole(item.askingPrice)}</span>
              <span className="tabular block text-[12px] text-indigo-dark">
                {formatMultiple(listingMultiple(item.askingPrice, item.annualCommissions))}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Carte blanche à en-tête, pour les blocs du poste. */
export function DeskPanel({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: { href: string; label: string };
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("overflow-hidden rounded-2xl border border-line bg-paper shadow-sm", className)}>
      <div className="flex items-end justify-between gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-[17px] font-semibold tracking-tight text-ink">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p> : null}
        </div>
        {action ? (
          <Link href={action.href} className="inline-flex shrink-0 items-center gap-1 text-[14px] font-medium text-indigo-dark hover:text-indigo">
            {action.label}
            <ToolIcon name="chevron-right" className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}
