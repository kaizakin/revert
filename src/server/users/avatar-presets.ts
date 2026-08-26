import { readdirSync } from "node:fs";
import { join } from "node:path";

export type AvatarPreset = {
  /** Public URL, e.g. /avatars/fox.png */
  url: string;
  label: string;
};

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".svg"]);

function labelFor(filename: string) {
  const base = filename.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
  return base.charAt(0).toUpperCase() + base.slice(1);
}

/**
 * Only files named avatarN.
 *
 * This folder is a menu offered to every member, and it used to be whatever
 * happened to be in it. A photo of a real person dropped in here for the
 * landing page was quietly listed as a face anyone could adopt — nobody put it
 * there for that, and nothing said they had. The name is the opt-in now: a file
 * has to say it is a preset to become one.
 */
const PRESET_NAME = /^avatar\d+$/i;

/**
 * Read once at module load, which on a server build means build time. Files in
 * public/ are served by the CDN and are not guaranteed to exist on a
 * serverless filesystem at request time, so reading per-request would work
 * locally and return nothing in production.
 *
 * Consequence worth knowing: adding avatars in production needs a redeploy.
 */
function readPresets(): AvatarPreset[] {
  try {
    const dir = join(process.cwd(), "public", "avatars");

    return readdirSync(dir)
      .filter((name) => IMAGE_EXTENSIONS.has(name.slice(name.lastIndexOf(".")).toLowerCase()))
      .filter((name) => PRESET_NAME.test(name.replace(/\.[^.]+$/, "")))
      .sort((a, b) => presetNumber(a) - presetNumber(b))
      .map((name) => ({ url: `/avatars/${name}`, label: labelFor(name) }));
  } catch {
    // Folder missing or unreadable is not an error — it just means no presets.
    return [];
  }
}

/** So avatar2 comes before avatar10, which a plain sort gets backwards. */
function presetNumber(filename: string): number {
  return Number(filename.replace(/\D+/g, "")) || 0;
}

export const AVATAR_PRESETS: AvatarPreset[] = readPresets();

/** Guards the server action: only a known preset may be stored as-is. */
export function isPresetUrl(url: string): boolean {
  return AVATAR_PRESETS.some((preset) => preset.url === url);
}
