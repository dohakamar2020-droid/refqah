/**
 * Login codes («الأكواد») for teachers and students.
 *
 * A code is a short, easy-to-dictate key that identifies one account:
 *   - كود المعلمة:  TCH-XXXXXX   (also the join code her students use)
 *   - كود الطالبة:  STU-XXXXXX
 *
 * Codes are stored normalized (upper-case, no spaces) and compared the same
 * way, so «tch-4k7t2m» and «TCH-4K7T2M» are the same code.
 */

/** No 0/O, 1/I/L — the characters people misread when writing a code down. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export const TEACHER_CODE_PREFIX = "TCH";
export const STUDENT_CODE_PREFIX = "STU";

/** Arabic-Indic and Persian digits → ASCII, so a code typed in Arabic works. */
function toAsciiDigits(value: string): string {
  return value
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/**
 * Normalize a code the way it is stored: ASCII digits, upper-case Latin,
 * no spaces or separators typed by mistake.
 */
export function normalizeCode(raw: string | null | undefined): string {
  return toAsciiDigits(String(raw ?? ""))
    .trim()
    .toUpperCase()
    .replace(/[\s–—_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Accepts codes like `TCH-4K7T2M`, `4K7T2M` (prefix added automatically) or a
 * teacher-chosen code such as `OMRANA` / `OM-2026`. 4–24 characters.
 */
export function isValidCode(code: string): boolean {
  return /^[A-Z0-9][A-Z0-9_-]{3,23}$/.test(code);
}

/** True when the code carries the given prefix (or no prefix at all). */
export function hasPrefix(code: string, prefix: string): boolean {
  return code.includes("-") ? code.startsWith(`${prefix}-`) : false;
}

function randomBody(length = 6): string {
  let out = "";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/** Generate a fresh teacher code: `TCH-4K7T2M`. */
export function generateTeacherCode(): string {
  return `${TEACHER_CODE_PREFIX}-${randomBody()}`;
}

/** Generate a fresh student code: `STU-9Q2W5E`. */
export function generateStudentCode(): string {
  return `${STUDENT_CODE_PREFIX}-${randomBody()}`;
}

/**
 * Make sure a code is unique across teachers + students.
 * `isTaken` is supplied by the caller (it needs the database).
 */
export async function generateUniqueCode(
  prefix: string,
  isTaken: (code: string) => Promise<boolean>,
  attempts = 12
): Promise<string> {
  for (let i = 0; i < attempts; i++) {
    const candidate =
      prefix === TEACHER_CODE_PREFIX ? generateTeacherCode() : generateStudentCode();
    if (!(await isTaken(candidate))) return candidate;
  }
  // Practically unreachable; fall back to a longer body.
  return `${prefix}-${randomBody(10)}`;
}

/**
 * Normalize a person's name for comparison: trim, collapse spaces, drop Arabic
 * diacritics/tatweel so «مريم أحمد» matches «مريم  أحمد» typed differently.
 */
export function normalizeName(raw: string | null | undefined): string {
  return String(raw ?? "")
    .replace(/[\u064B-\u0652\u0670\u0640]/g, "") // diacritics + tatweel
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
