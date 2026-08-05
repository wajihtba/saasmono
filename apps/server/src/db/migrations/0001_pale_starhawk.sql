CREATE TYPE "public"."org_role" AS ENUM('owner', 'admin', 'staff', 'teacher', 'parent', 'student');--> statement-breakpoint
CREATE TYPE "public"."platform_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."user_type" AS ENUM('staff', 'teacher', 'parent', 'student');--> statement-breakpoint

-- Normalize the free-text values written before the enums existed, otherwise
-- the USING casts below fail on the first unexpected row.
UPDATE "user" SET "user_type" = 'staff' WHERE "user_type" NOT IN ('staff', 'teacher', 'parent', 'student');--> statement-breakpoint
UPDATE "user" SET "role" = NULL WHERE "role" IS NOT NULL AND "role" NOT IN ('user', 'admin');--> statement-breakpoint

-- `member.role` used to hold either better-auth's 'member' or a user type.
-- Fall back to the user's type, which is a subset of org_role.
UPDATE "member" SET "role" = COALESCE(
  (SELECT "user"."user_type" FROM "user" WHERE "user"."id" = "member"."user_id"),
  'student'
) WHERE "role" NOT IN ('owner', 'admin', 'staff', 'teacher', 'parent', 'student');--> statement-breakpoint

UPDATE "invitation" SET "role" = NULL
WHERE "role" IS NOT NULL AND "role" NOT IN ('owner', 'admin', 'staff', 'teacher', 'parent', 'student');--> statement-breakpoint

ALTER TABLE "invitation" ALTER COLUMN "role" SET DATA TYPE "public"."org_role" USING "role"::"public"."org_role";--> statement-breakpoint
ALTER TABLE "member" ALTER COLUMN "role" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "member" ALTER COLUMN "role" SET DATA TYPE "public"."org_role" USING "role"::"public"."org_role";--> statement-breakpoint
ALTER TABLE "member" ALTER COLUMN "role" SET DEFAULT 'student'::"public"."org_role";--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" SET DATA TYPE "public"."platform_role" USING "role"::"public"."platform_role";--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "user_type" SET DATA TYPE "public"."user_type" USING "user_type"::"public"."user_type";
