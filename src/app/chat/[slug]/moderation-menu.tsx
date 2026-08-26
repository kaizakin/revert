"use client";

import { BAN_OPTIONS, describeBan, type BanDuration, type MemberRole } from "@/lib/moderation";

/**
 * What a mod can do to one person, in one place.
 *
 * Opened from a shield beside their name — the same shape as the pin control on
 * a message: an icon that admits it has more behind it, rather than a row of
 * destructive buttons sitting under every profile waiting to be brushed.
 *
 * The menu is the same whether it is opened from the member list or from the
 * profile, so a mod learns it once.
 */
export function ModerationMenu({
  username,
  role,
  bannedUntil,
  canModerate,
  canManageRoles,
  align,
  busy,
  onBan,
  onUnban,
  onSetRole,
  onClose,
}: {
  username: string;
  role: MemberRole;
  bannedUntil: Date | string | null;
  canModerate: boolean;
  canManageRoles: boolean;
  align: "left" | "right";
  busy: boolean;
  onBan: (duration: BanDuration) => void;
  onUnban: () => void;
  onSetRole: (role: MemberRole) => void;
  onClose: () => void;
}) {
  const banNote = describeBan(bannedUntil);

  return (
    <>
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        onClick={onClose}
        className="fixed inset-0 z-30 cursor-default bg-transparent"
      />

      <div
        role="menu"
        aria-label={`Moderate @${username}`}
        className={`absolute top-full z-40 mt-1 w-60 overflow-hidden rounded-xl border border-line bg-surface shadow-xl animate-in fade-in zoom-in-95 duration-100 ${
          align === "right" ? "right-0" : "left-0"
        }`}
      >
        {canManageRoles && (
          <button
            type="button"
            role="menuitem"
            disabled={busy}
            onClick={() => onSetRole(role === "moderator" ? "member" : "moderator")}
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] text-ink transition-colors hover:bg-raised disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-accent" aria-hidden>
              <path
                d={
                  role === "moderator"
                    ? "M12 19V5M6 13l6 6 6-6"
                    : "M12 5v14M6 11l6-6 6 6"
                }
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {role === "moderator" ? "Remove as moderator" : "Make moderator"}
          </button>
        )}

        {canModerate && (
          <div className={canManageRoles ? "border-t border-line" : ""}>
            {banNote ? (
              <>
                <p className="px-3 pt-2.5 text-[11.5px] font-medium text-danger">{banNote}</p>
                <button
                  type="button"
                  role="menuitem"
                  disabled={busy}
                  onClick={onUnban}
                  className="flex w-full items-center px-3 py-2.5 text-left text-[13px] text-ink transition-colors hover:bg-raised disabled:opacity-50"
                >
                  Unmute
                </button>
              </>
            ) : (
              <>
                <p className="px-3 pt-2.5 pb-1 text-[10.5px] font-bold uppercase tracking-wider text-faint">
                  Mute for
                </p>
                <div className="flex flex-wrap gap-1.5 px-3 pb-3">
                  {BAN_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="menuitem"
                      disabled={busy}
                      onClick={() => onBan(option.value)}
                      className="rounded-full border border-line px-2.5 py-1 text-[11.5px] text-muted transition-colors hover:border-danger/50 hover:text-danger disabled:opacity-50"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}

/** The trigger, so the list and the profile open the same thing the same way. */
export function ModerationButton({
  open,
  username,
  onToggle,
}: {
  open: boolean;
  username: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={`Moderate @${username}`}
      title="Moderate"
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
        open ? "bg-raised text-ink" : "text-muted hover:bg-raised hover:text-ink"
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
        <path
          d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6l7-3z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
