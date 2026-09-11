import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { BRAND_NAME } from "@/lib/site";

export function PendingShell({
  firstName,
  children,
}: {
  firstName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-page">
      <header className="sticky top-0 z-30 border-b border-line bg-surface">
        <div className="mx-auto flex h-[4.25rem] max-w-6xl items-center gap-4 px-4">
          <Link href="/en-attente-orias" className="flex items-center gap-2.5">
            <BrandMark className="h-9 w-9" />
            <span className="text-[15px] font-semibold tracking-tight text-ink">{BRAND_NAME}</span>
          </Link>
          <p className="ml-auto hidden text-[14px] text-muted sm:block">Bonjour {firstName}</p>
          <form action="/api/deconnexion" method="post" className="ml-auto sm:ml-0">
            <button type="submit" className="text-[14px] text-ink/80 hover:text-ink">
              Déconnexion
            </button>
          </form>
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
