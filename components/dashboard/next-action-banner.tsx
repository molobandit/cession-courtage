import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { NextAction } from "@/lib/dashboard/next-action";

const TONE_STYLES: Record<NextAction["tone"], string> = {
  action: "border-gold-deep/40 bg-gold/12",
  attente: "border-line bg-paper",
  calme: "border-line bg-paper",
};

const TONE_LABELS: Record<NextAction["tone"], string> = {
  action: "À faire",
  attente: "En cours",
  calme: "Rien à faire",
};

export function NextActionBanner({ action }: { action: NextAction }) {
  return (
    <section
      aria-label="Action suivante"
      className={`rounded-3xl border p-6 ${TONE_STYLES[action.tone]}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="max-w-2xl">
          <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-gold-deep">
            {TONE_LABELS[action.tone]}
          </p>
          <h2 className="mt-2 font-serif text-xl font-semibold text-ink">{action.title}</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">{action.detail}</p>
        </div>
        <Button asChild variant={action.tone === "action" ? "gold" : "outline"}>
          <Link href={action.href}>{action.cta}</Link>
        </Button>
      </div>
    </section>
  );
}
