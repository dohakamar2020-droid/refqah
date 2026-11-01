CREATE TABLE "site_meta" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hadith" ADD COLUMN "text_edited" boolean DEFAULT false NOT NULL;