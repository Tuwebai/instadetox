import { useMemo, useState } from "react";
import { Bookmark, ChevronLeft, ChevronRight, Heart, MessageCircle, MoreHorizontal, Send } from "lucide-react";
import { Link } from "wouter";
import { Glass } from "@/components/ui/glass";
import MentionText from "@/components/ui/mention-text";

export interface FeedPostCardRow {
  id: string;
  user_id: string;
  type: string;
  title: string | null;
  caption: string;
  media_url: string | null;
  video_cover_url?: string | null;
  mentions?: string[] | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  likedByMe?: boolean;
}

export interface FeedPostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

interface FeedPostCardProps {
  post: FeedPostCardRow;
  currentUserId?: string;
  isFollowingAuthor: boolean;
  followLoading: boolean;
  isSaved: boolean;
  commentsOpen: boolean;
  comments: FeedPostComment[];
  commentInput: string;
  onToggleFollow: (authorId: string) => void;
  onToggleLike: () => void;
  onToggleSave: () => void;
  onToggleComments: () => void;
  onShare: () => void;
  onCommentInputChange: (value: string) => void;
  onSubmitComment: () => void;
}

const compactCount = (value: number) =>
  new Intl.NumberFormat("es-AR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Math.max(0, value));

const shortTimeAgo = (isoDate: string) => {
  const now = Date.now();
  const at = new Date(isoDate).getTime();
  const diffMs = Math.max(0, now - at);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;

  if (diffMs < minute) return "ahora";
  if (diffMs < hour) return `${Math.floor(diffMs / minute)} min`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)} h`;
  if (diffMs < week) return `${Math.floor(diffMs / day)} d`;
  return `${Math.floor(diffMs / week)} sem`;
};

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
      // fallback to plain text parsing
    }
  }

  return raw
    .split(/[\n,|]/g)
    .map((item) => item.trim())
    .filter(Boolean);
};

const isInstagramMediaType = (post: FeedPostCardRow) => post.type === "photo" || post.type === "video";
const profileHref = (username: string | null | undefined) => (username ? `/${username}` : "/inicio");

const FeedPostCard = ({
  post,
  currentUserId,
  isFollowingAuthor,
  followLoading,
  isSaved,
  commentsOpen,
  comments,
  commentInput,
  onToggleFollow,
  onToggleLike,
  onToggleSave,
  onToggleComments,
  onShare,
  onCommentInputChange,
  onSubmitComment,
}: FeedPostCardProps) => {
  const [isMuted, setIsMuted] = useState(true);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const isOwnPost = Boolean(currentUserId && post.user_id === currentUserId);
  const showInstagramMediaCard = isInstagramMediaType(post) && Boolean(post.media_url);
  const mediaItems = useMemo(() => parseMediaList(post.media_url), [post.media_url]);
  const mediaList = mediaItems.length > 0 ? mediaItems : post.media_url ? [post.media_url] : [];
  const activeMedia = mediaList[activeMediaIndex] ?? mediaList[0] ?? null;
  const showVideo = post.type === "video" || isVideoUrl(activeMedia);
  const hasCarousel = mediaList.length > 1;
  const publishedAgo = useMemo(() => shortTimeAgo(post.created_at), [post.created_at]);

  const goPrevMedia = () => {
    if (!hasCarousel) return;
    setActiveMediaIndex((prev) => (prev - 1 + mediaList.length) % mediaList.length);
  };

  const goNextMedia = () => {
    if (!hasCarousel) return;
    setActiveMediaIndex((prev) => (prev + 1) % mediaList.length);
  };

  if (!showInstagramMediaCard) {
    return (
      <Glass className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/30 overflow-hidden">
            {post.avatar_url ? (
              <img src={post.avatar_url} alt={post.username ?? "avatar"} className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="flex-1">
            <Link
              href={profileHref(post.username)}
              className="text-sm font-semibold text-white hover:text-cyan-200 transition-colors"
            >
              {post.full_name || post.username || "usuario"}
            </Link>
            <p className="text-xs text-gray-300">@{post.username || "usuario"}</p>
          </div>
          {!isOwnPost ? (
            <button
              onClick={() => onToggleFollow(post.user_id)}
              disabled={followLoading}
              className={`text-xs px-3 py-1 rounded-full border transition ${
                isFollowingAuthor
                  ? "border-white/30 text-gray-200 hover:border-white/50"
                  : "border-primary/60 text-primary hover:bg-primary/20"
              } disabled:opacity-60`}
            >
              {followLoading ? "..." : isFollowingAuthor ? "Siguiendo" : "Seguir"}
            </button>
          ) : null}
        </div>

        {post.title ? <h3 className="text-lg font-semibold text-white">{post.title}</h3> : null}
        <p className="text-gray-200 whitespace-pre-line">
          <MentionText text={post.caption} />
        </p>
        {(post.mentions ?? []).length > 0 ? (
          <div className="text-sm text-cyan-200 flex flex-wrap gap-x-2 gap-y-1">
            {(post.mentions ?? []).map((mention) => (
              <Link
                key={`${post.id}-m-${mention}`}
                href={`/${mention}`}
                className="text-cyan-200 hover:text-cyan-100"
              >
                @{mention}
              </Link>
            ))}
          </div>
        ) : null}

        {activeMedia ? (
          <div className="overflow-hidden rounded-xl border border-white/20 bg-black">
            {showVideo ? (
              <video
                src={activeMedia}
                className="w-full h-72 object-cover"
                poster={post.video_cover_url ?? undefined}
                controls
                playsInline
                preload="metadata"
              />
            ) : (
              <img src={activeMedia} alt={post.title ?? "post"} className="w-full h-72 object-cover" />
            )}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-300">
          <button className={`inline-flex items-center gap-2 ${post.likedByMe ? "text-red-300" : ""}`} onClick={onToggleLike}>
            <Heart className={`w-4 h-4 ${post.likedByMe ? "fill-red-300" : ""}`} /> {post.likes_count}
          </button>
          <button className="inline-flex items-center gap-2" onClick={onToggleComments}>
            <MessageCircle className="w-4 h-4" /> {post.comments_count}
          </button>
          <button className={`inline-flex items-center gap-2 ${isSaved ? "text-cyan-200" : ""}`} onClick={onToggleSave}>
            <Bookmark className={`w-4 h-4 ${isSaved ? "fill-cyan-200" : ""}`} />
            {isSaved ? "Guardado" : "Guardar"}
          </button>
          <button className="inline-flex items-center gap-2" onClick={onShare}>
            <Send className="w-4 h-4" /> Compartir
          </button>
          <span className="w-full text-xs text-gray-400 sm:w-auto sm:ml-auto">{new Date(post.created_at).toLocaleString()}</span>
        </div>

        {commentsOpen ? (
          <div className="space-y-3 pt-2 border-t border-white/10">
            <div className="space-y-2 max-h-48 overflow-auto pr-1">
              {comments.length === 0 ? (
                <p className="text-xs text-gray-400">Sin comentarios aun.</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="frosted rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-400">{comment.user_id.slice(0, 8)}</p>
                    <p className="text-sm text-white whitespace-pre-line">{comment.content}</p>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <input
                value={commentInput}
                onChange={(e) => onCommentInputChange(e.target.value)}
                placeholder="Escribe un comentario..."
                className="frosted flex-1 rounded-lg px-3 py-2 text-white placeholder:text-gray-400"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onSubmitComment();
                  }
                }}
              />
              <button onClick={onSubmitComment} className="bg-primary hover:bg-primary/80 px-3 py-2 rounded-lg">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : null}
      </Glass>
    );
  }

  return (
    <Glass className="p-0 overflow-hidden w-full md:max-w-[560px] md:mx-auto">
      <div className="px-3 py-2.5 flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-primary/30 overflow-hidden flex-shrink-0">
          {post.avatar_url ? (
            <img src={post.avatar_url} alt={post.username ?? "avatar"} className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <Link
            href={profileHref(post.username)}
            className="text-[14px] leading-4 font-semibold text-white hover:text-cyan-200 transition-colors truncate block"
          >
            {post.username || "usuario"}
          </Link>
          <p className="text-[11px] text-gray-400 truncate">{publishedAgo}</p>
        </div>
        {!isOwnPost ? (
          <button
            onClick={() => onToggleFollow(post.user_id)}
            disabled={followLoading}
            className="text-[12px] font-semibold text-cyan-300 hover:text-cyan-200 transition-colors disabled:opacity-60"
          >
            {followLoading ? "..." : isFollowingAuthor ? "Siguiendo" : "Seguir"}
          </button>
        ) : null}
        <button className="p-1.5 rounded hover:bg-white/10" aria-label="Mas opciones">
          <MoreHorizontal className="w-4 h-4 text-gray-300" />
        </button>
      </div>

      <div className="bg-black border-y border-white/10">
        <div className="relative w-full aspect-[4/5]">
          {showVideo ? (
            <>
              <video
                src={activeMedia ?? undefined}
                className="absolute inset-0 w-full h-full object-cover"
                poster={post.video_cover_url ?? undefined}
                autoPlay
                muted={isMuted}
                loop
                playsInline
                preload="metadata"
                controls={false}
              />
              <button
                onClick={() => setIsMuted((prev) => !prev)}
                className="absolute bottom-3 right-3 text-xs px-2 py-1 rounded-full bg-black/60 text-white border border-white/20"
              >
                {isMuted ? "Sin sonido" : "Sonido"}
              </button>
            </>
          ) : (
            <img
              src={activeMedia ?? undefined}
              alt={post.title ?? "publicacion"}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
          )}

          {hasCarousel ? (
            <>
              <button
                onClick={goPrevMedia}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/55 border border-white/25 text-white hover:bg-black/70"
                aria-label="Media anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={goNextMedia}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/55 border border-white/25 text-white hover:bg-black/70"
                aria-label="Media siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className="absolute top-2 right-2 text-[11px] px-2 py-0.5 rounded-full bg-black/60 text-white border border-white/20">
                {activeMediaIndex + 1}/{mediaList.length}
              </div>
            </>
          ) : null}
        </div>
      </div>

      <div className="px-3 pt-2.5 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className={`inline-flex ${post.likedByMe ? "text-red-300" : "text-white"}`} onClick={onToggleLike} aria-label="Like">
              <Heart className={`w-6 h-6 ${post.likedByMe ? "fill-red-300" : ""}`} />
            </button>
            <button className="inline-flex text-white" onClick={onToggleComments} aria-label="Comentar">
              <MessageCircle className="w-6 h-6" />
            </button>
            <button className="inline-flex text-white" onClick={onShare} aria-label="Compartir">
              <Send className="w-6 h-6" />
            </button>
          </div>
          <button className={`inline-flex ${isSaved ? "text-cyan-200" : "text-white"}`} onClick={onToggleSave} aria-label="Guardar">
            <Bookmark className={`w-6 h-6 ${isSaved ? "fill-cyan-200" : ""}`} />
          </button>
        </div>

        <p className="text-[14px] font-semibold text-white mt-2">{compactCount(post.likes_count)} Me gusta</p>
        <p className="text-[14px] leading-5 text-white mt-1 whitespace-pre-line">
          <span className="font-semibold mr-1">{post.username || "usuario"}</span>
          <MentionText text={post.caption} />
        </p>
        {(post.mentions ?? []).length > 0 ? (
          <div className="text-[14px] text-cyan-200 mt-1 flex flex-wrap gap-x-2 gap-y-1">
            {(post.mentions ?? []).map((mention) => (
              <Link
                key={`${post.id}-m2-${mention}`}
                href={`/${mention}`}
                className="text-cyan-200 hover:text-cyan-100"
              >
                @{mention}
              </Link>
            ))}
          </div>
        ) : null}

        <button onClick={onToggleComments} className="mt-1 text-[14px] text-gray-400 hover:text-gray-300 transition-colors">
          Ver los {compactCount(post.comments_count)} comentarios
        </button>

        {hasCarousel ? (
          <div className="mt-3 flex items-center justify-center gap-1.5">
            {mediaList.map((_, index) => (
              <button
                key={`${post.id}-dot-${index}`}
                onClick={() => setActiveMediaIndex(index)}
                className={`h-1.5 w-1.5 rounded-full ${
                  index === activeMediaIndex ? "bg-cyan-300" : "bg-white/35"
                }`}
                aria-label={`Ir a media ${index + 1}`}
              />
            ))}
          </div>
        ) : null}

        {commentsOpen ? (
          <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
            <div className="space-y-2 max-h-40 overflow-auto pr-1">
              {comments.length === 0 ? (
                <p className="text-xs text-gray-400">Sin comentarios aun.</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="frosted rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-400">{comment.user_id.slice(0, 8)}</p>
                    <p className="text-sm text-white whitespace-pre-line">{comment.content}</p>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <input
                value={commentInput}
                onChange={(e) => onCommentInputChange(e.target.value)}
                placeholder="Agrega un comentario..."
                className="frosted flex-1 rounded-lg px-3 py-2 text-white placeholder:text-gray-400"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onSubmitComment();
                  }
                }}
              />
              <button onClick={onSubmitComment} className="text-cyan-300 hover:text-cyan-200 px-2 text-sm font-semibold">
                Publicar
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </Glass>
  );
};

export default FeedPostCard;
