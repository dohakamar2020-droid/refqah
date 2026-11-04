import "server-only";
import { getSessionUser } from "@/lib/permissions";
import { getTeacherById, resolveClass } from "@/lib/tenancy";
import type { Teacher } from "@/lib/db/schema";

/**
 * Which class is this request looking at?
 *
 *   1. A logged-in student → her teacher's class.
 *   2. A logged-in teacher → her own class.
 *   3. A visitor → the class of the code in the URL (if it exists).
 *
 * Returns null when none of those apply, and the page shows the code form.
 */
export async function getClassForRequest(
  code?: string
): Promise<Teacher | null> {
  const me = await getSessionUser();
  if (me?.teacherId) {
    const own = await getTeacherById(me.teacherId);
    if (own) return own;
  }
  if (code) return resolveClass(code);
  return null;
}
