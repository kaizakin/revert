"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { AvatarLightbox } from "@/components/avatar-lightbox";
import { SocialIcon } from "@/components/social-icon";
import {
  profileLinkLabel,
  profileUrl,
  SOCIAL_PROVIDERS,
  type SocialKey,
} from "@/lib/profile";
import type { PublicProfile } from "@/server/users/profile";

import { fetchProfile } from "../actions";

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
  onClose,
}: {
  username: string;
  onClose: () => void;
}) {
  const { data: profile = null, isLoading } = useQuery<PublicProfile | null>({
    queryKey: ["chat", "member-profile", username],
    queryFn: () => fetchProfile(username),
    staleTime: 1000 * 60 * 5,
  });

  const state = isLoading ? "loading" : profile ? "ready" : "missing";

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
        <h2 className="text-[15px] font-bold text-ink tracking-tight">Member Profile</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {state === "loading" && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="mt-3 text-xs font-medium text-faint">Loading profile…</p>
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
                  <p className="text-[17px] font-bold text-ink">{profile.displayName}</p>
                )}
                <p className="text-[13px] font-medium text-accent">@{profile.username}</p>
                {seen && (
                  <span
                    className={`mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                      isOnline
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold"
                        : "bg-raised text-faint"
                    }`}
                  >
                    {isOnline && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
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

            {(profile.workStatus || profile.company || profile.college || profile.location) && (
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
                    <dd className="font-semibold text-ink">{profile.company}</dd>
                  </div>
                )}
                {profile.college && (
                  <div className="flex justify-between items-center gap-3">
                    <dt className="text-muted text-xs font-medium">College</dt>
                    <dd className="font-semibold text-ink">{profile.college}</dd>
                  </div>
                )}
                {profile.location && (
                  <div className="flex justify-between items-center gap-3">
                    <dt className="text-muted text-xs font-medium">Location</dt>
                    <dd className="font-semibold text-ink">{profile.location}</dd>
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
                    const meta = SOCIAL_PROVIDERS.find((p) => p.key === social.provider);

                    return (
                      <li key={social.provider}>
                        <a
                          href={profileUrl(social.provider as SocialKey, social.handle)}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="flex items-center gap-2.5 rounded-xl bg-raised/50 px-3 py-2 text-[13px] font-medium text-ink transition-all hover:bg-raised hover:text-accent"
                        >
                          <SocialIcon
                            provider={social.provider as SocialKey}
                            className="h-4 w-4 shrink-0 text-muted"
                          />
                          <span className="truncate">
                            {profileLinkLabel(social.provider as SocialKey, social.handle)}
                          </span>
                          <span className="sr-only">{meta?.label ?? social.provider}</span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
