"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { AvatarLightbox } from "@/components/avatar-lightbox";
import { SocialIcon } from "@/components/social-icon";
import {
  profileLinkLabel,
  profileUrl,
  SOCIAL_PROVIDERS,
  type SocialKey,
} from "@/lib/profile";
import { describeBan } from "@/lib/moderation";
import type { PublicProfile } from "@/server/users/profile";

import { ModerationButton, ModerationMenu } from "./moderation-menu";
import {
  banUserAction,
  fetchProfile,
  setRoleAction,
  unbanUserAction,
} from "../actions";

const STATUS_LABEL: Record<string, string> = {
  working: "Working",
  student: "Student",
  looking: "Looking for a job",
};

function relative(value: Date | null) {
  if (!value) return null;
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60_000);

  if (minutes < 2) return "online";
  if (minutes < 60) return `last seen ${minutes} min ago`;
  if (minutes < 60 * 24) return `last seen ${Math.round(minutes / 60)} h ago`;
  return `last seen ${Math.round(minutes / (60 * 24))} d ago`;
}

export function MemberPanel({
  username,
  openModeration = false,
  slug,
  canModerate,
  canManageRoles,
  meUsername,
  onClose,
}: {
  username: string;
  /** Opened from a message, where the point was to moderate them. */
  openModeration?: boolean;
  slug: string;
  /** Deleting and banning. A moderator has these. */
  canModerate: boolean;
  /** Promoting and demoting, which only the admin has. */
  canManageRoles: boolean;
  /** So the shield never appears on your own profile. */
  meUsername: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  const { data: profile = null, isLoading } = useQuery<PublicProfile | null>({
    queryKey: ["chat", "member-profile", username],
    queryFn: () => fetchProfile(username),
    staleTime: 1000 * 60 * 5,
  });

  const state = isLoading ? "loading" : profile ? "ready" : "missing";

  const [menuOpen, setMenuOpen] = useState(openModeration);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Recomputed from the profile, so it clears itself when a ban lapses. */
  const banNote = describeBan(profile?.bannedUntil);

  /**
   * Every control here does the same three things, so they share one runner:
   * lock the panel, report what came back, and refetch. Refetching rather than
   * patching, because a ban changes what the panel is allowed to offer next and
   * guessing at that is how the buttons end up lying.
   */
  const run = async (action: () => Promise<{ error?: string }>) => {
    setBusy(true);
    setError(null);

    const result = await action();
    if (result.error) setError(result.error);

    await queryClient.invalidateQueries({
      queryKey: ["chat", "member-profile", username],
    });
    setBusy(false);
    setMenuOpen(false);
  };

  // Escape closes
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const seen = profile ? relative(profile.lastActiveAt) : null;
  const isOnline = seen === "online";

  return (
    <aside
      aria-label={`Profile of ${username}`}
      className="flex w-full shrink-0 flex-col border-l border-line bg-surface sm:w-80 animate-in slide-in-from-right-4 duration-150"
    >
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close profile"
          className="-ml-1 rounded-full p-1.5 text-muted transition-colors hover:bg-raised hover:text-ink active:scale-95"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
            <path
              d="M6 6l12 12M18 6L6 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <h2 className="flex-1 text-[15px] font-bold text-ink tracking-tight">
          Member Profile
        </h2>

        {/*
          In the header beside the close button, not stacked under the profile.
          It is a control for looking at somebody, so it belongs with the other
          controls for this panel rather than in the middle of what it is about.
        */}
        {profile &&
          profile.username !== meUsername &&
          profile.role !== "admin" &&
          (canModerate || canManageRoles) && (
            <div className="relative shrink-0">
              <ModerationButton
                open={menuOpen}
                username={profile.username}
                onToggle={() => setMenuOpen((open) => !open)}
              />

              {menuOpen && (
                <ModerationMenu
                  username={profile.username}
                  role={profile.role}
                  bannedUntil={profile.bannedUntil}
                  canModerate={canModerate}
                  canManageRoles={canManageRoles}
                  align="right"
                  busy={busy}
                  onBan={(duration) =>
                    run(() => banUserAction(slug, profile.username, duration))
                  }
                  onUnban={() => run(() => unbanUserAction(profile.username))}
                  onSetRole={(role) =>
                    run(() => setRoleAction(slug, profile.username, role))
                  }
                  onClose={() => setMenuOpen(false)}
                />
              )}
            </div>
          )}
      </div>

      {/* Said once, near the top, because it changes what the profile means. */}
      {banNote && (
        <p className="border-b border-line bg-danger/5 px-4 py-2 text-[12px] font-medium text-danger">
          {banNote}
        </p>
      )}

      <div className="flex-1 overflow-y-auto">
        {state === "loading" && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="mt-3 text-xs font-medium text-faint">
              Loading profile…
            </p>
          </div>
        )}

        {state === "missing" && (
          <p className="px-4 py-12 text-center text-xs font-medium text-faint">
            This account is no longer available.
          </p>
        )}

        {state === "ready" && profile && (
          <>
            <div className="flex flex-col items-center gap-3 px-6 py-7">
              <div className="relative">
                <AvatarLightbox
                  url={profile.avatarUrl}
                  username={profile.username}
                  displayName={profile.displayName}
                  size={96}
                />
                {isOnline && (
                  <span
                    title="Online"
                    className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-surface bg-emerald-500"
                  />
                )}
              </div>

              <div className="flex flex-col items-center gap-0.5 text-center">
                {profile.displayName && (
                  <p className="text-[17px] font-bold text-ink">
                    {profile.displayName}
                  </p>
                )}
                <p className="text-[13px] font-medium text-accent">
                  @{profile.username}
                </p>
                {seen && (
                  <span
                    className={`mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                      isOnline
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold"
                        : "bg-raised text-faint"
                    }`}
                  >
                    {isOnline && (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    )}
                    {seen}
                  </span>
                )}
              </div>

              {profile.headline && (
                <p className="text-center text-[13px] leading-relaxed text-ink/90">
                  {profile.headline}
                </p>
              )}
            </div>

            {profile.about && (
              <div className="border-t border-line px-5 py-4">
                <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-faint">
                  About
                </p>
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink/90">
                  {profile.about}
                </p>
              </div>
            )}

            {(profile.workStatus ||
              profile.company ||
              profile.college ||
              profile.location) && (
              <dl className="border-t border-line px-5 py-4 text-[13px] space-y-2.5">
                {profile.workStatus && (
                  <div className="flex justify-between items-center gap-3">
                    <dt className="text-muted text-xs font-medium">Status</dt>
                    <dd className="rounded-md bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">
                      {STATUS_LABEL[profile.workStatus]}
                    </dd>
                  </div>
                )}
                {profile.company && (
                  <div className="flex justify-between items-center gap-3">
                    <dt className="text-muted text-xs font-medium">Company</dt>
                    <dd className="font-semibold text-ink">
                      {profile.company}
                    </dd>
                  </div>
                )}
                {profile.college && (
                  <div className="flex justify-between items-center gap-3">
                    <dt className="text-muted text-xs font-medium">College</dt>
                    <dd className="font-semibold text-ink">
                      {profile.college}
                    </dd>
                  </div>
                )}
                {profile.location && (
                  <div className="flex justify-between items-center gap-3">
                    <dt className="text-muted text-xs font-medium">Location</dt>
                    <dd className="font-semibold text-ink">
                      {profile.location}
                    </dd>
                  </div>
                )}
              </dl>
            )}

            {profile.socials.length > 0 && (
              <div className="border-t border-line px-5 py-4">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-faint">
                  Links
                </p>
                <ul className="flex flex-col gap-2">
                  {profile.socials.map((social) => {
                    const meta = SOCIAL_PROVIDERS.find(
                      (p) => p.key === social.provider,
                    );

                    return (
                      <li key={social.provider}>
                        <a
                          href={profileUrl(
                            social.provider as SocialKey,
                            social.handle,
                          )}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="flex items-center gap-2.5 rounded-xl bg-raised/50 px-3 py-2 text-[13px] font-medium text-ink transition-all hover:bg-raised hover:text-accent"
                        >
                          <SocialIcon
                            provider={social.provider as SocialKey}
                            className="h-4 w-4 shrink-0 text-muted"
                          />
                          <span className="truncate">
                            {profileLinkLabel(
                              social.provider as SocialKey,
                              social.handle,
                            )}
                          </span>
                          <span className="sr-only">
                            {meta?.label ?? social.provider}
                          </span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {error && (
              <p className="px-4 pb-3 text-[12px] text-danger" role="alert">
                {error}
              </p>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
