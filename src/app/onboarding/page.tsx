import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { checkUsername } from "@/lib/username";
import { inviteRequired } from "@/server/invites/policy";
import { getDbUser } from "@/server/users/sync";

import { OnboardingForm } from "./onboarding-form";

export const metadata = { title: "Set up your account · Revert" };

export default async function OnboardingPage() {
  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/sign-in");

  // Already onboarded — nothing to do here.
  const existing = await getDbUser();
  if (existing) redirect("/rooms/general");

  const suggestion = clerkUser.username ? checkUsername(clerkUser.username) : null;
  const gated = inviteRequired();

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col gap-2">
          <span className="text-sm font-semibold tracking-tight text-ink">Revert</span>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Almost in</h1>
          <p className="text-sm leading-relaxed text-muted">
            Pick the name people will know you by. You can change your profile later, but
            your username is permanent.
          </p>
        </div>

        <OnboardingForm
          suggestedUsername={suggestion?.ok ? suggestion.username : ""}
          inviteRequired={gated}
        />
      </div>
    </main>
  );
}
