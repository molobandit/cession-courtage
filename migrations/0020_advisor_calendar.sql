-- Agenda conseiller : horaires, jours bloqués, occupation iCal, rendez-vous.
-- L’URL iCal (Google / Outlook) n’est jamais exposée au visiteur.

CREATE TABLE "AdvisorCalendarSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Paris',
    "slotMinutes" INTEGER NOT NULL DEFAULT 30,
    "horizonDays" INTEGER NOT NULL DEFAULT 14,
    "bufferMinutes" INTEGER NOT NULL DEFAULT 120,
    "icsUrl" TEXT,
    "lastSyncAt" DATETIME,
    "lastSyncError" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "AdvisorCalendarSettings" ("id", "updatedAt") VALUES ('default', CURRENT_TIMESTAMP);

CREATE TABLE "AdvisorAvailability" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weekday" INTEGER NOT NULL,
    "startMinutes" INTEGER NOT NULL,
    "endMinutes" INTEGER NOT NULL
);

CREATE INDEX "AdvisorAvailability_weekday_idx" ON "AdvisorAvailability"("weekday");

CREATE TABLE "AdvisorBlockedDay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL
);

CREATE UNIQUE INDEX "AdvisorBlockedDay_date_key" ON "AdvisorBlockedDay"("date");

CREATE TABLE "AdvisorBusyBlock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "uid" TEXT NOT NULL,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME NOT NULL,
    "source" TEXT NOT NULL
);

CREATE UNIQUE INDEX "AdvisorBusyBlock_uid_key" ON "AdvisorBusyBlock"("uid");
CREATE INDEX "AdvisorBusyBlock_startsAt_idx" ON "AdvisorBusyBlock"("startsAt");

CREATE TABLE "AdvisorBooking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "organisation" TEXT,
    "purpose" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" DATETIME
);

CREATE INDEX "AdvisorBooking_startsAt_status_idx" ON "AdvisorBooking"("startsAt", "status");
CREATE INDEX "AdvisorBooking_email_createdAt_idx" ON "AdvisorBooking"("email", "createdAt");
CREATE UNIQUE INDEX "AdvisorBooking_startsAt_active" ON "AdvisorBooking"("startsAt") WHERE "status" != 'CANCELLED';

-- Lun–ven, 9 h–12 h et 14 h–17 h (heure de Paris).
INSERT INTO "AdvisorAvailability" ("id", "weekday", "startMinutes", "endMinutes") VALUES
    ('av_mon_am', 1, 540, 720),
    ('av_tue_am', 2, 540, 720),
    ('av_wed_am', 3, 540, 720),
    ('av_thu_am', 4, 540, 720),
    ('av_fri_am', 5, 540, 720),
    ('av_mon_pm', 1, 840, 1020),
    ('av_tue_pm', 2, 840, 1020),
    ('av_wed_pm', 3, 840, 1020),
    ('av_thu_pm', 4, 840, 1020),
    ('av_fri_pm', 5, 840, 1020);
