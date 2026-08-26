/**
 * Pin rules, in a module the browser can import.
 *
 * The server enforces the limit and the client needs it to warn before somebody
 * taps — keeping the number here means both read the same one. The server module
 * imports the database driver, so a client component cannot reach into it for a
 * constant without dragging that into the bundle.
 */

/** Three is what a banner can cycle through without becoming a list. */
export const MAX_PINS = 3;

export type PinDuration = "24h" | "7d" | "forever";
