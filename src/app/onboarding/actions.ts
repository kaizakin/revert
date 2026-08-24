"use server";

import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { checkUsername } from "@/lib/username";
import { completeOnboarding, isUsernameAvailable } from "@/server/users/onboard";
import { getDbUser } from "@/server/users/sync";

export type OnboardState = {
  error?: string;
  field?: "username" | "invite" | "form";
};

export async function onboardAction(
  _prev: OnboardState,
  formData: FormData,
): Promise<OnboardState> {
  const clerkUser = await currentUser();
  if (!clerkUser) return { error: "You are signed out. Sign in again.", field: "form" };

  // Never trust the client for this — an already-onboarded user resubmitting
  // must not be able to burn a second invite code.
  const existing = await getDbUser();
  if (existing) redirect("/rooms/general");

  const username = String(formData.get("username") ?? "");
  const inviteCode = String(formData.get("inviteCode") ?? "");

  const candidate = checkUsername(username);
  if (!candidate.ok) return { error: candidate.error, field: "username" };

  if (!(await isUsernameAvailable(candidate.username))) {
    return { error: "That username is already taken.", field: "username" };
  }

  const email =
    clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)
      ?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;

  if (!email) return { error: "No email address on your account.", field: "form" };

  const result = await completeOnboarding({
    clerkId: clerkUser.id,
    email,
    username: candidate.username,
    inviteCode,
    avatarUrl: clerkUser.imageUrl ?? null,
    displayName:
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim() || null,
  });

  if (!result.ok) return { error: result.error, field: result.field };

  redirect("/rooms/general");
}
