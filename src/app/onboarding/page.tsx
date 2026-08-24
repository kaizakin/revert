import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { checkUsername } from "@/lib/username";
import { getDbUser } from "@/server/users/sync";

import { OnboardingForm } from "./onboarding-form";

export const metadata = { title: "Set up your account — Revert" };

export default async function OnboardingPage() {
  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/sign-in");

  // Already onboarded — nothing to do here.
  const existing = await getDbUser();
  if (existing) redirect("/rooms/general");

  const suggestion = clerkUser.username ? checkUsername(clerkUser.username) : null;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 p-6">
      <div className="flex w-full max-w-sm flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Almost in</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Pick a username and enter your invite code. Revert is invite-only for now.
        </p>
      </div>

      <OnboardingForm suggestedUsername={suggestion?.ok ? suggestion.username : ""} />
    </main>
  );
}
