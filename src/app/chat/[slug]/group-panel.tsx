"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Avatar } from "@/components/avatar";

import { ModerationButton, ModerationMenu } from "./moderation-menu";
import { banUserAction, setRoleAction, unbanUserAction } from "../actions";

import { fetchRoomInfo, updateRoomAction, type RoomInfo } from "../actions";

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
      <path
        d="M4 20h4L19 9l-4-4L4 16v4zM14.5 5.5l4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Picture with a camera overlay for mods.
 *
 * The file input saves on choose rather than waiting for a separate button:
 * picking a file from the system dialog is already the deliberate step, and
 * there is no surrounding form to press Save in.
 */
function GroupPicture({
  slug,
  name,
  avatarUrl,
  canEdit,
  onSaved,
  onError,
}: {
  slug: string;
  name: string;
  avatarUrl: string | null;
  canEdit: boolean;
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const picture = <Avatar src={avatarUrl} name={name || slug} size={96} />;

  if (!canEdit) return picture;

  return (
    <div className="group relative h-24 w-24">
      {picture}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={pending}
        aria-label="Change group picture"
        className="absolute inset-0 flex items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 disabled:opacity-100"
      >
        {pending ? (
          <span className="text-[11px] font-medium">Saving…</span>
        ) : (
          <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
            <path
              d="M4 8h3l1.5-2h7L17 8h3v11H4V8z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <circle
              cx="12"
              cy="13"
              r="3.2"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            />
          </svg>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;

          const form = new FormData();
          form.set("slug", slug);
          form.set("avatar", file);

          startTransition(async () => {
            const result = await updateRoomAction({}, form);
            // Clear it either way, so choosing the same file again still fires.
            event.target.value = "";

            if (result.error) onError(result.error);
            else onSaved();
          });
        }}
      />
    </div>
  );
}

/** A single field with a pencil, editable in place. */
function EditableField({
  slug,
  field,
  label,
  value,
  placeholder,
  multiline,
  canEdit,
  onSaved,
  render,
}: {
  slug: string;
  field: "name" | "topic";
  label: string;
  value: string;
  placeholder: string;
  multiline?: boolean;
  canEdit: boolean;
  onSaved: () => void;
  render: (value: string) => React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const save = () => {
    const form = new FormData();
    form.set("slug", slug);
    form.set(field, draft);

    startTransition(async () => {
      const result = await updateRoomAction({}, form);

      if (result.error) {
        setError(result.error);
        return;
      }

      setError(null);
      setEditing(false);
      onSaved();
    });
  };

  if (!editing) {
    return (
      <span className="flex items-start gap-1.5">
        {render(value)}
        {canEdit && (
          <button
            type="button"
            onClick={() => {
              setDraft(value);
              setError(null);
              setEditing(true);
            }}
            aria-label={`Edit ${label}`}
            title={`Edit ${label}`}
            className="mt-0.5 shrink-0 rounded p-1 text-faint transition-colors hover:bg-raised hover:text-ink"
          >
            <PencilIcon />
          </button>
        )}
      </span>
    );
  }

  const inputClass =
    "w-full rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-accent";

  return (
    <span className="flex w-full flex-col gap-1.5">
      {multiline ? (
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={300}
          rows={3}
          autoFocus
          placeholder={placeholder}
          className={`${inputClass} resize-y`}
        />
      ) : (
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={60}
          autoFocus
          placeholder={placeholder}
          className={inputClass}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              save();
            } else if (event.key === "Escape") {
              setEditing(false);
            }
          }}
        />
      )}

      {error && <span className="text-[11px] text-danger">{error}</span>}

      {/*
        A tick and a cross rather than two words. The field is right above them
        and already says what is being changed, so the words were repeating it —
        and an inline edit inside a panel is not a form worth two labelled
        buttons. Both keep an accessible name, which is what the words were
        actually carrying.
      */}
      <span className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          aria-label="Save"
          title="Save"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? (
            <span
              aria-hidden
              className="h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-current/40 border-t-current motion-reduce:animate-none"
            />
          ) : (
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
              <path
                d="M5 12.5l4.5 4.5L19 7.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={() => setEditing(false)}
          aria-label="Cancel"
          title="Cancel"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-line-strong hover:text-ink"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
            <path
              d="M6 6l12 12M18 6L6 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </span>
    </span>
  );
}

