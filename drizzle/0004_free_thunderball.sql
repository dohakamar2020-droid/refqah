CREATE TABLE "hadith_title" (
	"id" text PRIMARY KEY NOT NULL,
	"teacher_id" text NOT NULL,
	"hadith_id" text NOT NULL,
	"student_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"awarded_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "student" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "hadith_title" ADD CONSTRAINT "hadith_title_teacher_id_teacher_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teacher"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hadith_title" ADD CONSTRAINT "hadith_title_hadith_id_hadith_id_fk" FOREIGN KEY ("hadith_id") REFERENCES "public"."hadith"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hadith_title" ADD CONSTRAINT "hadith_title_student_id_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "hadith_title_teacher_hadith_uidx" ON "hadith_title" USING btree ("teacher_id","hadith_id");--> statement-breakpoint
CREATE INDEX "hadith_title_student_idx" ON "hadith_title" USING btree ("student_id");