"use client";

import { usePathname } from "next/navigation";

/**
 * Flips the card when moving between sign-in and sign-up.
 *
 * Keyed by pathname, so React tears down the old card and mounts a new one —
 * that remount is what restarts the animation. Without the key the DOM node
 * persists across the route change and the animation only ever plays once, on
 * first load.
 *
 * The outer element owns the perspective and does not animate; putting
 * perspective on the moving element itself makes the rotation look flat.
 */
export function AuthCard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="auth-perspective w-full max-w-sm">
      <div key={pathname} className="auth-flip">
        {children}
      </div>
    </div>
  );
}
