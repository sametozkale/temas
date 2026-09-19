-- Per-type email / WhatsApp notification matrix (Settings > Notifications).
ALTER TABLE "profiles" ADD COLUMN "notification_prefs" jsonb DEFAULT '{"digest":{"email":true,"whatsapp":false},"viewings":{"email":true,"whatsapp":false},"viewing_reminders":{"email":true,"whatsapp":false},"applications":{"email":true,"whatsapp":false},"owner_decisions":{"email":true,"whatsapp":false}}'::jsonb NOT NULL;
--> statement-breakpoint
UPDATE "profiles"
SET "notification_prefs" = jsonb_set(
  "notification_prefs",
  '{digest,email}',
  to_jsonb("reminder_digest_enabled")
);
--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "reminder_digest_enabled";
