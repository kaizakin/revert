import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";

import { AVATAR_PRESETS } from "@/server/users/avatar-presets";
import { getPublicProfile } from "@/server/users/profile";
import { ensureDbUser } from "@/server/users/sync";

import { ProfileForm } from "./profile-form";

export const metadata = { title: "Your profile · Revert" };

export default async function MyProfilePage() {
  const me = await ensureDbUser();
  if (!me) redirect("/onboarding");

  const profile = await getPublicProfile(me.username);
  if (!profile) redirect("/onboarding");

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Your profile</h1>
          <p className="mt-1 text-[13px] text-muted">
            Nothing is saved until you press Save.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
        <SignOutButton>
          <button
            type="button"
            className="shrink-0 rounded-lg border border-line bg-surface px-4 py-2 text-[13px] font-medium text-muted transition-colors hover:border-line-strong hover:text-ink"
          >
            Sign out
          </button>
        </SignOutButton>

        <Link
          href="/chat/hub"
          className="shrink-0 rounded-lg border border-line bg-surface px-4 py-2 text-[13px] font-medium text-ink transition-colors hover:border-line-strong"
        >
          Back to chat
        </Link>
        </div>
      </header>

      <ProfileForm
        profile={profile}
        showReadReceipts={me.showReadReceipts}
        presets={AVATAR_PRESETS}
      />
    </div>
  );
}
