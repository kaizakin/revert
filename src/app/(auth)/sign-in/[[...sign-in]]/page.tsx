import { SignIn } from "@clerk/nextjs";

export const metadata = { title: "Join or sign in · Revert" };

/**
 * One page for both. `withSignUp` turns this into Clerk's sign-in-or-up flow:
 * the visitor types an email, and Clerk decides whether that is a returning
 * account or a new one rather than asking them to decide first.
 *
 * `path` is not optional here, and leaving it off is what sent people to
 * /sign-in/factor-one/factor-one. Clerk's own types say so — under
 * routing: "path", `path` is required — and without it the component builds its
 * next step relative to wherever it happens to be standing. So the first step
 * appends factor-one to /sign-in, the second appends it again to that, and the
 * URL grows a segment on every attempt. Naming the base makes every step
 * absolute.
 *
 * Google was unaffected because OAuth leaves the site and comes back to a
 * callback, so it never walks these in-page steps.
 */
export default function SignInPage() {
  return <SignIn routing="path" path="/sign-in" withSignUp />;
}
