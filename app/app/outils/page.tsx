import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { canBuy, canSell, getActor, isOriasVerified } from "@/lib/authz";

export const metadata: Metadata = { title: "Outils" };

type Tool = { href: string; title: string; detail: string };

export default async function OutilsPage() {
  const actor = await getActor();
  if (!actor) redirect("/connexion?next=/app/outils");
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");

  const seller = canSell(actor);
  const buyer = canBuy(actor);

  const groups: { title: string; detail: string; tools: Tool[] }[] = [
    ...(seller
      ? [
          {
            title: "Céder",
            detail: "Importer, valoriser, publier. L’annonce paraît sous alias.",
            tools: [
              {
                href: "/app/import",
                title: "Importer un bordereau",
                detail: "CSV ou XLSX. Les colonnes nominatives de clients sont refusées.",
              },
              {
                href: "/app/annonces/nouvelle",
                title: "Publier une annonce",
                detail: "Alias numéroté, fenêtre d’offres, séquestre à la vente.",
              },
              {
                href: "/valoriser",
                title: "Estimer un portefeuille",
                detail: "Fourchette de valeur, pas un prix unique. Chaque poste est chiffré.",
              },
            ],
          },
        ]
      : []),
    ...(buyer
      ? [
          {
            title: "Acquérir",
            detail: "Décrivez une fois ce que vous cherchez. Les dossiers suivent.",
            tools: [
              {
                href: "/app/mandats",
                title: "Mandat d’achat",
                detail: "Budget, branches, zones. Les correspondances se calculent ensuite.",
              },
              {
                href: "/app/opportunites",
                title: "Correspondances",
                detail: "Dossiers dont le score d’adéquation dépasse le seuil.",
              },
              {
                href: "/annonces",
                title: "Catalogue",
                detail: "Portefeuilles sous alias, commissions annuelles, sans raison sociale.",
              },
            ],
          },
        ]
      : []),
    {
      title: "Conclure",
      detail: "Vérification du dossier, tarifs, et cadre de la cession.",
      tools: [
        {
          href: "/certification",
          title: "Portefeuille vérifié",
          detail: "Kbis, identité, ORIAS du dossier et documents du portefeuille.",
        },
        {
          href: "/tarifs",
          title: "Tarifs",
          detail: "Abonnement, dépôt d’identité, option simple ou vérifiée, séquestre.",
        },
      ],
    },
  ];

  const count = groups.reduce((sum, g) => sum + g.tools.length, 0);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
      <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-4xl">Outils</h1>
      <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
        L’essentiel pour céder, acquérir ou conclure. Rien d’autre.
      </p>

      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-line bg-paper p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <p className="text-[15px] text-ink">
          <span className="tabular font-semibold">{count}</span>{" "}
          <span className="text-muted">outils disponibles</span>
        </p>
        <Link
          href="/app"
          className="inline-flex min-h-11 items-center text-[14px] font-medium text-indigo-dark"
        >
          Retour au tableau de bord
        </Link>
      </div>

      <div className="mt-8 space-y-10">
        {groups.map((group) => (
          <section key={group.title}>
            <h2 className="text-lg font-bold text-ink sm:text-xl">{group.title}</h2>
            <p className="mt-1 text-[14px] text-muted">{group.detail}</p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {group.tools.map((tool) => (
                <li key={tool.href}>
                  <Link
                    href={tool.href}
                    className="lift flex h-full min-h-[10rem] flex-col rounded-3xl border border-line bg-paper p-5 shadow-sm hover:border-indigo sm:p-6"
                  >
                    <h3 className="text-[16px] font-semibold text-ink">{tool.title}</h3>
                    <p className="mt-2 flex-1 text-[14px] leading-relaxed text-muted">{tool.detail}</p>
                    <span className="mt-5 text-[14px] font-medium text-indigo-dark">Ouvrir</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
