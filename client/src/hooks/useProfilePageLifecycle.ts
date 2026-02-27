import { useEffect, type MutableRefObject, type RefObject } from "react";
import { setProfileRouteSnapshot } from "@/lib/profileRouteCache";

interface ProfileSnapshotRow {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_private?: boolean | null;
}

interface ActiveTabState {
  initialized: boolean;
  loading: boolean;
  hasMore: boolean;
}

interface UseProfilePageLifecycleOptions<TPost, TTab extends string> {
  isPostRouteMatch: boolean;
  targetUsername: string | null;
  profileData: ProfileSnapshotRow | null;
  postCount: number;
  followers: number;
  following: number;
  isFollowing: boolean;
  isFollowPending: boolean;
  canViewPosts: boolean;
  activeTab: TTab;
  activeTabState: ActiveTabState;
  activeTabPosts: TPost[];
  loadTabPage: (tab: TTab, options?: { reset?: boolean }) => Promise<void>;
  prefetchNextPage: (tab: TTab) => Promise<void>;
  tabStateRef: MutableRefObject<Record<TTab, ActiveTabState>>;
  loadMoreRef: RefObject<HTMLDivElement | null>;
  setDetoxDays: (days: number) => void;
  warmProfilePostRouteSnapshot: (post: TPost) => void;
}

export const useProfilePageLifecycle = <TPost, TTab extends string>({
  isPostRouteMatch,
  targetUsername,
  profileData,
  postCount,
  followers,
  following,
  isFollowing,
  isFollowPending,
  canViewPosts,
  activeTab,
  activeTabState,
  activeTabPosts,
  loadTabPage,
  prefetchNextPage,
  tabStateRef,
  loadMoreRef,
  setDetoxDays,
  warmProfilePostRouteSnapshot,
}: UseProfilePageLifecycleOptions<TPost, TTab>) => {
  useEffect(() => {
    if (isPostRouteMatch || !targetUsername || !profileData) return;
    setProfileRouteSnapshot({
      id: profileData.id,
      username: profileData.username,
      full_name: profileData.full_name,
      avatar_url: profileData.avatar_url,
      bio: profileData.bio,
      isPrivate: Boolean(profileData.is_private),
      postCount,
      followers,
      following,
      isFollowing,
      isFollowPending,
    });
  }, [followers, following, isFollowPending, isFollowing, isPostRouteMatch, postCount, profileData, targetUsername]);

  useEffect(() => {
    if (isPostRouteMatch) return;
    if (!canViewPosts) return;
    if (!profileData?.id || !targetUsername) return;
    if (activeTabState.initialized || activeTabState.loading) return;
    void loadTabPage(activeTab, { reset: true });
  }, [
    activeTab,
    activeTabState.initialized,
    activeTabState.loading,
    canViewPosts,
    isPostRouteMatch,
    loadTabPage,
    profileData?.id,
    targetUsername,
  ]);

  useEffect(() => {
    if (isPostRouteMatch) return;
    if (!canViewPosts) return;
    if (!profileData?.id || !targetUsername) return;
    if (!activeTabState.initialized || activeTabState.loading || !activeTabState.hasMore) return;
    void prefetchNextPage(activeTab);
  }, [
    activeTab,
    activeTabState.hasMore,
    activeTabState.initialized,
    activeTabState.loading,
    canViewPosts,
    isPostRouteMatch,
    prefetchNextPage,
    profileData?.id,
    targetUsername,
  ]);

  useEffect(() => {
    if (isPostRouteMatch) return;
    if (!canViewPosts) return;
    const target = loadMoreRef.current;
    if (!target || !profileData?.id || !targetUsername) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        const state = tabStateRef.current[activeTab];
        if (!state.initialized || state.loading || !state.hasMore) return;
        void loadTabPage(activeTab);
      },
      { rootMargin: "320px 0px 320px 0px" },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [activeTab, canViewPosts, isPostRouteMatch, loadTabPage, loadMoreRef, profileData?.id, tabStateRef, targetUsername]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("detoxDays");
    const days = stored ? Number.parseInt(stored, 10) : 0;
    setDetoxDays(Number.isFinite(days) ? Math.max(0, days) : 0);
  }, [setDetoxDays]);

  useEffect(() => {
    if (!profileData) return;
    if (!canViewPosts) return;
    const warmCandidates = activeTabPosts.slice(0, 18);
    warmCandidates.forEach((post) => {
      warmProfilePostRouteSnapshot(post);
    });
  }, [activeTabPosts, canViewPosts, profileData, warmProfilePostRouteSnapshot]);
};
