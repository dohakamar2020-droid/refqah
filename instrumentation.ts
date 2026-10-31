export async function register() {
  // Only on the Node.js runtime (not the edge runtime), and never during build.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const { ensureReady } = await import("@/lib/db/ready");
  try {
    await ensureReady();
    console.log("[refqah] database ready");
  } catch (err) {
    console.error("[refqah] database bootstrap failed:", err);
  }
}
