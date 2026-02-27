export interface PostRouteSnapshot {
  id: string;
  user_id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  title: string | null;
  caption: string;
  media_url: string | null;
  mentions: string[] | null;
  likes_count: number;
  comments_count: number;
  comments_enabled: boolean;
  created_at: string;
}

interface CacheEntry {
  snapshot: PostRouteSnapshot;
  cachedAt: number;
}

const POST_ROUTE_CACHE_TTL_MS = 5 * 60 * 1000;
const postRouteCache = new Map<string, CacheEntry>();

export const setPostRouteSnapshot = (snapshot: PostRouteSnapshot) => {
  postRouteCache.set(snapshot.id, { snapshot, cachedAt: Date.now() });
};

export const getPostRouteSnapshot = (postId: string): PostRouteSnapshot | null => {
  const entry = postRouteCache.get(postId);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > POST_ROUTE_CACHE_TTL_MS) {
    postRouteCache.delete(postId);
    return null;
  }
  return entry.snapshot;
};

