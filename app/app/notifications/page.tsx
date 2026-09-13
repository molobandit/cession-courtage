import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState, ToolIcon } from "@/components/app/toolbox";
import { getActor, isOriasVerified } from "@/lib/authz";
import { formatDateTime } from "@/lib/format/fr";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Notifications" };

/**
 * Tout ce qui s'est passé sur vos dossiers, du plus récent au plus ancien.
 *
 * Les notifications étaient enregistrées sans jamais être montrées : on
 * prenait position, on retenait une offre, et l'autre partie n'en voyait
 * rien. Ouvrir cette page les marque comme lues.
 */
export default async function NotificationsPage() {
  const actor = await getActor();
  if (!actor) redirect("/connexion?next=/app/notifications");
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");

  const notifications = await prisma.notification.findMany({
    where: { userId: actor.id },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: { id: true, title: true, body: true, href: true, readAt: true, createdAt: true },
  });
  const nonLues = notifications.filter((n) => !n.readAt).map((n) => n.id);
  if (nonLues.length > 0) {
    await prisma.notification.updateMany({
      where: { userId: actor.id, readAt: null },
      data: { readAt: new Date() },
    });
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">Notifications</h1>
      <p className="mt-1 text-[15px] text-muted">
        Prises de position, offres, étapes de dossier et messages. Chaque ligne mène au dossier concerné.
      </p>

      {notifications.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-line bg-paper shadow-sm">
          <EmptyState icon="doc" title="Aucune notification" text="Vous serez prévenu ici dès qu’un dossier avance." />
        </div>
      ) : (
        <ul className="mt-6 grid gap-2">
          {notifications.map((n) => {
            const nouvelle = nonLues.includes(n.id);
            const contenu = (
              <>
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${nouvelle ? "bg-indigo" : "bg-transparent"}`} />
                <span className="min-w-0 flex-1">
                  <span className={`block text-[15px] ${nouvelle ? "font-semibold" : "font-medium"} text-ink`}>{n.title}</span>
                  <span className="mt-0.5 block text-[14px] text-muted">{n.body}</span>
                  <span className="mt-1 block text-[12px] text-muted">{formatDateTime(n.createdAt)}</span>
                </span>
                {n.href ? <ToolIcon name="chevron-right" className="mt-1 h-4 w-4 shrink-0 text-muted" /> : null}
              </>
            );
            return (
              <li key={n.id}>
                {n.href ? (
                  <Link
                    href={n.href}
                    className={`flex gap-3 rounded-xl border p-4 hover:border-indigo ${nouvelle ? "border-indigo-line bg-indigo-soft/40" : "border-line bg-paper"}`}
                  >
                    {contenu}
                  </Link>
                ) : (
                  <div className="flex gap-3 rounded-xl border border-line bg-paper p-4">{contenu}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