export function GroupPanel({
  slug,
  canModerate,
  canManageRoles,
  meUsername,
  onClose,
  onOpenMember,
  refreshKey,
}: {
  slug: string;
  onClose: () => void;
  onOpenMember: (username: string) => void;
  /** Deleting and banning. A moderator has these. */
  canModerate: boolean;
  /** Promoting and demoting, which only the admin has. */
  canManageRoles: boolean;
  /** So the shield never appears against your own name. */
  meUsername: string;
  refreshKey?: number;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const [modFor, setModFor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /**
   * Same three steps for every control: lock, run, refetch. The member list has
   * to be re-read rather than patched, because a ban or a promotion changes
   * what the menu should offer next.
   */
  const act = async (action: () => Promise<{ error?: string }>) => {
    setBusy(true);
    await action();
    await queryClient.invalidateQueries({
      queryKey: ["chat", "room-info", slug],
    });
    setBusy(false);
    setModFor(null);
  };

  const { data: info = null, isLoading } = useQuery<RoomInfo | null>({
    queryKey: ["chat", "room-info", slug, refreshKey],
    queryFn: () => fetchRoomInfo(slug),
    staleTime: 1000 * 60 * 2,
  });

  const state = isLoading ? "loading" : info ? "ready" : "missing";

  const reload = () => {
    void queryClient.invalidateQueries({
      queryKey: ["chat", "room-info", slug],
    });
  };

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
      className="flex w-full shrink-0 flex-col border-l border-line bg-surface sm:w-80 animate-in slide-in-from-right-4 duration-150"
    >
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close group info"
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
        <h2 className="text-[15px] font-bold text-ink tracking-tight">
          Group Info
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {state === "loading" && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="mt-3 text-xs font-medium text-faint">
              Loading group info…
            </p>
          </div>
        )}

        {state === "missing" && (
          <p className="px-4 py-12 text-center text-xs font-medium text-faint">
            This group is not available.
          </p>
        )}

        {state === "ready" && info && (
          <>
            <div className="flex flex-col items-center gap-3 px-6 py-7">
              <GroupPicture
                slug={slug}
                name={info.name}
                avatarUrl={info.avatarUrl}
                canEdit={info.canEdit}
                onSaved={reload}
                onError={setError}
              />

              {error && (
                <p className="text-xs font-semibold text-danger">{error}</p>
              )}

              <div className="flex w-full flex-col items-center gap-0.5 text-center">
                <EditableField
                  slug={slug}
                  field="name"
                  label="group name"
                  value={info.name}
                  placeholder="Group name"
                  canEdit={info.canEdit}
                  onSaved={reload}
                  render={(value) => (
                    <span className="text-[17px] font-bold text-ink tracking-tight">
                      {value}
                    </span>
                  )}
                />

                <p className="text-[12.5px] font-medium text-muted">
                  {info.stats.total}{" "}
                  {info.stats.total === 1 ? "member" : "members"}
                  {info.stats.active > 0 && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      {` · ${info.stats.active} online`}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="border-t border-line px-5 py-4">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-faint">
                Description
              </p>
              <EditableField
                slug={slug}
                field="topic"
                label="description"
                value={info.topic ?? ""}
                placeholder="What this group is for"
                multiline
                canEdit={info.canEdit}
                onSaved={reload}
                render={(value) =>
                  value ? (
                    <span className="text-[13px] leading-relaxed text-ink/90">
                      {value}
                    </span>
                  ) : (
                    <span className="text-[13px] text-faint italic">
                      No description yet.
                    </span>
                  )
                }
              />
            </div>

            <div className="border-t border-line px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-faint">
                  Members ({info.stats.total})
                </p>
                {info.stats.active > 0 && (
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    {info.stats.active} online
                  </span>
                )}
              </div>

              <ul className="flex flex-col gap-1">
                {info.members.map((member) => (
                  <li key={member.id} className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onOpenMember(member.username)}
                      className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-all hover:bg-raised active:scale-[0.99]"
                    >
                      {/*
                        A ring and a steady dot. The dot used to pulse, which
                        made a list of people look like a row of alerts — being
                        online is a state, not an event, and nothing about it is
                        urgent enough to move.
                      */}
                      <div className="relative shrink-0">
                        <Avatar
                          src={member.avatarUrl}
                          name={member.username}
                          size={38}
                          className={
                            member.isOnline ? "ring-2 ring-emerald-500" : ""
                          }
                        />
                        {member.isOnline && (
                          <span
                            title="Online"
                            className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-surface bg-emerald-500"
                          />
                        )}
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-[13.5px] font-bold text-ink">
                            {member.displayName ?? `@${member.username}`}
                          </span>
                          {/* The badge says which one they are, not merely that
                              they are something. */}
                          {member.role !== "member" && (
                            <span className="shrink-0 rounded-full bg-accent-soft px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-accent">
                              {member.role === "admin" ? "admin" : "mod"}
                            </span>
                          )}
                        </div>
                        <span className="truncate text-[12px] text-muted">
                          {member.headline
                            ? member.headline
                            : `@${member.username}`}
                        </span>
                      </div>
                    </button>

                    {/*
                      Beside the row rather than inside the button that opens
                      the profile — nesting it there would make every tap on a
                      member a coin flip between reading about them and acting
                      on them.
                    */}
                    {/*
                      Not against your own name. The server refuses a mod
                      banning themselves either way, but a button that only
                      exists to be refused is a button that should not be drawn.
                    */}
                    {member.username !== meUsername &&
                      member.role !== "admin" &&
                      (canModerate || canManageRoles) && (
                        <div className="relative shrink-0">
                          <ModerationButton
                            open={modFor === member.username}
                            username={member.username}
                            onToggle={() =>
                              setModFor((current) =>
                                current === member.username
                                  ? null
                                  : member.username,
                              )
                            }
                          />

                          {modFor === member.username && (
                            <ModerationMenu
                              username={member.username}
                              role={member.role}
                              bannedUntil={member.bannedUntil}
                              canModerate={canModerate}
                              canManageRoles={canManageRoles}
                              align="right"
                              busy={busy}
                              onBan={(duration) =>
                                act(() =>
                                  banUserAction(
                                    slug,
                                    member.username,
                                    duration,
                                  ),
                                )
                              }
                              onUnban={() =>
                                act(() => unbanUserAction(member.username))
                              }
                              onSetRole={(role) =>
                                act(() =>
                                  setRoleAction(slug, member.username, role),
                                )
                              }
                              onClose={() => setModFor(null)}
                            />
                          )}
                        </div>
                      )}
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
