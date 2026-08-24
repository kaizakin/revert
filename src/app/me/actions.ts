"use server";

import { revalidatePath } from "next/cache";

import { profileSchema } from "@/lib/profile";
import { AVATAR_PRESETS } from "@/server/users/avatar-presets";
import { saveProfile, setAvatarPreset, uploadAvatar } from "@/server/users/profile";
import { checkAvailability, renameUser, type AvailabilityResult } from "@/server/users/rename";
import { getDbUser } from "@/server/users/sync";

export type ProfileState = { error?: string; saved?: boolean; username?: string };

/**
 * One action for the whole form, so nothing is written until Save is pressed.
 *
 * Picking an avatar used to save on click, which meant the picture changed even
 * if you then abandoned the form. Avatar choice and upload are now part of this
 * submit like every other field.
 */
export async function saveProfileAction(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const me = await getDbUser();
  if (!me) return { error: "You are signed out." };

  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName") ?? "",
    headline: formData.get("headline") ?? "",
    about: formData.get("about") ?? "",
    workStatus: formData.get("workStatus") || null,
    company: formData.get("company") ?? "",
    college: formData.get("college") ?? "",
    location: formData.get("location") ?? "",
    // Unchecked checkboxes are absent from FormData rather than false.
    showLastActive: formData.get("showLastActive") === "on",
    showReadReceipts: formData.get("showReadReceipts") === "on",
    github: formData.get("github") ?? "",
    linkedin: formData.get("linkedin") ?? "",
    x: formData.get("x") ?? "",
    leetcode: formData.get("leetcode") ?? "",
    codeforces: formData.get("codeforces") ?? "",
    website: formData.get("website") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  // Username first. If it fails, nothing else is written, so the form still
  // reflects what is stored.
  let username = me.username;
  const requested = String(formData.get("username") ?? "").trim();

  if (requested && requested.toLowerCase() !== me.username) {
    const renamed = await renameUser(me.id, me.clerkId, requested);
    if (!renamed.ok) return { error: renamed.error };
    username = renamed.username;
  }

  const presetUrl = String(formData.get("avatarPreset") ?? "");
  const file = formData.get("avatar");

  // An uploaded file wins over a preset, since choosing a file is the more
  // deliberate action.
  if (file instanceof File && file.size > 0) {
    const uploaded = await uploadAvatar(me.id, file);
    if (!uploaded.ok) return { error: uploaded.error };
  } else if (presetUrl && presetUrl !== me.avatarUrl) {
    const ok = await setAvatarPreset(me.id, presetUrl);
    if (!ok) return { error: "That avatar is not available." };
  }

  await saveProfile(me.id, parsed.data);

  revalidatePath("/me");
  revalidatePath("/chat", "layout");
  return { saved: true, username };
}

/** Live availability check for the username field. */
export async function checkUsernameAction(raw: string): Promise<AvailabilityResult> {
  const me = await getDbUser();
  if (!me) return { status: "invalid", reason: "You are signed out." };

  return checkAvailability(raw, me.username);
}

/** Exposed so the client can render the picker without importing server code. */
export async function listAvatarPresets() {
  return AVATAR_PRESETS;
}
