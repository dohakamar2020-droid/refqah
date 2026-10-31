import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import { user, session, account, verification } from "@/lib/db/schema";

/**
 * Better Auth configuration.
 * - Email + password sign-in
 * - Username sign-in (via the username plugin) — students may use either
 * - Role stored as an additional field on `user` ("admin" | "student")
 *
 * NOTE: `nextCookies()` MUST be the last plugin in the array — it is what lets
 * Better Auth read/write cookies from Server Actions and Route Handlers.
 */
export const auth = betterAuth({
  appName: "رِفقة الأربعين",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  baseURL: process.env.BETTER_AUTH_URL || undefined,
  secret:
    process.env.BETTER_AUTH_SECRET || "refqah-dev-secret-change-in-production",
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: false },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "student",
        input: false, // never settable from the client
      },
    },
  },
  plugins: [
    username({
      minUsernameLength: 3,
      maxUsernameLength: 30,
      usernameNormalization: (u) => u.trim().toLowerCase(),
    }),
    nextCookies(), // must be last
  ],
  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.BETTER_AUTH_URL,
  ].filter((o): o is string => Boolean(o)),
});

export type Session = typeof auth.$Infer.Session;
