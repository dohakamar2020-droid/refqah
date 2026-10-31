CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "achievement" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"type" text NOT NULL,
	"hadith_id" text,
	"title" text NOT NULL,
	"description" text,
	"awarded_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "competition_settings" (
	"id" text PRIMARY KEY DEFAULT 'main' NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hadith" (
	"id" text PRIMARY KEY NOT NULL,
	"order" integer NOT NULL,
	"title" text NOT NULL,
	"narrator" text,
	"arabic_text" text NOT NULL,
	"takhrij" text,
	"published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hadith_order_unique" UNIQUE("order")
);
--> statement-breakpoint
CREATE TABLE "message" (
	"id" text PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"category" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recitation" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"hadith_id" text NOT NULL,
	"recited" boolean DEFAULT false NOT NULL,
	"recited_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "registration_settings" (
	"id" text PRIMARY KEY DEFAULT 'main' NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"code" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "student" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"display_name" text NOT NULL,
	"avatar_url" text,
	"phone" text,
	"competition_opt_in" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "student_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"username" text,
	"display_username" text,
	"role" text DEFAULT 'student' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achievement" ADD CONSTRAINT "achievement_student_id_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achievement" ADD CONSTRAINT "achievement_hadith_id_hadith_id_fk" FOREIGN KEY ("hadith_id") REFERENCES "public"."hadith"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recitation" ADD CONSTRAINT "recitation_student_id_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recitation" ADD CONSTRAINT "recitation_hadith_id_hadith_id_fk" FOREIGN KEY ("hadith_id") REFERENCES "public"."hadith"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student" ADD CONSTRAINT "student_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "recitation_student_hadith_uidx" ON "recitation" USING btree ("student_id","hadith_id");--> statement-breakpoint
CREATE INDEX "recitation_hadith_idx" ON "recitation" USING btree ("hadith_id");--> statement-breakpoint
CREATE INDEX "recitation_student_idx" ON "recitation" USING btree ("student_id");