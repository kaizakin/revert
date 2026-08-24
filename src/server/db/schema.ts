import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ enums */

export const spaceRole = pgEnum("space_role", ["owner", "mod", "member"]);
export const workStatus = pgEnum("work_status", ["working", "student", "looking"]);
export const socialProvider = pgEnum("social_provider", [
  "github",
  "linkedin",
  "x",
  "leetcode",
  "codeforces",
  /** Stores a full URL rather than a handle. */
  "website",
]);
export const conversationKind = pgEnum("conversation_kind", ["room", "dm", "group_dm"]);
export const conversationType = pgEnum("conversation_type", ["chat", "announce", "ama"]);
export const messageKind = pgEnum("message_kind", ["text", "system", "job"]);
export const notifyLevel = pgEnum("notify_level", ["all", "mentions", "muted"]);
export const workMode = pgEnum("work_mode", ["remote", "hybrid", "onsite"]);
export const reportTarget = pgEnum("report_target", ["message", "user"]);
export const reportStatus = pgEnum("report_status", ["open", "actioned", "dismissed"]);
export const modActionKind = pgEnum("mod_action_kind", [
  "mute",
  "shadow_mute",
  "ban",
  "unban",
  "delete_message",
]);

/* ------------------------------------------------------------------ users */

/**
 * Mirrors Clerk, kept in sync by the Clerk webhook. Clerk remains the source
 * of truth for credentials; this table owns everything profile-shaped.
 * No phone number column exists here, deliberately.
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkId: text("clerk_id").notNull().unique(),
    username: text("username").notNull().unique(),
    email: text("email").notNull(),

    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    headline: text("headline"),
    about: text("about"),

    workStatus: workStatus("work_status"),
    company: text("company"),
    college: text("college"),
    location: text("location"),

    // Reciprocal privacy: hide yours and you cannot see anyone else's.
    showLastActive: boolean("show_last_active").notNull().default(true),
    showReadReceipts: boolean("show_read_receipts").notNull().default(true),

    isAdmin: boolean("is_admin").notNull().default(false),
    bannedUntil: timestamp("banned_until", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),

    lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("users_last_active_idx").on(t.lastActiveAt),
    /**
     * The column is already unique, but Postgres uniqueness is case-sensitive,
     * so "Tushar" and "tushar" would both be allowed. On a platform where the
     * username IS the identity, that is an impersonation vector. Usernames are
     * stored lowercase; this index is the guarantee.
     */
    uniqueIndex("users_username_lower_uq").on(sql`lower(${t.username})`),
  ],
);

/**
 * Self-reported profile links. Nothing here is verified — the handle is stored
 * as typed and the profile URL is built from it.
 */
export const socialAccounts = pgTable(
  "social_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: socialProvider("provider").notNull(),
    handle: text("handle").notNull(),
    url: text("url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("social_accounts_user_provider_uq").on(t.userId, t.provider)],
);

/* ---------------------------------------------------------------- invites */

export const inviteCodes = pgTable("invite_codes", {
  code: text("code").primaryKey(),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  label: text("label"),
  maxUses: integer("max_uses").notNull().default(1),
  uses: integer("uses").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const inviteRedemptions = pgTable(
  "invite_redemptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code")
      .notNull()
      .references(() => inviteCodes.code, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("invite_redemptions_user_uq").on(t.userId)],
);

/* ----------------------------------------------------------------- spaces */

export const spaces = pgTable("spaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const spaceMembers = pgTable(
  "space_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: spaceRole("role").notNull().default("member"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("space_members_uq").on(t.spaceId, t.userId)],
);

/* ---------------------------------------------------- conversations/rooms */

/**
 * One table for rooms now and DMs in Phase 2, so direct messages need almost
 * no new schema. The `type` column drives notification behaviour: `ama` means
 * only the host and direct mentions are allowed to push.
 */
export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    spaceId: uuid("space_id").references(() => spaces.id, { onDelete: "cascade" }),
    kind: conversationKind("kind").notNull().default("room"),
    type: conversationType("type").notNull().default("chat"),
    slug: text("slug"),
    name: text("name"),
    topic: text("topic"),
    /** Group picture. Null falls back to initials on a generated colour. */
    avatarUrl: text("avatar_url"),
    isDefault: boolean("is_default").notNull().default(false),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (t) => [unique("conversations_space_slug_uq").on(t.spaceId, t.slug)],
);

export const conversationMembers = pgTable(
  "conversation_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    isHost: boolean("is_host").notNull().default(false),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("conversation_members_uq").on(t.conversationId, t.userId)],
);

/* --------------------------------------------------------------- messages */

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    kind: messageKind("kind").notNull().default("text"),
    body: text("body"),
    replyToId: uuid("reply_to_id"),

    pinnedAt: timestamp("pinned_at", { withTimezone: true }),
    pinnedBy: uuid("pinned_by").references(() => users.id, { onDelete: "set null" }),

    editedAt: timestamp("edited_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("messages_conversation_created_idx").on(t.conversationId, t.createdAt),
    index("messages_author_idx").on(t.authorId),
  ],
);

