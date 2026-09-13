import type { ReactNode } from "react";

export function MemberPageHeader({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="mb-6">
      <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-indigo">Poste de marché</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">{title}</h1>
      {children ? (
        <div className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">{children}</div>
      ) : null}
    </header>
  );
}
