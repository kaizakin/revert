CREATE TYPE "public"."member_role" AS ENUM('member', 'moderator', 'admin');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "member_role" DEFAULT 'member' NOT NULL;--> statement-breakpoint
-- Carry the existing owners across. Without this the one person who could
-- moderate the room would come back from the migration as an ordinary member.
UPDATE "users" SET "role" = 'admin' WHERE "is_admin" = true;