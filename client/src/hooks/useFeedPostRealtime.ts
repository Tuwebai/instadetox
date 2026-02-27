import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { FeedPostCardRow } from "@/components/feed/feedPostTypes";
import type { RealtimePostgresChangesPayload, SupabaseClient } from "@supabase/supabase-js";

type FeedSetter = Dispatch<SetStateAction<FeedPostCardRow[]>>;

interface UseFeedPostRealtimeParams {
  supabaseClient: SupabaseClient | null;
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

export const useFeedPostRealtime = ({ supabaseClient, setFeed }: UseFeedPostRealtimeParams) => {
  useEffect(() => {
    if (!supabaseClient) return;

    const channel = supabaseClient
      .channel("feed-posts-realtime")
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
      .subscribe();

    return () => {
      void supabaseClient.removeChannel(channel);
    };
  }, [setFeed, supabaseClient]);
};
