import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import type { AuthUser } from "@/lib/AuthContext";
import { parseStoragePathFromPublicUrl, sanitizeFileName } from "@/lib/profileUtils";
import { getProfileRouteSnapshot, updateProfileRouteSnapshotByUserId } from "@/lib/profileRouteCache";

const AVATAR_BUCKET = "profile-avatars";
const EDIT_PROFILE_CACHE_KEY_PREFIX = "instadetox:edit-profile:";

const editProfileSchema = z.object({
  website: z.string().trim().max(120, "El sitio web no puede superar 120 caracteres.").optional(),
  bio: z.string().trim().max(150, "La presentación no puede superar 150 caracteres.").optional(),
  gender: z.enum(["Hombre", "Mujer", "No especificado"]),
  showProfileSuggestions: z.boolean(),
});

type EditProfileSchemaInput = z.input<typeof editProfileSchema>;

export type EditProfileValues = z.infer<typeof editProfileSchema> & {
  username: string;
  fullName: string;
  website: string;
  avatarUrl: string | null;
};

interface UseEditProfileFormOptions {
  user: AuthUser;
  updateUserProfile: (patch: Partial<Pick<AuthUser, "username" | "full_name" | "avatar_url" | "website">>) => void;
  notify: (payload: { title: string; description: string }) => void;
}

interface ProfileRow {
  username: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
}

type FieldErrors = Partial<Record<"website" | "bio" | "gender" | "showProfileSuggestions", string>>;

const toSafeWebsite = (value: unknown): string => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const toSafeGender = (value: unknown): EditProfileValues["gender"] => {
  if (value === "Hombre" || value === "Mujer" || value === "No especificado") return value;
  return "No especificado";
};

const toSafeSuggestions = (value: unknown): boolean => (typeof value === "boolean" ? value : true);

const getEditProfileCacheKey = (userId: string) => `${EDIT_PROFILE_CACHE_KEY_PREFIX}${userId}`;

const readLocalEditProfileSnapshot = (userId: string) => {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(getEditProfileCacheKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<EditProfileValues>;
    return {
      website: typeof parsed.website === "string" ? parsed.website : "",
      bio: typeof parsed.bio === "string" ? parsed.bio : "",
      gender: toSafeGender(parsed.gender),
      showProfileSuggestions: toSafeSuggestions(parsed.showProfileSuggestions),
    };
  } catch {
    return null;
  }
};

const writeLocalEditProfileSnapshot = (
  userId: string,
  values: Pick<EditProfileValues, "website" | "bio" | "gender" | "showProfileSuggestions">,
) => {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(getEditProfileCacheKey(userId), JSON.stringify(values));
  } catch {
    // ignore storage errors
  }
};

const tryDeletePreviousAvatarObject = async (avatarUrl: string | null) => {
  if (!supabase || !avatarUrl) return;
  const parsed = parseStoragePathFromPublicUrl(avatarUrl);
  if (!parsed || parsed.bucket !== AVATAR_BUCKET) return;
  await supabase.storage.from(AVATAR_BUCKET).remove([parsed.path]);
};

