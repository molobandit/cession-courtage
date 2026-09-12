import type { DealStage } from "@prisma/client";
import {
  pipelineIndex,
  pipelineProgressPercent,
  SALE_PIPELINE,
  type PipelineStep,
} from "@/lib/deal/pipeline";

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
      {/*
        Les étapes franchies se distinguent de celles qui restent : sans cela,
        le pourcentage annonce une progression que la liste ne montre pas, et
        l'un dément l'autre.
      */}
      <ol className="mt-5 grid gap-2 sm:grid-cols-2">
        {SALE_PIPELINE.map((step, index) => (
          <PipelineRow
            key={step.key}
            step={step}
            current={step.key === currentKey}
            done={index < pipelineIndex(currentKey)}
          />
        ))}
      </ol>
    </section>
  );
}

function PipelineRow({
  step,
  current,
  done,
}: {
  step: PipelineStep;
  current: boolean;
  done: boolean;
}) {
  return (
    <li
      className={`rounded-2xl border px-3 py-3 ${
        current
          ? "border-indigo bg-indigo-soft"
          : done
            ? "border-line bg-surface-alt"
            : "border-line bg-paper"
      }`}
    >
      <p
        className={`text-[13px] font-semibold ${
          current ? "text-indigo-dark" : done ? "text-muted" : "text-ink"
        }`}
      >
        {step.label}
        {current ? " · en cours" : done ? " · fait" : ""}
      </p>
      <p className="mt-1 text-[12px] leading-relaxed text-muted">{step.summary}</p>
    </li>
  );
}
