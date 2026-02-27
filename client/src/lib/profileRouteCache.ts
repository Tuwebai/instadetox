import { supabase } from "@/lib/supabase";

export interface ProfileRouteSnapshot {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  isPrivate: boolean;
  postCount: number;
  followers: number;
  following: number;
  isFollowing: boolean;
  isFollowPending: boolean;
}

interface CacheEntry {
  snapshot: ProfileRouteSnapshot;
  cachedAt: number;
}

const PROFILE_ROUTE_CACHE_TTL_MS = 10 * 60 * 1000;
const profileRouteCache = new Map<string, CacheEntry>();
const inflightPrefetch = new Map<string, Promise<void>>();

const normalizeUsernameKey = (username: string) => username.trim().toLowerCase();

export const setProfileRouteSnapshot = (snapshot: ProfileRouteSnapshot) => {
  const key = normalizeUsernameKey(snapshot.username);
  profileRouteCache.set(key, { snapshot, cachedAt: Date.now() });
};

export const updateProfileRouteSnapshot = (
  username: string,
  updater: (snapshot: ProfileRouteSnapshot) => ProfileRouteSnapshot,
) => {
  const key = normalizeUsernameKey(username);
  if (!key) return;
  const entry = profileRouteCache.get(key);
  if (!entry) return;
  profileRouteCache.set(key, { snapshot: updater(entry.snapshot), cachedAt: Date.now() });
};

export const updateProfileRouteSnapshotByUserId = (
  userId: string,
  updater: (snapshot: ProfileRouteSnapshot) => ProfileRouteSnapshot,
) => {
  if (!userId) return;
  profileRouteCache.forEach((entry, key) => {
    if (entry.snapshot.id !== userId) return;
    profileRouteCache.set(key, { snapshot: updater(entry.snapshot), cachedAt: Date.now() });
  });
};

export const rekeyProfileRouteSnapshotByUserId = (userId: string, nextUsername: string) => {
  const nextKey = normalizeUsernameKey(nextUsername);
  if (!userId || !nextKey) return;

  let foundKey: string | null = null;
  let foundEntry: CacheEntry | null = null;
  profileRouteCache.forEach((entry, key) => {
    if (foundKey) return;
    if (entry.snapshot.id !== userId) return;
    foundKey = key;
    foundEntry = entry;
  });

  if (!foundKey || !foundEntry) return;
  const entry = foundEntry as CacheEntry;
  profileRouteCache.delete(foundKey);
  profileRouteCache.set(nextKey, {
    snapshot: { ...entry.snapshot, username: nextKey },
    cachedAt: Date.now(),
  });
};

export const getProfileRouteSnapshot = (username: string): ProfileRouteSnapshot | null => {
  const key = normalizeUsernameKey(username);
  const entry = profileRouteCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > PROFILE_ROUTE_CACHE_TTL_MS) {
    profileRouteCache.delete(key);
    return null;
  }
  return entry.snapshot;
};

export const prefetchProfileRouteSnapshot = async (username: string, currentUserId: string | null | undefined) => {
  const normalizedUsername = normalizeUsernameKey(username);
  if (!normalizedUsername || normalizedUsername === "inicio") return;
  if (!supabase) return;
  if (getProfileRouteSnapshot(normalizedUsername)) return;

  const existing = inflightPrefetch.get(normalizedUsername);
  if (existing) {
    await existing;
    return;
  }

  const run = (async () => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url, bio, is_private")
      .eq("username", normalizedUsername)
      .maybeSingle();

    if (!profile) return;

    const profileId = profile.id as string;
    const { data: headerData } = await supabase.rpc("get_profile_header_snapshot", {
      p_profile_id: profileId,
    });
    const headerRow = Array.isArray(headerData) ? headerData[0] : null;
    const isFollowing = Boolean(headerRow?.is_following);

    setProfileRouteSnapshot({
      id: profileId,
      username: ((profile.username as string | null) ?? normalizedUsername).toLowerCase(),
      full_name: (profile.full_name as string | null) ?? null,
      avatar_url: (profile.avatar_url as string | null) ?? null,
      bio: (profile.bio as string | null) ?? null,
      isPrivate: Boolean(profile.is_private),
      postCount: Number(headerRow?.post_count ?? 0),
      followers: Number(headerRow?.followers_count ?? 0),
      following: Number(headerRow?.following_count ?? 0),
      isFollowing,
      isFollowPending: !isFollowing && Boolean(headerRow?.is_follow_pending),
    });
  })()
    .catch(() => undefined)
    .finally(() => {
      inflightPrefetch.delete(normalizedUsername);
    });

  inflightPrefetch.set(normalizedUsername, run);
  await run;
};
