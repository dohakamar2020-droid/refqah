import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

/* ────────────────────────────────
 * Better Auth tables
 * ──────────────────────────────── */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  // username plugin fields
  username: text("username").unique(),
  displayUsername: text("display_username"),
  // app role: "admin" (المعلمة) | "student" (الطالبة)
  role: text("role").notNull().default("student"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/* ────────────────────────────────
 * App tables
 * ──────────────────────────────── */

/** Student profile — 1:1 with a user account. Privacy settings live here. */
export const student = pgTable("student", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  /**
   * رقم واتساب الطالبة بالصيغة الدولية (مثال: 201012345678).
   * اختياري — يُستخدم فقط لفتح محادثة واتساب عند إرسال التقرير.
   */
  phone: text("phone"),
  /** موافقة الطالبة على الظهور في لوحة أفضل 3 */
  competitionOptIn: boolean("competition_opt_in").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/** The 42 hadiths of the course. */
export const hadith = pgTable("hadith", {
  id: text("id").primaryKey(),
  order: integer("order").notNull().unique(),
  title: text("title").notNull(),
  arabicText: text("arabic_text").notNull(),
  source: text("source"),
  published: boolean("published").notNull().default(false),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/** Recitation status of one student for one hadith (recited / not yet). */
export const recitation = pgTable(
  "recitation",
  {
    id: text("id").primaryKey(),
    studentId: text("student_id")
      .notNull()
      .references(() => student.id, { onDelete: "cascade" }),
    hadithId: text("hadith_id")
      .notNull()
      .references(() => hadith.id, { onDelete: "cascade" }),
    recited: boolean("recited").notNull().default(false),
    /** وقت اعتماد التسميع — يُستخدم لتحديد أول من أتمّت الحديث الأول */
    recitedAt: timestamp("recited_at"),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("recitation_student_hadith_uidx").on(t.studentId, t.hadithId),
    index("recitation_hadith_idx").on(t.hadithId),
    index("recitation_student_idx").on(t.studentId),
  ]
);

/** Honors / badges, e.g. «سَابِقَةُ الخَيْرَات» لأول من أتمّت الحديث الأول. */
export const achievement = pgTable("achievement", {
  id: text("id").primaryKey(),
  studentId: text("student_id")
    .notNull()
    .references(() => student.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "first_hadith" | "custom"
  hadithId: text("hadith_id").references(() => hadith.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  description: text("description"),
  awardedAt: timestamp("awarded_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Global competition (Top 3) switch — controlled by the teacher only. */
export const competitionSettings = pgTable("competition_settings", {
  id: text("id").primaryKey().default("main"),
  enabled: boolean("enabled").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/** Library of encouraging messages — original wording, rotated per visit. */
export const message = pgTable("message", {
  id: text("id").primaryKey(),
  text: text("text").notNull(),
  category: text("category"), // تحفيز | امتنان | همة | استمرار | علم
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ── Types ── */

export type User = typeof user.$inferSelect;
export type Student = typeof student.$inferSelect;
export type Hadith = typeof hadith.$inferSelect;
export type Recitation = typeof recitation.$inferSelect;
export type Achievement = typeof achievement.$inferSelect;
export type CompetitionSettings = typeof competitionSettings.$inferSelect;
export type Message = typeof message.$inferSelect;

export const schema = {
  user,
  session,
  account,
  verification,
  student,
  hadith,
  recitation,
  achievement,
  competitionSettings,
  message,
};
