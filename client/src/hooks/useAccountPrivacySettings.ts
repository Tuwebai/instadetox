import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { AuthUser } from "@/lib/AuthContext";

const PRIVACY_CACHE_KEY_PREFIX = "instadetox:account-privacy:";

const getPrivacyCacheKey = (userId: string) => `${PRIVACY_CACHE_KEY_PREFIX}${userId}`;

const readPrivacyCache = (userId: string): boolean | null => {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(getPrivacyCacheKey(userId));
    if (raw === null) return null;
    return raw === "1";
  } catch {
    return null;
  }
};

const writePrivacyCache = (userId: string, value: boolean) => {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(getPrivacyCacheKey(userId), value ? "1" : "0");
  } catch {
    // ignore storage issues
  }
};

interface UseAccountPrivacySettingsOptions {
  user: AuthUser;
  notify: (payload: { title: string; description: string }) => void;
}

export const useAccountPrivacySettings = ({ user, notify }: UseAccountPrivacySettingsOptions) => {
  const [isPrivate, setIsPrivate] = useState<boolean>(() => readPrivacyCache(user.id) ?? false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      if (!supabase) return;
      const { data, error } = await supabase.from("profiles").select("is_private").eq("id", user.id).maybeSingle();
      if (cancelled || error || !data) return;

      const next = Boolean((data as { is_private?: unknown }).is_private);
      setIsPrivate(next);
      writePrivacyCache(user.id, next);
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  const togglePrivacy = useCallback(
    async (nextValue: boolean) => {
      if (!supabase) return;
      if (saving) return;

      const previous = isPrivate;
      setIsPrivate(nextValue);
      writePrivacyCache(user.id, nextValue);
      setSaving(true);

      const { error } = await supabase.from("profiles").update({ is_private: nextValue }).eq("id", user.id);
      if (error) {
        setIsPrivate(previous);
        writePrivacyCache(user.id, previous);
        notify({
          title: "No se pudo actualizar",
          description: "No se guardó la configuración de privacidad. Reintentá.",
        });
        setSaving(false);
        return;
      }

      notify({
        title: "Privacidad actualizada",
        description: nextValue ? "Tu cuenta ahora es privada." : "Tu cuenta ahora es pública.",
      });
      setSaving(false);
    },
    [isPrivate, notify, saving, user.id],
  );

  return {
    isPrivate,
    saving,
    togglePrivacy,
  };
};
