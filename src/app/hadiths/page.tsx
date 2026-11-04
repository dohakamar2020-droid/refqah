import { redirect } from "next/navigation";
import { getClassForRequest } from "@/lib/class-context";

export const dynamic = "force-dynamic";

/**
 * /hadiths used to be the single class's journey. With many teachers, the
 * journey belongs to a class: logged-in users are sent to their own class page,
 * visitors are asked for the teacher code on the home page.
 */
export default async function HadithsPage() {
  const klass = await getClassForRequest();
  if (klass) redirect(`/c/${klass.code}`);
  redirect("/#lookup");
}
