"use server";

import { revalidatePath } from "next/cache";
import { getActor, isAdmin } from "@/lib/authz/actor";
import { ForbiddenError } from "@/lib/authz/errors";
import { ensureAdvisorCalendar } from "@/lib/booking/ensure";
import { minutesFromHm } from "@/lib/booking/time";
import { syncAdvisorIcs } from "@/lib/booking/sync-ics";
import { prisma } from "@/lib/prisma";

async function requireAgendaAdmin() {
  const actor = await getActor();
  if (!actor || !isAdmin(actor)) throw new ForbiddenError("Réservé aux administrateurs.");
  await ensureAdvisorCalendar();
  return actor;
}

export async function addAdvisorWindowAction(formData: FormData): Promise<void> {
  await requireAgendaAdmin();
  const weekday = Number(formData.get("weekday"));
  const start = minutesFromHm(String(formData.get("start") ?? ""));
  const end = minutesFromHm(String(formData.get("end") ?? ""));
  if (!Number.isInteger(weekday) || weekday < 1 || weekday > 7 || start == null || end == null || start >= end) {
    return;
  }
  await prisma.advisorAvailability.create({
    data: { weekday, startMinutes: start, endMinutes: end },
  });
  revalidatePath("/admin/agenda");
  revalidatePath("/rendez-vous");
}

export async function deleteAdvisorWindowAction(formData: FormData): Promise<void> {
  await requireAgendaAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.advisorAvailability.delete({ where: { id } }).catch(() => undefined);
  revalidatePath("/admin/agenda");
  revalidatePath("/rendez-vous");
}

export async function addBlockedDayAction(formData: FormData): Promise<void> {
  await requireAgendaAdmin();
  const date = String(formData.get("date") ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
  await prisma.advisorBlockedDay.upsert({
    where: { date },
    create: { date },
    update: {},
  });
  revalidatePath("/admin/agenda");
  revalidatePath("/rendez-vous");
}

export async function deleteBlockedDayAction(formData: FormData): Promise<void> {
  await requireAgendaAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.advisorBlockedDay.delete({ where: { id } }).catch(() => undefined);
  revalidatePath("/admin/agenda");
  revalidatePath("/rendez-vous");
}

export async function saveAdvisorIcsAction(formData: FormData): Promise<void> {
  await requireAgendaAdmin();
  const raw = String(formData.get("icsUrl") ?? "").trim();
  const remove = formData.get("removeIcs") === "on";
  const current = await prisma.advisorCalendarSettings.findUnique({
    where: { id: "default" },
  });
  let icsUrl = current?.icsUrl ?? null;
  if (remove) icsUrl = null;
  else if (raw) {
    if (!raw.startsWith("https://")) return;
    icsUrl = raw;
  }
  await prisma.advisorCalendarSettings.update({
    where: { id: "default" },
    data: { icsUrl },
  });
  await syncAdvisorIcs();
  revalidatePath("/admin/agenda");
  revalidatePath("/rendez-vous");
}

export async function syncAdvisorIcsAction(): Promise<void> {
  await requireAgendaAdmin();
  await syncAdvisorIcs();
  revalidatePath("/admin/agenda");
  revalidatePath("/rendez-vous");
}

export async function cancelAdvisorBookingAction(formData: FormData): Promise<void> {
  await requireAgendaAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.advisorBooking.updateMany({
    where: { id, status: { not: "CANCELLED" } },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });
  revalidatePath("/admin/agenda");
  revalidatePath("/rendez-vous");
}
