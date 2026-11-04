import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Entry point kept for old links only: each side now has its own sign-in page.
 *   - students → /student/login
 *   - teachers → /teacher/login
 */
export default async function LoginPage() {
  redirect("/student/login");
}
