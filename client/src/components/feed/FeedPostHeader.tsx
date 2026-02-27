import { MoreHorizontal } from "lucide-react";
import { Link } from "wouter";

interface FeedPostHeaderProps {
  username: string | null;
  avatarUrl: string | null;
  publishedAgo: string;
  contextLabel?: string | null;
  isOwnPost: boolean;
  isFollowingAuthor: boolean;
  isFollowPendingAuthor: boolean;
  followLoading: boolean;
  onWarmProfileRoute?: () => void;
  onToggleFollow: () => void;
  onOpenOptions: () => void;
}

const profileHref = (username: string | null | undefined) => (username ? `/${username}` : "/inicio");

const FeedPostHeader = ({
  username,
  avatarUrl,
  publishedAgo,
  contextLabel,
  isOwnPost,
  isFollowingAuthor,
  isFollowPendingAuthor,
  followLoading,
  onWarmProfileRoute,
  onToggleFollow,
  onOpenOptions,
}: FeedPostHeaderProps) => {
  return (
    <header className="ig-post-header">
      <div className="ig-post-avatar">
        {avatarUrl ? <img src={avatarUrl} alt={username ?? "avatar"} className="h-full w-full object-cover" /> : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="ig-post-userline">
          <Link
            href={profileHref(username)}
            className="ig-post-username"
            onMouseEnter={onWarmProfileRoute}
            onFocus={onWarmProfileRoute}
            onTouchStart={onWarmProfileRoute}
          >
            {username || "usuario"}
          </Link>
          <span className="ig-post-dot-sep"> • </span>
          <span className="ig-post-time">{publishedAgo}</span>
        </div>
        {contextLabel ? <p className="ig-post-subtitle">{contextLabel}</p> : null}
      </div>
      {!isOwnPost ? (
        <button onClick={onToggleFollow} disabled={followLoading} className="ig-post-follow-btn">
          {followLoading ? "..." : isFollowingAuthor ? "Siguiendo" : isFollowPendingAuthor ? "Pendiente" : "Seguir"}
        </button>
      ) : null}
      <button className="ig-post-icon-btn" aria-label="Mas opciones" type="button" onClick={onOpenOptions}>
        <MoreHorizontal className="w-4 h-4" />
      </button>
    </header>
  );
};

export default FeedPostHeader;
