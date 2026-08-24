/** Deterministic avatar colours, so a name always gets the same circle. */
const AVATAR_COLOURS = [
  "#5b8def",
  "#1fa855",
  "#e6a11f",
  "#9b5de5",
  "#00a3a3",
  "#e8624a",
  "#e542a3",
  "#7d8bd4",
];

function hash(value: string) {
  let out = 0;
  for (let i = 0; i < value.length; i++) out = (out * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(out);
}

export function avatarColour(seed: string | null) {
  if (!seed) return "#8696a0";
  return AVATAR_COLOURS[hash(seed) % AVATAR_COLOURS.length];
}

/** Up to two letters, skipping the leading # or @ people type. */
export function initials(name: string | null) {
  if (!name) return "?";
  const cleaned = name.replace(/^[#@]/, "").trim();
  const parts = cleaned.split(/[\s_-]+/).filter(Boolean);

  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return cleaned.slice(0, 2).toUpperCase();
}
