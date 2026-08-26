ALTER TABLE "messages" ADD COLUMN "pinned_until" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "messages_pinned_idx" ON "messages" USING btree ("conversation_id","pinned_at");