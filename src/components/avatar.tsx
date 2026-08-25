import Image from "next/image";

import { avatarColour, initials } from "@/lib/avatar";

/**
 * One avatar for people and rooms.
 *
 * Uses next/image so a picture is resized and re-encoded to the size it
 * actually renders at. The group photo was a 319 KB JPEG being painted into a
 * 48px circle on the landing page — the one page that has to load fast for
 * someone tapping a link on mobile data.
 *
 * Falls back to initials on a colour derived from the name, so a room or member
 * without a picture still looks deliberate rather than empty.
 */
export function Avatar({
  src,
  name,
  size,
  className = "",
  priority,
}: {
  src: string | null | undefined;
  /** Seeds the fallback colour and letters. */
  name: string;
  size: number;
  className?: string;
  /** Set for an avatar above the fold, so it is not lazy-loaded. */
  priority?: boolean;
}) {
  if (src) {
    return (
      <Image
        src={src}
        alt=""
        width={size}
        height={size}
        priority={priority}
        className={`shrink-0 rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: avatarColour(name),
        fontSize: Math.max(10, Math.round(size * 0.36)),
      }}
    >
      {initials(name)}
    </span>
  );
}
