import type { Metadata } from "next";
import { AdvisorBookingForm } from "@/components/booking/advisor-booking-form";
import {
  bookingMonths,
  groupSlotsByParisDay,
  parisOffsetLabel,
} from "@/lib/booking/calendar";
import { loadOpenAdvisorSlots } from "@/lib/booking/load";
import { parisOffsetMinutes } from "@/lib/booking/time";
import {
  ADVISOR_BOOKING_LEDE,
  ADVISOR_BOOKING_TITLE,
  CTA_ADVISOR,
} from "@/lib/copy/market";

export const metadata: Metadata = {
  title: CTA_ADVISOR,
  description: ADVISOR_BOOKING_LEDE,
  alternates: { canonical: "/rendez-vous" },
};

export default async function RendezVousPage() {
  const slots = await loadOpenAdvisorSlots();

  // Mise en forme côté serveur : le visiteur voit l'heure de Paris quel que
  // soit le fuseau de sa machine.
  const days = groupSlotsByParisDay(
    slots.map((slot) => ({
      startsAt: slot.startsAt.toISOString(),
      endsAt: slot.endsAt.toISOString(),
    })),
  );
  const premier = slots[0]?.startsAt ?? new Date();

  return (
    <main className="mx-auto max-w-5xl px-4 py-14">
      <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-indigo">
        Conseiller
      </p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink sm:text-5xl">
        {ADVISOR_BOOKING_TITLE}
      </h1>
      <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-muted">
        {ADVISOR_BOOKING_LEDE}
      </p>
      <div className="mt-10 rounded-[1.75rem] border border-line bg-paper p-6 sm:p-9">
        <AdvisorBookingForm
          days={days}
          months={bookingMonths(days)}
          timezoneLabel={parisOffsetLabel(premier, parisOffsetMinutes(premier))}
        />
      </div>
    </main>
  );
}
