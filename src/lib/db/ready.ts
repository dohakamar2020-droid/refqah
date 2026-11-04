import { ensureSchema } from "./bootstrap";
import { ensureSeed } from "./seed";
import { adoptLegacyData } from "../tenancy";

let readyPromise: Promise<void> | null = null;

/**
 * Make sure the schema exists, older single-teacher data is adopted by its
 * teacher, and the base content (hadiths, messages, teacher spaces) is seeded.
 * Cheap to call on every request — it resolves immediately after the first
 * successful run.
 */
export function ensureReady(): Promise<void> {
  if (!readyPromise) {
    readyPromise = (async () => {
      await ensureSchema();
      await adoptLegacyData();
      await ensureSeed();
    })().catch((err) => {
      readyPromise = null; // allow retry on the next request
      throw err;
    });
  }
  return readyPromise;
}
