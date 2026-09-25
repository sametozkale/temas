ALTER TABLE "conversations" ADD COLUMN "mailbox_state" text DEFAULT 'inbox' NOT NULL;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "starred" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_mailbox_state_check" CHECK ("conversations"."mailbox_state" in ('inbox','archived','trash','spam'));