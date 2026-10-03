import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Briques du tableau de bord : actions rapides, compteurs, dossiers récents.
 *
 * Même grammaire partout — un pictogramme sur pastille en dégradé, un titre,
 * une ligne d'aide, une flèche — pour que l'œil apprenne une fois où cliquer.
 * Chaque service garde sa couleur d'un écran à l'autre : le vert du kit sur le
 * tableau de bord est le vert du kit dans sa liste.
 */

export type ToolIconName =
  | "bolt"
  | "chart"
  | "doc"
  | "briefcase"
  | "tools"
  | "bag"
  | "search"
  | "clipboard"
  | "shield"
  | "lock"
  | "vault"
  | "file-check"
  | "megaphone"
  | "cart"
  | "folder"
  | "user"
  | "arrow-right"
  | "chevron-right"
  | "arrow-left"
  | "plus"
  | "info";

const ICONS: Record<ToolIconName, React.ReactNode> = {
  bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  doc: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" />
    </>
  ),
  tools: (
    <>
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4 2.5-2.5Z" />
    </>
  ),
  bag: (
    <>
      <path d="M6 7h12l1 13H5L6 7Z" />
      <path d="M9 7V6a3 3 0 0 1 6 0v1" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  clipboard: (
    <>
      <rect x="8" y="3" width="8" height="4" rx="1" />
      <path d="M16 5h1a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h1" />
      <path d="m9 14 2 2 4-4" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  // Le cadenas du trust : l'anse, le corps, l'entrée de clé.
  lock: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      <path d="M12 14.5v2.5" />
    </>
  ),
  // Le coffre du séquestre : la caisse, le cadran à croix, la poignée à droite.
  vault: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="2" />
      <circle cx="10.5" cy="12" r="3" />
      <path d="M10.5 10.5v3M9 12h3" />
      <path d="M17 10v4" />
    </>
  ),
  "file-check": (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
      <path d="M14 3v5h5M9 15l2 2 4-4" />
    </>
  ),
  megaphone: (
    <>
      <path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1Z" />
      <path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12" />
    </>
  ),
  cart: (
    <>
      <path d="M3 4h2l2.4 11h10.2L20 8H6.2" />
      <circle cx="9" cy="19" r="1.5" />
      <circle cx="17" cy="19" r="1.5" />
    </>
  ),
  folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  "arrow-right": <path d="M5 12h14M13 6l6 6-6 6" />,
  "chevron-right": <path d="m9 6 6 6-6 6" />,
  "arrow-left": <path d="M19 12H5M11 6l-6 6 6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
};

export function ToolIcon({
  name,
  className,
  strokeWidth = 1.7,
}: {
  name: ToolIconName;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {ICONS[name]}
    </svg>
  );
}

/** Teinte de chaque service, constante d'un écran à l'autre. */
export const TONES = {
  sell: { from: "#e0667c", to: "#b93d58", text: "#b93d58", soft: "#fbe9ed" },
  buy: { from: "#7b7ff5", to: "#4f52d9", text: "#4f52d9", soft: "#ebebfd" },
  kit: { from: "#76b893", to: "#3f8c61", text: "#3f8c61", soft: "#e6f3eb" },
  escrow: { from: "#a578f5", to: "#7b3fe4", text: "#7b3fe4", soft: "#f1e9fd" },
  attestations: { from: "#86b7e0", to: "#4d86c2", text: "#4d86c2", soft: "#e7f0f9" },
  listing: { from: "#eaa84a", to: "#c8742a", text: "#c8742a", soft: "#fbf0e3" },
  wanted: { from: "#7f96f2", to: "#4b64d6", text: "#4b64d6", soft: "#e9edfc" },
} as const;

export type ToneName = keyof typeof TONES;

export function IconBadge({
  icon,
  tone,
  size = "md",
}: {
  icon: ToolIconName;
  tone: ToneName;
  size?: "sm" | "md";
}) {
  const t = TONES[tone];
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center text-white shadow-[0_8px_18px_-10px_rgba(17,24,39,0.6)]",
        size === "md" ? "h-12 w-12 rounded-xl" : "h-10 w-10 rounded-lg",
      )}
      style={{ backgroundImage: `linear-gradient(135deg, ${t.from}, ${t.to})` }}
    >
      <ToolIcon name={icon} className={size === "md" ? "h-6 w-6" : "h-5 w-5"} />
    </span>
  );
}

