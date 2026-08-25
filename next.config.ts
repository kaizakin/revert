import type { NextConfig } from "next";

/**
 * Avatars come from two places: files under public/, and Supabase Storage for
 * anything uploaded. Both have to be allowed for next/image to optimise them —
 * an un-listed remote host is refused rather than passed through, which would
 * break every uploaded picture.
 *
 * Derived from the env var rather than hardcoded, so recreating the Supabase
 * project does not silently stop images loading.
 */
function supabaseHost(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;

  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

const host = supabaseHost();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: host
      ? [{ protocol: "https", hostname: host, pathname: "/storage/v1/object/public/**" }]
      : [],
  },

  /**
   * The chat routes used to live under /rooms with the room slug "general".
   * Both changed: /chat covers 1:1 conversations as well as groups, matching
   * the single conversations table underneath. These keep old links alive.
   */
  async redirects() {
    return [
      { source: "/rooms/general", destination: "/chat/hub", permanent: false },
      { source: "/rooms/:slug", destination: "/chat/:slug", permanent: false },
      { source: "/rooms", destination: "/chat", permanent: false },
    ];
  },
};

export default nextConfig;