export const useEditProfileForm = ({ user, updateUserProfile, notify }: UseEditProfileFormOptions) => {
  const cachedProfile = getProfileRouteSnapshot(user.username);
  const localSnapshot = readLocalEditProfileSnapshot(user.id);

  const initialBootstrapValues: EditProfileValues = {
    username: cachedProfile?.username ?? user.username,
    fullName: cachedProfile?.full_name ?? user.full_name ?? "",
    website: localSnapshot?.website ?? user.website ?? "",
    bio: localSnapshot?.bio ?? cachedProfile?.bio ?? "",
    gender: localSnapshot?.gender ?? "No especificado",
    showProfileSuggestions: localSnapshot?.showProfileSuggestions ?? true,
    avatarUrl: cachedProfile?.avatar_url ?? user.avatar_url ?? null,
  };

  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [values, setValues] = useState<EditProfileValues>(initialBootstrapValues);
  const [initialValues, setInitialValues] = useState<EditProfileValues>(initialBootstrapValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const dirtyRef = useRef(false);

  const hasChanges = useMemo(
    () =>
      values.website !== initialValues.website ||
      values.bio !== initialValues.bio ||
      values.gender !== initialValues.gender ||
      values.showProfileSuggestions !== initialValues.showProfileSuggestions ||
      values.avatarUrl !== initialValues.avatarUrl,
    [initialValues, values],
  );

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      if (!supabase) return;

      const [{ data: profile, error: profileError }, { data: authData }] = await Promise.all([
        supabase.from("profiles").select("username, full_name, bio, avatar_url").eq("id", user.id).maybeSingle(),
        supabase.auth.getUser(),
      ]);

      if (cancelled || profileError || !profile) return;

      const metadata = authData.user?.user_metadata as Record<string, unknown> | undefined;
      const mapped: EditProfileValues = {
        username: (profile as ProfileRow).username,
        fullName: (profile as ProfileRow).full_name ?? "",
        website: toSafeWebsite(metadata?.website),
        bio: (profile as ProfileRow).bio ?? "",
        gender: toSafeGender(metadata?.gender),
        showProfileSuggestions: toSafeSuggestions(metadata?.show_profile_suggestions),
        avatarUrl: (profile as ProfileRow).avatar_url ?? null,
      };

      writeLocalEditProfileSnapshot(user.id, {
        website: mapped.website,
        bio: mapped.bio ?? "",
        gender: mapped.gender,
        showProfileSuggestions: mapped.showProfileSuggestions,
      });

      if (!dirtyRef.current) {
        setValues(mapped);
        setInitialValues(mapped);
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  const setField = useCallback(<K extends keyof EditProfileValues>(field: K, value: EditProfileValues[K]) => {
    dirtyRef.current = true;
    setValues((prev) => ({ ...prev, [field]: value }));
    if (field === "website" || field === "bio" || field === "gender" || field === "showProfileSuggestions") {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }, []);

  const handleAvatarFileChange = useCallback(
    async (file: File) => {
      if (!supabase || avatarBusy) return;
      if (!file.type.startsWith("image/")) {
        notify({ title: "Formato no válido", description: "Solo se permiten imágenes para el avatar." });
        return;
      }

      const previousAvatar = values.avatarUrl;
      const optimisticUrl = URL.createObjectURL(file);
      setAvatarBusy(true);
      dirtyRef.current = true;
      setValues((prev) => ({ ...prev, avatarUrl: optimisticUrl }));

      try {
        const ext = file.name.includes(".") ? file.name.split(".").pop() ?? "jpg" : "jpg";
        const baseName = sanitizeFileName(file.name.replace(/\.[^/.]+$/, "")) || "avatar";
        const path = `${user.id}/${Date.now()}-${baseName}.${ext}`;

        const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });
        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
        const finalUrl = data.publicUrl;

        const { error: profileError } = await supabase.from("profiles").update({ avatar_url: finalUrl }).eq("id", user.id);
        if (profileError) throw profileError;

        await supabase.auth.updateUser({ data: { avatar_url: finalUrl } });
        await tryDeletePreviousAvatarObject(previousAvatar);

        setValues((prev) => ({ ...prev, avatarUrl: finalUrl }));
        setInitialValues((prev) => ({ ...prev, avatarUrl: finalUrl }));
        updateUserProfile({ avatar_url: finalUrl });
        updateProfileRouteSnapshotByUserId(user.id, (snapshot) => ({ ...snapshot, avatar_url: finalUrl }));
        window.dispatchEvent(new CustomEvent("instadetox:avatar-updated", { detail: { userId: user.id, avatarUrl: finalUrl } }));
        notify({ title: "Foto actualizada", description: "Tu foto de perfil se actualizó correctamente." });
      } catch {
        setValues((prev) => ({ ...prev, avatarUrl: previousAvatar }));
        notify({ title: "Error", description: "No se pudo actualizar la foto de perfil." });
      } finally {
        URL.revokeObjectURL(optimisticUrl);
        setAvatarBusy(false);
      }
    },
    [avatarBusy, notify, updateUserProfile, user.id, values.avatarUrl],
  );

  const save = useCallback(async () => {
    if (!supabase || saving) return false;

    const parseInput: EditProfileSchemaInput = {
      website: values.website,
      bio: values.bio,
      gender: values.gender,
      showProfileSuggestions: values.showProfileSuggestions,
    };

    const parsed = editProfileSchema.safeParse(parseInput);
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setErrors({
        website: flat.website?.[0],
        bio: flat.bio?.[0],
        gender: flat.gender?.[0],
        showProfileSuggestions: flat.showProfileSuggestions?.[0],
      });
      return false;
    }

    if (!hasChanges) {
      notify({ title: "Sin cambios", description: "No hay cambios para guardar." });
      return true;
    }

    const previousValues = values;
    const previousInitialValues = initialValues;
    const payload = { bio: parsed.data.bio || null };

    const nextValues: EditProfileValues = {
      ...values,
      website: (parsed.data.website || "").trim(),
      bio: payload.bio ?? "",
      gender: parsed.data.gender,
      showProfileSuggestions: parsed.data.showProfileSuggestions,
    };

    setSaving(true);
    setErrors({});

    setValues(nextValues);
    setInitialValues(nextValues);
    writeLocalEditProfileSnapshot(user.id, {
      website: nextValues.website,
      bio: nextValues.bio ?? "",
      gender: nextValues.gender,
      showProfileSuggestions: nextValues.showProfileSuggestions,
    });
    updateUserProfile({ website: nextValues.website });
    updateProfileRouteSnapshotByUserId(user.id, (snapshot) => ({ ...snapshot, bio: payload.bio }));
    dirtyRef.current = false;

    notify({ title: "Perfil actualizado", description: "Cambios guardados." });
    setSaving(false);

    void Promise.all([
      supabase.from("profiles").update(payload).eq("id", user.id),
      supabase.auth.updateUser({
        data: {
          website: nextValues.website,
          gender: nextValues.gender,
          show_profile_suggestions: nextValues.showProfileSuggestions,
        },
      }),
    ])
      .then(([profileResult, authResult]) => {
        if (!profileResult.error && !authResult.error) return;
        if (!dirtyRef.current) {
          setValues(previousValues);
          setInitialValues(previousInitialValues);
        }
        writeLocalEditProfileSnapshot(user.id, {
          website: previousValues.website,
          bio: previousValues.bio ?? "",
          gender: previousValues.gender,
          showProfileSuggestions: previousValues.showProfileSuggestions,
        });
        updateUserProfile({ website: previousValues.website });
        updateProfileRouteSnapshotByUserId(user.id, (snapshot) => ({ ...snapshot, bio: previousValues.bio || null }));
        notify({ title: "No se pudo guardar", description: "Hubo un error sincronizando cambios. Reintentá." });
      })
      .catch(() => {
        if (!dirtyRef.current) {
          setValues(previousValues);
          setInitialValues(previousInitialValues);
        }
        writeLocalEditProfileSnapshot(user.id, {
          website: previousValues.website,
          bio: previousValues.bio ?? "",
          gender: previousValues.gender,
          showProfileSuggestions: previousValues.showProfileSuggestions,
        });
        updateUserProfile({ website: previousValues.website });
        updateProfileRouteSnapshotByUserId(user.id, (snapshot) => ({ ...snapshot, bio: previousValues.bio || null }));
        notify({ title: "No se pudo guardar", description: "Hubo un error sincronizando cambios. Reintentá." });
      });

    return true;
  }, [hasChanges, initialValues, notify, saving, user.id, values]);

  return {
    saving,
    avatarBusy,
    values,
    errors,
    hasChanges,
    setField,
    handleAvatarFileChange,
    save,
  };
};
