import { SignIn } from "@clerk/nextjs";

export const metadata = { title: "Join or sign in · Revert" };

/**
 * One page for both. `withSignUp` turns this into Clerk's sign-in-or-up flow:
 * the visitor types an email, and Clerk decides whether that is a returning
 * account or a new one rather than asking them to decide first.
 *
 * Someone arriving from the channel does not know or care which they are, and
 * making them pick between two doors before they have typed anything is a
 * question the product can answer itself.
 */
export default function SignInPage() {
  return <SignIn withSignUp />;
}
