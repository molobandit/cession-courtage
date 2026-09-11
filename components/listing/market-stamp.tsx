import { STAMP_CERTIFIED, STAMP_SOLD } from "@/lib/copy/market";

export function MarketStamp({
  kind,
  size = "md",
}: {
  kind: "certified" | "sold";
  size?: "sm" | "md" | "lg";
}) {
  const label = kind === "sold" ? STAMP_SOLD : STAMP_CERTIFIED;
  const sizeClass =
    size === "lg"
      ? "px-3 py-1.5 text-[15px] tracking-[0.18em]"
      : size === "sm"
        ? "px-1.5 py-0.5 text-[10px] tracking-[0.14em]"
        : "px-2 py-1 text-[12px] tracking-[0.16em]";

  return (
    <span
      className={`inline-flex -rotate-12 items-center justify-center rounded-sm border-[3px] border-red-700 bg-red-50/90 font-extrabold text-red-700 shadow-[inset_0_0_0_1px_rgba(185,28,28,0.35)] ${sizeClass}`}
      aria-label={label}
    >
      {label}
    </span>
  );
}
