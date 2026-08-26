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
  MARK_SCALE,
  MARK_STROKE,
  MARK_VIEWBOX,
} from "../src/lib/mark";

const root = process.cwd();
const size = MARK_VIEWBOX;
const radius = +(size * MARK_RADIUS).toFixed(2);
/*
 * The component sizes its svg to a fraction of the tile; a standalone file has
 * no outer element to shrink, so the same inset is a transform. Scaling the
 * group scales the stroke with it, which is what keeps the two identical — the
 * old favicon skipped this and drew the arrow a size larger than the header did.
 */
const inset = +((MARK_VIEWBOX * (1 - MARK_SCALE)) / 2).toFixed(3);
const glyph = [
  `    <g transform="translate(${inset} ${inset}) scale(${MARK_SCALE})">`,
  ...MARK_PATHS.map((d) => `      <path d="${d}"/>`),
  "    </g>",
].join("\n");

const strokeAttrs = `stroke-width="${MARK_STROKE}" stroke-linecap="round" stroke-linejoin="round"`;

/**
 * The favicon's tile follows the browser theme the way the app's does. Chrome
 * and Firefox honour a media query inside an SVG icon; Safari ignores SVG icons
 * entirely and takes the PNG, which is why that one commits to a tile.
 */
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <style>
    .tile { fill: ${MARK_COLOURS.tile.light} }
    @media (prefers-color-scheme: dark) { .tile { fill: ${MARK_COLOURS.tile.dark} } }
  </style>
  <rect class="tile" width="${size}" height="${size}" rx="${radius}"/>
  <g fill="none" stroke="${MARK_COLOURS.glyph}" ${strokeAttrs}>
${glyph}
  </g>
</svg>
`;

/**
 * A homescreen tile has no theme to follow and sits on someone's own wallpaper,
 * so it takes the deeper green: white holds its shape against a photograph there
 * in a way it does not on the mint.
 */
function flatSvg(px: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${px}" height="${px}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${MARK_COLOURS.tile.light}"/>
  <g fill="none" stroke="${MARK_COLOURS.glyph}" ${strokeAttrs}>
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
