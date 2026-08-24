import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
  /* config options here */
};

export default nextConfig;
