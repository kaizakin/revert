"use client";

import { useEffect, useState, useTransition } from "react";

import { avatarColour, initials } from "@/lib/avatar";

import { fetchRoomInfo, updateRoomAction, type RoomInfo } from "../actions";

export function GroupPanel({
  slug,
  onClose,
  onOpenMember,
  /** Changes when membership does, so an open panel refetches instead of going stale. */
  refreshKey,
}: {
  slug: string;
  onClose: () => void;
  onOpenMember: (username: string) => void;
  refreshKey?: number;
}) {
  const [info, setInfo] = useState<RoomInfo | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");

  const reload = () => {
    void fetchRoomInfo(slug).then((result) => {
      setInfo(result);
      setState(result ? "ready" : "missing");
    });
  };

  useEffect(() => {
    let cancelled = false;

    void fetchRoomInfo(slug).then((result) => {
      if (cancelled) return;
      setInfo(result);
      setState(result ? "ready" : "missing");
    });

    return () => {
      cancelled = true;
    };
  }, [slug, refreshKey]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <aside
      aria-label="Group info"
      className="flex w-full shrink-0 flex-col border-l border-line bg-surface sm:w-80"
    >
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close group info"
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
        <h2 className="text-[15px] font-semibold text-ink">Group info</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {state === "loading" && (
          <p className="px-4 py-8 text-center text-[13px] text-faint">Loading…</p>
        )}

        {state === "missing" && (
          <p className="px-4 py-8 text-center text-[13px] text-faint">
            This group is not available.
          </p>
        )}

        {state === "ready" && info && (
          <>
            <div className="flex flex-col items-center gap-3 px-6 py-7">
              {info.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={info.avatarUrl}
                  alt=""
                  className="h-24 w-24 rounded-full object-cover"
                />
              ) : (
                <span
                  className="flex h-24 w-24 items-center justify-center rounded-full text-2xl font-semibold text-white"
                  style={{ backgroundColor: avatarColour(slug) }}
                  aria-hidden
                >
                  {initials(info.name)}
                </span>
              )}

              <div className="flex flex-col items-center gap-0.5 text-center">
                <p className="text-[17px] font-semibold text-ink">{info.name}</p>
                <p className="text-[12px] text-muted">
                  {info.stats.total} {info.stats.total === 1 ? "member" : "members"}
                  {info.stats.active > 0 && ` · ${info.stats.active} online`}
                </p>
              </div>
            </div>

            {info.canEdit ? (
              <GroupEditor slug={slug} info={info} onSaved={reload} />
            ) : (
              info.topic && (
                <div className="border-t border-line px-5 py-4">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-faint">
                    Description
                  </p>
                  <p className="text-[13px] leading-relaxed text-ink">{info.topic}</p>
                </div>
              )
            )}

            <div className="border-t border-line px-5 py-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-faint">
                {info.stats.total} {info.stats.total === 1 ? "member" : "members"}
              </p>

              <ul className="flex flex-col">
                {info.members.map((member) => (
                  <li key={member.id}>
                    <button
                      type="button"
                      onClick={() => onOpenMember(member.username)}
                      className="-mx-2 flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-raised"
                    >
                      <span className="relative shrink-0">
                        {member.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={member.avatarUrl}
                            alt=""
                            width={36}
                            height={36}
                            className="h-9 w-9 rounded-full object-cover"
                          />
                        ) : (
                          <span
                            className="flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                            style={{ backgroundColor: avatarColour(member.username) }}
                            aria-hidden
                          >
                            {initials(member.username)}
                          </span>
                        )}
                        {member.isOnline && (
                          <span
                            title="Online"
                            className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-surface bg-accent"
                          />
                        )}
                      </span>

                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-[14px] text-ink">
                            {member.displayName ?? `@${member.username}`}
                          </span>
                          {member.isAdmin && (
                            <span className="shrink-0 rounded-full bg-accent-soft px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-accent">
                              admin
                            </span>
                          )}
                        </span>
                        <span className="truncate text-[12px] text-muted">
                          {member.headline ?? `@${member.username}`}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

/**
 * Group details, editable by mods.
 *
 * Collapsed by default: the panel is read most of the time, and an always-open
 * form would bury the member list under inputs nobody is using.
 */
function GroupEditor({
  slug,
  info,
  onSaved,
}: {
  slug: string;
  info: RoomInfo;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  /**
   * Completion is handled here rather than by watching the action result in an
   * effect. Closing the form and refreshing the panel are consequences of the
   * submit, so they belong in the submit path — reacting to them afterwards
   * means a setState inside an effect and an extra render.
   */
  const submit = (formData: FormData) => {
    startTransition(async () => {
      const result = await updateRoomAction({}, formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      setError(null);
      setOpen(false);
      onSaved();
    });
  };

  if (!open) {
    return (
      <div className="border-t border-line px-5 py-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-faint">
            Description
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-[12px] font-medium text-accent hover:underline"
          >
            Edit
          </button>
        </div>
        <p className="text-[13px] leading-relaxed text-ink">
          {info.topic ?? <span className="text-faint">No description yet.</span>}
        </p>
      </div>
    );
  }

  return (
    <form action={submit} className="flex flex-col gap-3 border-t border-line px-5 py-4">
      <input type="hidden" name="slug" value={slug} />

      <label className="flex flex-col gap-1.5">
        <span className="text-[12px] font-medium text-ink">Group name</span>
        <input
          name="name"
          defaultValue={info.name}
          maxLength={60}
          required
          className="rounded-lg border border-line bg-canvas px-3 py-2 text-[13px] text-ink outline-none focus:border-accent"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[12px] font-medium text-ink">Description</span>
        <textarea
          name="topic"
          defaultValue={info.topic ?? ""}
          maxLength={300}
          rows={3}
          className="resize-y rounded-lg border border-line bg-canvas px-3 py-2 text-[13px] text-ink outline-none focus:border-accent"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[12px] font-medium text-ink">Group picture</span>
        <input
          name="avatar"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="text-[12px] text-muted file:mr-3 file:rounded-md file:border-0 file:bg-raised file:px-3 file:py-1.5 file:text-[12px] file:text-ink"
        />
        <span className="text-[11px] text-faint">
          PNG, JPEG or WebP, up to 2 MB. Leave empty to keep the current one.
        </span>
      </label>

      {error && <p className="text-[11px] text-danger">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-3.5 py-2 text-[13px] font-semibold text-accent-ink disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg px-3 py-2 text-[13px] text-muted hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
