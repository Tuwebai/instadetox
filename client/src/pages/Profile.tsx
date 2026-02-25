import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { User, Grid3X3, Bookmark, UserSquare2, Heart, MessageCircle, X, ChevronLeft, ChevronRight, Settings, Upload, Trash2, Search as SearchIcon, Send } from "lucide-react";
import { Link, useRoute } from "wouter";
import { Glass } from "@/components/ui/glass";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import MentionText from "@/components/ui/mention-text";
import { useToast } from "@/hooks/use-toast";

interface ProfileRow {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

interface ProfilePost {
  id: string;
  title: string | null;
  caption: string;
  media_url: string | null;
  mentions?: string[] | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
}

interface ConnectionUser {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  isFollowingByMe: boolean;
}

interface ModalComment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface CachedProfile {
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

type ProfileTab = "posts" | "saved" | "tagged";

interface TabPageState {
  items: ProfilePost[];
  page: number;
  hasMore: boolean;
  loading: boolean;
  initialized: boolean;
}

interface TabPrefetchState {
  page: number;
  rows: ProfilePost[];
  hasMore: boolean;
}

const PAGE_SIZE = 18;
const AVATAR_BUCKET = "profile-avatars";

const createInitialTabState = (): Record<ProfileTab, TabPageState> => ({
  posts: { items: [], page: 0, hasMore: true, loading: false, initialized: false },
  saved: { items: [], page: 0, hasMore: true, loading: false, initialized: false },
  tagged: { items: [], page: 0, hasMore: true, loading: false, initialized: false },
});

const createInitialPrefetchState = (): Record<ProfileTab, TabPrefetchState | null> => ({
  posts: null,
  saved: null,
  tagged: null,
});

const createInitialPrefetchingState = (): Record<ProfileTab, boolean> => ({
  posts: false,
  saved: false,
  tagged: false,
});

const formatCompact = (value: number) =>
  new Intl.NumberFormat("es-AR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Math.max(0, value));

const isVideoUrl = (mediaUrl: string | null) => {
  if (!mediaUrl) return false;
  return /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(mediaUrl) || mediaUrl.includes(".m3u8");
};

const parseMediaList = (mediaUrl: string | null): string[] => {
  if (!mediaUrl) return [];
  const raw = mediaUrl.trim();
  if (!raw) return [];

  if (raw.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => {
            if (typeof item === "string") return item.trim();
            if (
              item &&
              typeof item === "object" &&
              "url" in item &&
              typeof (item as { url: unknown }).url === "string"
            ) {
              return (item as { url: string }).url.trim();
            }
            return "";
          })
          .filter(Boolean);
      }
    } catch {
      // fallback
    }
  }

  return raw
    .split(/[\n,|]/g)
    .map((item) => item.trim())
    .filter(Boolean);
};

const parseStoragePathFromPublicUrl = (url: string | null): { bucket: string; path: string } | null => {
  if (!url) return null;
  const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/i);
  if (!match) return null;
  const [, bucket, rawPath] = match;
  return { bucket, path: decodeURIComponent(rawPath) };
};

const sanitizeFileName = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const formatRelativeTime = (isoDate: string) => {
  const now = Date.now();
  const at = new Date(isoDate).getTime();
  const diffMs = Math.max(0, now - at);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return "ahora";
  if (diffMs < hour) return `hace ${Math.floor(diffMs / minute)} min`;
  if (diffMs < day) return `hace ${Math.floor(diffMs / hour)} h`;
  return `hace ${Math.floor(diffMs / day)} d`;
};

