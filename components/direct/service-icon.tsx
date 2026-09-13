/** Pictogrammes des services à la carte. Traits fins, couleur héritée. */
export type ServiceIconName = "kit" | "escrow" | "attestations" | "listing" | "wanted" | "sell" | "buy";

const PATHS: Record<ServiceIconName, React.ReactNode> = {
  kit: (
    <>
      <path d="M8 3h6l4 4v13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v4h4M10 12h5M10 16h3" />
    </>
  ),
  escrow: (
    <>
      <path d="M12 3 5 6v5c0 4.5 3 8.5 7 10 4-1.5 7-5.5 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  attestations: (
    <>
      <path d="M6 3h9l3 3v8" />
      <path d="M6 3v18h7" />
      <circle cx="17" cy="17" r="3" />
      <path d="m15.5 19.5-.5 2.5 2-1 2 1-.5-2.5" />
    </>
  ),
  listing: (
    <>
      <path d="M4 11V5a1 1 0 0 1 1-1h6l9 9-7 7-9-9Z" />
      <circle cx="8.5" cy="8.5" r="1.5" />
    </>
  ),
  wanted: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-4.5-4.5" />
    </>
  ),
  sell: (
    <>
      <path d="M12 19V5M6 11l6-6 6 6" />
    </>
  ),
  buy: (
    <>
      <path d="M5 7h14l-1.5 9a2 2 0 0 1-2 1.7h-7A2 2 0 0 1 6.5 16L5 7Z" />
      <path d="M9 7a3 3 0 0 1 6 0" />
    </>
  ),
};

export function ServiceIcon({ name, className }: { name: ServiceIconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {PATHS[name]}
    </svg>
  );
}
