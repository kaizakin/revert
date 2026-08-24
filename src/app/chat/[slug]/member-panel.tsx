"use client";

import { useEffect, useState } from "react";

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
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");

  /**
   * No synchronous setState here: the panel is keyed by username in the room
   * view, so a different member remounts it and the initial state is already
   * "loading". Resetting it in the effect would just cause an extra render.
   */
  useEffect(() => {
    let cancelled = false;

    void fetchProfile(username).then((result) => {
      if (cancelled) return;
      setProfile(result);
      setState(result ? "ready" : "missing");
    });

    return () => {
      cancelled = true;
    };
  }, [username]);

  // Escape closes, which is the one keyboard affordance a panel like this owes.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const seen = profile ? relative(profile.lastActiveAt) : null;

  return (
    <aside
      aria-label={`Profile of ${username}`}
      className="flex w-full shrink-0 flex-col border-l border-line bg-surface sm:w-80"
    >
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close profile"
          className="-ml-1 rounded-full p-1.5 text-muted transition-colors hover:bg-raised hover:text-ink"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
            <path
              d="M6 6l12 12M18 6L6 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <h2 className="text-[15px] font-semibold text-ink">Profile</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {state === "loading" && (
          <p className="px-4 py-8 text-center text-[13px] text-faint">Loading…</p>
        )}

        {state === "missing" && (
          <p className="px-4 py-8 text-center text-[13px] text-faint">
            This account is no longer available.
          </p>
        )}

        {state === "ready" && profile && (
          <>
            <div className="flex flex-col items-center gap-3 px-6 py-7">
              <AvatarLightbox
                url={profile.avatarUrl}
                username={profile.username}
                size={96}
              />

              <div className="flex flex-col items-center gap-0.5 text-center">
                {profile.displayName && (
                  <p className="text-[17px] font-semibold text-ink">{profile.displayName}</p>
                )}
                <p className="text-[14px] text-muted">@{profile.username}</p>
                {seen && <p className="text-[12px] text-faint">{seen}</p>}
              </div>

              {profile.headline && (
                <p className="text-center text-[13px] leading-relaxed text-ink">
                  {profile.headline}
                </p>
              )}
            </div>

            {profile.about && (
              <div className="border-t border-line px-5 py-4">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-faint">
                  About
                </p>
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink">
                  {profile.about}
                </p>
              </div>
            )}

            {(profile.workStatus || profile.company || profile.college || profile.location) && (
              <dl className="border-t border-line px-5 py-4 text-[13px]">
                {profile.workStatus && (
                  <div className="flex justify-between gap-3 py-1">
                    <dt className="text-muted">Status</dt>
                    <dd className="text-right text-ink">{STATUS_LABEL[profile.workStatus]}</dd>
                  </div>
                )}
                {profile.company && (
                  <div className="flex justify-between gap-3 py-1">
                    <dt className="text-muted">Company</dt>
                    <dd className="text-right text-ink">{profile.company}</dd>
                  </div>
                )}
                {profile.college && (
                  <div className="flex justify-between gap-3 py-1">
                    <dt className="text-muted">College</dt>
                    <dd className="text-right text-ink">{profile.college}</dd>
                  </div>
                )}
                {profile.location && (
                  <div className="flex justify-between gap-3 py-1">
                    <dt className="text-muted">Location</dt>
                    <dd className="text-right text-ink">{profile.location}</dd>
                  </div>
                )}
              </dl>
            )}

            {profile.socials.length > 0 && (
              <div className="border-t border-line px-5 py-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-faint">
                  Links
                </p>
                <ul className="flex flex-col gap-1.5">
                  {profile.socials.map((social) => {
                    const meta = SOCIAL_PROVIDERS.find((p) => p.key === social.provider);

                    return (
                      <li key={social.provider}>
                        <a
                          href={profileUrl(social.provider as SocialKey, social.handle)}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="flex items-center gap-2 text-[13px] text-ink transition-colors hover:text-accent"
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
