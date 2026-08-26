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
 * The favicon follows the browser's theme the way the app follows the OS one.
 * Chrome and Firefox honour a media query inside an SVG icon; Safari ignores SVG
 * icons entirely and takes the PNG below, which is why that one has to commit to
 * a single pairing.
 */
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <style>
    .tile { fill: ${MARK_COLOURS.light.tile} }
    .glyph { stroke: ${MARK_COLOURS.light.glyph} }
    @media (prefers-color-scheme: dark) {
      .tile { fill: ${MARK_COLOURS.dark.tile} }
      .glyph { stroke: ${MARK_COLOURS.dark.glyph} }
    }
  </style>
  <rect class="tile" width="${size}" height="${size}" rx="${radius}"/>
  <g class="glyph" fill="none" stroke-width="${MARK_STROKE}" stroke-linecap="round" stroke-linejoin="round">
${glyph}
  </g>
</svg>
`;

/**
 * The touch icon takes the light pairing. A homescreen tile has no theme to
 * follow and sits on the person's own wallpaper, so it commits to the deeper
 * green: white on #17784f holds its shape against a photograph in a way dark ink
 * on mint does not.
 */
function flatSvg(px: number) {
  const { tile, glyph: stroke } = MARK_COLOURS.light;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${px}" height="${px}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${tile}"/>
  <g fill="none" stroke="${stroke}" stroke-width="${MARK_STROKE}" stroke-linecap="round" stroke-linejoin="round">
${glyph}
  </g>
</svg>`;
}

async function main() {
  const iconPath = path.join(root, "src", "app", "icon.svg");
  await writeFile(iconPath, faviconSvg, "utf8");

  /* 180 is what iOS asks for; anything smaller gets upscaled on a retina phone. */
  const applePath = path.join(root, "src", "app", "apple-icon.png");
  await mkdir(path.dirname(applePath), { recursive: true });
  await sharp(Buffer.from(flatSvg(180))).png().toFile(applePath);

  console.log("wrote src/app/icon.svg");
  console.log("wrote src/app/apple-icon.png (180x180)");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
