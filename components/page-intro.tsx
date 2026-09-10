import type { ReactNode } from "react";

export function PageIntro({
  kicker,
  title,
  children,
  actions,
}: {
  kicker?: string;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="border-b border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-12">
        {kicker ? <p className="text-[13px] font-semibold text-indigo">{kicker}</p> : null}
        <h1
          className={`max-w-3xl text-4xl font-bold tracking-tight text-ink ${kicker ? "mt-3" : ""}`}
        >
          {title}
        </h1>
        {children ? (
          <div className="mt-4 max-w-2xl text-[16px] leading-relaxed text-muted">{children}</div>
        ) : null}
        {actions ? <div className="mt-7 flex flex-wrap gap-3">{actions}</div> : null}
      </div>
    </section>
  );
}
