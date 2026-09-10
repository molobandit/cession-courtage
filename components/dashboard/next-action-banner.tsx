import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { NextAction } from "@/lib/dashboard/next-action";

const TONE_STYLES: Record<NextAction["tone"], string> = {
  action: "border-indigo-line bg-indigo-soft",
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
      className={`rounded-[1.75rem] border p-5 sm:p-6 ${TONE_STYLES[action.tone]}`}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-indigo-dark">
            {TONE_LABELS[action.tone]}
          </p>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-ink">{action.title}</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">{action.detail}</p>
        </div>
        <Button
          asChild
          variant={action.tone === "action" ? "primary" : "outline"}
          className="w-full shrink-0 sm:w-auto"
        >
          <Link href={action.href}>{action.cta}</Link>
        </Button>
      </div>
    </section>
  );
}
