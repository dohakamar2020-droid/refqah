"use client";

import { createAuthClient } from "better-auth/react";
import { usernameClient, inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "@/lib/auth";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || undefined,
  plugins: [usernameClient(), inferAdditionalFields<typeof auth>()],
});

export type AuthClient = typeof authClient;