/** Titre de section précédé de sa pastille. */
export function SectionHeading({
  icon,
  title,
  id,
}: {
  icon: ToolIconName;
  title: string;
  id?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-soft text-indigo">
        <ToolIcon name={icon} className="h-5 w-5" />
      </span>
      <h2 id={id} className="text-xl font-semibold tracking-tight text-ink">
        {title}
      </h2>
    </div>
  );
}

/** Carte blanche qui regroupe des tuiles d'action. */
export function ActionGroup({
  icon,
  iconColor,
  title,
  lede,
  children,
}: {
  icon: ToolIconName;
  iconColor: string;
  title: string;
  lede: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-paper p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-2.5">
        <span className="mt-1 shrink-0" style={{ color: iconColor }}>
          <ToolIcon name={icon} className="h-4 w-4" />
        </span>
        <h3 className="text-[17px] font-semibold leading-snug text-ink">{title}</h3>
      </div>
      <p className="mt-2 text-[14px] leading-relaxed text-muted">{lede}</p>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">{children}</ul>
    </section>
  );
}

export function ActionTile({
  href,
  icon,
  tone,
  title,
  subtitle,
}: {
  href: string;
  icon: ToolIconName;
  tone: ToneName;
  title: string;
  subtitle: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="group flex h-full items-center gap-4 rounded-xl border border-line bg-paper p-4 transition hover:border-indigo hover:shadow-sm"
      >
        <IconBadge icon={icon} tone={tone} />
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold leading-snug text-ink">{title}</span>
          <span className="mt-0.5 block truncate text-[13px] text-muted">{subtitle}</span>
        </span>
        <ToolIcon
          name="arrow-right"
          className="h-4 w-4 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-indigo"
        />
      </Link>
    </li>
  );
}

export function GlanceCounter({
  href,
  icon,
  tone,
  value,
  label,
  badge,
}: {
  href: string;
  icon: ToolIconName;
  tone: ToneName;
  value: number;
  label: string;
  badge?: number;
}) {
  return (
    <li>
      <Link
        href={href}
        className="group flex h-full items-center gap-3 rounded-xl border border-line bg-paper p-4 transition hover:border-indigo hover:shadow-sm"
      >
        <IconBadge icon={icon} tone={tone} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="tabular text-2xl font-bold leading-none text-ink">{value}</span>
            {badge ? (
              <span
                className="tabular rounded-full px-2 py-0.5 text-[12px] font-semibold"
                style={{ backgroundColor: TONES[tone].soft, color: TONES[tone].text }}
              >
                {badge}
              </span>
            ) : null}
          </span>
          <span className="mt-1 block text-[13px] leading-snug text-muted">{label}</span>
        </span>
        <ToolIcon name="chevron-right" className="h-4 w-4 shrink-0 text-muted group-hover:text-indigo" />
      </Link>
    </li>
  );
}

/** Panneau pleine largeur d'une famille de dossiers. */
export function RecentPanel({
  icon,
  tone,
  title,
  count,
  href,
  emptyText,
  children,
}: {
  icon: ToolIconName;
  tone: ToneName;
  title: string;
  count?: number;
  href: string;
  emptyText: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-paper p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span style={{ color: TONES[tone].text }}>
            <ToolIcon name={icon} className="h-5 w-5" />
          </span>
          <h3 className="truncate text-[18px] font-medium text-ink">{title}</h3>
          {count ? (
            <span
              className="tabular rounded-full px-2 py-0.5 text-[12px] font-semibold"
              style={{ backgroundColor: TONES[tone].soft, color: TONES[tone].text }}
            >
              {count}
            </span>
          ) : null}
        </div>
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1 text-[14px] font-medium text-indigo-dark hover:text-indigo"
        >
          Voir tout
          <ToolIcon name="chevron-right" className="h-4 w-4" />
        </Link>
      </div>
      {children ? (
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</ul>
      ) : (
        <EmptyState icon={icon} text={emptyText} />
      )}
    </section>
  );
}

