"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Avatar } from "@/components/avatar";

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
            <circle cx="12" cy="13" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
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

      <span className="flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-lg bg-accent px-3 py-1.5 text-[12px] font-semibold text-accent-ink disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-lg px-2 py-1.5 text-[12px] text-muted hover:text-ink"
        >
          Cancel
        </button>
      </span>
    </span>
  );
}

export function GroupPanel({
  slug,
  onClose,
  onOpenMember,
  refreshKey,
}: {
  slug: string;
  onClose: () => void;
  onOpenMember: (username: string) => void;
  refreshKey?: number;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { data: info = null, isLoading } = useQuery<RoomInfo | null>({
    queryKey: ["chat", "room-info", slug, refreshKey],
    queryFn: () => fetchRoomInfo(slug),
    staleTime: 1000 * 60 * 2,
  });

  const state = isLoading ? "loading" : info ? "ready" : "missing";

  const reload = () => {
    void queryClient.invalidateQueries({ queryKey: ["chat", "room-info", slug] });
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
              <GroupPicture
                slug={slug}
                name={info.name}
                avatarUrl={info.avatarUrl}
                canEdit={info.canEdit}
                onSaved={reload}
                onError={setError}
              />

              {error && <p className="text-[11px] text-danger">{error}</p>}

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
                    <span className="text-[17px] font-semibold text-ink">{value}</span>
                  )}
                />

                <p className="text-[12px] text-muted">
                  {info.stats.total} {info.stats.total === 1 ? "member" : "members"}
                  {info.stats.active > 0 && ` · ${info.stats.active} online`}
                </p>
              </div>
            </div>

            <div className="border-t border-line px-5 py-4">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-faint">
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
                    <span className="text-[13px] leading-relaxed text-ink">{value}</span>
                  ) : (
                    <span className="text-[13px] text-faint">No description yet.</span>
                  )
                }
              />
            </div>

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
                        <Avatar src={member.avatarUrl} name={member.username} size={36} />
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
