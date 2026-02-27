import { useCallback, useRef } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { supabase as supabaseClient } from "@/lib/supabase";
import type { ProfileTab, TabPageState } from "@/hooks/useProfileTabsState";

interface PostLike {
  id: string;
}

interface CachedProfile {
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface UseProfileRealtimeHelpersParams<TPost extends PostLike> {
  supabase: NonNullable<typeof supabaseClient> | null;
  setTabState: Dispatch<SetStateAction<Record<ProfileTab, TabPageState<TPost>>>>;
  tabStateRef: MutableRefObject<Record<ProfileTab, TabPageState<TPost>>>;
}

export const useProfileRealtimeHelpers = <TPost extends PostLike>({
  supabase,
  setTabState,
  tabStateRef,
}: UseProfileRealtimeHelpersParams<TPost>) => {
  const profileCacheRef = useRef<Map<string, CachedProfile>>(new Map());
  const localFollowOpsRef = useRef<Set<string>>(new Set());

  const patchPostAcrossTabs = useCallback((postId: string, updater: (post: TPost) => TPost) => {
    setTabState((prev) => {
      const next = { ...prev };
      (Object.keys(next) as ProfileTab[]).forEach((tab) => {
        next[tab] = {
          ...next[tab],
          items: next[tab].items.map((post) => (post.id === postId ? updater(post) : post)),
        };
      });
      return next;
    });
  }, [setTabState]);

  const hasPostLoaded = useCallback((postId: string) => {
    const tabs = tabStateRef.current;
    return (Object.keys(tabs) as ProfileTab[]).some((tab) => tabs[tab].items.some((post) => post.id === postId));
  }, [tabStateRef]);

  const ensureProfileCache = useCallback(
    async (profileId: string): Promise<CachedProfile> => {
      const cached = profileCacheRef.current.get(profileId);
      if (cached) return cached;

      if (!supabase) {
        const fallback: CachedProfile = { username: "usuario", full_name: null, avatar_url: null };
        profileCacheRef.current.set(profileId, fallback);
        return fallback;
      }

      const { data } = await supabase
        .from("profiles")
        .select("username, full_name, avatar_url")
        .eq("id", profileId)
        .maybeSingle();

      const resolved: CachedProfile = {
        username: (data?.username as string) ?? "usuario",
        full_name: (data?.full_name as string | null) ?? null,
        avatar_url: (data?.avatar_url as string | null) ?? null,
      };
      profileCacheRef.current.set(profileId, resolved);
      return resolved;
    },
    [supabase],
  );

  return {
    localFollowOpsRef,
    patchPostAcrossTabs,
    hasPostLoaded,
    ensureProfileCache,
  };
};

