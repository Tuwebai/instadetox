import { useCallback } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { supabase as supabaseClient } from "@/lib/supabase";
import type { ProfileTab, TabPageState, TabPrefetchState } from "@/hooks/useProfileTabsState";

interface PostLike {
  id: string;
  title: string | null;
  caption: string;
  media_url: string | null;
  mentions?: string[] | null;
  likes_count: number;
  comments_count: number;
  comments_enabled?: boolean;
  created_at: string;
}

interface UseProfileTabsDataParams<TPost extends PostLike> {
  supabase: NonNullable<typeof supabaseClient> | null;
  profileId: string | null | undefined;
  targetUsername: string | null | undefined;
  pageSize: number;
  setTabState: Dispatch<SetStateAction<Record<ProfileTab, TabPageState<TPost>>>>;
  tabStateRef: MutableRefObject<Record<ProfileTab, TabPageState<TPost>>>;
  prefetchedPageRef: MutableRefObject<Record<ProfileTab, TabPrefetchState<TPost> | null>>;
  prefetchingRef: MutableRefObject<Record<ProfileTab, boolean>>;
}

export const useProfileTabsData = <TPost extends PostLike>({
  supabase,
  profileId,
  targetUsername,
  pageSize,
  setTabState,
  tabStateRef,
  prefetchedPageRef,
  prefetchingRef,
}: UseProfileTabsDataParams<TPost>) => {
  const fetchTabPage = useCallback(
    async (tab: ProfileTab, currentProfileId: string, username: string, page: number): Promise<TPost[]> => {
      if (!supabase) return [];

      const from = page * pageSize;
      const to = from + pageSize - 1;

      if (tab === "posts") {
        const { data } = await supabase
          .from("posts")
          .select("id, title, caption, media_url, mentions, likes_count, comments_count, comments_enabled, created_at")
          .eq("user_id", currentProfileId)
          .eq("is_published", true)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .range(from, to);
        return (data ?? []) as TPost[];
      }

      if (tab === "saved") {
        const { data } = await supabase
          .from("saved_posts")
          .select("created_at, posts:post_id(id, title, caption, media_url, mentions, likes_count, comments_count, comments_enabled, created_at)")
          .eq("user_id", currentProfileId)
          .order("created_at", { ascending: false })
          .range(from, to);

        return (data ?? []).flatMap((row) => {
          const joined = row.posts;
          if (!joined) return [];
          if (Array.isArray(joined)) return joined as TPost[];
          return [joined as TPost];
        });
      }

      const { data } = await supabase
        .from("posts")
        .select("id, title, caption, media_url, mentions, likes_count, comments_count, comments_enabled, created_at")
        .contains("mentions", [username.toLowerCase()])
        .eq("is_published", true)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .range(from, to);

      return (data ?? []) as TPost[];
    },
    [pageSize, supabase],
  );

  const loadTabPage = useCallback(
    async (tab: ProfileTab, opts?: { reset?: boolean }) => {
      if (!profileId || !targetUsername) return;
      const reset = opts?.reset ?? false;
      const current = tabStateRef.current[tab];
      if (reset && current.loading && !current.initialized && current.page === 0) return;
      if (!reset && (current.loading || !current.hasMore)) return;

      const nextPage = reset ? 0 : current.page;
      const prefetched = prefetchedPageRef.current[tab];
      const canUsePrefetched = !reset && prefetched?.page === nextPage;

      setTabState((prev) => {
        const nextForTab = {
          ...prev[tab],
          loading: true,
          ...(reset ? { items: [], page: 0, hasMore: true, initialized: false } : {}),
        };
        const prevForTab = prev[tab];
        const sameState =
          prevForTab.loading === nextForTab.loading &&
          prevForTab.page === nextForTab.page &&
          prevForTab.hasMore === nextForTab.hasMore &&
          prevForTab.initialized === nextForTab.initialized &&
          prevForTab.items === nextForTab.items;
        if (sameState) return prev;
        return {
          ...prev,
          [tab]: nextForTab,
        };
      });

      try {
        const rows = canUsePrefetched
          ? (prefetched?.rows ?? [])
          : await fetchTabPage(tab, profileId, targetUsername, nextPage);
        const hasMore = canUsePrefetched ? Boolean(prefetched?.hasMore) : rows.length === pageSize;
        if (canUsePrefetched) {
          prefetchedPageRef.current[tab] = null;
        }

        setTabState((prev) => {
          const base = reset ? [] : prev[tab].items;
          const mergedMap = new Map<string, TPost>();
          for (const item of base) mergedMap.set(item.id, item);
          for (const item of rows) mergedMap.set(item.id, item);

          return {
            ...prev,
            [tab]: {
              items: Array.from(mergedMap.values()),
              page: reset ? 1 : prev[tab].page + 1,
              hasMore,
              loading: false,
              initialized: true,
            },
          };
        });
      } catch {
        setTabState((prev) => ({
          ...prev,
          [tab]: {
            ...prev[tab],
            loading: false,
            initialized: true,
            hasMore: false,
          },
        }));
      }
    },
    [fetchTabPage, pageSize, prefetchedPageRef, profileId, setTabState, tabStateRef, targetUsername],
  );

  const prefetchNextPage = useCallback(
    async (tab: ProfileTab) => {
      if (!profileId || !targetUsername) return;
      const state = tabStateRef.current[tab];
      if (!state.initialized || state.loading || !state.hasMore) return;
      if (prefetchingRef.current[tab]) return;

      const nextPage = state.page;
      const existing = prefetchedPageRef.current[tab];
      if (existing?.page === nextPage) return;

      prefetchingRef.current[tab] = true;
      try {
        const rows = await fetchTabPage(tab, profileId, targetUsername, nextPage);
        prefetchedPageRef.current[tab] = {
          page: nextPage,
          rows,
          hasMore: rows.length === pageSize,
        };
      } catch {
        prefetchedPageRef.current[tab] = null;
      } finally {
        prefetchingRef.current[tab] = false;
      }
    },
    [fetchTabPage, pageSize, prefetchingRef, prefetchedPageRef, profileId, tabStateRef, targetUsername],
  );

  return {
    loadTabPage,
    prefetchNextPage,
  };
};
