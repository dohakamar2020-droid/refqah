/**
 * True while `next build` is generating static pages.
 *
 * The app never needs real data then: every page is rendered on demand
 * (`dynamic = "force-dynamic"`), so the shared header can skip the database
 * entirely instead of opening the embedded PGlite files from several build
 * workers at once.
 */
export const isBuildPhase = () =>
  process.env.NEXT_PHASE === "phase-production-build";
