-- Préférences de notification du compte (JSON : messages, offers, deals, billing).

ALTER TABLE "User" ADD COLUMN "notifyPrefs" TEXT;
