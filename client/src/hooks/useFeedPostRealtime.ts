import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { FeedPostCardRow } from "@/components/feed/feedPostTypes";
import type { RealtimePostgresChangesPayload, SupabaseClient } from "@supabase/supabase-js";

type FeedSetter = Dispatch<SetStateAction<FeedPostCardRow[]>>;

interface UseFeedPostRealtimeParams {
  supabaseClient: SupabaseClient | null;
  userId: string | null | undefined;
  setFeed: FeedSetter;
}

const mergePostUpdate = (
  current: FeedPostCardRow,
  payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
): FeedPostCardRow => {
  const next = payload.new as Partial<FeedPostCardRow>;
  return {
    ...current,
    likes_count: typeof next.likes_count === "number" ? next.likes_count : current.likes_count,
    comments_count: typeof next.comments_count === "number" ? next.comments_count : current.comments_count,
    hide_like_count: typeof next.hide_like_count === "boolean" ? next.hide_like_count : current.hide_like_count,
    comments_enabled: typeof next.comments_enabled === "boolean" ? next.comments_enabled : current.comments_enabled,
    caption: typeof next.caption === "string" ? next.caption : current.caption,
    media_url: typeof next.media_url === "string" || next.media_url === null ? next.media_url : current.media_url,
    mentions: Array.isArray(next.mentions) ? (next.mentions as string[]) : current.mentions,
  };
};

export const useFeedPostRealtime = ({ supabaseClient, userId, setFeed }: UseFeedPostRealtimeParams) => {
  useEffect(() => {
    if (!supabaseClient) return;

    const channel = supabaseClient
      .channel(`feed-posts-realtime-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "posts" },
        (payload) => {
          const updatedId = (payload.new as { id?: string })?.id;
          if (!updatedId) return;
          setFeed((prev) => prev.map((post) => (post.id === updatedId ? mergePostUpdate(post, payload) : post)));
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "posts" },
        (payload) => {
          const deletedId = (payload.old as { id?: string })?.id;
          if (!deletedId) return;
          setFeed((prev) => prev.filter((post) => post.id !== deletedId));
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "post_likes" },
        (payload) => {
          const row = (payload.eventType === "DELETE" ? payload.old : payload.new) as Record<string, unknown>;
          const postId = row.post_id as string | undefined;
          const actorId = row.user_id as string | undefined;
          if (!postId) return;
          
          // Ignoramos el evento si lo generó el propio usuario (ya cubierto por Optimistic UI)
          if (actorId && userId && actorId === userId) return;

          if (payload.eventType === "INSERT") {
            setFeed((prev) => prev.map((post) => post.id === postId ? { ...post, likes_count: post.likes_count + 1 } : post));
          } else if (payload.eventType === "DELETE") {
            setFeed((prev) => prev.map((post) => post.id === postId ? { ...post, likes_count: Math.max(0, post.likes_count - 1) } : post));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "post_comments" },
        (payload) => {
          const row = (payload.eventType === "DELETE" ? payload.old : payload.new) as Record<string, unknown>;
          const postId = row.post_id as string | undefined;
          const actorId = row.user_id as string | undefined;
          if (!postId) return;
          
          if (actorId && userId && actorId === userId) return;

          if (payload.eventType === "INSERT") {
            setFeed((prev) => prev.map((post) => post.id === postId ? { ...post, comments_count: post.comments_count + 1 } : post));
          } else if (payload.eventType === "DELETE") {
            setFeed((prev) => prev.map((post) => post.id === postId ? { ...post, comments_count: Math.max(0, post.comments_count - 1) } : post));
          }
        }
      )
      .subscribe();

    return () => {
      void supabaseClient.removeChannel(channel);
    };
  }, [setFeed, supabaseClient, userId]);
};
