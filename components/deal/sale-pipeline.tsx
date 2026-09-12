import type { DealStage } from "@prisma/client";
import { pipelineProgressPercent, SALE_PIPELINE, type PipelineStep } from "@/lib/deal/pipeline";

export function SalePipeline({
  currentKey,
}: {
  currentKey: DealStage | "POSITION";
}) {
  const percent = pipelineProgressPercent(currentKey);

  return (
    <section className="rounded-3xl border border-line bg-paper p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-ink">Parcours jusqu’à la cession</h2>
        <p className="tabular text-[14px] text-muted">{percent} %</p>
      </div>
      <div
        className="mt-3 h-2 rounded-full bg-surface-alt"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label="Avancement de la cession"
      >
        <div className="h-full rounded-full bg-indigo" style={{ width: `${percent}%` }} />
      </div>
      <ol className="mt-5 grid gap-2 sm:grid-cols-2">
        {SALE_PIPELINE.map((step) => (
          <PipelineRow key={step.key} step={step} current={step.key === currentKey} />
        ))}
      </ol>
    </section>
  );
}

function PipelineRow({ step, current }: { step: PipelineStep; current: boolean }) {
  return (
    <li
      className={`rounded-2xl border px-3 py-3 ${
        current ? "border-indigo bg-indigo-soft" : "border-line bg-paper"
      }`}
    >
      <p className={`text-[13px] font-semibold ${current ? "text-indigo-dark" : "text-ink"}`}>
        {step.label}
        {current ? " · en cours" : ""}
      </p>
      <p className="mt-1 text-[12px] leading-relaxed text-muted">{step.summary}</p>
    </li>
  );
}