export const attachments = pgTable("attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  messageId: uuid("message_id")
    .notNull()
    .references(() => messages.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  url: text("url").notNull(),
  name: text("name"),
  mimeType: text("mime_type"),
  sizeBytes: integer("size_bytes"),
  width: integer("width"),
  height: integer("height"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reactions = pgTable(
  "reactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    emoji: text("emoji").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("reactions_uq").on(t.messageId, t.userId, t.emoji)],
);

/** Stored rather than parsed at read time, so mention notifications stay a cheap query. */
export const mentions = pgTable(
  "mentions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [unique("mentions_uq").on(t.messageId, t.userId)],
);

export const messageReads = pgTable(
  "message_reads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    lastReadMessageId: uuid("last_read_message_id"),
    lastReadAt: timestamp("last_read_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("message_reads_uq").on(t.userId, t.conversationId)],
);

/* ---------------------------------------------------------- notifications */

/**
 * One row per scope. A null conversationId is the global default for that user.
 * Rooms above 50 members default to `mentions`, so noise is opt-in rather than
 * opt-out. This is the product promise, in a column.
 */
export const notificationPrefs = pgTable(
  "notification_prefs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id").references(() => conversations.id, {
      onDelete: "cascade",
    }),
    level: notifyLevel("level").notNull().default("mentions"),

    digestEnabled: boolean("digest_enabled").notNull().default(true),
    digestHour: integer("digest_hour").notNull().default(9),
    quietStart: integer("quiet_start"),
    quietEnd: integer("quiet_end"),
    timezone: text("timezone").notNull().default("Asia/Kolkata"),

    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("notification_prefs_uq").on(t.userId, t.conversationId)],
);

export const devices = pgTable("devices", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  fcmToken: text("fcm_token").notNull().unique(),
  platform: text("platform"),
  userAgent: text("user_agent"),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    title: text("title"),
    body: text("body"),
    url: text("url"),
    payload: jsonb("payload"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notifications_user_created_idx").on(t.userId, t.createdAt)],
);

/* ------------------------------------------------------------- job alerts */

export const jobPosts = pgTable(
  "job_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postedBy: uuid("posted_by").references(() => users.id, { onDelete: "set null" }),
    messageId: uuid("message_id").references(() => messages.id, { onDelete: "set null" }),

    company: text("company").notNull(),
    role: text("role").notNull(),
    location: text("location"),
    workMode: workMode("work_mode"),
    expMin: integer("exp_min"),
    expMax: integer("exp_max"),
    salaryMin: integer("salary_min"),
    salaryMax: integer("salary_max"),
    currency: text("currency").default("INR"),

    applyUrl: text("apply_url").notNull(),
    description: text("description"),
    tags: text("tags").array(),
    source: text("source"),

    /** Normalised company + role + applyUrl. Stops the same opening being posted twice. */
    dedupeKey: text("dedupe_key").notNull().unique(),

    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("job_posts_created_idx").on(t.createdAt)],
);

/* ------------------------------------------------------------- moderation */

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reporterId: uuid("reporter_id").references(() => users.id, { onDelete: "set null" }),
    targetType: reportTarget("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    reason: text("reason").notNull(),
    note: text("note"),
    status: reportStatus("status").notNull().default("open"),
    handledBy: uuid("handled_by").references(() => users.id, { onDelete: "set null" }),
    handledAt: timestamp("handled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("reports_status_idx").on(t.status)],
);

export const moderationActions = pgTable("moderation_actions", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  targetUserId: uuid("target_user_id").references(() => users.id, { onDelete: "cascade" }),
  kind: modActionKind("kind").notNull(),
  reason: text("reason"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  targetType: text("target_type"),
  targetId: text("target_id"),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Simple counter table. Move to Redis if write volume ever becomes a problem. */
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  count: integer("count").notNull().default(0),
});
