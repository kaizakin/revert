import { SignUp } from "@clerk/nextjs";

export const metadata = { title: "Join · Revert" };

/**
 * Kept, but nothing links here any more: /sign-in handles both.
 *
 * Deliberately not deleted. NEXT_PUBLIC_CLERK_SIGN_UP_URL still names this
 * route, so Clerk can send someone here on its own, and the catch-all takes the
 * sub-paths an OAuth round trip needs. Deleting it would turn any of those into
 * a 404 — and a 404 in the middle of creating an account is the one failure
 * this app cannot afford, for the sake of removing five lines nobody sees.
 *
 * If the sign-in-or-up flow proves out, this can go along with the env var.
 */
export default function SignUpPage() {
  return <SignUp />;
}
