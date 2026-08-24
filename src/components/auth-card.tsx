"use client";

import { usePathname, useRouter } from "next/navigation";

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
  const router = useRouter();

  /**
   * Clerk renders its "Sign up" / "Sign in" footer link as a real anchor with a
   * full href, which triggers a document navigation: the whole page reloads,
   * the branding column redraws, and the flip never plays because the element
   * is mounted fresh rather than swapped.
   *
   * Intercepting the click and routing through Next keeps the layout mounted.
   * Only same-origin auth paths are handled, and modified clicks are left alone
   * so open-in-new-tab still works.
   */
  const interceptInternalLinks = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const anchor = (event.target as HTMLElement).closest("a");
    if (!anchor) return;

    const href = anchor.getAttribute("href");
    if (!href) return;

    let url: URL;
    try {
      url = new URL(href, window.location.origin);
    } catch {
      return;
    }

    if (url.origin !== window.location.origin) return;
    if (!/^\/sign-(in|up)/.test(url.pathname)) return;

    event.preventDefault();
    router.push(url.pathname + url.search);
  };

  return (
    <div
      className="auth-perspective w-full max-w-sm"
      onClickCapture={interceptInternalLinks}
    >
      <div key={pathname} className="auth-flip">
        {children}
      </div>
    </div>
  );
}
