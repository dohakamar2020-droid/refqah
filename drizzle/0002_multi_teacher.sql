CREATE TABLE IF NOT EXISTS "teacher" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"display_code" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "teacher_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "teacher_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "hadith" DROP CONSTRAINT IF EXISTS "hadith_order_unique";--> statement-breakpoint
ALTER TABLE "competition_settings" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "registration_settings" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "hadith" ADD COLUMN IF NOT EXISTS "teacher_id" text;--> statement-breakpoint
ALTER TABLE "message" ADD COLUMN IF NOT EXISTS "teacher_id" text;--> statement-breakpoint
ALTER TABLE "student" ADD COLUMN IF NOT EXISTS "teacher_id" text;--> statement-breakpoint
ALTER TABLE "student" ADD COLUMN IF NOT EXISTS "login_code" text;--> statement-breakpoint
ALTER TABLE "teacher" DROP CONSTRAINT IF EXISTS "teacher_user_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "teacher" ADD CONSTRAINT "teacher_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hadith" DROP CONSTRAINT IF EXISTS "hadith_teacher_id_teacher_id_fk";--> statement-breakpoint
ALTER TABLE "hadith" ADD CONSTRAINT "hadith_teacher_id_teacher_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teacher"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" DROP CONSTRAINT IF EXISTS "message_teacher_id_teacher_id_fk";--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_teacher_id_teacher_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teacher"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student" DROP CONSTRAINT IF EXISTS "student_teacher_id_teacher_id_fk";--> statement-breakpoint
ALTER TABLE "student" ADD CONSTRAINT "student_teacher_id_teacher_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teacher"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hadith_teacher_order_uidx" ON "hadith" USING btree ("teacher_id","order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "message_teacher_idx" ON "message" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "student_teacher_idx" ON "student" USING btree ("teacher_id");--> statement-breakpoint
ALTER TABLE "student" DROP CONSTRAINT IF EXISTS "student_login_code_unique";--> statement-breakpoint
ALTER TABLE "student" ADD CONSTRAINT "student_login_code_unique" UNIQUE("login_code");