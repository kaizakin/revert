/**
 * The Revert mark, as data.
 *
 * One drawing, in one place. The favicon used to be a second hand-kept copy in
 * src/app/icon.svg with its colours frozen at #12805c — a green the app uses in
 * neither theme — so the tab and the header were quietly different logos. Both
 * are generated from here now: the component reads it directly, the icon files
 * are written from it by `npm run icons`.
 *
 * A return arrow: it goes out, turns, and comes back. That is what the word
 * means in every sense the product uses it — a reply in chat, a reply from a
 * recruiter, and the undo glyph everyone already reads as "back".
 */

/** Every coordinate below lives on this grid. */
export const MARK_VIEWBOX = 32;

/**
 * Ink spans 7.25 → 24.75 across and 6.75 → 25.25 down, which centres it on
 * (16, 16) exactly. The old drawing sat at (16.45, 14.9) — 1.1 units high, which
 * is what made the tile read top-heavy at every size.
 */
export const MARK_PATHS = [
  /* Out to the right, around, and back — the return itself. */
  "M8.25 12.25 H18.25 a6.5 6.5 0 0 1 0 13 H12.25",
  /* Head pointing back the way it came. */
  "M12.75 6.75 L7.25 12.25 L12.75 17.75",
];

/**
 * Chosen so the stroke lands on whole pixels, which is the difference between a
 * crisp mark and a grey smudge in a browser tab. The glyph fills the tile, so
 * rendered stroke is `size / 16`: exactly 1px at 16, 2px at 32, 4px at 64.
 *
 * The old mark drew a 2.6 stroke into an svg sized at 62% of its tile, which
 * came to 0.8px at 16 — under one device pixel, so it resolved grey rather than
 * white. Sizes that are not multiples of 16 land between pixels, so prefer 16,
 * 32, 48 and 64 for anything small.
 */
export const MARK_STROKE = 2;

/** Corner radius as a fraction of the tile, matching a rounded app icon. */
export const MARK_RADIUS = 0.28;

/**
 * The mark inverts between themes: white on deep green in light, dark ink on
 * mint in dark. The component gets this from the theme tokens; the icon files
 * cannot read tokens, so they carry the same values literally.
 */
export const MARK_COLOURS = {
  light: { tile: "#17784f", glyph: "#ffffff" },
  dark: { tile: "#35cf93", glyph: "#05241a" },
} as const;