export function EmptyState({
  icon,
  text,
  title,
  action,
}: {
  icon: ToolIconName;
  text: string;
  title?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      <ToolIcon name={icon} className="h-10 w-10 text-muted/60" strokeWidth={1.4} />
      {title ? <p className="mt-4 text-[17px] font-semibold text-ink">{title}</p> : null}
      <p className={cn("text-[14px] text-muted", title ? "mt-1" : "mt-3")}>{text}</p>
      {action ? (
        <Link
          href={action.href}
          className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg bg-indigo-dark px-5 text-[14px] font-semibold !text-white hover:bg-indigo"
        >
          <ToolIcon name="plus" className="h-4 w-4" />
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

/** Anneau d'avancement, lisible sans ouvrir le dossier. */
export function ProgressRing({ percent }: { percent: number }) {
  const valeur = Math.max(0, Math.min(100, Math.round(percent)));
  const rayon = 20;
  const perimetre = 2 * Math.PI * rayon;
  return (
    <span
      className="relative flex h-12 w-12 shrink-0 items-center justify-center"
      role="img"
      aria-label={`Avancement ${valeur} %`}
    >
      <svg viewBox="0 0 48 48" className="absolute inset-0 h-12 w-12 -rotate-90">
        <circle cx="24" cy="24" r={rayon} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-line" />
        <circle
          cx="24"
          cy="24"
          r={rayon}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={perimetre}
          strokeDashoffset={perimetre * (1 - valeur / 100)}
          className="text-indigo-dark"
        />
      </svg>
      <span className="tabular text-[11px] font-bold text-indigo-dark">{valeur}%</span>
    </span>
  );
}

/** Carte de dossier : ruban de position, avancement, puces, montant. */
export function DossierCard({
  href,
  ribbon,
  tone,
  title,
  subtitle,
  percent,
  bullets,
  amount,
}: {
  href: string;
  ribbon: { label: string; icon: ToolIconName };
  tone: ToneName;
  title: string;
  subtitle?: string;
  percent?: number;
  bullets: { text: string; muted?: boolean }[];
  amount: string;
}) {
  const t = TONES[tone];
  return (
    <li>
      <Link
        href={href}
        className="group relative flex h-full flex-col rounded-xl border border-line bg-paper px-5 pb-4 pt-9 transition hover:border-indigo hover:shadow-sm"
      >
        <span
          className="absolute left-0 top-0 inline-flex items-center gap-1.5 rounded-br-lg rounded-tl-xl px-3 py-1 text-[12px] font-semibold text-white"
          style={{ backgroundImage: `linear-gradient(135deg, ${t.from}, ${t.to})` }}
        >
          <ToolIcon name={ribbon.icon} className="h-3.5 w-3.5" />
          {ribbon.label}
        </span>
        <span className="flex items-center gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: t.soft, color: t.text }}
          >
            <ToolIcon name="folder" className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[16px] font-semibold text-ink">{title}</span>
            {subtitle ? <span className="block truncate text-[14px] text-muted">{subtitle}</span> : null}
          </span>
          {typeof percent === "number" ? <ProgressRing percent={percent} /> : null}
        </span>
        <span className="mt-4 grid gap-2">
          {bullets.map((b, i) => (
            <span key={`${b.text}-${i}`} className="flex items-start gap-2.5 text-[14px]">
              <span
                className={cn("mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full", i === 0 ? "bg-indigo/60" : "bg-ok/60")}
              />
              <span className={cn("line-clamp-2", b.muted ? "italic text-muted" : "text-ink")}>{b.text}</span>
            </span>
          ))}
        </span>
        <span className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-3">
          <span className="tabular text-[17px] font-bold" style={{ color: t.text }}>
            {amount}
          </span>
          <ToolIcon name="chevron-right" className="h-4 w-4 text-muted group-hover:text-indigo" />
        </span>
      </Link>
    </li>
  );
}
