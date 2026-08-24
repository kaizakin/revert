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
