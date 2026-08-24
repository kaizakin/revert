/**
 * Whether a signup needs an invite code.
 *
 * Off by default. The funnel here is an existing community of people who
 * already trust the person running it — making them hunt for a code is friction
 * against the one thing that has to work, which is getting them in the door.
 *
 * The invite machinery stays built and tested, because it is exactly what you
 * want later for paid groups, referral circles, and controlled waves if abuse
 * ever shows up. Flip REQUIRE_INVITE_CODE=true to turn the gate back on.
 */
export function inviteRequired(): boolean {
  return process.env.REQUIRE_INVITE_CODE === "true";
}
