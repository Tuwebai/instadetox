import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Compass } from "lucide-react";
import { Glass } from "@/components/ui/glass";
import { Skeleton } from "@/components/ui/skeleton";
import DailyBook from "@/components/DailyBook";
import RightPanel from "@/components/RightPanel";
import FeedPostCard, { FeedPostCardRow, FeedPostComment } from "@/components/feed/FeedPostCard";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface FeedCursor {
  createdAt: string;
  id: string;
}

const FEED_PAGE_SIZE = 10;
const CURSOR_RECOVERY_MAX_HOPS = 2;

const cursorToKey = (cursor: FeedCursor | null) =>
  cursor ? `${cursor.createdAt}::${cursor.id}` : "__ROOT__";

const Home = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [feed, setFeed] = useState<FeedPostCardRow[]>([]);
  const [feedMode, setFeedMode] = useState<"ranked" | "recent">("ranked");
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<FeedCursor | null>(null);
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentsByPost, setCommentsByPost] = useState<Record<string, FeedPostComment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [followingAuthorIds, setFollowingAuthorIds] = useState<Set<string>>(new Set());
  const [followLoadingByUser, setFollowLoadingByUser] = useState<Record<string, boolean>>({});
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const seenPostIdsRef = useRef<Set<string>>(new Set());
  const exhaustedCursorKeysRef = useRef<Set<string>>(new Set());

  const fetchFeedBatch = useCallback(
    async (cursor: FeedCursor | null, append: boolean) => {
      if (!supabase) {
        setLoadingFeed(false);
        setLoadingMore(false);
        setHasMore(false);
        return;
      }

      if (append) {
        setLoadingMore(true);
      } else {
        setLoadingFeed(true);
      }
      let activeCursor = cursor;
      let recoveryHops = 0;

      if (append && exhaustedCursorKeysRef.current.has(cursorToKey(activeCursor))) {
        setHasMore(false);
        setLoadingMore(false);
        return;
      }

      while (true) {
        let query = supabase
          .from("feed_posts")
          .select("*")
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(FEED_PAGE_SIZE);

        if (activeCursor) {
          const cursorFilter = `created_at.lt.${activeCursor.createdAt},and(created_at.eq.${activeCursor.createdAt},id.lt.${activeCursor.id})`;
          query = query.or(cursorFilter);
        }

        const { data: posts, error: postsError } = await query;

        if (postsError) {
          setLoadingFeed(false);
          setLoadingMore(false);
          toast({ title: "Error", description: "No se pudo cargar el feed." });
          return;
        }

        const mappedPosts = (posts ?? []) as FeedPostCardRow[];
        if (mappedPosts.length === 0) {
          setHasMore(false);
          break;
        }

        if (mappedPosts.length < FEED_PAGE_SIZE) {
          setHasMore(false);
        }

        let likedSet = new Set<string>();
        if (user?.id && mappedPosts.length > 0) {
          const ids = mappedPosts.map((p) => p.id);
          const { data: likes } = await supabase
            .from("post_likes")
            .select("post_id")
            .eq("user_id", user.id)
            .in("post_id", ids);

          likedSet = new Set((likes ?? []).map((l) => l.post_id as string));
        }

        let savedSet = new Set<string>();
        if (user?.id && mappedPosts.length > 0) {
          const postIds = mappedPosts.map((p) => p.id);
          const { data: savedRows } = await supabase
            .from("saved_posts")
            .select("post_id")
            .eq("user_id", user.id)
            .in("post_id", postIds);

          savedSet = new Set((savedRows ?? []).map((row) => row.post_id as string));
        }

        let followingSet = new Set<string>();
        if (user?.id && mappedPosts.length > 0) {
          const authorIds = Array.from(new Set(mappedPosts.map((p) => p.user_id).filter((id) => id && id !== user.id)));
          if (authorIds.length > 0) {
            const { data: follows } = await supabase
              .from("follows")
              .select("following_id")
              .eq("follower_id", user.id)
              .in("following_id", authorIds);

            followingSet = new Set((follows ?? []).map((f) => f.following_id as string));
          }
        }

        const mapped = mappedPosts.map((p) => ({
          ...p,
          likedByMe: likedSet.has(p.id),
        }));

        let fresh = mapped;
        if (append) {
          fresh = mapped.filter((p) => !seenPostIdsRef.current.has(p.id));
        }

        const lastPost = mappedPosts[mappedPosts.length - 1];
        const nextCursorCandidate: FeedCursor = {
          createdAt: lastPost.created_at,
          id: lastPost.id,
        };
        setNextCursor(nextCursorCandidate);

        if (append && fresh.length === 0) {
          exhaustedCursorKeysRef.current.add(cursorToKey(activeCursor));
          const stuckInSameCursor = cursorToKey(activeCursor) === cursorToKey(nextCursorCandidate);
          if (stuckInSameCursor || recoveryHops >= CURSOR_RECOVERY_MAX_HOPS) {
            setHasMore(false);
            break;
          }
          recoveryHops += 1;
          activeCursor = nextCursorCandidate;
          continue;
        }

        if (append) {
          fresh.forEach((post) => seenPostIdsRef.current.add(post.id));
          setFeed((prev) => [...prev, ...fresh]);
        } else {
          seenPostIdsRef.current = new Set(mapped.map((p) => p.id));
          exhaustedCursorKeysRef.current.clear();
          setFeed(mapped);
        }

        setSavedPostIds((prev) => {
          if (!append) return savedSet;
          const next = new Set(prev);
          savedSet.forEach((id) => next.add(id));
          return next;
        });

        setFollowingAuthorIds((prev) => {
          if (!append) return followingSet;
          const next = new Set(prev);
          followingSet.forEach((id) => next.add(id));
          return next;
        });

        break;
      }

      setLoadingFeed(false);
      setLoadingMore(false);
    },
    [toast, user?.id],
  );

  const loadFeed = useCallback(async () => {
    setHasMore(true);
    setNextCursor(null);
    seenPostIdsRef.current.clear();
    exhaustedCursorKeysRef.current.clear();
    await fetchFeedBatch(null, false);
  }, [fetchFeedBatch]);

  const loadMore = useCallback(async () => {
    if (loadingFeed || loadingMore || !hasMore || !nextCursor) return;
    await fetchFeedBatch(nextCursor, true);
  }, [fetchFeedBatch, hasMore, loadingFeed, loadingMore, nextCursor]);

  const loadComments = async (postId: string) => {
    if (!supabase) return;

    const { data, error } = await supabase
      .from("post_comments")
      .select("id, post_id, user_id, content, created_at")
      .eq("post_id", postId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      toast({ title: "Error", description: "No se pudieron cargar los comentarios." });
      return;
    }

    setCommentsByPost((prev) => ({ ...prev, [postId]: (data ?? []) as FeedPostComment[] }));
  };

  useEffect(() => {
    void loadFeed();
  }, [user?.id, loadFeed]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting) {
          void loadMore();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  useEffect(() => {
    const onAvatarUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string; avatarUrl?: string }>).detail;
      if (!detail?.userId) return;
      setFeed((prev) =>
        prev.map((post) => (post.user_id === detail.userId ? { ...post, avatar_url: detail.avatarUrl ?? null } : post)),
      );
    };

    window.addEventListener("instadetox:avatar-updated", onAvatarUpdated as EventListener);
    return () => window.removeEventListener("instadetox:avatar-updated", onAvatarUpdated as EventListener);
  }, []);

  const toggleLike = async (post: FeedPostCardRow) => {
    if (!supabase || !user?.id) {
      toast({ title: "Inicia sesion", description: "Debes iniciar sesion para dar like." });
      return;
    }

    const currentlyLiked = Boolean(post.likedByMe);

    setFeed((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? {
              ...p,
              likedByMe: !currentlyLiked,
              likes_count: currentlyLiked ? Math.max(0, p.likes_count - 1) : p.likes_count + 1,
            }
          : p,
      ),
    );

    if (currentlyLiked) {
      const { error } = await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
      if (error) {
        await loadFeed();
        toast({ title: "Error", description: "No se pudo quitar el like." });
      }
      return;
    }

    const { error } = await supabase
      .from("post_likes")
      .upsert({ post_id: post.id, user_id: user.id }, { onConflict: "post_id,user_id", ignoreDuplicates: true });
    if (error) {
      await loadFeed();
      toast({ title: "Error", description: "No se pudo dar like." });
    }
  };

  const toggleFollowAuthor = async (authorId: string) => {
    if (!supabase || !user?.id) {
      toast({ title: "Inicia sesion", description: "Debes iniciar sesion para seguir usuarios." });
      return;
    }
    if (authorId === user.id) return;

    const isFollowing = followingAuthorIds.has(authorId);
    setFollowLoadingByUser((prev) => ({ ...prev, [authorId]: true }));
    setFollowingAuthorIds((prev) => {
      const next = new Set(prev);
      if (isFollowing) {
        next.delete(authorId);
      } else {
        next.add(authorId);
      }
      return next;
    });

    if (isFollowing) {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", authorId);

      if (error) {
        setFollowingAuthorIds((prev) => {
          const next = new Set(prev);
          next.add(authorId);
          return next;
        });
        toast({ title: "Error", description: "No se pudo dejar de seguir." });
      }
    } else {
      const { error } = await supabase.from("follows").insert({
        follower_id: user.id,
        following_id: authorId,
      });

      if (error) {
        setFollowingAuthorIds((prev) => {
          const next = new Set(prev);
          next.delete(authorId);
          return next;
        });
        toast({ title: "Error", description: "No se pudo seguir al usuario." });
      }
    }

    setFollowLoadingByUser((prev) => ({ ...prev, [authorId]: false }));
  };

  const toggleSavePost = async (postId: string) => {
    if (!supabase || !user?.id) {
      toast({ title: "Inicia sesion", description: "Debes iniciar sesion para guardar publicaciones." });
      return;
    }

    const isSaved = savedPostIds.has(postId);
    setSavedPostIds((prev) => {
      const next = new Set(prev);
      if (isSaved) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });

    if (isSaved) {
      const { error } = await supabase.from("saved_posts").delete().eq("user_id", user.id).eq("post_id", postId);
      if (error) {
        setSavedPostIds((prev) => new Set(prev).add(postId));
        toast({ title: "Error", description: "No se pudo quitar de guardados." });
      }
      return;
    }

    const { error } = await supabase.from("saved_posts").insert({ user_id: user.id, post_id: postId });
    if (error) {
      setSavedPostIds((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
      toast({ title: "Error", description: "No se pudo guardar la publicacion." });
    }
  };

  const handleToggleComments = async (postId: string) => {
    const willOpen = !openComments[postId];
    setOpenComments((prev) => ({ ...prev, [postId]: willOpen }));
    if (willOpen) {
      await loadComments(postId);
    }
  };

  const handleCommentSubmit = async (postId: string) => {
    if (!supabase || !user?.id) {
      toast({ title: "Inicia sesion", description: "Debes iniciar sesion para comentar." });
      return;
    }

    const content = (commentInputs[postId] ?? "").trim();
    if (!content) return;

    const { error } = await supabase.from("post_comments").insert({
      post_id: postId,
      user_id: user.id,
      content,
    });

    if (error) {
      toast({ title: "Error", description: "No se pudo publicar el comentario." });
      return;
    }

    setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
    setFeed((prev) => prev.map((p) => (p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p)));
    await loadComments(postId);
  };

  const handleSharePost = async (postId: string) => {
    const shareUrl = `${window.location.origin}/inicio?post=${postId}`;
    const shareTitle = "InstaDetox";
    const shareText = "Mira esta publicacion en InstaDetox";

    try {
      if (navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      toast({ title: "Enlace copiado", description: "Se copio el enlace de la publicacion." });
    } catch {
      toast({ title: "No se pudo compartir", description: "Intenta nuevamente." });
    }
  };

  const visibleFeed = useMemo(() => {
    if (feedMode === "recent") {
      return [...feed].sort((a, b) => {
        const timeDiff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (timeDiff !== 0) return timeDiff;
        return b.id.localeCompare(a.id);
      });
    }

    // Ranking base: engagement ponderado + recencia (half-life 24h)
    const now = Date.now();
    const halfLifeMs = 24 * 60 * 60 * 1000;

    return [...feed].sort((a, b) => {
      const score = (post: FeedPostCardRow) => {
        const ageMs = Math.max(1, now - new Date(post.created_at).getTime());
        const recencyFactor = Math.pow(0.5, ageMs / halfLifeMs);
        const engagement = post.likes_count * 1 + post.comments_count * 2;
        return engagement + recencyFactor * 10;
      };

      const s = score(b) - score(a);
      if (Math.abs(s) > 1e-9) return s;
      const t = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (t !== 0) return t;
      return b.id.localeCompare(a.id);
    });
  }, [feed, feedMode]);

  const renderFeedSkeleton = (key: string) => (
    <Glass key={key} className="p-5 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-64 w-full rounded-xl" />
      <div className="flex items-center gap-4">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
      </div>
    </Glass>
  );

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col md:flex-row gap-6">
      <div className="w-full md:w-2/3 lg:w-7/12 space-y-6 pb-8 animate-in fade-in duration-500">
        <Glass className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Compass className="w-5 h-5 mr-2 text-primary" />
            Feed Detox
          </h2>
          <p className="text-gray-300 mb-4">Contenido social con enfoque de bienestar digital.</p>
          <div className="flex gap-2">
            <button
              onClick={() => setFeedMode("ranked")}
              className={`px-3 py-1.5 rounded-lg text-sm ${
                feedMode === "ranked" ? "bg-primary/20 text-primary" : "frosted text-gray-300"
              }`}
            >
              Para ti
            </button>
            <button
              onClick={() => setFeedMode("recent")}
              className={`px-3 py-1.5 rounded-lg text-sm ${
                feedMode === "recent" ? "bg-primary/20 text-primary" : "frosted text-gray-300"
              }`}
            >
              Recientes
            </button>
          </div>
        </Glass>

        {loadingFeed ? (
          <>
            {renderFeedSkeleton("sk-1")}
            {renderFeedSkeleton("sk-2")}
            {renderFeedSkeleton("sk-3")}
          </>
        ) : feed.length === 0 ? (
          <Glass className="p-6">
            <p className="text-gray-300">Aun no hay publicaciones. Crea la primera desde la pestaña Crear.</p>
          </Glass>
        ) : (
          visibleFeed.map((post) => (
            <FeedPostCard
              key={post.id}
              post={post}
              currentUserId={user?.id}
              isFollowingAuthor={followingAuthorIds.has(post.user_id)}
              followLoading={Boolean(followLoadingByUser[post.user_id])}
              isSaved={savedPostIds.has(post.id)}
              commentsOpen={Boolean(openComments[post.id])}
              comments={commentsByPost[post.id] ?? []}
              commentInput={commentInputs[post.id] ?? ""}
              onToggleFollow={(authorId) => void toggleFollowAuthor(authorId)}
              onToggleLike={() => void toggleLike(post)}
              onToggleSave={() => void toggleSavePost(post.id)}
              onToggleComments={() => void handleToggleComments(post.id)}
              onShare={() => void handleSharePost(post.id)}
              onCommentInputChange={(value) =>
                setCommentInputs((prev) => ({
                  ...prev,
                  [post.id]: value,
                }))
              }
              onSubmitComment={() => void handleCommentSubmit(post.id)}
            />
          ))
        )}

        {feed.length > 0 ? (
          <div ref={loadMoreRef} className="py-2 text-center text-sm text-gray-300">
            {loadingMore ? "Cargando mas publicaciones..." : hasMore ? "Desliza para cargar mas" : "No hay mas contenido"}
          </div>
        ) : null}

        {loadingMore ? renderFeedSkeleton("sk-more") : null}

        <DailyBook />
      </div>

      <div className="w-full md:w-1/3 lg:w-5/12">
        <RightPanel />
      </div>
    </div>
  );
};

export default Home;
