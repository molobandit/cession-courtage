import { CERTIFIED_BADGE } from "@/lib/site";

export function CertifiedBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={
        compact
          ? "rounded-full border border-indigo-line bg-indigo-soft px-2.5 py-0.5 text-[11px] font-semibold text-indigo"
          : "inline-flex rounded-full bg-indigo px-2.5 py-1 text-[12px] font-semibold text-white"
      }
    >
      {compact ? "✓ Certifié" : CERTIFIED_BADGE}
    </span>
  );
}
