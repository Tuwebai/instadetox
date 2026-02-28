import { useCallback, useState } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { supabase as supabaseClient } from "@/lib/supabase";
import { updateProfileRouteSnapshot } from "@/lib/profileRouteCache";
import { apiFetch } from "@/lib/api";

interface UseProfileFollowActionsParams {
  supabase: NonNullable<typeof supabaseClient> | null;
  userId: string | null | undefined;
  profileDataId: string | null | undefined;
  profileUsername: string | null | undefined;
  isOwnProfile: boolean;
  isPrivateProfile: boolean;
  isFollowing: boolean;
  isFollowPending: boolean;
  setIsFollowing: Dispatch<SetStateAction<boolean>>;
  setIsFollowPending: Dispatch<SetStateAction<boolean>>;
  setFollowers: Dispatch<SetStateAction<number>>;
  localFollowOpsRef: MutableRefObject<Set<string>>;
}

export const useProfileFollowActions = ({
  supabase,
  userId,
  profileDataId,
  profileUsername,
  isOwnProfile,
  isPrivateProfile,
  isFollowing,
  isFollowPending,
  setIsFollowing,
  setIsFollowPending,
  setFollowers,
  localFollowOpsRef,
}: UseProfileFollowActionsParams) => {
  const [followLoading, setFollowLoading] = useState(false);

  const handleToggleFollow = useCallback(async () => {
    if (!supabase || !userId || !profileDataId || !profileUsername || isOwnProfile) return;

    setFollowLoading(true);
    const currentlyFollowing = isFollowing;
    const currentlyPending = isFollowPending;
    const followOpKey = `${userId}:${profileDataId}`;
    localFollowOpsRef.current.add(followOpKey);

    if (currentlyFollowing) {
      setIsFollowing(false);
      setFollowers((prev) => Math.max(0, prev - 1));
      updateProfileRouteSnapshot(profileUsername, (snapshot) => ({
        ...snapshot,
        isFollowing: false,
        isFollowPending: false,
        followers: Math.max(0, snapshot.followers - 1),
      }));

      let hasError = false;
      try {
        await apiFetch(`/api/users/${profileDataId}/follow`, { method: "DELETE" });
      } catch (err) {
        hasError = true;
      }

      if (hasError) {
        setIsFollowing(true);
        setFollowers((prev) => prev + 1);
        updateProfileRouteSnapshot(profileUsername, (snapshot) => ({
          ...snapshot,
          isFollowing: true,
          isFollowPending: false,
          followers: snapshot.followers + 1,
        }));
        localFollowOpsRef.current.delete(followOpKey);
      }
    } else if (currentlyPending) {
      setIsFollowPending(false);
      updateProfileRouteSnapshot(profileUsername, (snapshot) => ({
        ...snapshot,
        isFollowing: false,
        isFollowPending: false,
      }));

      let hasError = false;
      try {
        await apiFetch(`/api/users/${profileDataId}/follow`, { method: "DELETE" });
      } catch (err) {
        hasError = true;
      }

      if (hasError) {
        setIsFollowPending(true);
        updateProfileRouteSnapshot(profileUsername, (snapshot) => ({
          ...snapshot,
          isFollowing: false,
          isFollowPending: true,
        }));
        localFollowOpsRef.current.delete(followOpKey);
      }
    } else {
      if (isPrivateProfile) {
        setIsFollowPending(true);
        updateProfileRouteSnapshot(profileUsername, (snapshot) => ({
          ...snapshot,
          isFollowing: false,
          isFollowPending: true,
        }));

        let hasError = false;
        try {
          await apiFetch(`/api/users/${profileDataId}/follow`, { method: "POST" });
        } catch (err) {
          hasError = true;
        }

        if (hasError) {
          setIsFollowPending(false);
          updateProfileRouteSnapshot(profileUsername, (snapshot) => ({
            ...snapshot,
            isFollowing: false,
            isFollowPending: false,
          }));
          localFollowOpsRef.current.delete(followOpKey);
        }
      } else {
        setIsFollowing(true);
        setFollowers((prev) => prev + 1);
        updateProfileRouteSnapshot(profileUsername, (snapshot) => ({
          ...snapshot,
          isFollowing: true,
          isFollowPending: false,
          followers: snapshot.followers + 1,
        }));

        let hasError = false;
        try {
          await apiFetch(`/api/users/${profileDataId}/follow`, { method: "POST" });
        } catch (err) {
          hasError = true;
        }

        if (hasError) {
          setIsFollowing(false);
          setFollowers((prev) => Math.max(0, prev - 1));
          updateProfileRouteSnapshot(profileUsername, (snapshot) => ({
            ...snapshot,
            isFollowing: false,
            isFollowPending: false,
            followers: Math.max(0, snapshot.followers - 1),
          }));
          localFollowOpsRef.current.delete(followOpKey);
        }
      }
    }

    window.setTimeout(() => {
      localFollowOpsRef.current.delete(followOpKey);
    }, 5000);
    setFollowLoading(false);
  }, [
    isFollowing,
    isOwnProfile,
    isPrivateProfile,
    isFollowPending,
    localFollowOpsRef,
    profileDataId,
    profileUsername,
    setIsFollowPending,
    setFollowers,
    setIsFollowing,
    supabase,
    userId,
  ]);

  return {
    followLoading,
    handleToggleFollow,
  };
};
