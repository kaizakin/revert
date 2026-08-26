/**
 * Shared between client and server, so it must stay free of any server import.
 * The emoji list previously lived next to the database code, which dragged the
 * db client and the service-role realtime transport into the browser bundle.
 */

/** The row offered on a long press. Anything else is rejected server-side. */
export const REACTION_EMOJI = ["👍", "❤️", "😂", "😮", "😢", "🙏"] as const;

export type ReactionEmoji = (typeof REACTION_EMOJI)[number];

export function isAllowedEmoji(value: string): value is ReactionEmoji {
  return (REACTION_EMOJI as readonly string[]).includes(value);
}

export type ReactionSummary = {
  emoji: string;
  count: number;
  mine: boolean;
};

/**
 * One person's reaction moving, applied to a summary.
 *
 * The same rule the server follows, kept here so the optimistic update cannot
 * drift from it. It used to only touch the emoji that was tapped: choosing a
 * second one added it without taking the first off, so the count climbed and
 * then dropped a moment later when the server's answer arrived. Both halves
 * happen in one pass now, and the two counts move together.
 */
export function applyOwnReaction(
  current: ReactionSummary[],
  emoji: string,
): ReactionSummary[] {
  const mine = current.find((r) => r.mine);

  /* Tapping the one already chosen takes it off; anything else replaces it. */
  const clearingOwn = mine?.emoji === emoji;

  const withoutMine = current.map((r) =>
    mine && r.emoji === mine.emoji ? { ...r, count: r.count - 1, mine: false } : r,
  );

  const next = clearingOwn
    ? withoutMine
    : withoutMine.some((r) => r.emoji === emoji)
      ? withoutMine.map((r) =>
          r.emoji === emoji ? { ...r, count: r.count + 1, mine: true } : r,
        )
      : [...withoutMine, { emoji, count: 1, mine: true }];

  /* An emoji nobody is left holding should not linger at zero. */
  return next.filter((r) => r.count > 0);
}

export type Reactor = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isYou: boolean;
};

export type ReactorGroup = { emoji: string; people: Reactor[] };

/**
 * The same move, applied to the list of names behind the pill.
 *
 * Lives beside applyOwnReaction because the two have to agree: the summary and
 * the list are two views of one fact. Keeping this next to the sheet meant only
 * the sheet's own buttons updated it, so reacting from the hover picker left
 * the wrong emoji beside your name until you changed it from the list instead.
 */
export function moveOwnReactor(
  groups: ReactorGroup[],
  emoji: string,
  me: { username: string; avatarUrl: string | null },
): ReactorGroup[] {
  const mineNow = groups.find((g) => g.people.some((p) => p.isYou));
  const clearing = mineNow?.emoji === emoji;

  const withoutMe = groups
    .map((g) => ({ ...g, people: g.people.filter((p) => !p.isYou) }))
    .filter((g) => g.people.length > 0);

  if (clearing) return withoutMe;

  const row: Reactor = {
    username: me.username,
    displayName: null,
    avatarUrl: me.avatarUrl,
    isYou: true,
  };

  return withoutMe.some((g) => g.emoji === emoji)
    ? withoutMe.map((g) => (g.emoji === emoji ? { ...g, people: [...g.people, row] } : g))
    : [...withoutMe, { emoji, people: [row] }];
}
