import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { supabase as supabaseClient } from "@/lib/supabase";
import { updateProfileRouteSnapshotByUserId } from "@/lib/profileRouteCache";
import { parseStoragePathFromPublicUrl, sanitizeFileName } from "@/lib/profileUtils";

const AVATAR_BUCKET = "profile-avatars";

interface UseProfileAvatarActionsParams<TProfile extends { avatar_url: string | null }> {
  supabase: NonNullable<typeof supabaseClient> | null;
  userId: string | null | undefined;
  profileDataId: string | null | undefined;
  profileAvatarUrl: string | null | undefined;
  isOwnProfile: boolean;
  setProfileData: Dispatch<SetStateAction<TProfile | null>>;
  updateUserProfile: (updates: { avatar_url: string }) => void;
  toast: (payload: { title: string; description: string }) => void;
}

export const useProfileAvatarActions = <TProfile extends { avatar_url: string | null }>({
  supabase,
  userId,
  profileDataId,
  profileAvatarUrl,
  isOwnProfile,
  setProfileData,
  updateUserProfile,
  toast,
}: UseProfileAvatarActionsParams<TProfile>) => {
  const avatarInputRef: MutableRefObject<HTMLInputElement | null> = useRef<HTMLInputElement | null>(null);
  const [isAvatarOptionsOpen, setIsAvatarOptionsOpen] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);

  const syncAvatarLocal = useCallback(
    (avatarUrl: string | null) => {
      setProfileData((prev) => (prev ? { ...prev, avatar_url: avatarUrl } : prev));
      if (profileDataId) {
        updateProfileRouteSnapshotByUserId(profileDataId, (snapshot) => ({
          ...snapshot,
          avatar_url: avatarUrl,
        }));
      }
      if (userId && profileDataId === userId) {
        updateUserProfile({ avatar_url: avatarUrl ?? "" });
        window.dispatchEvent(
          new CustomEvent("instadetox:avatar-updated", {
            detail: { userId, avatarUrl: avatarUrl ?? "" },
          }),
        );
      }
    },
    [profileDataId, setProfileData, updateUserProfile, userId],
  );

  const tryDeletePreviousAvatarObject = useCallback(
    async (avatarUrl: string | null) => {
      if (!supabase || !avatarUrl) return;
      const parsed = parseStoragePathFromPublicUrl(avatarUrl);
      if (!parsed || parsed.bucket !== AVATAR_BUCKET) return;
      await supabase.storage.from(AVATAR_BUCKET).remove([parsed.path]);
    },
    [supabase],
  );

  const handleOpenAvatarOptions = useCallback(() => {
    if (!isOwnProfile || avatarBusy) return;
    setIsAvatarOptionsOpen(true);
  }, [avatarBusy, isOwnProfile]);

  const handleCloseAvatarOptions = useCallback(() => {
    if (avatarBusy) return;
    setIsAvatarOptionsOpen(false);
  }, [avatarBusy]);

  const handlePickAvatarFile = useCallback(() => {
    if (avatarBusy) return;
    avatarInputRef.current?.click();
  }, [avatarBusy]);

  const handleAvatarFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.currentTarget.value = "";
      if (!file || !supabase || !profileDataId || !userId || profileDataId !== userId) return;

      if (!file.type.startsWith("image/")) {
        toast({ title: "Formato no valido", description: "Solo se permiten imagenes para el avatar." });
        return;
      }

      const previousAvatar = profileAvatarUrl ?? null;
      const optimisticUrl = URL.createObjectURL(file);
      setAvatarBusy(true);
      setIsAvatarOptionsOpen(false);
      syncAvatarLocal(optimisticUrl);

      try {
        const ext = file.name.includes(".") ? file.name.split(".").pop() ?? "jpg" : "jpg";
        const baseName = sanitizeFileName(file.name.replace(/\.[^/.]+$/, "")) || "avatar";
        const path = `${userId}/${Date.now()}-${baseName}.${ext}`;

        const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });
        if (uploadError) throw uploadError;

        const { data: publicData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
        const finalUrl = publicData.publicUrl;

        const { error: profileError } = await supabase
          .from("profiles")
          .update({ avatar_url: finalUrl })
          .eq("id", userId);
        if (profileError) throw profileError;

        await supabase.auth.updateUser({ data: { avatar_url: finalUrl } });
        await tryDeletePreviousAvatarObject(previousAvatar);
        syncAvatarLocal(finalUrl);
        toast({ title: "Foto actualizada", description: "Tu foto de perfil se actualizo correctamente." });
      } catch {
        syncAvatarLocal(previousAvatar);
        toast({ title: "Error", description: "No se pudo actualizar la foto de perfil." });
      } finally {
        URL.revokeObjectURL(optimisticUrl);
        setAvatarBusy(false);
      }
    },
    [
      profileAvatarUrl,
      profileDataId,
      supabase,
      syncAvatarLocal,
      toast,
      tryDeletePreviousAvatarObject,
      userId,
    ],
  );

  const handleRemoveAvatar = useCallback(async () => {
    if (!supabase || !profileDataId || !userId || profileDataId !== userId || avatarBusy) return;

    const previousAvatar = profileAvatarUrl ?? null;
    setAvatarBusy(true);
    setIsAvatarOptionsOpen(false);
    syncAvatarLocal(null);

    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", userId);
      if (profileError) throw profileError;

      await supabase.auth.updateUser({ data: { avatar_url: null } });
      await tryDeletePreviousAvatarObject(previousAvatar);
      toast({ title: "Foto eliminada", description: "Tu avatar actual fue eliminado." });
    } catch {
      syncAvatarLocal(previousAvatar);
      toast({ title: "Error", description: "No se pudo eliminar la foto de perfil." });
    } finally {
      setAvatarBusy(false);
    }
  }, [
    avatarBusy,
    profileAvatarUrl,
    profileDataId,
    supabase,
    syncAvatarLocal,
    toast,
    tryDeletePreviousAvatarObject,
    userId,
  ]);

  useEffect(() => {
    if (!isAvatarOptionsOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAvatarOptionsOpen(false);
      }
    };
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isAvatarOptionsOpen]);

  return {
    avatarInputRef,
    avatarBusy,
    isAvatarOptionsOpen,
    handleOpenAvatarOptions,
    handleCloseAvatarOptions,
    handlePickAvatarFile,
    handleAvatarFileChange,
    handleRemoveAvatar,
  };
};
