import { SignUp } from "@clerk/nextjs";

export const metadata = { title: "Join · Revert" };

/**
 * Kept, but nothing links here any more: /sign-in handles both.
 *
 * Deliberately not deleted. NEXT_PUBLIC_CLERK_SIGN_UP_URL still names this
 * route, so Clerk can send someone here on its own, and the catch-all takes the
 * sub-paths an OAuth round trip needs. Deleting it would turn any of those into
 * a 404 — and a 404 in the middle of creating an account is the one failure
 * this app cannot afford, for the sake of removing a few lines nobody sees.
 *
 * Carries its own `path` for the same reason /sign-in does: without it the
 * verification step appends to the current URL instead of the base.
 */
export default function SignUpPage() {
  return <SignUp routing="path" path="/sign-up" />;
}
