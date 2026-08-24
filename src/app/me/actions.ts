"use server";

import { revalidatePath } from "next/cache";

import { profileSchema } from "@/lib/profile";
import { setAvatarPreset, saveProfile, uploadAvatar } from "@/server/users/profile";
import { getDbUser } from "@/server/users/sync";

export type ProfileState = { error?: string; saved?: boolean };

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
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  await saveProfile(me.id, parsed.data);

  revalidatePath("/me");
  revalidatePath("/rooms", "layout");
  return { saved: true };
}

export type AvatarState = { error?: string; url?: string };

export async function chooseAvatarAction(url: string): Promise<AvatarState> {
  const me = await getDbUser();
  if (!me) return { error: "You are signed out." };

  const ok = await setAvatarPreset(me.id, url);
  if (!ok) return { error: "That avatar is not available." };

  revalidatePath("/me");
  revalidatePath("/rooms", "layout");
  return { url };
}

export async function uploadAvatarAction(
  _prev: AvatarState,
  formData: FormData,
): Promise<AvatarState> {
  const me = await getDbUser();
  if (!me) return { error: "You are signed out." };

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image first." };
  }

  const result = await uploadAvatar(me.id, file);
  if (!result.ok) return { error: result.error };

  revalidatePath("/me");
  revalidatePath("/rooms", "layout");
  return { url: result.url };
}
