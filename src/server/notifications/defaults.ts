import type { conversationType, notifyLevel } from "@/server/db/schema";

type RoomType = (typeof conversationType.enumValues)[number];
type Level = (typeof notifyLevel.enumValues)[number];

/** Above this, a chat room is too busy to push every message by default. */
export const BUSY_ROOM_THRESHOLD = 50;

/**
 * The notification promise, expressed once.
 *
 *  - chat rooms push everything while small, and drop to mentions-only once
 *    they get busy. Noise is opt-in, never opt-out.
 *  - announce rooms push everything regardless. They are low volume and high
 *    value, which is the whole point of the jobs room.
 *  - ama rooms are mentions-only always. During a session only the host and
 *    direct mentions may notify you, which is the complaint this fixes.
 */
export function defaultLevelForRoom(type: RoomType, memberCount: number): Level {
  switch (type) {
    case "announce":
      return "all";
    case "ama":
      return "mentions";
    case "chat":
      return memberCount >= BUSY_ROOM_THRESHOLD ? "mentions" : "all";
  }
}
