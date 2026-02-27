import { useEffect } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { ProfileTab, TabPageState } from "@/hooks/useProfileTabsState";
import type { supabase as supabaseClient } from "@/lib/supabase";

interface RealtimeProfileRow {
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

interface RealtimePost {
  id: string;
  title: string | null;
  caption: string;
  media_url: string | null;
  mentions?: string[] | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
}

interface RealtimeModalComment {
  id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  likes_count: number;
  liked_by_me: boolean;
}

interface CachedProfile {
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface UseProfileRealtimeBridgeParams<
  TProfileRow extends RealtimeProfileRow,
  TPost extends RealtimePost,
  TModalComment extends RealtimeModalComment,
> {
  supabase: NonNullable<typeof supabaseClient> | null;
  profileDataId: string | null | undefined;
  modalPostId: string | null | undefined;
  userId: string | null | undefined;
  localFollowOpsRef: MutableRefObject<Set<string>>;
  hasPostLoaded: (postId: string) => boolean;
  ensureProfileCache: (profileId: string) => Promise<CachedProfile>;
  patchPostAcrossTabs: (postId: string, updater: (post: TPost) => TPost) => void;
  dedupeAndSortModalComments: (comments: TModalComment[]) => TModalComment[];
  setProfileData: Dispatch<SetStateAction<TProfileRow | null>>;
  setPostCount: Dispatch<SetStateAction<number>>;
  setTabState: Dispatch<SetStateAction<Record<ProfileTab, TabPageState<TPost>>>>;
  setModalCommentsByPost: Dispatch<SetStateAction<Record<string, TModalComment[]>>>;
  setFollowers: Dispatch<SetStateAction<number>>;
  setIsFollowing: Dispatch<SetStateAction<boolean>>;
  setIsFollowPending: Dispatch<SetStateAction<boolean>>;
  setFollowing: Dispatch<SetStateAction<number>>;
}

export const useProfileRealtimeBridge = <
  TProfileRow extends RealtimeProfileRow,
  TPost extends RealtimePost,
  TModalComment extends RealtimeModalComment,
>({
  supabase,
  profileDataId,
  modalPostId,
  userId,
  localFollowOpsRef,
  hasPostLoaded,
  ensureProfileCache,
  patchPostAcrossTabs,
  dedupeAndSortModalComments,
  setProfileData,
  setPostCount,
  setTabState,
  setModalCommentsByPost,
  setFollowers,
  setIsFollowing,
  setIsFollowPending,
  setFollowing,
}: UseProfileRealtimeBridgeParams<TProfileRow, TPost, TModalComment>) => {
  useEffect(() => {
    const client = supabase;
    if (!client || !profileDataId) return;

    const profileId = profileDataId;
    const channel = client.channel(`profile-realtime:${profileId}:${Date.now()}`);

    channel.on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${profileId}` },
      (payload) => {
        const next = payload.new as Record<string, unknown>;
        setProfileData((prev) =>
          prev
            ? {
                ...prev,
                username: (next.username as string) ?? prev.username,
                full_name: (next.full_name as string | null) ?? prev.full_name,
                avatar_url: (next.avatar_url as string | null) ?? prev.avatar_url,
                bio: (next.bio as string | null) ?? prev.bio,
              }
            : prev,
        );
      },
    );

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "posts", filter: `user_id=eq.${profileId}` },
      (payload) => {
        const eventType = payload.eventType;
        if (eventType === "INSERT") {
          const next = payload.new as Record<string, unknown>;
          const inserted = {
            id: next.id as string,
            title: (next.title as string | null) ?? null,
            caption: (next.caption as string) ?? "",
            media_url: (next.media_url as string | null) ?? null,
            mentions: (next.mentions as string[] | null) ?? null,
            likes_count: (next.likes_count as number) ?? 0,
            comments_count: (next.comments_count as number) ?? 0,
            created_at: (next.created_at as string) ?? new Date().toISOString(),
          } as TPost;

          setPostCount((prev) => prev + 1);
          setTabState((prev) => {
            const exists = prev.posts.items.some((post) => post.id === inserted.id);
            if (exists) return prev;
            return {
              ...prev,
              posts: {
                ...prev.posts,
                items: [inserted, ...prev.posts.items],
              },
            };
          });
          return;
        }

        if (eventType === "UPDATE") {
          const next = payload.new as Record<string, unknown>;
          const postId = next.id as string;
          patchPostAcrossTabs(postId, (post) => ({
            ...post,
            title: (next.title as string | null) ?? post.title,
            caption: (next.caption as string) ?? post.caption,
            media_url: (next.media_url as string | null) ?? post.media_url,
            mentions: (next.mentions as string[] | null) ?? post.mentions ?? null,
            created_at: (next.created_at as string) ?? post.created_at,
          }));
          return;
        }

        if (eventType === "DELETE") {
          const oldRow = payload.old as Record<string, unknown>;
          const postId = oldRow.id as string;
          setPostCount((prev) => Math.max(0, prev - 1));
          setTabState((prev) => {
            const next = { ...prev };
            (Object.keys(next) as ProfileTab[]).forEach((tab) => {
              next[tab] = {
                ...next[tab],
                items: next[tab].items.filter((post) => post.id !== postId),
              };
            });
            return next;
          });
          setModalCommentsByPost((prev) => {
            const next = { ...prev };
            delete next[postId];
            return next;
          });
        }
      },
    );

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "post_likes" },
      (payload) => {
        const eventType = payload.eventType;
        const row = (eventType === "DELETE" ? payload.old : payload.new) as Record<string, unknown>;
        const postId = row.post_id as string | undefined;
        const actorId = row.user_id as string | undefined;
        if (!postId) return;
        if (!hasPostLoaded(postId) && modalPostId !== postId) return;

        if (actorId && userId && actorId === userId) {
          return;
        }

        if (eventType === "INSERT") {
          patchPostAcrossTabs(postId, (post) => ({ ...post, likes_count: post.likes_count + 1 }));
        } else if (eventType === "DELETE") {
          patchPostAcrossTabs(postId, (post) => ({ ...post, likes_count: Math.max(0, post.likes_count - 1) }));
        }
      },
    );

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "post_comments" },
      async (payload) => {
        const eventType = payload.eventType;
        const row = (eventType === "DELETE" ? payload.old : payload.new) as Record<string, unknown>;
        const postId = row.post_id as string | undefined;
        if (!postId) return;
        if (!hasPostLoaded(postId) && modalPostId !== postId) return;

        const actorId = row.user_id as string | undefined;
        if (actorId && userId && actorId === userId) {
          return;
        }

        if (eventType === "INSERT") {
          patchPostAcrossTabs(postId, (post) => ({ ...post, comments_count: post.comments_count + 1 }));
          if (modalPostId === postId) {
            const incomingId = row.id as string | undefined;
            if (!incomingId) return;
            const profile = actorId ? await ensureProfileCache(actorId) : { username: "usuario", full_name: null, avatar_url: null };
            const incoming = {
              id: incomingId,
              user_id: actorId ?? "",
              parent_id: (row.parent_id as string | null) ?? null,
              content: (row.content as string) ?? "",
              created_at: (row.created_at as string) ?? new Date().toISOString(),
              username: profile.username,
              full_name: profile.full_name,
              avatar_url: profile.avatar_url,
              likes_count: 0,
              liked_by_me: Boolean(actorId && userId && actorId === userId),
            } as TModalComment;
            setModalCommentsByPost((prev) => {
              const current = prev[postId] ?? [];
              return { ...prev, [postId]: dedupeAndSortModalComments([...current, incoming]) };
            });
          }
          return;
        }

        if (eventType === "UPDATE") {
          if (modalPostId === postId) {
            setModalCommentsByPost((prev) => ({
              ...prev,
              [postId]: dedupeAndSortModalComments(
                (prev[postId] ?? []).map((comment) =>
                  comment.id === (row.id as string)
                    ? {
                        ...comment,
                        content: (row.content as string) ?? comment.content,
                        created_at: (row.created_at as string) ?? comment.created_at,
                      }
                    : comment,
                ),
              ),
            }));
          }
          return;
        }

        if (eventType === "DELETE") {
          patchPostAcrossTabs(postId, (post) => ({ ...post, comments_count: Math.max(0, post.comments_count - 1) }));
          if (modalPostId === postId) {
            setModalCommentsByPost((prev) => ({
              ...prev,
              [postId]: (prev[postId] ?? []).filter((comment) => comment.id !== (row.id as string)),
            }));
          }
        }
      },
    );

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "comment_likes" },
      (payload) => {
        const eventType = payload.eventType;
        const row = (eventType === "DELETE" ? payload.old : payload.new) as Record<string, unknown>;
        const commentId = row.comment_id as string | undefined;
        const actorId = row.user_id as string | undefined;
        if (!commentId) return;
        if (actorId && userId && actorId === userId) return;

        setModalCommentsByPost((prev) => {
          if (!modalPostId) return prev;
          const current = prev[modalPostId] ?? [];
          if (!current.some((comment) => comment.id === commentId)) return prev;
          return {
            ...prev,
            [modalPostId]: current.map((comment) => {
              if (comment.id !== commentId) return comment;
              if (eventType === "INSERT") {
                const likedByMe = actorId && userId ? actorId === userId : comment.liked_by_me;
                return {
                  ...comment,
                  likes_count: comment.likes_count + 1,
                  liked_by_me: likedByMe ? true : comment.liked_by_me,
                };
              }
              if (eventType === "DELETE") {
                const removeMine = actorId && userId ? actorId === userId : false;
                return {
                  ...comment,
                  likes_count: Math.max(0, comment.likes_count - 1),
                  liked_by_me: removeMine ? false : comment.liked_by_me,
                };
              }
              return comment;
            }),
          };
        });
      },
    );

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "follows" },
      (payload) => {
        const eventType = payload.eventType;
        const row = (eventType === "DELETE" ? payload.old : payload.new) as Record<string, unknown>;
        const followerId = row.follower_id as string | undefined;
        const followingId = row.following_id as string | undefined;
        if (!followerId || !followingId) return;
        const followOpKey = `${followerId}:${followingId}`;
        if (localFollowOpsRef.current.has(followOpKey)) {
          localFollowOpsRef.current.delete(followOpKey);
          return;
        }

        if (followingId === profileId) {
          setFollowers((prev) => (eventType === "INSERT" ? prev + 1 : Math.max(0, prev - 1)));
          if (userId && followerId === userId) {
            setIsFollowing(eventType === "INSERT");
            if (eventType === "INSERT") {
              setIsFollowPending(false);
            }
          }
        }

        if (followerId === profileId) {
          setFollowing((prev) => (eventType === "INSERT" ? prev + 1 : Math.max(0, prev - 1)));
        }
      },
    );

    if (userId) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "follow_requests", filter: `requester_id=eq.${userId}` },
        (payload) => {
          const row = (payload.eventType === "DELETE" ? payload.old : payload.new) as Record<string, unknown>;
          const targetId = row.target_id as string | undefined;
          if (!targetId || targetId !== profileId) return;
          const status = row.status as string | undefined;
          const isPending = payload.eventType !== "DELETE" && status === "pending";
          setIsFollowPending(isPending);
          if (!isPending) {
            setIsFollowing((prev) => (status === "accepted" ? true : prev));
          }
        },
      );
    }

    channel.subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [
    dedupeAndSortModalComments,
    ensureProfileCache,
    hasPostLoaded,
    localFollowOpsRef,
    modalPostId,
    patchPostAcrossTabs,
    profileDataId,
    setFollowers,
    setFollowing,
    setIsFollowPending,
    setIsFollowing,
    setModalCommentsByPost,
    setPostCount,
    setProfileData,
    setTabState,
    supabase,
    userId,
  ]);
};
