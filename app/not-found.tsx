import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col items-start px-4 py-20">
      <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-gold-deep">
        Page introuvable
      </p>
      <h1 className="mt-4 font-serif text-3xl font-semibold text-ink">
        Cette page n’existe pas, ou ne vous est pas accessible
      </h1>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">
        Un dossier non publié reste invisible pour tout le monde sauf son cédant.
        Si vous avez suivi un lien vers une annonce, il est possible qu’elle ait
        été retirée ou que sa fenêtre d’offres soit close.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild variant="gold">
          <Link href="/annonces">Voir les annonces</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Retour à l’accueil</Link>
        </Button>
      </div>
    </main>
  );
}
