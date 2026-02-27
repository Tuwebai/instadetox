import { useCallback, useRef } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { supabase as supabaseClient } from "@/lib/supabase";

interface AuthLikeUser {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface CommentLikesCursor {
  createdAt: string;
  userId: string;
}

interface CommentLikeUser {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  isPrivate: boolean;
  isFollowingByMe: boolean;
  isFollowPendingByMe: boolean;
}

interface ModalCommentLikeTarget {
  id: string;
  liked_by_me: boolean;
  likes_count: number;
}

interface UseProfileCommentLikesActionsParams<TComment extends ModalCommentLikeTarget> {
  supabase: NonNullable<typeof supabaseClient> | null;
  user: AuthLikeUser | null;
  modalPostId: string | null | undefined;
  modalComments: TComment[];
  modalCommentActionBusyById: Record<string, boolean>;
  commentLikesModalOpen: boolean;
  commentLikesModalCommentId: string | null;
  commentLikesModalUsers: CommentLikeUser[];
  commentLikesModalActionBusyById: Record<string, boolean>;
  commentLikesModalActiveCommentIdRef: MutableRefObject<string | null>;
  setCommentLikesModalOpen: Dispatch<SetStateAction<boolean>>;
  setCommentLikesModalCommentId: Dispatch<SetStateAction<string | null>>;
  setCommentLikesModalUsers: Dispatch<SetStateAction<CommentLikeUser[]>>;
  setCommentLikesModalLoading: Dispatch<SetStateAction<boolean>>;
  setCommentLikesModalLoadingMore: Dispatch<SetStateAction<boolean>>;
  setCommentLikesModalHasMore: Dispatch<SetStateAction<boolean>>;
  setCommentLikesModalCursor: Dispatch<SetStateAction<CommentLikesCursor | null>>;
  setCommentLikesModalActionBusyById: Dispatch<SetStateAction<Record<string, boolean>>>;
  setModalCommentActionBusyById: Dispatch<SetStateAction<Record<string, boolean>>>;
  setModalCommentsByPost: Dispatch<SetStateAction<Record<string, TComment[]>>>;
  toast: (opts: { title: string; description: string }) => void;
}

export const useProfileCommentLikesActions = <TComment extends ModalCommentLikeTarget>({
  supabase,
  user,
  modalPostId,
  modalComments,
  modalCommentActionBusyById,
  commentLikesModalOpen,
  commentLikesModalCommentId,
  commentLikesModalUsers,
  commentLikesModalActionBusyById,
  commentLikesModalActiveCommentIdRef,
  setCommentLikesModalOpen,
  setCommentLikesModalCommentId,
  setCommentLikesModalUsers,
  setCommentLikesModalLoading,
  setCommentLikesModalLoadingMore,
  setCommentLikesModalHasMore,
  setCommentLikesModalCursor,
  setCommentLikesModalActionBusyById,
  setModalCommentActionBusyById,
  setModalCommentsByPost,
  toast,
}: UseProfileCommentLikesActionsParams<TComment>) => {
  const likesPageInFlightRef = useRef<Set<string>>(new Set());

  const loadCommentLikesModalPage = useCallback(
    async (commentId: string, cursor: CommentLikesCursor | null, options?: { append?: boolean }) => {
      if (!supabase) return;
      const isAppend = Boolean(options?.append);
      const requestKey = `${commentId}::${isAppend ? "append" : "initial"}::${cursor?.createdAt ?? "none"}::${cursor?.userId ?? "none"}`;
      if (likesPageInFlightRef.current.has(requestKey)) return;
      likesPageInFlightRef.current.add(requestKey);
      if (isAppend) {
        setCommentLikesModalLoadingMore(true);
      } else {
        setCommentLikesModalLoading(true);
        setCommentLikesModalUsers([]);
      }
      try {
        const pageSize = 30;
        let query = supabase
          .from("comment_likes")
          .select("user_id, created_at")
          .eq("comment_id", commentId)
          .order("created_at", { ascending: false })
          .order("user_id", { ascending: false })
          .limit(pageSize + 1);
        if (cursor) {
          query = query.or(
            `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},user_id.lt.${cursor.userId})`,
          );
        }
        const { data: likesRows, error: likesError } = await query;

        if (commentLikesModalActiveCommentIdRef.current !== commentId) {
          return;
        }

        if (likesError) {
          setCommentLikesModalLoading(false);
          setCommentLikesModalLoadingMore(false);
          toast({ title: "Error", description: "No se pudo cargar quienes dieron me gusta." });
          return;
        }

        const rawRows = likesRows ?? [];
        const hasMore = rawRows.length > pageSize;
        const pageRows = hasMore ? rawRows.slice(0, pageSize) : rawRows;
        const orderedUserIds = pageRows.map((row) => row.user_id as string).filter(Boolean);

        if (orderedUserIds.length === 0) {
          if (!isAppend) setCommentLikesModalUsers([]);
          setCommentLikesModalHasMore(false);
          setCommentLikesModalCursor(null);
          setCommentLikesModalLoading(false);
          setCommentLikesModalLoadingMore(false);
          return;
        }

        const [{ data: profilesData }, { data: followsData }, { data: pendingData }] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, username, full_name, avatar_url, is_private")
            .in("id", orderedUserIds),
          user?.id
            ? supabase.from("follows").select("following_id").eq("follower_id", user.id).in("following_id", orderedUserIds)
            : Promise.resolve({ data: [], error: null }),
          user?.id
            ? supabase
                .from("follow_requests")
                .select("target_id")
                .eq("requester_id", user.id)
                .eq("status", "pending")
                .in("target_id", orderedUserIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

        if (commentLikesModalActiveCommentIdRef.current !== commentId) {
          return;
        }

        const profileById = new Map(
          (profilesData ?? []).map((profile) => [
            profile.id as string,
            {
              username: (profile.username as string) ?? "usuario",
              full_name: (profile.full_name as string | null) ?? null,
              avatar_url: (profile.avatar_url as string | null) ?? null,
              is_private: Boolean(profile.is_private),
            },
          ]),
        );
        const followingSet = new Set((followsData ?? []).map((row) => row.following_id as string));
        const pendingSet = new Set((pendingData ?? []).map((row) => row.target_id as string));
        const mappedUsers: CommentLikeUser[] = orderedUserIds
          .map((id) => {
            const profile = profileById.get(id);
            if (!profile) return null;
            return {
              id,
              username: profile.username,
              full_name: profile.full_name,
              avatar_url: profile.avatar_url,
              isPrivate: Boolean(profile.is_private),
              isFollowingByMe: id === user?.id ? true : followingSet.has(id),
              isFollowPendingByMe: id === user?.id ? false : !followingSet.has(id) && pendingSet.has(id),
            } satisfies CommentLikeUser;
          })
          .filter((row): row is CommentLikeUser => row !== null);

        setCommentLikesModalUsers((prev) => {
          if (!isAppend) return mappedUsers;
          const byId = new Map(prev.map((item) => [item.id, item]));
          mappedUsers.forEach((item) => byId.set(item.id, item));
          return Array.from(byId.values());
        });
        const lastRow = pageRows.at(-1);
        setCommentLikesModalHasMore(hasMore);
        setCommentLikesModalCursor(
          hasMore && lastRow
            ? {
                createdAt: lastRow.created_at as string,
                userId: lastRow.user_id as string,
              }
            : null,
        );
        setCommentLikesModalLoading(false);
        setCommentLikesModalLoadingMore(false);
      } finally {
        likesPageInFlightRef.current.delete(requestKey);
      }
    },
    [
      commentLikesModalActiveCommentIdRef,
      likesPageInFlightRef,
      setCommentLikesModalCursor,
      setCommentLikesModalHasMore,
      setCommentLikesModalLoading,
      setCommentLikesModalLoadingMore,
      setCommentLikesModalUsers,
      supabase,
      toast,
      user?.id,
    ],
  );

  const handleOpenCommentLikesModal = useCallback(
    async (commentId: string) => {
      commentLikesModalActiveCommentIdRef.current = commentId;
      setCommentLikesModalOpen(true);
      setCommentLikesModalCommentId(commentId);
      setCommentLikesModalHasMore(false);
      setCommentLikesModalCursor(null);
      void loadCommentLikesModalPage(commentId, null, { append: false });
    },
    [
      commentLikesModalActiveCommentIdRef,
      loadCommentLikesModalPage,
      setCommentLikesModalCommentId,
      setCommentLikesModalCursor,
      setCommentLikesModalHasMore,
      setCommentLikesModalOpen,
    ],
  );

  const handleCommentLikesModalToggleFollow = useCallback(
    async (targetUserId: string) => {
      if (!supabase || !user?.id || targetUserId === user.id) return;
      const target = commentLikesModalUsers.find((row) => row.id === targetUserId);
      if (!target) return;
      if (commentLikesModalActionBusyById[targetUserId]) return;

      const currentlyFollowing = target.isFollowingByMe;
      const currentlyPending = target.isFollowPendingByMe;
      setCommentLikesModalActionBusyById((prev) => ({ ...prev, [targetUserId]: true }));
      if (currentlyFollowing) {
        setCommentLikesModalUsers((prev) =>
          prev.map((row) =>
            row.id === targetUserId ? { ...row, isFollowingByMe: false, isFollowPendingByMe: false } : row,
          ),
        );
      } else if (currentlyPending) {
        setCommentLikesModalUsers((prev) =>
          prev.map((row) =>
            row.id === targetUserId ? { ...row, isFollowingByMe: false, isFollowPendingByMe: false } : row,
          ),
        );
      } else if (target.isPrivate) {
        setCommentLikesModalUsers((prev) =>
          prev.map((row) =>
            row.id === targetUserId ? { ...row, isFollowingByMe: false, isFollowPendingByMe: true } : row,
          ),
        );
      } else {
        setCommentLikesModalUsers((prev) =>
          prev.map((row) =>
            row.id === targetUserId ? { ...row, isFollowingByMe: true, isFollowPendingByMe: false } : row,
          ),
        );
      }

      if (currentlyFollowing) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", targetUserId);
        if (error) {
          setCommentLikesModalUsers((prev) =>
            prev.map((row) =>
              row.id === targetUserId
                ? { ...row, isFollowingByMe: currentlyFollowing, isFollowPendingByMe: currentlyPending }
                : row,
            ),
          );
          toast({ title: "Error", description: "No se pudo dejar de seguir." });
        }
        setCommentLikesModalActionBusyById((prev) => ({ ...prev, [targetUserId]: false }));
        return;
      }

      if (currentlyPending) {
        const { error } = await supabase
          .from("follow_requests")
          .update({ status: "canceled", resolved_at: new Date().toISOString() })
          .eq("requester_id", user.id)
          .eq("target_id", targetUserId)
          .eq("status", "pending");
        if (error) {
          setCommentLikesModalUsers((prev) =>
            prev.map((row) =>
              row.id === targetUserId
                ? { ...row, isFollowingByMe: currentlyFollowing, isFollowPendingByMe: currentlyPending }
                : row,
            ),
          );
          toast({ title: "Error", description: "No se pudo cancelar la solicitud." });
        }
        setCommentLikesModalActionBusyById((prev) => ({ ...prev, [targetUserId]: false }));
        return;
      }

      if (target.isPrivate) {
        const { error } = await supabase.from("follow_requests").upsert(
          {
            requester_id: user.id,
            target_id: targetUserId,
            status: "pending",
            resolved_at: null,
          },
          { onConflict: "requester_id,target_id" },
        );
        if (error) {
          setCommentLikesModalUsers((prev) =>
            prev.map((row) =>
              row.id === targetUserId
                ? { ...row, isFollowingByMe: currentlyFollowing, isFollowPendingByMe: currentlyPending }
                : row,
            ),
          );
          toast({ title: "Error", description: "No se pudo enviar la solicitud." });
        }
        setCommentLikesModalActionBusyById((prev) => ({ ...prev, [targetUserId]: false }));
        return;
      }

      const { error } = await supabase.from("follows").insert({
        follower_id: user.id,
        following_id: targetUserId,
      });
      if (error) {
        setCommentLikesModalUsers((prev) =>
          prev.map((row) =>
            row.id === targetUserId
              ? { ...row, isFollowingByMe: currentlyFollowing, isFollowPendingByMe: currentlyPending }
              : row,
          ),
        );
        toast({ title: "Error", description: "No se pudo seguir al usuario." });
      }
      setCommentLikesModalActionBusyById((prev) => ({ ...prev, [targetUserId]: false }));
    },
    [
      commentLikesModalActionBusyById,
      commentLikesModalUsers,
      setCommentLikesModalActionBusyById,
      setCommentLikesModalUsers,
      supabase,
      toast,
      user?.id,
    ],
  );

  const handleToggleCommentLike = useCallback(
    async (commentId: string) => {
      if (!supabase || !user?.id) return;
      if (modalCommentActionBusyById[commentId]) return;

      const current = modalComments.find((comment) => comment.id === commentId);
      if (!current) return;
      const currentlyLiked = current.liked_by_me;

      setModalCommentActionBusyById((prev) => ({ ...prev, [commentId]: true }));
      setModalCommentsByPost((prev) => {
        if (!modalPostId) return prev;
        return {
          ...prev,
          [modalPostId]: (prev[modalPostId] ?? []).map((comment) =>
            comment.id === commentId
              ? {
                  ...comment,
                  liked_by_me: !currentlyLiked,
                  likes_count: currentlyLiked ? Math.max(0, comment.likes_count - 1) : comment.likes_count + 1,
                }
              : comment,
          ),
        };
      });
      if (commentLikesModalOpen && commentLikesModalCommentId === commentId && user) {
        if (currentlyLiked) {
          setCommentLikesModalUsers((prev) => prev.filter((row) => row.id !== user.id));
        } else {
          setCommentLikesModalUsers((prev) => {
            if (prev.some((row) => row.id === user.id)) return prev;
            return [
              {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                avatar_url: user.avatar_url || null,
                isPrivate: false,
                isFollowingByMe: true,
                isFollowPendingByMe: false,
              },
              ...prev,
            ];
          });
        }
      }

      if (currentlyLiked) {
        const { error } = await supabase
          .from("comment_likes")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", user.id);
        if (error) {
          setModalCommentsByPost((prev) => {
            if (!modalPostId) return prev;
            return {
              ...prev,
              [modalPostId]: (prev[modalPostId] ?? []).map((comment) =>
                comment.id === commentId
                  ? { ...comment, liked_by_me: true, likes_count: comment.likes_count + 1 }
                  : comment,
              ),
            };
          });
          if (commentLikesModalOpen && commentLikesModalCommentId === commentId && user) {
            setCommentLikesModalUsers((prev) => {
              if (prev.some((row) => row.id === user.id)) return prev;
              return [
                {
                  id: user.id,
                  username: user.username,
                  full_name: user.full_name,
                  avatar_url: user.avatar_url || null,
                  isPrivate: false,
                  isFollowingByMe: true,
                  isFollowPendingByMe: false,
                },
                ...prev,
              ];
            });
          }
          toast({ title: "Error", description: "No se pudo quitar like del comentario." });
        }
        setModalCommentActionBusyById((prev) => ({ ...prev, [commentId]: false }));
        return;
      }

      const { error } = await supabase
        .from("comment_likes")
        .upsert({ comment_id: commentId, user_id: user.id }, { onConflict: "comment_id,user_id", ignoreDuplicates: true });
      if (error) {
        setModalCommentsByPost((prev) => {
          if (!modalPostId) return prev;
          return {
            ...prev,
            [modalPostId]: (prev[modalPostId] ?? []).map((comment) =>
              comment.id === commentId
                ? { ...comment, liked_by_me: false, likes_count: Math.max(0, comment.likes_count - 1) }
                : comment,
            ),
          };
        });
        if (commentLikesModalOpen && commentLikesModalCommentId === commentId && user) {
          setCommentLikesModalUsers((prev) => prev.filter((row) => row.id !== user.id));
        }
        toast({ title: "Error", description: "No se pudo dar like al comentario." });
      }
      setModalCommentActionBusyById((prev) => ({ ...prev, [commentId]: false }));
    },
    [
      commentLikesModalCommentId,
      commentLikesModalOpen,
      modalCommentActionBusyById,
      modalComments,
      modalPostId,
      setCommentLikesModalUsers,
      setModalCommentActionBusyById,
      setModalCommentsByPost,
      supabase,
      toast,
      user,
      user?.id,
    ],
  );

  return {
    loadCommentLikesModalPage,
    handleOpenCommentLikesModal,
    handleCommentLikesModalToggleFollow,
    handleToggleCommentLike,
  };
};
