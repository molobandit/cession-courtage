import { formatDateTime } from "@/lib/format/fr";
import {
  addAdvisorWindowAction,
  addBlockedDayAction,
  cancelAdvisorBookingAction,
  deleteAdvisorWindowAction,
  deleteBlockedDayAction,
  saveAdvisorIcsAction,
  syncAdvisorIcsAction,
} from "@/app/actions/admin-agenda";
import { Button } from "@/components/ui/button";
import { ensureAdvisorCalendar } from "@/lib/booking/ensure";
import { hmFromMinutes, WEEKDAY_LABELS, formatParisSlot } from "@/lib/booking/time";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Agenda conseiller" };

function maskIcs(url: string | null): string | null {
  if (!url) return null;
  if (url.length < 28) return "Adresse iCal enregistrée";
  return `…${url.slice(-24)}`;
}

const PURPOSE_LABEL: Record<string, string> = {
  DEPOSIT: "Déposer un portefeuille",
  BUY: "Acheter / se renseigner",
  OTHER: "Autre",
};

export default async function AdminAgendaPage() {
  await ensureAdvisorCalendar();
  const [settings, windows, blocked, bookings] = await Promise.all([
    prisma.advisorCalendarSettings.findUnique({ where: { id: "default" } }),
    prisma.advisorAvailability.findMany({ orderBy: [{ weekday: "asc" }, { startMinutes: "asc" }] }),
    prisma.advisorBlockedDay.findMany({ orderBy: { date: "asc" } }),
    prisma.advisorBooking.findMany({
      where: { startsAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60_000) } },
      orderBy: { startsAt: "asc" },
    }),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="font-serif text-2xl text-ink">Agenda conseiller</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Les créneaux publics viennent de vos horaires, moins les jours bloqués,
        moins l’occupation importée depuis Google ou Outlook (adresse iCal
        secrète), moins les entretiens déjà réservés sur le site.
      </p>

      <section className="mt-8 rounded-2xl border border-line bg-paper p-6">
        <h2 className="text-lg font-semibold text-ink">Calendrier (Google / Outlook)</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">
          Dans Google Agenda : Paramètres du calendrier → Intégration de
          l’agenda → « Adresse secrète au format iCal ». Dans Outlook :
          Partager → Publier un calendrier → ICS. Collez uniquement une URL
          https. Elle n’apparaît jamais sur le site public.
        </p>
        {maskIcs(settings?.icsUrl ?? null) ? (
          <p className="mt-3 text-[13px] text-ink">Enregistré : {maskIcs(settings?.icsUrl ?? null)}</p>
        ) : (
          <p className="mt-3 text-[13px] text-muted">Aucun calendrier branché pour l’instant.</p>
        )}
        {settings?.lastSyncAt ? (
          <p className="mt-1 text-[13px] text-muted">
            Dernière synchro : {formatDateTime(settings.lastSyncAt)}
            {settings.lastSyncError ? ` — ${settings.lastSyncError}` : ""}
          </p>
        ) : null}
        <form action={saveAdvisorIcsAction} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 text-[13px] font-medium text-ink">
            Adresse iCal
            <input
              name="icsUrl"
              type="url"
              placeholder="https://calendar.google.com/calendar/ical/…"
              className="mt-1 h-11 w-full rounded-md border border-line bg-surface-alt px-3 text-[14px]"
            />
          </label>
          <label className="flex items-center gap-2 text-[13px] text-ink">
            <input type="checkbox" name="removeIcs" className="accent-indigo" />
            Retirer
          </label>
          <Button type="submit" variant="primary">
            Enregistrer
          </Button>
        </form>
        <form action={syncAdvisorIcsAction} className="mt-3">
          <Button type="submit" variant="outline">
            Synchroniser maintenant
          </Button>
        </form>
      </section>

      <section className="mt-8 rounded-2xl border border-line bg-paper p-6">
        <h2 className="text-lg font-semibold text-ink">Horaires d’ouverture</h2>
        <ul className="mt-4 space-y-2 text-[14px]">
          {windows.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-3 border-b border-line py-2">
              <span>
                {WEEKDAY_LABELS[row.weekday]} · {hmFromMinutes(row.startMinutes)} –{" "}
                {hmFromMinutes(row.endMinutes)}
              </span>
              <form action={deleteAdvisorWindowAction}>
                <input type="hidden" name="id" value={row.id} />
                <button type="submit" className="text-[13px] text-danger hover:underline">
                  Retirer
                </button>
              </form>
            </li>
          ))}
        </ul>
        <form action={addAdvisorWindowAction} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-[13px] font-medium text-ink">
            Jour
            <select name="weekday" className="mt-1 h-11 rounded-md border border-line bg-surface-alt px-3">
              {Object.entries(WEEKDAY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[13px] font-medium text-ink">
            Début
            <input name="start" type="time" defaultValue="09:00" className="mt-1 h-11 rounded-md border border-line bg-surface-alt px-3" />
          </label>
          <label className="text-[13px] font-medium text-ink">
            Fin
            <input name="end" type="time" defaultValue="12:00" className="mt-1 h-11 rounded-md border border-line bg-surface-alt px-3" />
          </label>
          <Button type="submit" variant="outline">
            Ajouter
          </Button>
        </form>
      </section>

      <section className="mt-8 rounded-2xl border border-line bg-paper p-6">
        <h2 className="text-lg font-semibold text-ink">Jours bloqués</h2>
        <ul className="mt-4 space-y-2 text-[14px]">
          {blocked.length === 0 ? (
            <li className="text-muted">Aucun jour fermé.</li>
          ) : (
            blocked.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3">
                <span className="tabular">{row.date}</span>
                <form action={deleteBlockedDayAction}>
                  <input type="hidden" name="id" value={row.id} />
                  <button type="submit" className="text-[13px] text-danger hover:underline">
                    Retirer
                  </button>
                </form>
              </li>
            ))
          )}
        </ul>
        <form action={addBlockedDayAction} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-[13px] font-medium text-ink">
            Date
            <input name="date" type="date" className="mt-1 h-11 rounded-md border border-line bg-surface-alt px-3" />
          </label>
          <Button type="submit" variant="outline">
            Bloquer ce jour
          </Button>
        </form>
      </section>

      <section className="mt-8 rounded-2xl border border-line bg-paper p-6">
        <h2 className="text-lg font-semibold text-ink">Entretiens</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="py-2 font-medium">Créneau</th>
                <th className="py-2 font-medium">Contact</th>
                <th className="py-2 font-medium">Objet</th>
                <th className="py-2 font-medium">État</th>
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-muted">
                    Aucun entretien sur la période récente.
                  </td>
                </tr>
              ) : (
                bookings.map((row) => {
                  const slot = formatParisSlot(row.startsAt, row.endsAt);
                  return (
                    <tr key={row.id} className="border-t border-line align-top">
                      <td className="py-3">
                        {slot.dayLabel}
                        <div className="text-[13px] text-muted">{slot.timeLabel}</div>
                      </td>
                      <td className="py-3">
                        {row.fullName}
                        <div className="text-[13px] text-muted">{row.email}</div>
                        {row.phone ? <div className="text-[13px] text-muted">{row.phone}</div> : null}
                      </td>
                      <td className="py-3">{PURPOSE_LABEL[row.purpose] ?? row.purpose}</td>
                      <td className="py-3">
                        {row.status === "CANCELLED" ? (
                          "Annulé"
                        ) : (
                          <form action={cancelAdvisorBookingAction}>
                            <input type="hidden" name="id" value={row.id} />
                            <button type="submit" className="text-[13px] text-danger hover:underline">
                              Annuler
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
