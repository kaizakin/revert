import Link from "next/link";
import { redirect } from "next/navigation";

import { AVATAR_PRESETS } from "@/server/users/avatar-presets";
import { getPublicProfile } from "@/server/users/profile";
import { ensureDbUser } from "@/server/users/sync";

import { AvatarPicker } from "./avatar-picker";
import { ProfileForm } from "./profile-form";

export const metadata = { title: "Your profile · Revert" };

export default async function MyProfilePage() {
  const me = await ensureDbUser();
  if (!me) redirect("/onboarding");

  const profile = await getPublicProfile(me.username);
  if (!profile) redirect("/onboarding");

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8">
      <header className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Your profile</h1>
          <p className="mt-1 text-[13px] text-muted">@{me.username} · permanent</p>
        </div>
        <Link
          href="/rooms/general"
          className="rounded-lg border border-line bg-surface px-4 py-2 text-[13px] font-medium text-ink transition-colors hover:border-line-strong"
        >
          Back to chat
        </Link>
      </header>

      <section className="mb-8 border-b border-line pb-8">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-faint">
          Picture
        </h2>
        <AvatarPicker
          username={me.username}
          currentUrl={me.avatarUrl}
          presets={AVATAR_PRESETS}
        />
      </section>

      <ProfileForm profile={profile} showReadReceipts={me.showReadReceipts} />
    </div>
  );
}
