export interface FeedPostCardRow {
  id: string;
  user_id: string;
  type: string;
  title: string | null;
  caption: string;
  media_url: string | null;
  video_cover_url?: string | null;
  mentions?: string[] | null;
  hide_like_count?: boolean;
  comments_enabled?: boolean;
  likes_count: number;
  comments_count: number;
  created_at: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  feed_context?: "own" | "following" | "suggested" | null;
  likedByMe?: boolean;
}

export interface FeedPostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
}
