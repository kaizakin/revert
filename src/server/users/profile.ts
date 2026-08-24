import { and, eq, inArray, isNull } from "drizzle-orm";

import {
  AVATAR_MAX_BYTES,
  AVATAR_MIME,
  normalizeSocialValue,
  type ProfileInput,
  type SocialKey,
  SOCIAL_PROVIDERS,
} from "@/lib/profile";
import { db } from "@/server/db";
import { socialAccounts, users } from "@/server/db/schema";

import { isPresetUrl } from "./avatar-presets";

export type PublicProfile = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  headline: string | null;
  about: string | null;
  workStatus: "working" | "student" | "looking" | null;
  company: string | null;
  college: string | null;
  location: string | null;
  lastActiveAt: Date | null;
  showLastActive: boolean;
  createdAt: Date;
  socials: { provider: SocialKey; handle: string }[];
};

/**
 * A profile as anyone else sees it.
 *
 * lastActiveAt is nulled out when the person has hidden it. Reciprocity is
 * decided by the caller, which knows the viewer.
 */
export async function getPublicProfile(username: string): Promise<PublicProfile | null> {
  const [row] = await db
    .select()
    .from(users)
    .where(and(eq(users.username, username.toLowerCase()), isNull(users.deletedAt)))
    .limit(1);

  if (!row) return null;

  const socials = await db
    .select({
      provider: socialAccounts.provider,
      handle: socialAccounts.handle,
    })
    .from(socialAccounts)
    .where(eq(socialAccounts.userId, row.id));

  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    headline: row.headline,
    about: row.about,
    workStatus: row.workStatus,
    company: row.company,
    college: row.college,
    location: row.location,
    lastActiveAt: row.showLastActive ? row.lastActiveAt : null,
    showLastActive: row.showLastActive,
    createdAt: row.createdAt,
    socials: socials.filter((s) => s.handle).map((s) => ({ ...s, provider: s.provider })),
  };
}

/**
 * Apply reciprocity: hide your own last-seen and you cannot read anyone
 * else's. Enforced here rather than in the UI, so the value never reaches a
 * client that should not have it.
 */
export function applyReciprocity(profile: PublicProfile, viewer: { showLastActive: boolean }) {
  if (viewer.showLastActive) return profile;
  return { ...profile, lastActiveAt: null };
}

export async function saveProfile(userId: string, input: ProfileInput): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        displayName: input.displayName || null,
        headline: input.headline || null,
        about: input.about || null,
        workStatus: input.workStatus ?? null,
        company: input.company || null,
        college: input.college || null,
        location: input.location || null,
        showLastActive: input.showLastActive,
        showReadReceipts: input.showReadReceipts,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    await writeSocials(tx, userId, input);
  });
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type SocialValues = Partial<Record<SocialKey, string | undefined>>;

/**
 * Write the social links for a user, one row per provider.
 *
 * Shared by the profile page and onboarding so the normalisation rules cannot
 * drift apart. An empty value deletes the row; an unusable one is skipped
 * rather than stored, since a broken link on a public profile is worse than a
 * missing one.
 */
export async function writeSocials(tx: Tx, userId: string, values: SocialValues) {
  for (const provider of SOCIAL_PROVIDERS) {
    const normalised = normalizeSocialValue(provider.key, values[provider.key] ?? "");

    if (normalised === null) continue;

    if (!normalised) {
      await tx
        .delete(socialAccounts)
        .where(
          and(eq(socialAccounts.userId, userId), eq(socialAccounts.provider, provider.key)),
        );
      continue;
    }

    await tx
      .insert(socialAccounts)
      .values({ userId, provider: provider.key, handle: normalised })
      .onConflictDoUpdate({
        target: [socialAccounts.userId, socialAccounts.provider],
        set: { handle: normalised },
      });
  }
}

export async function setAvatarPreset(userId: string, url: string): Promise<boolean> {
  // Only a known preset path may be written, so this cannot be used to point an
  // avatar at an arbitrary URL.
  if (!isPresetUrl(url)) return false;

  await db
    .update(users)
    .set({ avatarUrl: url, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return true;
}

export type UploadResult = { ok: true; url: string } | { ok: false; error: string };

/**
 * Upload to the public `avatars` bucket using the service role, so the browser
 * never gets storage write access. The path is keyed by user id, so nobody can
 * overwrite anyone else's file.
 */
export async function uploadAvatar(userId: string, file: File): Promise<UploadResult> {
  if (!AVATAR_MIME.includes(file.type)) {
    return { ok: false, error: "Use a PNG, JPEG or WebP image." };
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return { ok: false, error: "Keep the image under 2 MB." };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { ok: false, error: "Uploads are not configured." };

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  // Cache-busting suffix, because the path is stable per user and the CDN would
  // otherwise keep serving the previous picture.
  const path = `${userId}/avatar-${Date.now()}.${extension}`;

  const response = await fetch(`${url}/storage/v1/object/avatars/${path}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": file.type,
      "x-upsert": "true",
    },
    body: new Uint8Array(await file.arrayBuffer()),
  });

  if (!response.ok) {
    console.error("[avatar] upload failed", response.status, await response.text());
    return { ok: false, error: "Upload failed. Try again." };
  }

  const publicUrl = `${url}/storage/v1/object/public/avatars/${path}`;

  await db
    .update(users)
    .set({ avatarUrl: publicUrl, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return { ok: true, url: publicUrl };
}

/** Profiles for a set of usernames, for the member list. */
export async function getMembersByIds(ids: string[]) {
  if (!ids.length) return [];

  return db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      headline: users.headline,
    })
    .from(users)
    .where(and(inArray(users.id, ids), isNull(users.deletedAt)));
}

/**
 * Upload a group picture.
 *
 * Same bucket as member avatars under a rooms/ prefix, keyed by conversation
 * id, so one room can never overwrite another's file. Service role only — the
 * browser never gets storage write access.
 */
export async function uploadRoomAvatar(
  conversationId: string,
  file: File,
): Promise<UploadResult> {
  if (!AVATAR_MIME.includes(file.type)) {
    return { ok: false, error: "Use a PNG, JPEG or WebP image." };
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return { ok: false, error: "Keep the image under 2 MB." };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { ok: false, error: "Uploads are not configured." };

  const extension =
    file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `rooms/${conversationId}/avatar-${Date.now()}.${extension}`;

  const response = await fetch(`${url}/storage/v1/object/avatars/${path}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": file.type,
      "x-upsert": "true",
    },
    body: new Uint8Array(await file.arrayBuffer()),
  });

  if (!response.ok) {
    console.error("[room avatar] upload failed", response.status, await response.text());
    return { ok: false, error: "Upload failed. Try again." };
  }

  return { ok: true, url: `${url}/storage/v1/object/public/avatars/${path}` };
}