const Profile = () => {
  const { user, updateUserProfile } = useAuth();
  const { toast } = useToast();
  const [isPublicRouteMatch, params] = useRoute<{ username: string }>("/:username");
  const [profileData, setProfileData] = useState<ProfileRow | null>(null);
  const [tabState, setTabState] = useState<Record<ProfileTab, TabPageState>>(() => createInitialTabState());
  const [postCount, setPostCount] = useState(0);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");
  const [detoxDays, setDetoxDays] = useState(0);
  const [modalIndex, setModalIndex] = useState<number | null>(null);
  const [isAvatarOptionsOpen, setIsAvatarOptionsOpen] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [connectionsOpen, setConnectionsOpen] = useState(false);
  const [connectionsType, setConnectionsType] = useState<"followers" | "following">("followers");
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [connectionsQuery, setConnectionsQuery] = useState("");
  const [connections, setConnections] = useState<ConnectionUser[]>([]);
  const [connectionActionLoadingById, setConnectionActionLoadingById] = useState<Record<string, boolean>>({});
  const [connectionSuggestions, setConnectionSuggestions] = useState<ConnectionUser[]>([]);
  const [modalCommentsByPost, setModalCommentsByPost] = useState<Record<string, ModalComment[]>>({});
  const [modalCommentsLoading, setModalCommentsLoading] = useState(false);
  const [modalCommentInput, setModalCommentInput] = useState("");
  const [modalLikeBusy, setModalLikeBusy] = useState(false);
  const [modalLikedByMe, setModalLikedByMe] = useState(false);
  const [modalSaveBusy, setModalSaveBusy] = useState(false);
  const [modalSavedByMe, setModalSavedByMe] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const modalCommentInputRef = useRef<HTMLInputElement | null>(null);
  const tabStateRef = useRef<Record<ProfileTab, TabPageState>>(createInitialTabState());
  const prefetchedPageRef = useRef<Record<ProfileTab, TabPrefetchState | null>>(createInitialPrefetchState());
  const prefetchingRef = useRef<Record<ProfileTab, boolean>>(createInitialPrefetchingState());
  const profileCacheRef = useRef<Map<string, CachedProfile>>(new Map());

  const targetUsername = useMemo(() => {
    if (isPublicRouteMatch && params?.username) return params.username;
    return user?.username ?? null;
  }, [isPublicRouteMatch, params?.username, user?.username]);

  const isOwnProfile = Boolean(profileData?.id && user?.id && profileData.id === user.id);

  useEffect(() => {
    tabStateRef.current = tabState;
  }, [tabState]);

  const fetchTabPage = useCallback(
    async (tab: ProfileTab, profileId: string, username: string, page: number): Promise<ProfilePost[]> => {
      if (!supabase) return [];

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      if (tab === "posts") {
        const { data } = await supabase
          .from("posts")
          .select("id, title, caption, media_url, mentions, likes_count, comments_count, created_at")
          .eq("user_id", profileId)
          .order("created_at", { ascending: false })
          .range(from, to);
        return (data ?? []) as ProfilePost[];
      }

      if (tab === "saved") {
        const { data } = await supabase
          .from("saved_posts")
          .select("created_at, posts:post_id(id, title, caption, media_url, mentions, likes_count, comments_count, created_at)")
          .eq("user_id", profileId)
          .order("created_at", { ascending: false })
          .range(from, to);

        return (data ?? []).flatMap((row) => {
          const joined = row.posts;
          if (!joined) return [];
          if (Array.isArray(joined)) return joined as ProfilePost[];
          return [joined as ProfilePost];
        });
      }

      const { data } = await supabase
        .from("posts")
        .select("id, title, caption, media_url, mentions, likes_count, comments_count, created_at")
        .contains("mentions", [username.toLowerCase()])
        .order("created_at", { ascending: false })
        .range(from, to);

      return (data ?? []) as ProfilePost[];
    },
    [],
  );

  const loadTabPage = useCallback(
    async (tab: ProfileTab, opts?: { reset?: boolean }) => {
      if (!profileData?.id || !targetUsername) return;
      const reset = opts?.reset ?? false;
      const current = tabStateRef.current[tab];
      if (!reset && (current.loading || !current.hasMore)) return;

      const nextPage = reset ? 0 : current.page;
      const prefetched = prefetchedPageRef.current[tab];
      const canUsePrefetched = !reset && prefetched?.page === nextPage;

      setTabState((prev) => ({
        ...prev,
        [tab]: {
          ...prev[tab],
          loading: true,
          ...(reset ? { items: [], page: 0, hasMore: true, initialized: false } : {}),
        },
      }));

      try {
        const rows = canUsePrefetched
          ? (prefetched?.rows ?? [])
          : await fetchTabPage(tab, profileData.id, targetUsername, nextPage);
        const hasMore = canUsePrefetched ? Boolean(prefetched?.hasMore) : rows.length === PAGE_SIZE;
        if (canUsePrefetched) {
          prefetchedPageRef.current[tab] = null;
        }

        setTabState((prev) => {
          const base = reset ? [] : prev[tab].items;
          const mergedMap = new Map<string, ProfilePost>();
          for (const item of base) mergedMap.set(item.id, item);
          for (const item of rows) mergedMap.set(item.id, item);

          return {
            ...prev,
            [tab]: {
              items: Array.from(mergedMap.values()),
              page: reset ? 1 : prev[tab].page + 1,
              hasMore,
              loading: false,
              initialized: true,
            },
          };
        });
      } catch {
        setTabState((prev) => ({
          ...prev,
          [tab]: {
            ...prev[tab],
            loading: false,
            initialized: true,
            hasMore: false,
          },
        }));
      }
    },
    [fetchTabPage, profileData?.id, targetUsername],
  );

  const prefetchNextPage = useCallback(
    async (tab: ProfileTab) => {
      if (!profileData?.id || !targetUsername) return;
      const state = tabStateRef.current[tab];
      if (!state.initialized || state.loading || !state.hasMore) return;
      if (prefetchingRef.current[tab]) return;

      const nextPage = state.page;
      const existing = prefetchedPageRef.current[tab];
      if (existing?.page === nextPage) return;

      prefetchingRef.current[tab] = true;
      try {
        const rows = await fetchTabPage(tab, profileData.id, targetUsername, nextPage);
        prefetchedPageRef.current[tab] = {
          page: nextPage,
          rows,
          hasMore: rows.length === PAGE_SIZE,
        };
      } catch {
        prefetchedPageRef.current[tab] = null;
      } finally {
        prefetchingRef.current[tab] = false;
      }
    },
    [fetchTabPage, profileData?.id, targetUsername],
  );

  const loadFollowStateByIds = useCallback(
    async (ids: string[]): Promise<Set<string>> => {
      if (!supabase || !user?.id || ids.length === 0) return new Set();
      const uniqueIds = Array.from(new Set(ids.filter((id) => id !== user.id)));
      if (uniqueIds.length === 0) return new Set();

      const { data } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id)
        .in("following_id", uniqueIds);

      return new Set((data ?? []).map((row) => row.following_id as string));
    },
    [user?.id],
  );

  const loadConnections = useCallback(
    async (type: "followers" | "following") => {
      if (!supabase || !profileData?.id) return;
      setConnectionsLoading(true);

      const relationColumn = type === "followers" ? "follower_id" : "following_id";
      const filterColumn = type === "followers" ? "following_id" : "follower_id";

      const { data: followsData, error } = await supabase
        .from("follows")
        .select(`${relationColumn}, created_at`)
        .eq(filterColumn, profileData.id)
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

      const [{ data: profilesData }, followingByMeSet] = await Promise.all([
        supabase.from("profiles").select("id, username, full_name, avatar_url").in("id", ids),
        loadFollowStateByIds(ids),
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
          isFollowingByMe: followingByMeSet.has(profile!.id as string) || profile!.id === user?.id,
        }));

      setConnections(mapped);

      if (user?.id) {
        const exclude = new Set([...ids, user.id]);
        const { data: suggestionProfiles } = await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url")
          .neq("id", user.id)
          .order("created_at", { ascending: false })
          .limit(30);

        const filteredSuggestions = (suggestionProfiles ?? [])
          .filter((row) => !exclude.has(row.id as string))
          .slice(0, 6);

        const suggestionIds = filteredSuggestions.map((row) => row.id as string);
        const suggestionFollowing = await loadFollowStateByIds(suggestionIds);
        setConnectionSuggestions(
          filteredSuggestions
            .filter((row) => !suggestionFollowing.has(row.id as string))
            .map((row) => ({
              id: row.id as string,
              username: (row.username as string) ?? "usuario",
              full_name: (row.full_name as string | null) ?? null,
              avatar_url: (row.avatar_url as string | null) ?? null,
              isFollowingByMe: false,
            })),
        );
      }

      setConnectionsLoading(false);
    },
    [loadFollowStateByIds, profileData?.id, toast, user?.id],
  );

  const openConnectionsModal = (type: "followers" | "following") => {
    setConnectionsType(type);
    setConnectionsQuery("");
    setConnectionActionLoadingById({});
    setConnectionsOpen(true);
    void loadConnections(type);
  };

  useEffect(() => {
    const loadProfile = async () => {
      if (!supabase || !targetUsername || !user?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, bio")
        .eq("username", targetUsername)
        .maybeSingle();

      if (profileError || !profile) {
        setProfileData(null);
        setTabState(createInitialTabState());
        prefetchedPageRef.current = createInitialPrefetchState();
        prefetchingRef.current = createInitialPrefetchingState();
        setPostCount(0);
        setFollowers(0);
        setFollowing(0);
        setIsFollowing(false);
        setLoading(false);
        return;
      }

      const profileId = profile.id as string;
      setProfileData(profile as ProfileRow);

      const [postsCountRes, followersRes, followingRes, followRes] = await Promise.all([
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", profileId),
        supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", profileId),
        supabase.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", profileId),
        user.id === profileId
          ? Promise.resolve({ data: null, error: null })
          : supabase
              .from("follows")
              .select("follower_id")
              .eq("follower_id", user.id)
              .eq("following_id", profileId)
              .maybeSingle(),
      ]);

      setPostCount(postsCountRes.count ?? 0);
      setFollowers(followersRes.count ?? 0);
      setFollowing(followingRes.count ?? 0);
      setIsFollowing(Boolean(followRes?.data));
      setTabState(createInitialTabState());
      prefetchedPageRef.current = createInitialPrefetchState();
      prefetchingRef.current = createInitialPrefetchingState();
      setActiveTab("posts");
      setLoading(false);
    };

    void loadProfile();
  }, [targetUsername, user?.id]);

  useEffect(() => {
    if (!profileData?.id || !targetUsername) return;
    const current = tabState[activeTab];
    if (current.initialized || current.loading) return;
    void loadTabPage(activeTab, { reset: true });
  }, [activeTab, loadTabPage, profileData?.id, tabState, targetUsername]);

  useEffect(() => {
    if (!profileData?.id || !targetUsername) return;
    const current = tabState[activeTab];
    if (!current.initialized || current.loading || !current.hasMore) return;
    void prefetchNextPage(activeTab);
  }, [activeTab, prefetchNextPage, profileData?.id, tabState, targetUsername]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !profileData?.id || !targetUsername) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        const state = tabStateRef.current[activeTab];
        if (!state.initialized || state.loading || !state.hasMore) return;
        void loadTabPage(activeTab);
      },
      { rootMargin: "320px 0px 320px 0px" },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [activeTab, loadTabPage, profileData?.id, targetUsername]);

  useEffect(() => {
    const stored = window.localStorage.getItem("detoxDays");
    const days = stored ? Number.parseInt(stored, 10) : 0;
    setDetoxDays(Number.isFinite(days) ? Math.max(0, days) : 0);
  }, []);

  const activeTabPosts = tabState[activeTab].items;
  const normalizedConnectionsQuery = connectionsQuery.trim().toLowerCase();
  const filteredConnections = useMemo(() => {
    if (!normalizedConnectionsQuery) return connections;
    return connections.filter((row) => {
      const username = row.username.toLowerCase();
      const fullName = (row.full_name ?? "").toLowerCase();
      return username.includes(normalizedConnectionsQuery) || fullName.includes(normalizedConnectionsQuery);
    });
  }, [connections, normalizedConnectionsQuery]);

  const modalPost = modalIndex !== null ? activeTabPosts[modalIndex] ?? null : null;
  const modalComments = modalPost ? modalCommentsByPost[modalPost.id] ?? [] : [];

  const patchPostAcrossTabs = useCallback((postId: string, updater: (post: ProfilePost) => ProfilePost) => {
    setTabState((prev) => {
      const next = { ...prev };
      (Object.keys(next) as ProfileTab[]).forEach((tab) => {
        next[tab] = {
          ...next[tab],
          items: next[tab].items.map((post) => (post.id === postId ? updater(post) : post)),
        };
      });
      return next;
    });
  }, []);

  const hasPostLoaded = useCallback((postId: string) => {
    const tabs = tabStateRef.current;
    return (Object.keys(tabs) as ProfileTab[]).some((tab) => tabs[tab].items.some((post) => post.id === postId));
  }, []);

  const ensureProfileCache = useCallback(
    async (profileId: string): Promise<CachedProfile> => {
      const cached = profileCacheRef.current.get(profileId);
      if (cached) return cached;

      if (!supabase) {
        const fallback: CachedProfile = { username: "usuario", full_name: null, avatar_url: null };
        profileCacheRef.current.set(profileId, fallback);
        return fallback;
      }

      const { data } = await supabase
        .from("profiles")
        .select("username, full_name, avatar_url")
        .eq("id", profileId)
        .maybeSingle();

      const resolved: CachedProfile = {
        username: (data?.username as string) ?? "usuario",
        full_name: (data?.full_name as string | null) ?? null,
        avatar_url: (data?.avatar_url as string | null) ?? null,
      };
      profileCacheRef.current.set(profileId, resolved);
      return resolved;
    },
    [],
  );

  const loadModalPostState = useCallback(
    async (postId: string) => {
      if (!supabase) return;
      setModalCommentsLoading(true);

      const commentsPromise = supabase
        .from("post_comments")
        .select("id, user_id, content, created_at")
        .eq("post_id", postId)
        .order("created_at", { ascending: true })
        .limit(80);

      const likedPromise =
        user?.id
          ? supabase.from("post_likes").select("post_id").eq("post_id", postId).eq("user_id", user.id).maybeSingle()
          : Promise.resolve({ data: null, error: null });
      const savedPromise =
        user?.id
          ? supabase.from("saved_posts").select("post_id").eq("post_id", postId).eq("user_id", user.id).maybeSingle()
          : Promise.resolve({ data: null, error: null });

      const [commentsRes, likedRes, savedRes] = await Promise.all([commentsPromise, likedPromise, savedPromise]);
      setModalLikedByMe(Boolean(likedRes?.data));
      setModalSavedByMe(Boolean(savedRes?.data));

      const rawComments = commentsRes.data ?? [];
      if (rawComments.length === 0) {
        setModalCommentsByPost((prev) => ({ ...prev, [postId]: [] }));
        setModalCommentsLoading(false);
        return;
      }

      const userIds = Array.from(new Set(rawComments.map((row) => row.user_id as string)));
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .in("id", userIds);

      const profileMap = new Map((profilesData ?? []).map((profile) => [profile.id as string, profile]));
      const mapped: ModalComment[] = rawComments.map((row) => {
        const profile = profileMap.get(row.user_id as string);
        return {
          id: row.id as string,
          user_id: row.user_id as string,
          content: row.content as string,
          created_at: row.created_at as string,
          username: (profile?.username as string) ?? "usuario",
          full_name: (profile?.full_name as string | null) ?? null,
          avatar_url: (profile?.avatar_url as string | null) ?? null,
        };
      });

      setModalCommentsByPost((prev) => ({ ...prev, [postId]: mapped }));
      setModalCommentsLoading(false);
    },
    [user?.id],
  );

  const handleModalToggleLike = async () => {
    if (!supabase || !user?.id || !modalPost || modalLikeBusy) return;
    const currentlyLiked = modalLikedByMe;
    setModalLikeBusy(true);
    setModalLikedByMe(!currentlyLiked);
    patchPostAcrossTabs(modalPost.id, (post) => ({
      ...post,
      likes_count: currentlyLiked ? Math.max(0, post.likes_count - 1) : post.likes_count + 1,
    }));

    if (currentlyLiked) {
      const { error } = await supabase.from("post_likes").delete().eq("post_id", modalPost.id).eq("user_id", user.id);
      if (error) {
        setModalLikedByMe(true);
        patchPostAcrossTabs(modalPost.id, (post) => ({ ...post, likes_count: post.likes_count + 1 }));
        toast({ title: "Error", description: "No se pudo quitar el like." });
      }
      setModalLikeBusy(false);
      return;
    }

    const { error } = await supabase
      .from("post_likes")
      .upsert({ post_id: modalPost.id, user_id: user.id }, { onConflict: "post_id,user_id", ignoreDuplicates: true });
    if (error) {
      setModalLikedByMe(false);
      patchPostAcrossTabs(modalPost.id, (post) => ({ ...post, likes_count: Math.max(0, post.likes_count - 1) }));
      toast({ title: "Error", description: "No se pudo dar like." });
    }
    setModalLikeBusy(false);
  };

  const handleModalToggleSave = async () => {
    if (!supabase || !user?.id || !modalPost || modalSaveBusy) return;
    const currentlySaved = modalSavedByMe;
    setModalSaveBusy(true);
    setModalSavedByMe(!currentlySaved);

    if (currentlySaved) {
      const { error } = await supabase.from("saved_posts").delete().eq("post_id", modalPost.id).eq("user_id", user.id);
      if (error) {
        setModalSavedByMe(true);
        toast({ title: "Error", description: "No se pudo quitar de guardados." });
      } else if (isOwnProfile) {
        setTabState((prev) => ({
          ...prev,
          saved: { ...prev.saved, initialized: false, hasMore: true, page: 0, items: [] },
        }));
      }
      setModalSaveBusy(false);
      return;
    }

    const { error } = await supabase.from("saved_posts").insert({ post_id: modalPost.id, user_id: user.id });
    if (error) {
      setModalSavedByMe(false);
      toast({ title: "Error", description: "No se pudo guardar la publicacion." });
    } else if (isOwnProfile) {
      // Refresca pestaña guardados del perfil propio para reflejar persistencia real.
      setTabState((prev) => ({
        ...prev,
        saved: { ...prev.saved, initialized: false, hasMore: true, page: 0, items: [] },
      }));
    }
    setModalSaveBusy(false);
  };

  const handleModalShare = async () => {
    if (!modalPost || !profileData?.username) return;
    const shareUrl = `${window.location.origin}/${profileData.username}?post=${modalPost.id}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = shareUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      toast({ title: "Enlace copiado", description: "Listo para compartir." });
    } catch {
      toast({ title: "Error", description: "No se pudo copiar el enlace." });
    }
  };

  const focusModalCommentInput = () => {
    modalCommentInputRef.current?.focus();
  };

  const handleModalSubmitComment = async () => {
    if (!supabase || !user?.id || !modalPost) return;
    const content = modalCommentInput.trim();
    if (!content) return;

    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticComment: ModalComment = {
      id: optimisticId,
      user_id: user.id,
      content,
      created_at: new Date().toISOString(),
      username: user.username,
      full_name: user.full_name,
      avatar_url: user.avatar_url || null,
    };

    setModalCommentInput("");
    setModalCommentsByPost((prev) => ({
      ...prev,
      [modalPost.id]: [...(prev[modalPost.id] ?? []), optimisticComment],
    }));
    patchPostAcrossTabs(modalPost.id, (post) => ({ ...post, comments_count: post.comments_count + 1 }));

    const { data, error } = await supabase
      .from("post_comments")
      .insert({ post_id: modalPost.id, user_id: user.id, content })
      .select("id, user_id, content, created_at")
      .maybeSingle();

    if (error || !data) {
      setModalCommentsByPost((prev) => ({
        ...prev,
        [modalPost.id]: (prev[modalPost.id] ?? []).filter((comment) => comment.id !== optimisticId),
      }));
      patchPostAcrossTabs(modalPost.id, (post) => ({ ...post, comments_count: Math.max(0, post.comments_count - 1) }));
      toast({ title: "Error", description: "No se pudo publicar el comentario." });
      return;
    }

    setModalCommentsByPost((prev) => ({
      ...prev,
      [modalPost.id]: (prev[modalPost.id] ?? []).map((comment) =>
        comment.id === optimisticId
          ? {
              ...comment,
              id: data.id as string,
              created_at: data.created_at as string,
            }
          : comment,
      ),
    }));
  };

  useEffect(() => {
    if (modalIndex === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setModalIndex(null);
      if (event.key === "ArrowLeft") {
        setModalIndex((prev) => {
          if (prev === null || activeTabPosts.length === 0) return prev;
          return (prev - 1 + activeTabPosts.length) % activeTabPosts.length;
        });
      }
      if (event.key === "ArrowRight") {
        setModalIndex((prev) => {
          if (prev === null || activeTabPosts.length === 0) return prev;
          return (prev + 1) % activeTabPosts.length;
        });
      }
    };
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [modalIndex, activeTabPosts.length]);

  useEffect(() => {
    if (!modalPost?.id) return;
    setModalCommentInput("");
    void loadModalPostState(modalPost.id);
  }, [loadModalPostState, modalPost?.id]);

  useEffect(() => {
    const client = supabase;
    if (!client || !profileData?.id) return;

    const profileId = profileData.id;
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
          const inserted: ProfilePost = {
            id: next.id as string,
            title: (next.title as string | null) ?? null,
            caption: (next.caption as string) ?? "",
            media_url: (next.media_url as string | null) ?? null,
            mentions: (next.mentions as string[] | null) ?? null,
            likes_count: (next.likes_count as number) ?? 0,
            comments_count: (next.comments_count as number) ?? 0,
            created_at: (next.created_at as string) ?? new Date().toISOString(),
          };

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
        if (!hasPostLoaded(postId) && modalPost?.id !== postId) return;

        if (actorId && user?.id && actorId === user.id) {
          // acciones locales ya aplicadas optimistamente
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
        if (!hasPostLoaded(postId) && modalPost?.id !== postId) return;

        const actorId = row.user_id as string | undefined;
        if (actorId && user?.id && actorId === user.id) {
          // comentario local optimista ya aplicado
          return;
        }

        if (eventType === "INSERT") {
          patchPostAcrossTabs(postId, (post) => ({ ...post, comments_count: post.comments_count + 1 }));
          if (modalPost?.id === postId) {
            const profile = actorId ? await ensureProfileCache(actorId) : { username: "usuario", full_name: null, avatar_url: null };
            const incoming: ModalComment = {
              id: (row.id as string) ?? `rt-${Date.now()}`,
              user_id: actorId ?? "",
              content: (row.content as string) ?? "",
              created_at: (row.created_at as string) ?? new Date().toISOString(),
              username: profile.username,
              full_name: profile.full_name,
              avatar_url: profile.avatar_url,
            };
            setModalCommentsByPost((prev) => {
              const current = prev[postId] ?? [];
              if (current.some((comment) => comment.id === incoming.id)) return prev;
              return { ...prev, [postId]: [...current, incoming] };
            });
          }
          return;
        }

        if (eventType === "UPDATE") {
          if (modalPost?.id === postId) {
            setModalCommentsByPost((prev) => ({
              ...prev,
              [postId]: (prev[postId] ?? []).map((comment) =>
                comment.id === (row.id as string)
                  ? {
                      ...comment,
                      content: (row.content as string) ?? comment.content,
                      created_at: (row.created_at as string) ?? comment.created_at,
                    }
                  : comment,
              ),
            }));
          }
          return;
        }

        if (eventType === "DELETE") {
          patchPostAcrossTabs(postId, (post) => ({ ...post, comments_count: Math.max(0, post.comments_count - 1) }));
          if (modalPost?.id === postId) {
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
      { event: "*", schema: "public", table: "follows" },
      (payload) => {
        const eventType = payload.eventType;
        const row = (eventType === "DELETE" ? payload.old : payload.new) as Record<string, unknown>;
        const followerId = row.follower_id as string | undefined;
        const followingId = row.following_id as string | undefined;
        if (!followerId || !followingId) return;

        if (followingId === profileId) {
          setFollowers((prev) => (eventType === "INSERT" ? prev + 1 : Math.max(0, prev - 1)));
          if (user?.id && followerId === user.id) {
            setIsFollowing(eventType === "INSERT");
          }
        }

        if (followerId === profileId) {
          setFollowing((prev) => (eventType === "INSERT" ? prev + 1 : Math.max(0, prev - 1)));
        }
      },
    );

    channel.subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [ensureProfileCache, hasPostLoaded, modalPost?.id, patchPostAcrossTabs, profileData?.id, user?.id]);

  const handleToggleFollow = async () => {
    if (!supabase || !user?.id || !profileData || isOwnProfile) return;

    setFollowLoading(true);
    const currentlyFollowing = isFollowing;

    setIsFollowing(!currentlyFollowing);
    setFollowers((prev) => (currentlyFollowing ? Math.max(0, prev - 1) : prev + 1));

    if (currentlyFollowing) {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", profileData.id);

      if (error) {
        setIsFollowing(true);
        setFollowers((prev) => prev + 1);
      }
    } else {
      const { error } = await supabase.from("follows").insert({
        follower_id: user.id,
        following_id: profileData.id,
      });

      if (error) {
        setIsFollowing(false);
        setFollowers((prev) => Math.max(0, prev - 1));
      }
    }

    setFollowLoading(false);
  };

  const handleConnectionToggleFollow = async (targetUserId: string, fromSuggestions = false) => {
    if (!supabase || !user?.id || !targetUserId || targetUserId === user.id) return;
    const sourceSetter = fromSuggestions ? setConnectionSuggestions : setConnections;
    const sourceRows = fromSuggestions ? connectionSuggestions : connections;
    const target = sourceRows.find((row) => row.id === targetUserId);
    if (!target) return;

    const currentlyFollowing = target.isFollowingByMe;
    setConnectionActionLoadingById((prev) => ({ ...prev, [targetUserId]: true }));
    sourceSetter((prev) =>
      prev.map((row) => (row.id === targetUserId ? { ...row, isFollowingByMe: !currentlyFollowing } : row)),
    );

    if (currentlyFollowing) {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId);

      if (error) {
        sourceSetter((prev) =>
          prev.map((row) => (row.id === targetUserId ? { ...row, isFollowingByMe: currentlyFollowing } : row)),
        );
        toast({ title: "Error", description: "No se pudo dejar de seguir." });
      } else if (connectionsType === "following" && isOwnProfile && !fromSuggestions) {
        setConnections((prev) => prev.filter((row) => row.id !== targetUserId));
        setFollowing((prev) => Math.max(0, prev - 1));
      }
    } else {
      const { error } = await supabase.from("follows").insert({
        follower_id: user.id,
        following_id: targetUserId,
      });

      if (error) {
        sourceSetter((prev) =>
          prev.map((row) => (row.id === targetUserId ? { ...row, isFollowingByMe: currentlyFollowing } : row)),
        );
        toast({ title: "Error", description: "No se pudo seguir al usuario." });
      } else if (connectionsType === "following" && isOwnProfile && !fromSuggestions) {
        setFollowing((prev) => prev + 1);
      }
      if (!currentlyFollowing && fromSuggestions) {
        setConnectionSuggestions((prev) => prev.filter((row) => row.id !== targetUserId));
      }
    }

    setConnectionActionLoadingById((prev) => ({ ...prev, [targetUserId]: false }));
  };

  const handleRemoveFollower = async (targetUserId: string) => {
    if (!supabase || !user?.id || !isOwnProfile || targetUserId === user.id) return;
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
      .eq("following_id", user.id);

    if (error) {
      setConnections((prev) => [targetRow, ...prev]);
      setFollowers((prev) => prev + 1);
      toast({ title: "Error", description: "No se pudo eliminar este seguidor." });
    }

    setConnectionActionLoadingById((prev) => ({ ...prev, [targetUserId]: false }));
  };

  const handleOpenAvatarOptions = () => {
    if (!isOwnProfile || avatarBusy) return;
    setIsAvatarOptionsOpen(true);
  };

  const handleCloseAvatarOptions = () => {
    if (avatarBusy) return;
    setIsAvatarOptionsOpen(false);
  };

  const syncAvatarLocal = (avatarUrl: string | null) => {
    setProfileData((prev) => (prev ? { ...prev, avatar_url: avatarUrl } : prev));
    if (user?.id && profileData?.id === user.id) {
      updateUserProfile({ avatar_url: avatarUrl ?? "" });
      window.dispatchEvent(
        new CustomEvent("instadetox:avatar-updated", {
          detail: { userId: user.id, avatarUrl: avatarUrl ?? "" },
        }),
      );
    }
  };

  const tryDeletePreviousAvatarObject = async (avatarUrl: string | null) => {
    if (!supabase || !avatarUrl) return;
    const parsed = parseStoragePathFromPublicUrl(avatarUrl);
    if (!parsed || parsed.bucket !== AVATAR_BUCKET) return;
    await supabase.storage.from(AVATAR_BUCKET).remove([parsed.path]);
  };

  const handlePickAvatarFile = () => {
    if (avatarBusy) return;
    avatarInputRef.current?.click();
  };

  const handleAvatarFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file || !supabase || !profileData?.id || !user?.id || profileData.id !== user.id) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Formato no valido", description: "Solo se permiten imagenes para el avatar." });
      return;
    }

    const previousAvatar = profileData.avatar_url;
    const optimisticUrl = URL.createObjectURL(file);
    setAvatarBusy(true);
    setIsAvatarOptionsOpen(false);
    syncAvatarLocal(optimisticUrl);

    try {
      const ext = file.name.includes(".") ? file.name.split(".").pop() ?? "jpg" : "jpg";
      const baseName = sanitizeFileName(file.name.replace(/\.[^/.]+$/, "")) || "avatar";
      const path = `${user.id}/${Date.now()}-${baseName}.${ext}`;

      const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });
      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
      const finalUrl = publicData.publicUrl;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ avatar_url: finalUrl })
        .eq("id", user.id);
      if (profileError) throw profileError;

      await supabase.auth.updateUser({ data: { avatar_url: finalUrl } });
      await tryDeletePreviousAvatarObject(previousAvatar);
      syncAvatarLocal(finalUrl);
      toast({ title: "Foto actualizada", description: "Tu foto de perfil se actualizo correctamente." });
    } catch {
      syncAvatarLocal(previousAvatar);
      toast({ title: "Error", description: "No se pudo actualizar la foto de perfil." });
    } finally {
      URL.revokeObjectURL(optimisticUrl);
      setAvatarBusy(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!supabase || !profileData?.id || !user?.id || profileData.id !== user.id || avatarBusy) return;

    const previousAvatar = profileData.avatar_url;
    setAvatarBusy(true);
    setIsAvatarOptionsOpen(false);
    syncAvatarLocal(null);

    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", user.id);
      if (profileError) throw profileError;

      await supabase.auth.updateUser({ data: { avatar_url: null } });
      await tryDeletePreviousAvatarObject(previousAvatar);
      toast({ title: "Foto eliminada", description: "Tu avatar actual fue eliminado." });
    } catch {
      syncAvatarLocal(previousAvatar);
      toast({ title: "Error", description: "No se pudo eliminar la foto de perfil." });
    } finally {
      setAvatarBusy(false);
    }
  };

  useEffect(() => {
    if (!isAvatarOptionsOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAvatarOptionsOpen(false);
      }
    };
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isAvatarOptionsOpen]);

  useEffect(() => {
    if (!connectionsOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setConnectionsOpen(false);
      }
    };
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [connectionsOpen]);

  if (loading) {
    return (
      <div className="w-full max-w-5xl mx-auto space-y-6 pb-8 animate-in fade-in duration-500">
        <Glass className="p-6">
          <p className="text-gray-300">Cargando perfil...</p>
        </Glass>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="w-full max-w-5xl mx-auto space-y-6 pb-8 animate-in fade-in duration-500">
        <Glass className="p-6">
          <h2 className="text-xl font-semibold text-white">Perfil no encontrado</h2>
          <p className="text-gray-300 mt-2">No existe un usuario con ese nombre.</p>
        </Glass>
      </div>
    );
  }

  const activeTabMeta = tabState[activeTab];
  const tabButtonClass = "h-11 sm:h-12 flex items-center justify-center gap-2 text-[11px] sm:text-xs uppercase tracking-wide";

  return (
    <div className="w-full max-w-[935px] mx-auto pt-3 sm:pt-7 lg:pt-10 pb-8 animate-in fade-in duration-500">
      <Glass className="px-2.5 py-3 sm:px-7 sm:py-7 lg:px-10 lg:py-8">
        <div className="flex flex-row items-start gap-3 sm:gap-9 lg:gap-12">
          <div className="flex justify-start sm:justify-start sm:pt-2 flex-shrink-0">
            <div className="group relative">
              <button
                type="button"
                onClick={handleOpenAvatarOptions}
                disabled={!isOwnProfile || avatarBusy}
                className={`relative w-[72px] h-[72px] sm:w-[120px] sm:h-[120px] lg:w-[144px] lg:h-[144px] rounded-full overflow-hidden border border-white/20 bg-black/30 ${
                  isOwnProfile ? "cursor-pointer" : "cursor-default"
                }`}
                aria-label={isOwnProfile ? "Cambiar foto de perfil" : "Avatar de perfil"}
                title={isOwnProfile ? "Cambiar foto de perfil" : undefined}
              >
                {profileData.avatar_url ? (
                  <img src={profileData.avatar_url} alt={profileData.username} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full grid place-items-center">
                    <User className="w-9 h-9 sm:w-12 sm:h-12 text-primary" />
                  </div>
                )}
              </button>
              {isOwnProfile ? (
                <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-black/80 px-2 py-1 text-[11px] text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  Cambiar foto de perfil
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-start justify-between gap-3 sm:gap-4">
              <div className="min-w-0 text-left flex-1">
                <h2 className="text-[19px] sm:text-[25px] lg:text-[29px] font-semibold text-white leading-tight truncate">
                  {profileData.username}
                </h2>
                <p className="text-[12px] sm:text-[15px] font-medium text-gray-200 mt-0.5 sm:mt-1.5 truncate">
                  {profileData.full_name || "Usuario InstaDetox"}
                </p>
              </div>

              {isOwnProfile ? (
                <button
                  type="button"
                  onClick={() =>
                    toast({
                      title: "Configuracion",
                      description: "Funcionalidad proximamente.",
                    })
                  }
                  className="p-1.5 sm:p-2 rounded-lg border border-white/20 text-gray-200 hover:border-white/40 hover:text-white transition-colors mt-0.5"
                  aria-label="Configuracion"
                >
                  <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              ) : null}
            </div>

            {!isOwnProfile ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-4 sm:mt-5">
                <div className="flex gap-2 justify-center sm:justify-start">
                  <Button className="h-8 px-4 text-[13px] sm:text-sm" onClick={() => void handleToggleFollow()} disabled={followLoading}>
                    {followLoading ? "Procesando..." : isFollowing ? "Siguiendo" : "Seguir"}
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="mt-2.5 sm:mt-5 lg:mt-6 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-start sm:gap-x-8">
              <p className="text-[12px] sm:text-[15px] lg:text-[16px] text-gray-100 text-left">
                <span className="font-semibold text-white">{formatCompact(postCount)}</span> publicaciones
              </p>
              <button
                type="button"
                onClick={() => openConnectionsModal("followers")}
                className="text-[12px] sm:text-[15px] lg:text-[16px] text-gray-100 hover:text-white transition-colors text-left"
              >
                <span className="font-semibold text-white">{formatCompact(followers)}</span> seguidores
              </button>
              <button
                type="button"
                onClick={() => openConnectionsModal("following")}
                className="text-[12px] sm:text-[15px] lg:text-[16px] text-gray-100 hover:text-white transition-colors text-left"
              >
                <span className="font-semibold text-white">{formatCompact(following)}</span> seguidos
              </button>
            </div>

            <div className="hidden sm:block mt-2.5 sm:mt-4 lg:mt-5 text-left">
              {profileData.bio ? (
                <p className="text-[12px] sm:text-[14px] text-gray-200 whitespace-pre-line mt-1 leading-relaxed">
                  <MentionText text={profileData.bio} />
                </p>
              ) : null}
            </div>

            <div className="hidden sm:flex mt-2.5 sm:mt-3 flex-wrap gap-1.5 sm:gap-2 justify-start">
              <span className="text-[11px] sm:text-xs px-2.5 py-1 rounded-full border border-cyan-300/30 bg-cyan-500/10 text-cyan-200">
                Detox streak: {detoxDays} dias
              </span>
              <span className="text-[11px] sm:text-xs px-2.5 py-1 rounded-full border border-emerald-300/30 bg-emerald-500/10 text-emerald-200">
                Tiempo recuperado: {detoxDays * 90} min
              </span>
            </div>

            {isOwnProfile ? (
              <div className="mt-2.5 sm:mt-4 lg:mt-5 flex justify-start">
                <Button
                  variant="outline"
                  className="h-8 px-4 sm:px-5 text-[12px] sm:text-sm"
                  onClick={() =>
                    toast({
                      title: "Editar perfil",
                      description: "Funcionalidad proximamente.",
                    })
                  }
                >
                  Editar perfil
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="sm:hidden mt-3 text-left">
          {profileData.bio ? (
            <p className="text-[12px] text-gray-200 whitespace-pre-line leading-relaxed">
              <MentionText text={profileData.bio} />
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5 justify-start">
              <span className="text-[11px] px-2.5 py-1 rounded-full border border-cyan-300/30 bg-cyan-500/10 text-cyan-200">
                Detox streak: {detoxDays} dias
              </span>
              <span className="text-[11px] px-2.5 py-1 rounded-full border border-emerald-300/30 bg-emerald-500/10 text-emerald-200">
                Tiempo recuperado: {detoxDays * 90} min
              </span>
            </div>
          )}
        </div>

        <div className="mt-5 sm:mt-8 border-t border-white/15">
          <div className="grid grid-cols-3">
            <button
              className={`${tabButtonClass} ${
                activeTab === "posts" ? "text-white border-t-2 border-white" : "text-gray-400"
              }`}
              onClick={() => setActiveTab("posts")}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              className={`${tabButtonClass} ${
                activeTab === "saved" ? "text-white border-t-2 border-white" : "text-gray-400"
              }`}
              onClick={() => setActiveTab("saved")}
            >
              <Bookmark className="w-4 h-4" />
            </button>
            <button
              className={`${tabButtonClass} ${
                activeTab === "tagged" ? "text-white border-t-2 border-white" : "text-gray-400"
              }`}
              onClick={() => setActiveTab("tagged")}
            >
              <UserSquare2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!activeTabMeta.initialized && activeTabMeta.loading ? (
          <div className="py-10 grid grid-cols-3 gap-0.5 sm:gap-1">
            {Array.from({ length: 9 }).map((_, idx) => (
              <div key={`profile-skeleton-${idx}`} className="aspect-square bg-white/10 animate-pulse" />
            ))}
          </div>
        ) : activeTabPosts.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-gray-300 text-sm">
              {activeTab === "posts"
                ? "Este perfil aun no tiene publicaciones."
                : activeTab === "saved"
                  ? "No hay guardados en este perfil."
                  : "No hay publicaciones etiquetadas."}
            </p>
          </div>
        ) : (
          <div className="mt-0.5 sm:mt-1 grid grid-cols-3 gap-0.5 sm:gap-1">
            {activeTabPosts.map((post, index) => {
              const mediaList = parseMediaList(post.media_url);
              const media = mediaList[0] ?? null;
              const isVideo = isVideoUrl(media);
              return (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => setModalIndex(index)}
                  className="group relative aspect-square bg-black/50 border border-white/10 overflow-hidden text-left"
                >
                  {media ? (
                    isVideo ? (
                      <video src={media} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                    ) : (
                      <img src={media} alt={post.title ?? "post"} className="w-full h-full object-cover" loading="lazy" />
                    )
                  ) : (
                    <div className="w-full h-full p-2 text-[11px] text-gray-300 overflow-hidden">
                      <MentionText text={post.caption} />
                    </div>
                  )}
                  {(post.mentions ?? []).length > 0 ? (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/55 px-2 py-1 text-[10px] flex flex-wrap gap-x-1.5">
                      {(post.mentions ?? []).map((mention) => (
                        <Link key={`${post.id}-m-${mention}`} href={`/${mention}`} className="text-cyan-200 hover:text-cyan-100">
                          @{mention}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                  <div className="hidden md:flex absolute inset-0 bg-black/55 items-center justify-center gap-5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="inline-flex items-center gap-1.5 text-white font-semibold">
                      <Heart className="w-4 h-4 fill-white" />
                      <span>{formatCompact(post.likes_count)}</span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 text-white font-semibold">
                      <MessageCircle className="w-4 h-4 fill-white" />
                      <span>{formatCompact(post.comments_count)}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div ref={loadMoreRef} className="h-10 w-full" />
        {activeTabMeta.loading && activeTabMeta.initialized ? (
          <div className="pb-4 text-center text-xs text-gray-300">Cargando mas publicaciones...</div>
        ) : null}
      </Glass>

      {modalPost ? (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm p-3 sm:p-6 flex items-center justify-center" onClick={() => setModalIndex(null)}>
          <div className="relative w-full max-w-5xl rounded-xl overflow-hidden border border-white/20 bg-slate-950/95" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setModalIndex(null)}
              className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-black/70 hover:bg-black"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>

            {activeTabPosts.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setModalIndex((prev) => {
                      if (prev === null) return prev;
                      return (prev - 1 + activeTabPosts.length) % activeTabPosts.length;
                    })
                  }
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-black/70 hover:bg-black"
                  aria-label="Anterior"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setModalIndex((prev) => {
                      if (prev === null) return prev;
                      return (prev + 1) % activeTabPosts.length;
                    })
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-black/70 hover:bg-black"
                  aria-label="Siguiente"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_360px]">
              <div className="bg-black min-h-[280px] md:min-h-[560px] flex items-center justify-center">
                {(() => {
                  const mediaList = parseMediaList(modalPost.media_url);
                  const media = mediaList[0] ?? null;
                  if (!media) {
                    return (
                      <div className="p-5 text-sm text-gray-300">
                        <MentionText text={modalPost.caption} />
                      </div>
                    );
                  }
                  if (isVideoUrl(media)) {
                    return <video src={media} className="w-full h-full max-h-[80vh] object-contain" controls autoPlay playsInline />;
                  }
                  return <img src={media} alt={modalPost.title ?? "post"} className="w-full h-full max-h-[80vh] object-contain" />;
                })()}
              </div>

              <div className="border-t md:border-t-0 md:border-l border-white/10 flex flex-col min-h-[380px] md:min-h-[560px]">
                <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center">
                    {profileData.avatar_url ? (
                      <img src={profileData.avatar_url} alt={profileData.username} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-white">{profileData.username.slice(0, 1).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{profileData.username}</p>
                    <p className="text-xs text-gray-400 truncate">{profileData.full_name || "Usuario InstaDetox"}</p>
                  </div>
                </div>

                <div className="px-4 py-3 border-b border-white/10 overflow-y-auto flex-1 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center flex-shrink-0">
                      {profileData.avatar_url ? (
                        <img src={profileData.avatar_url} alt={profileData.username} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs text-white">{profileData.username.slice(0, 1).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="min-w-0 text-sm leading-5">
                      <span className="font-semibold text-white mr-1">{profileData.username}</span>
                      <span className="text-white whitespace-pre-line">
                        <MentionText text={modalPost.caption} />
                      </span>
                      {(modalPost.mentions ?? []).length > 0 ? (
                        <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-sm">
                          {(modalPost.mentions ?? []).map((mention) => (
                            <Link key={`${modalPost.id}-modal-${mention}`} href={`/${mention}`} className="text-cyan-200 hover:text-cyan-100">
                              @{mention}
                            </Link>
                          ))}
                        </div>
                      ) : null}
                      <p className="text-[11px] text-gray-400 mt-1">{formatRelativeTime(modalPost.created_at)}</p>
                    </div>
                  </div>

                  {modalCommentsLoading ? (
                    <p className="text-xs text-gray-400">Cargando comentarios...</p>
                  ) : modalComments.length === 0 ? (
                    <p className="text-xs text-gray-400">Aun no hay comentarios.</p>
                  ) : (
                    modalComments.map((comment) => (
                      <div key={comment.id} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center flex-shrink-0">
                          {comment.avatar_url ? (
                            <img src={comment.avatar_url} alt={comment.username} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs text-white">{comment.username.slice(0, 1).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="min-w-0 text-sm leading-5">
                          <Link href={`/${comment.username}`} className="font-semibold text-white mr-1 hover:text-cyan-200">
                            {comment.username}
                          </Link>
                          <span className="text-white whitespace-pre-line">{comment.content}</span>
                          <p className="text-[11px] text-gray-400 mt-1">{formatRelativeTime(comment.created_at)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="px-4 pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => void handleModalToggleLike()}
                        disabled={modalLikeBusy}
                        className={`${modalLikedByMe ? "text-red-400" : "text-white"} disabled:opacity-60`}
                        aria-label="Like"
                      >
                        <Heart className={`w-6 h-6 ${modalLikedByMe ? "fill-red-400" : ""}`} />
                      </button>
                      <button type="button" onClick={focusModalCommentInput} className="inline-flex text-white" aria-label="Comentar">
                        <MessageCircle className="w-6 h-6" />
                      </button>
                      <button type="button" onClick={() => void handleModalShare()} className="inline-flex text-white" aria-label="Compartir">
                        <Send className="w-6 h-6" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleModalToggleSave()}
                      disabled={modalSaveBusy}
                      className={`inline-flex ${modalSavedByMe ? "text-cyan-300" : "text-white"} disabled:opacity-60`}
                      aria-label="Guardar"
                    >
                      <Bookmark className={`w-6 h-6 ${modalSavedByMe ? "fill-cyan-300" : ""}`} />
                    </button>
                  </div>
                  <p className="text-sm font-semibold text-white mt-2">{formatCompact(modalPost.likes_count)} Me gusta</p>
                  <p className="text-[11px] text-gray-400 mt-1">{formatRelativeTime(modalPost.created_at)}</p>
                </div>

                <div className="px-4 py-3 border-t border-white/10 flex items-center gap-2">
                  <input
                    ref={modalCommentInputRef}
                    value={modalCommentInput}
                    onChange={(event) => setModalCommentInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void handleModalSubmitComment();
                      }
                    }}
                    placeholder="Agrega un comentario..."
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => void handleModalSubmitComment()}
                    disabled={!modalCommentInput.trim()}
                    className="text-sm font-semibold text-cyan-300 hover:text-cyan-200 disabled:opacity-40"
                  >
                    Publicar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {connectionsOpen ? (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm p-3 sm:p-4 flex items-center justify-center" onClick={() => setConnectionsOpen(false)}>
          <div
            className="w-full max-w-[520px] max-h-[78vh] rounded-2xl overflow-hidden border border-white/15 bg-slate-900/95 flex flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative h-12 border-b border-white/10 flex items-center justify-center">
              <h3 className="text-[16px] font-semibold text-white">{connectionsType === "followers" ? "Seguidores" : "Seguidos"}</h3>
              <button
                type="button"
                onClick={() => setConnectionsOpen(false)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md border border-white/30 hover:bg-white/10"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-3 py-3 border-b border-white/10">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  value={connectionsQuery}
                  onChange={(event) => setConnectionsQuery(event.target.value)}
                  placeholder="Buscar"
                  className="w-full h-9 rounded-md bg-white/10 border border-white/10 pl-9 pr-3 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
                />
              </div>
            </div>

            <div className="overflow-y-auto p-3 space-y-2">
              {connectionsLoading ? (
                <div className="py-8 text-center text-sm text-gray-300">Cargando lista...</div>
              ) : filteredConnections.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-300">
                  {connectionsQuery.trim() ? "Sin resultados para esa busqueda." : "No hay usuarios para mostrar."}
                </div>
              ) : (
                filteredConnections.map((row) => {
                  const actionLoading = Boolean(connectionActionLoadingById[row.id]);
                  const canRemoveFollower = connectionsType === "followers" && isOwnProfile && row.id !== user?.id;
                  const showFollowAction = !canRemoveFollower && row.id !== user?.id;
                  const showInlineFollowInFollowers =
                    connectionsType === "followers" &&
                    row.id !== user?.id &&
                    !row.isFollowingByMe;

                  return (
                    <div key={`${connectionsType}-${row.id}`} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-white/5">
                      <div className="h-11 w-11 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center flex-shrink-0">
                        {row.avatar_url ? (
                          <img src={row.avatar_url} alt={row.username} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-sm text-white">{row.username.slice(0, 1).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Link href={`/${row.username}`} className="block text-sm font-semibold text-white truncate hover:text-cyan-200">
                            {row.username}
                          </Link>
                          {showInlineFollowInFollowers ? (
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => {
                                void handleConnectionToggleFollow(row.id);
                              }}
                              className="text-xs font-semibold text-blue-400 hover:text-blue-300 disabled:opacity-60"
                            >
                              {actionLoading ? "..." : "Seguir"}
                            </button>
                          ) : null}
                        </div>
                        <p className="text-sm text-gray-300 truncate">{row.full_name || row.username}</p>
                      </div>
                      {canRemoveFollower ? (
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => {
                            void handleRemoveFollower(row.id);
                          }}
                          className="h-8 px-3 rounded-lg text-sm font-semibold text-white bg-white/10 hover:bg-white/20 disabled:opacity-60"
                        >
                          {actionLoading ? "..." : "Eliminar"}
                        </button>
                      ) : showFollowAction ? (
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => {
                            void handleConnectionToggleFollow(row.id);
                          }}
                          className={`h-8 px-3 rounded-lg text-sm font-semibold ${
                            row.isFollowingByMe
                              ? "bg-white/10 text-white hover:bg-white/20"
                              : "bg-blue-500 text-white hover:bg-blue-400"
                          } disabled:opacity-60`}
                        >
                          {actionLoading ? "..." : row.isFollowingByMe ? "Siguiendo" : "Seguir"}
                        </button>
                      ) : null}
                    </div>
                  );
                })
              )}

              {!connectionsQuery.trim() && connectionSuggestions.length > 0 ? (
                <div className="pt-3 mt-2 border-t border-white/10">
                  <p className="text-[15px] font-semibold text-white mb-2">Sugerencias para ti</p>
                  <div className="space-y-2">
                    {connectionSuggestions.map((row) => {
                      const actionLoading = Boolean(connectionActionLoadingById[row.id]);
                      return (
                        <div key={`suggestion-${row.id}`} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-white/5">
                          <div className="h-11 w-11 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center flex-shrink-0">
                            {row.avatar_url ? (
                              <img src={row.avatar_url} alt={row.username} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-sm text-white">{row.username.slice(0, 1).toUpperCase()}</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <Link href={`/${row.username}`} className="block text-sm font-semibold text-white truncate hover:text-cyan-200">
                              {row.username}
                            </Link>
                            <p className="text-sm text-gray-300 truncate">{row.full_name || row.username}</p>
                          </div>
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => {
                              void handleConnectionToggleFollow(row.id, true);
                            }}
                            className={`h-8 px-3 rounded-lg text-sm font-semibold ${
                              row.isFollowingByMe
                                ? "bg-white/10 text-white hover:bg-white/20"
                                : "bg-blue-500 text-white hover:bg-blue-400"
                            } disabled:opacity-60`}
                          >
                            {actionLoading ? "..." : row.isFollowingByMe ? "Siguiendo" : "Seguir"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          void handleAvatarFileChange(event);
        }}
      />

      {isAvatarOptionsOpen ? (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm p-4 flex items-center justify-center" onClick={handleCloseAvatarOptions}>
          <div
            className="w-full max-w-[420px] rounded-2xl overflow-hidden border border-white/15 bg-slate-900/95"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-6 py-5 text-center border-b border-white/10">
              <h3 className="text-[20px] font-medium text-white">Cambiar foto del perfil</h3>
            </div>
            <button
              type="button"
              disabled={avatarBusy}
              onClick={handlePickAvatarFile}
              className="w-full h-14 text-center text-[15px] font-semibold text-blue-400 hover:bg-white/5 transition-colors inline-flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Subir foto
            </button>
            <div className="h-px bg-white/10" />
            <button
              type="button"
              disabled={avatarBusy || !profileData?.avatar_url}
              onClick={() => {
                void handleRemoveAvatar();
              }}
              className="w-full h-14 text-center text-[15px] font-semibold text-red-400 hover:bg-white/5 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar foto actual
            </button>
            <div className="h-px bg-white/10" />
            <button
              type="button"
              disabled={avatarBusy}
              onClick={handleCloseAvatarOptions}
              className="w-full h-14 text-center text-[15px] font-medium text-white hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Profile;
