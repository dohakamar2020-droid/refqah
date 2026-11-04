CREATE TABLE IF NOT EXISTS "recitation_note" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"hadith_id" text NOT NULL,
	"mistakes" text,
	"body" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recitation_note" DROP CONSTRAINT IF EXISTS "recitation_note_student_id_student_id_fk";--> statement-breakpoint
ALTER TABLE "recitation_note" ADD CONSTRAINT "recitation_note_student_id_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recitation_note" DROP CONSTRAINT IF EXISTS "recitation_note_hadith_id_hadith_id_fk";--> statement-breakpoint
ALTER TABLE "recitation_note" ADD CONSTRAINT "recitation_note_hadith_id_hadith_id_fk" FOREIGN KEY ("hadith_id") REFERENCES "public"."hadith"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "recitation_note_student_hadith_uidx" ON "recitation_note" USING btree ("student_id","hadith_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recitation_note_student_idx" ON "recitation_note" USING btree ("student_id");