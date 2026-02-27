import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

export type FollowRequestStatus = "pending" | "accepted" | "rejected" | "canceled";

export interface FollowRequestItem {
  requester_id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  is_private: boolean;
  status: FollowRequestStatus;
  created_at: string;
  resolved_at: string | null;
  isFollowingByMe: boolean;
  isFollowPendingByMe: boolean;
}

interface UseFollowRequestsInboxParams {
  userId: string | undefined;
}

export const useFollowRequestsInbox = ({ userId }: UseFollowRequestsInboxParams) => {
  const [followRequests, setFollowRequests] = useState<FollowRequestItem[]>([]);
  const [followRequestsLoading, setFollowRequestsLoading] = useState(true);
  const [followRequestBusyById, setFollowRequestBusyById] = useState<Record<string, boolean>>({});

  const loadFollowRequests = useCallback(async () => {
    if (!supabase || !userId) {
      setFollowRequests([]);
      setFollowRequestsLoading(false);
      return;
    }

    setFollowRequestsLoading(true);

    const { data: requestRowsData } = await supabase
      .from("follow_requests")
      .select("requester_id, status, created_at, resolved_at")
      .eq("target_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);

    const requestRows = (requestRowsData ?? []) as Array<Record<string, unknown>>;
    const requesterIds = Array.from(
      new Set(
        requestRows
          .map((row) => row.requester_id as string | undefined)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    const [profilesRes, followsRes, pendingRes] = requesterIds.length
      ? await Promise.all([
          supabase
            .from("profiles")
            .select("id, username, full_name, avatar_url, is_private")
            .in("id", requesterIds),
          supabase
            .from("follows")
            .select("following_id")
            .eq("follower_id", userId)
            .in("following_id", requesterIds),
          supabase
            .from("follow_requests")
            .select("target_id")
            .eq("requester_id", userId)
            .eq("status", "pending")
            .in("target_id", requesterIds),
        ])
      : [{ data: [], error: null }, { data: [], error: null }, { data: [], error: null }];

    const byRequesterId = new Map(
      ((profilesRes.data ?? []) as Array<Record<string, unknown>>).map((profile) => [
        profile.id as string,
        profile,
      ]),
    );
    const followingSet = new Set((followsRes.data ?? []).map((row) => row.following_id as string));
    const pendingSet = new Set((pendingRes.data ?? []).map((row) => row.target_id as string));

    const normalizedRequests = requestRows
      .map((row) => {
        const requesterId = row.requester_id as string | undefined;
        const status = row.status as FollowRequestStatus | undefined;
        if (!requesterId || !status) return null;

        const profile = byRequesterId.get(requesterId);
        const username = (profile?.username as string | undefined) ?? "usuario";
        const fullName = (profile?.full_name as string | null | undefined) ?? null;
        const avatarUrl = (profile?.avatar_url as string | null | undefined) ?? null;
        const isPrivate = Boolean(profile?.is_private);
        const isFollowingByMe = followingSet.has(requesterId);

        return {
          requester_id: requesterId,
          username,
          full_name: fullName,
          avatar_url: avatarUrl,
          is_private: isPrivate,
          status,
          created_at: (row.created_at as string) ?? new Date().toISOString(),
          resolved_at: (row.resolved_at as string | null) ?? null,
          isFollowingByMe,
          isFollowPendingByMe: !isFollowingByMe && pendingSet.has(requesterId),
        } satisfies FollowRequestItem;
      })
      .filter((row): row is FollowRequestItem => row !== null);

    setFollowRequests(normalizedRequests);
    setFollowRequestsLoading(false);
  }, [userId]);

  const handleFollowRequestAction = useCallback(
    async (requesterId: string, action: "accepted" | "rejected") => {
      if (!supabase) return;
      setFollowRequestBusyById((prev) => ({ ...prev, [requesterId]: true }));

      const { data, error } = await supabase.rpc("respond_follow_request", {
        p_requester_id: requesterId,
        p_action: action,
      });

      if (!error && data) {
        await loadFollowRequests();
      }

      setFollowRequestBusyById((prev) => ({ ...prev, [requesterId]: false }));
    },
    [loadFollowRequests],
  );

  const handleToggleFollowBack = useCallback(
    async (requesterId: string) => {
      if (!supabase || !userId || requesterId === userId) return;
      const requestRow = followRequests.find((row) => row.requester_id === requesterId);
      if (!requestRow) return;

      const currentlyFollowing = requestRow.isFollowingByMe;
      const currentlyPending = requestRow.isFollowPendingByMe;
      setFollowRequestBusyById((prev) => ({ ...prev, [requesterId]: true }));

      if (currentlyFollowing) {
        setFollowRequests((prev) =>
          prev.map((row) =>
            row.requester_id === requesterId
              ? { ...row, isFollowingByMe: false, isFollowPendingByMe: false }
              : row,
          ),
        );

        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", userId)
          .eq("following_id", requesterId);

        if (error) {
          setFollowRequests((prev) =>
            prev.map((row) =>
              row.requester_id === requesterId
                ? { ...row, isFollowingByMe: true, isFollowPendingByMe: false }
                : row,
            ),
          );
        }

        setFollowRequestBusyById((prev) => ({ ...prev, [requesterId]: false }));
        return;
      }

      if (currentlyPending) {
        setFollowRequests((prev) =>
          prev.map((row) =>
            row.requester_id === requesterId
              ? { ...row, isFollowingByMe: false, isFollowPendingByMe: false }
              : row,
          ),
        );

        const { error } = await supabase
          .from("follow_requests")
          .update({ status: "canceled", resolved_at: new Date().toISOString() })
          .eq("requester_id", userId)
          .eq("target_id", requesterId)
          .eq("status", "pending");

        if (error) {
          setFollowRequests((prev) =>
            prev.map((row) =>
              row.requester_id === requesterId
                ? { ...row, isFollowingByMe: false, isFollowPendingByMe: true }
                : row,
            ),
          );
        }

        setFollowRequestBusyById((prev) => ({ ...prev, [requesterId]: false }));
        return;
      }

      if (requestRow.is_private) {
        setFollowRequests((prev) =>
          prev.map((row) =>
            row.requester_id === requesterId
              ? { ...row, isFollowingByMe: false, isFollowPendingByMe: true }
              : row,
          ),
        );

        const { error } = await supabase.from("follow_requests").upsert(
          {
            requester_id: userId,
            target_id: requesterId,
            status: "pending",
            resolved_at: null,
          },
          { onConflict: "requester_id,target_id" },
        );

        if (error) {
          setFollowRequests((prev) =>
            prev.map((row) =>
              row.requester_id === requesterId
                ? { ...row, isFollowingByMe: false, isFollowPendingByMe: false }
                : row,
            ),
          );
        }

        setFollowRequestBusyById((prev) => ({ ...prev, [requesterId]: false }));
        return;
      }

      setFollowRequests((prev) =>
        prev.map((row) =>
          row.requester_id === requesterId
            ? { ...row, isFollowingByMe: true, isFollowPendingByMe: false }
            : row,
        ),
      );

      const { error } = await supabase.from("follows").insert({
        follower_id: userId,
        following_id: requesterId,
      });

      if (error) {
        setFollowRequests((prev) =>
          prev.map((row) =>
            row.requester_id === requesterId
              ? { ...row, isFollowingByMe: false, isFollowPendingByMe: false }
              : row,
          ),
        );
      }

      setFollowRequestBusyById((prev) => ({ ...prev, [requesterId]: false }));
    },
    [followRequests, userId],
  );

  useEffect(() => {
    void loadFollowRequests();
  }, [loadFollowRequests]);

  useEffect(() => {
    if (!supabase || !userId) return;
    const client = supabase;
    const channel = client.channel(`follow-requests-inbox:${userId}:${Date.now()}`);

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "follow_requests", filter: `target_id=eq.${userId}` },
      () => {
        void loadFollowRequests();
      },
    );

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "follows", filter: `follower_id=eq.${userId}` },
      () => {
        void loadFollowRequests();
      },
    );

    channel.subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [loadFollowRequests, userId]);

  const pendingFollowItems = useMemo(
    () => followRequests.filter((row) => row.status === "pending").slice(0, 5),
    [followRequests],
  );

  return {
    followRequests,
    followRequestsLoading,
    followRequestBusyById,
    pendingFollowItems,
    loadFollowRequests,
    handleFollowRequestAction,
    handleToggleFollowBack,
  };
};
