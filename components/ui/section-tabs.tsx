"use client";

import {
  Children,
  isValidElement,
  useEffect,
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

function tabFromHash(ids: string[]): string | null {
  if (typeof window === "undefined") return null;
  const raw = window.location.hash.replace(/^#/, "").toLowerCase();
  const mapped = HASH_ALIASES[raw] ?? raw;
  return ids.includes(mapped) ? mapped : null;
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

  useEffect(() => {
    const fromHash = tabFromHash(ids);
    if (fromHash) setActive(fromHash);
    // Lecture du hash à l’arrivée sur la fiche.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = panels.find((panel) => panel.props.id === active) ?? panels[0];

  return (
    <div>
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
