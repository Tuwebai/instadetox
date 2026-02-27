import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { supabase as supabaseClient } from "@/lib/supabase";
import { getProfileRouteSnapshot } from "@/lib/profileRouteCache";

interface UseProfileDataBootstrapParams<TProfile> {
  supabase: NonNullable<typeof supabaseClient> | null;
  userId: string | null | undefined;
  authUsername?: string | null | undefined;
  authFullName?: string | null | undefined;
  authAvatarUrl?: string | null | undefined;
  isPostRouteMatch: boolean;
  targetUsername: string | null;
  resetTabsState: () => void;
  setActiveTabPosts: () => void;
  setProfileData: Dispatch<SetStateAction<TProfile | null>>;
  setPostCount: Dispatch<SetStateAction<number>>;
  setFollowers: Dispatch<SetStateAction<number>>;
  setFollowing: Dispatch<SetStateAction<number>>;
  setIsFollowing: Dispatch<SetStateAction<boolean>>;
  setIsFollowPending: Dispatch<SetStateAction<boolean>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
}

export const useProfileDataBootstrap = <TProfile extends { id: string; username: string; full_name: string | null; avatar_url: string | null; bio: string | null; is_private?: boolean | null }>({
  supabase,
  userId,
  authUsername,
  authFullName,
  authAvatarUrl,
  isPostRouteMatch,
  targetUsername,
  resetTabsState,
  setActiveTabPosts,
  setProfileData,
  setPostCount,
  setFollowers,
  setFollowing,
  setIsFollowing,
  setIsFollowPending,
  setLoading,
}: UseProfileDataBootstrapParams<TProfile>) => {
  useEffect(() => {
    if (isPostRouteMatch) return;
    if (!userId || !targetUsername || !authUsername) return;
    if (targetUsername !== authUsername) return;

    setProfileData((prev) =>
      prev ??
      ({
        id: userId,
        username: authUsername,
        full_name: authFullName ?? null,
        avatar_url: authAvatarUrl ?? null,
        bio: null,
      } as TProfile),
    );
    setLoading(false);
  }, [
    authAvatarUrl,
    authFullName,
    authUsername,
    isPostRouteMatch,
    setLoading,
    setProfileData,
    targetUsername,
    userId,
  ]);

  useEffect(() => {
    if (!isPostRouteMatch && !targetUsername) {
      setLoading(false);
    }
  }, [isPostRouteMatch, setLoading, targetUsername]);

  useEffect(() => {
    if (isPostRouteMatch || !targetUsername) return;
    const cached = getProfileRouteSnapshot(targetUsername);
    if (!cached) return;

    setProfileData({
      id: cached.id,
      username: cached.username,
      full_name: cached.full_name,
      avatar_url: cached.avatar_url,
      bio: cached.bio,
      is_private: cached.isPrivate,
    } as TProfile);
    setPostCount(cached.postCount);
    setFollowers(cached.followers);
    setFollowing(cached.following);
    setIsFollowing(cached.isFollowing);
    setIsFollowPending(cached.isFollowPending);
    setLoading(false);
  }, [
    isPostRouteMatch,
    setFollowers,
    setFollowing,
    setIsFollowing,
    setIsFollowPending,
    setLoading,
    setPostCount,
    setProfileData,
    targetUsername,
  ]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!supabase || !userId) {
        setLoading(false);
        return;
      }
      if (isPostRouteMatch) return;
      if (!targetUsername) {
        setLoading(false);
        return;
      }
      const isOwnProfileRoute = Boolean(authUsername && targetUsername === authUsername);

      const cached = getProfileRouteSnapshot(targetUsername);
      setLoading(!(cached || isOwnProfileRoute));

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, bio, is_private")
        .eq("username", targetUsername)
        .maybeSingle();

      if (profileError || !profile) {
        if (cached) {
          setLoading(false);
          return;
        }
        setProfileData(null);
        resetTabsState();
        setPostCount(0);
        setFollowers(0);
        setFollowing(0);
        setIsFollowing(false);
        setIsFollowPending(false);
        setLoading(false);
        return;
      }

      const profileId = profile.id as string;
      setProfileData(profile as TProfile);

      const { data: headerData } = await supabase.rpc("get_profile_header_snapshot", {
        p_profile_id: profileId,
      });
      const headerRow = Array.isArray(headerData) ? headerData[0] : null;

      const derivedIsFollowing = Boolean(headerRow?.is_following);
      const derivedIsPending = Boolean(headerRow?.is_follow_pending) && !derivedIsFollowing;

      setPostCount(Number(headerRow?.post_count ?? 0));
      setFollowers(Number(headerRow?.followers_count ?? 0));
      setFollowing(Number(headerRow?.following_count ?? 0));
      setIsFollowing(derivedIsFollowing);
      setIsFollowPending(derivedIsPending);
      resetTabsState();
      setActiveTabPosts();
      setLoading(false);
    };

    void loadProfile();
  }, [
    isPostRouteMatch,
    resetTabsState,
    setActiveTabPosts,
    setFollowers,
    setFollowing,
    setIsFollowing,
    setIsFollowPending,
    setLoading,
    setPostCount,
    setProfileData,
    supabase,
    targetUsername,
    authUsername,
    userId,
  ]);
};
