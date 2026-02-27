import { useCallback, useState } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { supabase as supabaseClient } from "@/lib/supabase";
import { updateProfileRouteSnapshot } from "@/lib/profileRouteCache";

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

      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", userId)
        .eq("following_id", profileDataId);

      if (error) {
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

      const { error } = await supabase
        .from("follow_requests")
        .update({ status: "canceled", resolved_at: new Date().toISOString() })
        .eq("requester_id", userId)
        .eq("target_id", profileDataId)
        .eq("status", "pending");

      if (error) {
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

        const { error } = await supabase.from("follow_requests").upsert(
          {
            requester_id: userId,
            target_id: profileDataId,
            status: "pending",
            resolved_at: null,
          },
          { onConflict: "requester_id,target_id" },
        );

        if (error) {
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

        const { error } = await supabase.from("follows").insert({
          follower_id: userId,
          following_id: profileDataId,
        });

        if (error) {
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
