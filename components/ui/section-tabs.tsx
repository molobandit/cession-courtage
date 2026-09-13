"use client";

import {
  Children,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";

const HASH_ALIASES: Record<string, string> = {
  informations: "informations",
  documents: "documents",
  position: "position",
  interesse: "position",
  depot: "position",
  offre: "position",
  echanges: "position",
  parcours: "parcours",
  messages: "messages",
};

export function SectionTab({
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return <>{children}</>;
}

const OPEN_EVENT = "section-tab:open";

function resolveTab(raw: string, ids: string[]): string | null {
  const cle = raw.replace(/^#/, "").toLowerCase();
  const mapped = HASH_ALIASES[cle] ?? cle;
  return ids.includes(mapped) ? mapped : null;
}

function tabFromHash(ids: string[]): string | null {
  if (typeof window === "undefined") return null;
  return resolveTab(window.location.hash, ids);
}

/**
 * Ouvre un onglet depuis n'importe quel bouton de la page.
 *
 * Un lien « #position » ne suffit pas : Next change l'adresse sans émettre
 * d'événement `hashchange`, et l'onglet restait fermé — le bouton « Prendre
 * position » ne faisait rien.
 */
export function openSectionTab(hash: string) {
  if (typeof window === "undefined") return;
  window.history.replaceState(null, "", hash.startsWith("#") ? hash : `#${hash}`);
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: hash }));
}

export function SectionTabLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      className={className}
      onClick={(event) => {
        if (!href.startsWith("#")) return;
        event.preventDefault();
        openSectionTab(href);
      }}
    >
      {children}
    </a>
  );
}

export function SectionTabs({
  children,
  defaultId,
}: {
  children: ReactNode;
  defaultId?: string;
}) {
  const panels = Children.toArray(children).filter(
    (child): child is ReactElement<{ id: string; label: string; children: ReactNode }> =>
      isValidElement(child),
  );
  const ids = panels.map((panel) => String(panel.props.id));
  const fallback = defaultId && ids.includes(defaultId) ? defaultId : ids[0];
  const [active, setActive] = useState(fallback);

  const conteneur = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fromHash = tabFromHash(ids);
    if (fromHash) setActive(fromHash);

    const ouvrir = (raw: string) => {
      const cible = resolveTab(raw, ids);
      if (!cible) return;
      setActive(cible);
      requestAnimationFrame(() => {
        const ancre = document.getElementById(raw.replace(/^#/, ""));
        (ancre && ancre !== conteneur.current ? ancre : conteneur.current)?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    };
    const surEvenement = (event: Event) => ouvrir(String((event as CustomEvent).detail ?? ""));
    const surHash = () => ouvrir(window.location.hash);
    window.addEventListener(OPEN_EVENT, surEvenement);
    window.addEventListener("hashchange", surHash);
    return () => {
      window.removeEventListener(OPEN_EVENT, surEvenement);
      window.removeEventListener("hashchange", surHash);
    };
    // Les onglets d'une fiche ne changent pas pendant sa vie.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = panels.find((panel) => panel.props.id === active) ?? panels[0];

  return (
    <div ref={conteneur} className="scroll-mt-24">
      <div
        className="flex gap-1 overflow-x-auto rounded-full border border-line bg-paper p-1"
        role="tablist"
      >
        {panels.map((panel) => {
          const selected = panel.props.id === current?.props.id;
          return (
            <button
              key={panel.props.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={`shrink-0 rounded-full px-4 py-2 text-[14px] font-medium ${
                selected ? "bg-indigo text-white" : "text-muted hover:text-ink"
              }`}
              onClick={() => {
                setActive(panel.props.id);
                if (typeof window !== "undefined") {
                  window.history.replaceState(null, "", `#${panel.props.id}`);
                }
              }}
            >
              {panel.props.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" className="mt-6">
        {current}
      </div>
    </div>
  );
}
