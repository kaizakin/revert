/**
 * The Revert mark, as data.
 *
 * The drawing is the original one: a small, airy arrow with room around it. An
 * attempt at filling more of the tile and squaring the stroke onto the pixel
 * grid made it chunky, and the delicate version is the better mark — so the
 * geometry here is exactly what it was.
 *
 * What is not original is that it now exists once. The favicon used to be a
 * hand-kept second copy in src/app/icon.svg with its colours frozen at #12805c,
 * a green the app uses in neither theme, so the tab and the header were quietly
 * different logos. Both icon files are written from this by `npm run icons`.
 *
 * A return arrow: it goes out, turns, and comes back. That is what the word
 * means in every sense the product uses it — a reply in chat, a reply from a
 * recruiter, and the undo glyph everyone already reads as "back".
 */

/** Every coordinate below lives on this grid. */
export const MARK_VIEWBOX = 32;

export const MARK_PATHS = [
  /* Out to the right, around, and back — the return itself. */
  "M11 12h7a4.5 4.5 0 0 1 0 9h-3.5",
  /* Head pointing back the way it came. */
  "M13.8 8.8 10.4 12l3.4 3.2",
];

/**
 * How much of the tile the drawing takes. The space around it is the point —
 * this is what makes the mark read as delicate rather than as an arrow crammed
 * into a green square.
 */
export const MARK_SCALE = 0.62;

/**
 * Stroke in grid units. Rendered weight is MARK_STROKE * MARK_SCALE * size / 32,
 * which is about 0.8px in a 16px tile — under a device pixel, so the mark is
 * softer there than it is crisp. Kept anyway: a stroke heavy enough to land on
 * whole pixels at this scale is visibly chunkier, and the drawing matters more
 * than the tab does.
 */
export const MARK_STROKE = 2.6;

/** Corner radius as a fraction of the tile, matching a rounded app icon. */
export const MARK_RADIUS = 0.28;

/**
 * The tile follows the accent — deep green in light, mint in dark — and the
 * arrow stays white on both rather than inverting to near-black on the mint.
 *
 * Recorded rather than argued: white measures 2.0:1 on the mint against 5.5:1 on
 * the deep green. Chosen for how it looks on a dark screen.
 */
export const MARK_COLOURS = {
  glyph: "#ffffff",
  /* Matches --rv-accent per theme, for the icon files, which cannot read tokens. */
  tile: { light: "#17784f", dark: "#35cf93" },
} as const;
