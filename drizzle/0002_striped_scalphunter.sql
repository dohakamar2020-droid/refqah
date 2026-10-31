CREATE TABLE "registration_settings" (
	"id" text PRIMARY KEY DEFAULT 'main' NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"code" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
