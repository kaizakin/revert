/**
 * Writes the icon files from the one drawing in @/lib/mark.
 *
 * Run with `npm run icons` after changing the mark, and commit the output. The
 * files are generated rather than hand-kept because that is exactly how the tab
 * ended up showing a different logo from the header: two copies, one of them
 * forgotten.
 *
 * sharp comes in under Next rather than being declared here. That is fine for a
 * script whose output is committed — if it ever goes missing, only regeneration
 * breaks, and the build does not care.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import {
  MARK_COLOURS,
  MARK_PATHS,
  MARK_RADIUS,
  MARK_STROKE,
  MARK_VIEWBOX,
} from "../src/lib/mark";

const root = process.cwd();
const size = MARK_VIEWBOX;
const radius = +(size * MARK_RADIUS).toFixed(2);
const glyph = MARK_PATHS.map((d) => `    <path d="${d}"/>`).join("\n");

/**
 * No media query any more. The mark is one colour pairing in both themes, so the
 * favicon is the same drawing as the header rather than a themed variant of it.
 */
function markSvg(px: number) {
  const { tile, glyph: stroke } = MARK_COLOURS;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${px}" height="${px}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${tile}"/>
  <g fill="none" stroke="${stroke}" stroke-width="${MARK_STROKE}" stroke-linecap="round" stroke-linejoin="round">
${glyph}
  </g>
</svg>`;
}

async function main() {
  const iconPath = path.join(root, "src", "app", "icon.svg");
  await writeFile(iconPath, `${markSvg(size)}
`, "utf8");

  /* 180 is what iOS asks for; anything smaller gets upscaled on a retina phone. */
  const applePath = path.join(root, "src", "app", "apple-icon.png");
  await mkdir(path.dirname(applePath), { recursive: true });
  await sharp(Buffer.from(markSvg(180))).png().toFile(applePath);

  console.log("wrote src/app/icon.svg");
  console.log("wrote src/app/apple-icon.png (180x180)");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
