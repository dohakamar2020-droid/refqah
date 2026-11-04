import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/permissions";

export const dynamic = "force-dynamic";

/** Old address of the student space — kept so old bookmarks still work. */
export default async function MePage() {
  const me = await getSessionUser();
  if (!me) redirect("/student/login");
  redirect(me.role === "admin" ? "/admin" : "/student");
}
