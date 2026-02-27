import { useCallback, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { supabase as supabaseClient } from "@/lib/supabase";

export interface ProfileConnectionUser {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  isPrivate: boolean;
  isFollowingByMe: boolean;
  isFollowPendingByMe: boolean;
}

interface UseProfileConnectionsParams {
  supabase: NonNullable<typeof supabaseClient> | null;
  userId: string | null | undefined;
  profileDataId: string | null | undefined;
  isOwnProfile: boolean;
  setFollowers: Dispatch<SetStateAction<number>>;
  setFollowing: Dispatch<SetStateAction<number>>;
  toast: (payload: { title: string; description: string }) => void;
}

export const useProfileConnections = ({
  supabase,
  userId,
  profileDataId,
  isOwnProfile,
  setFollowers,
  setFollowing,
  toast,
}: UseProfileConnectionsParams) => {
  const [connectionsOpen, setConnectionsOpen] = useState(false);
  const [connectionsType, setConnectionsType] = useState<"followers" | "following">("followers");
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [connectionsQuery, setConnectionsQuery] = useState("");
  const [connections, setConnections] = useState<ProfileConnectionUser[]>([]);
  const [connectionActionLoadingById, setConnectionActionLoadingById] = useState<Record<string, boolean>>({});
  const [connectionSuggestions, setConnectionSuggestions] = useState<ProfileConnectionUser[]>([]);

  const loadFollowStateByIds = useCallback(
    async (ids: string[]): Promise<Set<string>> => {
      if (!supabase || !userId || ids.length === 0) return new Set();
      const uniqueIds = Array.from(new Set(ids.filter((id) => id !== userId)));
      if (uniqueIds.length === 0) return new Set();

      const { data } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", userId)
        .in("following_id", uniqueIds);

      return new Set((data ?? []).map((row) => row.following_id as string));
    },
    [supabase, userId],
  );

  const loadPendingFollowStateByIds = useCallback(
    async (ids: string[]): Promise<Set<string>> => {
      if (!supabase || !userId || ids.length === 0) return new Set();
      const uniqueIds = Array.from(new Set(ids.filter((id) => id !== userId)));
      if (uniqueIds.length === 0) return new Set();

      const { data } = await supabase
        .from("follow_requests")
        .select("target_id")
        .eq("requester_id", userId)
        .eq("status", "pending")
        .in("target_id", uniqueIds);

      return new Set((data ?? []).map((row) => row.target_id as string));
    },
    [supabase, userId],
  );

  const loadConnections = useCallback(
    async (type: "followers" | "following") => {
      if (!supabase || !profileDataId) return;
      setConnectionsLoading(true);

      const relationColumn = type === "followers" ? "follower_id" : "following_id";
      const filterColumn = type === "followers" ? "following_id" : "follower_id";

      const { data: followsData, error } = await supabase
        .from("follows")
        .select(`${relationColumn}, created_at`)
        .eq(filterColumn, profileDataId)
        .order("created_at", { ascending: false })
        .limit(250);

      if (error) {
        setConnections([]);
        setConnectionsLoading(false);
        toast({ title: "Error", description: "No se pudo cargar la lista." });
        return;
      }

      const relationRows = (followsData ?? []) as Array<Record<string, string | null>>;
      const ids = relationRows
        .map((row) => row[relationColumn] as string | null)
        .filter((id): id is string => Boolean(id));

      if (ids.length === 0) {
        setConnections([]);
        setConnectionSuggestions([]);
        setConnectionsLoading(false);
        return;
      }

      const [{ data: profilesData }, followingByMeSet, pendingByMeSet] = await Promise.all([
        supabase.from("profiles").select("id, username, full_name, avatar_url, is_private").in("id", ids),
        loadFollowStateByIds(ids),
        loadPendingFollowStateByIds(ids),
      ]);

      const byId = new Map((profilesData ?? []).map((profile) => [profile.id as string, profile]));
      const mapped = ids
        .map((id) => byId.get(id))
        .filter(Boolean)
        .map((profile) => ({
          id: profile!.id as string,
          username: (profile!.username as string) ?? "usuario",
          full_name: (profile!.full_name as string | null) ?? null,
          avatar_url: (profile!.avatar_url as string | null) ?? null,
          isPrivate: Boolean(profile!.is_private),
          isFollowingByMe: followingByMeSet.has(profile!.id as string) || profile!.id === userId,
          isFollowPendingByMe:
            profile!.id === userId ? false : !followingByMeSet.has(profile!.id as string) && pendingByMeSet.has(profile!.id as string),
        }));

      setConnections(mapped);

      if (userId) {
        const exclude = new Set([...ids, userId]);
        const { data: suggestionProfiles } = await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url, is_private")
          .neq("id", userId)
          .order("created_at", { ascending: false })
          .limit(30);

        const filteredSuggestions = (suggestionProfiles ?? [])
          .filter((row) => !exclude.has(row.id as string))
          .slice(0, 6);

        const suggestionIds = filteredSuggestions.map((row) => row.id as string);
        const [suggestionFollowing, suggestionPending] = await Promise.all([
          loadFollowStateByIds(suggestionIds),
          loadPendingFollowStateByIds(suggestionIds),
        ]);
        setConnectionSuggestions(
          filteredSuggestions
            .filter((row) => !suggestionFollowing.has(row.id as string) && !suggestionPending.has(row.id as string))
            .map((row) => ({
              id: row.id as string,
              username: (row.username as string) ?? "usuario",
              full_name: (row.full_name as string | null) ?? null,
              avatar_url: (row.avatar_url as string | null) ?? null,
              isPrivate: Boolean(row.is_private),
              isFollowingByMe: false,
              isFollowPendingByMe: false,
            })),
        );
      }

      setConnectionsLoading(false);
    },
    [loadFollowStateByIds, loadPendingFollowStateByIds, profileDataId, supabase, toast, userId],
  );

  const openConnectionsModal = useCallback(
    (type: "followers" | "following") => {
      setConnectionsType(type);
      setConnectionsQuery("");
      setConnectionActionLoadingById({});
      setConnectionsOpen(true);
      void loadConnections(type);
    },
    [loadConnections],
  );

  const normalizedConnectionsQuery = connectionsQuery.trim().toLowerCase();
  const filteredConnections = useMemo(() => {
    if (!normalizedConnectionsQuery) return connections;
    return connections.filter((row) => {
      const username = row.username.toLowerCase();
      const fullName = (row.full_name ?? "").toLowerCase();
      return username.includes(normalizedConnectionsQuery) || fullName.includes(normalizedConnectionsQuery);
    });
  }, [connections, normalizedConnectionsQuery]);

  const handleConnectionToggleFollow = useCallback(
    async (targetUserId: string, fromSuggestions = false) => {
      if (!supabase || !userId || !targetUserId || targetUserId === userId) return;
      const sourceSetter = fromSuggestions ? setConnectionSuggestions : setConnections;
      const sourceRows = fromSuggestions ? connectionSuggestions : connections;
      const target = sourceRows.find((row) => row.id === targetUserId);
      if (!target) return;

      const currentlyFollowing = target.isFollowingByMe;
      const currentlyPending = target.isFollowPendingByMe;
      setConnectionActionLoadingById((prev) => ({ ...prev, [targetUserId]: true }));
      if (currentlyFollowing) {
        sourceSetter((prev) =>
          prev.map((row) =>
            row.id === targetUserId ? { ...row, isFollowingByMe: false, isFollowPendingByMe: false } : row,
          ),
        );
      } else if (currentlyPending) {
        sourceSetter((prev) =>
          prev.map((row) =>
            row.id === targetUserId ? { ...row, isFollowingByMe: false, isFollowPendingByMe: false } : row,
          ),
        );
      } else if (target.isPrivate) {
        sourceSetter((prev) =>
          prev.map((row) =>
            row.id === targetUserId ? { ...row, isFollowingByMe: false, isFollowPendingByMe: true } : row,
          ),
        );
      } else {
        sourceSetter((prev) =>
          prev.map((row) =>
            row.id === targetUserId ? { ...row, isFollowingByMe: true, isFollowPendingByMe: false } : row,
          ),
        );
      }

      if (currentlyFollowing) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", userId)
          .eq("following_id", targetUserId);

        if (error) {
          sourceSetter((prev) =>
            prev.map((row) =>
              row.id === targetUserId
                ? { ...row, isFollowingByMe: currentlyFollowing, isFollowPendingByMe: currentlyPending }
                : row,
            ),
          );
          toast({ title: "Error", description: "No se pudo dejar de seguir." });
        } else if (connectionsType === "following" && isOwnProfile && !fromSuggestions) {
          setConnections((prev) => prev.filter((row) => row.id !== targetUserId));
          setFollowing((prev) => Math.max(0, prev - 1));
        }
      } else if (currentlyPending) {
        const { error } = await supabase
          .from("follow_requests")
          .update({ status: "canceled", resolved_at: new Date().toISOString() })
          .eq("requester_id", userId)
          .eq("target_id", targetUserId)
          .eq("status", "pending");

        if (error) {
          sourceSetter((prev) =>
            prev.map((row) =>
              row.id === targetUserId
                ? { ...row, isFollowingByMe: currentlyFollowing, isFollowPendingByMe: currentlyPending }
                : row,
            ),
          );
          toast({ title: "Error", description: "No se pudo cancelar la solicitud." });
        }
      } else if (target.isPrivate) {
        const { error } = await supabase.from("follow_requests").upsert(
          {
            requester_id: userId,
            target_id: targetUserId,
            status: "pending",
            resolved_at: null,
          },
          { onConflict: "requester_id,target_id" },
        );

        if (error) {
          sourceSetter((prev) =>
            prev.map((row) =>
              row.id === targetUserId
                ? { ...row, isFollowingByMe: currentlyFollowing, isFollowPendingByMe: currentlyPending }
                : row,
            ),
          );
          toast({ title: "Error", description: "No se pudo enviar la solicitud." });
        }
      } else {
        const { error } = await supabase.from("follows").insert({
          follower_id: userId,
          following_id: targetUserId,
        });

        if (error) {
          sourceSetter((prev) =>
            prev.map((row) =>
              row.id === targetUserId
                ? { ...row, isFollowingByMe: currentlyFollowing, isFollowPendingByMe: currentlyPending }
                : row,
            ),
          );
          toast({ title: "Error", description: "No se pudo seguir al usuario." });
        } else if (connectionsType === "following" && isOwnProfile && !fromSuggestions) {
          setFollowing((prev) => prev + 1);
        }
        if (!currentlyFollowing && !currentlyPending && fromSuggestions) {
          setConnectionSuggestions((prev) => prev.filter((row) => row.id !== targetUserId));
        }
      }

      setConnectionActionLoadingById((prev) => ({ ...prev, [targetUserId]: false }));
    },
    [
      connectionSuggestions,
      connections,
      connectionsType,
      isOwnProfile,
      setFollowing,
      supabase,
      toast,
      userId,
    ],
  );

  const handleRemoveFollower = useCallback(
    async (targetUserId: string) => {
      if (!supabase || !userId || !isOwnProfile || targetUserId === userId) return;
      const currentRows = connections;
      const targetRow = currentRows.find((row) => row.id === targetUserId);
      if (!targetRow) return;

      setConnectionActionLoadingById((prev) => ({ ...prev, [targetUserId]: true }));
      setConnections((prev) => prev.filter((row) => row.id !== targetUserId));
      setFollowers((prev) => Math.max(0, prev - 1));

      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", targetUserId)
        .eq("following_id", userId);

      if (error) {
        setConnections((prev) => [targetRow, ...prev]);
        setFollowers((prev) => prev + 1);
        toast({ title: "Error", description: "No se pudo eliminar este seguidor." });
      }

      setConnectionActionLoadingById((prev) => ({ ...prev, [targetUserId]: false }));
    },
    [connections, isOwnProfile, setFollowers, supabase, toast, userId],
  );

  return {
    connectionsOpen,
    setConnectionsOpen,
    connectionsType,
    connectionsLoading,
    connectionsQuery,
    setConnectionsQuery,
    connectionActionLoadingById,
    connectionSuggestions,
    filteredConnections,
    openConnectionsModal,
    handleConnectionToggleFollow,
    handleRemoveFollower,
  };
};
