import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Next.js 16 renamed `middleware.ts` to `proxy.ts`. The behaviour is the same.
 *
 * This is an optimistic gate only — it sends signed-out visitors to sign-in.
 * Real authorisation still has to happen in each route handler and server
 * action, because proxy checks are not a session management solution.
 */
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;

  const { userId, redirectToSignIn } = await auth();

  /**
   * Explicit redirect rather than auth.protect().
   *
   * protect() rewrites unauthenticated requests to 404 instead of redirecting,
   * which reads as "this page does not exist" rather than "you need to sign
   * in". On localhost it happened to look fine, because Clerk's dev-browser
   * handshake kicked in first; on a real domain the handshake does not apply
   * and every protected page returned a bare 404.
   */
  if (!userId) {
    return redirectToSignIn({ returnBackUrl: req.url });
  }
});

export const config = {
  matcher: [
    // Everything except Next internals and static files, unless a search param is present.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes.
    "/(api|trpc)(.*)",
  ],
};
