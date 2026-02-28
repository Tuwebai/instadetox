import { useEffect, useMemo, useState } from "react";
import { shortTimeAgo } from "@/components/feed/feedPostUtils";
import type { FeedPostCardRow, FeedPostComment } from "@/components/feed/feedPostTypes";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { prefetchProfileRouteSnapshot } from "@/lib/profileRouteCache";
import FeedTextPostReplyModal from "@/components/feed/FeedTextPostReplyModal";

interface FeedTextPostCardProps {
  post: FeedPostCardRow;
  currentUserId?: string;
  contextLabel?: string | null;
  isFollowingAuthor: boolean;
  isFollowPendingAuthor: boolean;
  isFavoriteAuthor: boolean;
  followLoading: boolean;
  isSaved: boolean;
  commentsOpen: boolean;
  comments: FeedPostComment[];
  commentInput: string;
  onToggleFollow: (authorId: string) => Promise<void> | void;
  onToggleLike: () => void;
  onToggleSave: () => void;
  onToggleComments: () => void;
  onShare: () => void;
  onCommentInputChange: (value: string) => void;
  onSubmitComment: () => void;
  onOpenPost: () => void;
  onWarmRoute?: () => void;
  onWarmProfileRoute?: () => void;
  onDeletePost: (postId: string) => Promise<boolean>;
  onReportPost: (postId: string, reportedUserId: string, reason: string) => Promise<boolean>;
  onToggleFavoriteAuthor: (authorId: string) => Promise<boolean>;
  onToggleHideLikeCount: (postId: string, nextValue: boolean) => Promise<boolean>;
  onToggleCommentsEnabled: (postId: string, nextValue: boolean) => Promise<boolean>;
  onEditPostCaption: (postId: string, nextCaption: string) => Promise<boolean>;
}

export default function FeedTextPostCard({
  post,
  currentUserId,
  contextLabel,
  isFollowingAuthor,
  isFollowPendingAuthor,
  isFavoriteAuthor,
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
  onOpenPost,
  onWarmRoute,
  onWarmProfileRoute,
  onDeletePost,
  onReportPost,
  onToggleFavoriteAuthor,
  onToggleHideLikeCount,
  onToggleCommentsEnabled,
  onEditPostCaption,
}: FeedTextPostCardProps) {
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [menuBusy, setMenuBusy] = useState(false);
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionDraft, setCaptionDraft] = useState(post.caption ?? "");
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);

  const isOwnPost = Boolean(currentUserId && post.user_id === currentUserId);
  const publishedAgo = useMemo(() => shortTimeAgo(post.created_at), [post.created_at]);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const commentsEnabled = post.comments_enabled !== false;
  const hideLikeCount = Boolean(post.hide_like_count);
  const postUrl = `${window.location.origin}/p/${post.id}`;

  useEffect(() => {
    setCaptionDraft(post.caption ?? "");
  }, [post.caption, post.id]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      toast({ title: "Enlace copiado", description: "Se copio el enlace de la publicacion." });
      setOptionsOpen(false);
    } catch {
      toast({ title: "Error", description: "No se pudo copiar el enlace." });
    }
  };

  const handleToggleFollowFromMenu = async () => {
    if (isOwnPost) return;
    if (!isFollowingAuthor && !isFollowPendingAuthor) {
      toast({ title: "Info", description: "No sigues a esta cuenta." });
      setOptionsOpen(false);
      return;
    }
    setMenuBusy(true);
    try {
      await onToggleFollow(post.user_id);
      setOptionsOpen(false);
    } finally {
      setMenuBusy(false);
    }
  };

  const handleDeletePost = async () => {
    if (!isOwnPost || menuBusy) return;
    setMenuBusy(true);
    try {
      const ok = await onDeletePost(post.id);
      if (ok) setOptionsOpen(false);
    } finally {
      setMenuBusy(false);
    }
  };

  const handleReportPost = async () => {
    if (menuBusy) return;
    setMenuBusy(true);
    try {
      const ok = await onReportPost(post.id, post.user_id, "menu_report");
      if (ok) setOptionsOpen(false);
    } finally {
      setMenuBusy(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (menuBusy) return;
    setMenuBusy(true);
    try {
      await onToggleFavoriteAuthor(post.user_id);
      setOptionsOpen(false);
    } finally {
      setMenuBusy(false);
    }
  };

  const handleToggleHideLikes = async () => {
    if (!isOwnPost || menuBusy) return;
    setMenuBusy(true);
    try {
      const ok = await onToggleHideLikeCount(post.id, !hideLikeCount);
      if (ok) setOptionsOpen(false);
    } finally {
      setMenuBusy(false);
    }
  };

  const handleToggleCommentsAvailability = async () => {
    if (!isOwnPost || menuBusy) return;
    setMenuBusy(true);
    try {
      const ok = await onToggleCommentsEnabled(post.id, !commentsEnabled);
      if (ok) setOptionsOpen(false);
    } finally {
      setMenuBusy(false);
    }
  };

  const handleSaveCaption = async () => {
    const nextCaption = captionDraft.trim();
    if (!nextCaption || nextCaption === post.caption) {
      setEditingCaption(false);
      return;
    }
    setMenuBusy(true);
    try {
      const ok = await onEditPostCaption(post.id, nextCaption);
      if (ok) {
        setEditingCaption(false);
        setOptionsOpen(false);
      }
    } finally {
      setMenuBusy(false);
    }
  };

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onWarmProfileRoute?.();
    const uname = post.username || "inicio";
    void prefetchProfileRouteSnapshot(uname, currentUserId ?? null);
    setLocation(`/${uname}`);
  };

  // SVGs clonados desde IG Threads Style
  const LikeIcon = post.likedByMe ? (
    <svg aria-label="Ya no me gusta" role="img" viewBox="0 0 48 48" className="w-[19px] h-[19px] text-[#ff3040] fill-current">
      <title>Ya no me gusta</title>
      <path d="M34.6 3.1c-4.5 0-7.9 1.8-10.6 5.6-2.7-3.7-6.1-5.5-10.6-5.5C6 3.1 0 9.6 0 17.6c0 7.3 5.4 12 10.6 16.5.6.5 1.3 1.1 1.9 1.7l2.3 2c4.4 3.9 6.6 5.9 7.6 6.5.5.3 1.1.5 1.6.5s1.1-.2 1.6-.5c1-.6 2.8-2.2 7.8-6.8l2-1.8c.7-.6 1.3-1.2 2-1.7C42.7 29.6 48 25 48 17.6c0-8-6-14.5-13.4-14.5z"></path>
    </svg>
  ) : (
    <svg aria-label="Me gusta" role="img" viewBox="-0.5 0 25 24" className="w-[19px] h-[19px] text-[#f5f5f5] fill-transparent stroke-current hover:text-[#a8a8a8] transition-colors">
      <title>Me gusta</title>
      <path d="M16.5 2C14.8335 2 13.2217 2.70703 12 3.93652C10.7783 2.70704 9.1665 2 7.5 2C3.3785 2 0.5 5.08423 0.5 9.5C0.5 14.1284 4.84516 19.4619 11.311 22.7719C11.5267 22.8827 11.7633 22.9379 12 22.9379C12.2367 22.9379 12.4733 22.8827 12.689 22.7719C19.1548 19.4619 23.5 14.1284 23.5 9.5C23.5 5.08423 20.6217 2 16.5 2ZM12 20.8764C6.30767 17.8962 2.5 13.3467 2.5 9.5C2.5 6.15893 4.4625 4 7.5 4C9.5 4 11.25 5.75 12 7.5C12.75 5.75 14.5 4 16.5 4C19.5377 4 21.5 6.15893 21.5 9.5C21.5 13.3467 17.6923 17.8962 12 20.8764Z" fill="currentColor"></path>
    </svg>
  );

  const ReplyIcon = (
    <svg aria-label="Responder" role="img" viewBox="0 0 24 24" className="w-[18px] h-[18px] text-[#f5f5f5] fill-current hover:text-[#a8a8a8] transition-colors">
      <title>Responder</title>
      <path clipRule="evenodd" d="M12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21C13.414 21 14.7492 20.6747 15.9373 20.0956C16.1277 20.0028 16.3428 19.9728 16.5514 20.0101L20.7565 20.7619L19.9927 16.5927C19.954 16.3815 19.9843 16.1633 20.0792 15.9707C20.6685 14.7742 21 13.4273 21 12C21 7.02944 16.9706 3 12 3ZM1 12C1 5.92486 5.92488 1 12 1C18.0752 1 23 5.92488 23 12C23 13.6205 22.649 15.1615 22.018 16.549L22.9836 21.8198C23.0427 22.1423 22.94 22.4733 22.7086 22.7056C22.4773 22.938 22.1468 23.0421 21.824 22.9844L16.512 22.0348C15.1341 22.6553 13.6061 23 12 23C5.92488 23 1 18.0752 1 12Z" fillRule="evenodd"></path>
    </svg>
  );

  const RepostIcon = (
    <svg aria-label="Repostear" role="img" viewBox="0 0 24 24" className="w-[18px] h-[18px] text-[#f5f5f5] fill-current hover:text-[#a8a8a8] transition-colors">
      <title>Repostear</title>
      <path d="M4.51617 6.9986C6.13179 4.58593 8.88099 2.99979 11.9995 2.99979C15.7267 2.99979 18.9259 5.26459 20.2927 8.49676C20.5079 9.00543 21.0946 9.24341 21.6033 9.0283C22.1119 8.81318 22.3499 8.22644 22.1348 7.71777C20.466 3.7716 16.5582 0.999786 11.9995 0.999786C8.27776 0.999786 4.9897 2.84823 2.99988 5.67416V2.9986C2.99988 2.44631 2.55216 1.9986 1.99988 1.9986C1.44759 1.9986 0.999878 2.44631 0.999878 2.9986V7.9986C0.999878 8.55088 1.44759 8.9986 1.99988 8.9986H6.99988C7.55216 8.9986 7.99988 8.55088 7.99988 7.9986C7.99988 7.44631 7.55216 6.9986 6.99988 6.9986H4.51617Z"></path><path d="M2.39572 14.9713C2.90439 14.7562 3.49113 14.9942 3.70625 15.5029C5.07309 18.735 8.27228 20.9998 11.9995 20.9998C15.118 20.9998 17.8672 19.4137 19.4828 17.001H16.9991C16.4468 17.001 15.9991 16.5533 15.9991 16.001C15.9991 15.4487 16.4468 15.001 16.9991 15.001H21.9991C22.5514 15.001 22.9991 15.4487 22.9991 16.001V21.001C22.9991 21.5533 22.5514 22.001 21.9991 22.001C21.4468 22.001 20.9991 21.5533 20.9991 21.001V18.3255C19.0093 21.1514 15.7212 22.9998 11.9995 22.9998C7.44077 22.9998 3.53298 20.228 1.86419 16.2818C1.64908 15.7732 1.88705 15.1864 2.39572 14.9713Z"></path>
    </svg>
  );

  const ShareIcon = (
    <svg aria-label="Compartir" role="img" viewBox="0 0 24 24" className="w-[18px] h-[18px] text-[#f5f5f5] fill-current hover:text-[#a8a8a8] transition-colors">
      <title>Compartir</title>
      <path clipRule="evenodd" d="M7.2474 1.49853C4.18324 -0.187039 0.600262 2.64309 1.53038 6.01431L3.18181 12L1.53038 17.9857C0.600277 21.3569 4.18324 24.1871 7.2474 22.5015L20.8245 15.0329C23.2153 13.7177 23.2153 10.2823 20.8244 8.96712L7.2474 1.49853ZM3.45835 5.48239C2.99873 3.81649 4.76927 2.41796 6.28345 3.25089L19.8605 10.7195C20.0016 10.7971 20.123 10.8923 20.2247 11H4.98064L3.45835 5.48239ZM4.98064 13L3.45835 18.5176C2.99873 20.1835 4.76927 21.5821 6.28345 20.7491L19.8605 13.2805C20.0016 13.2029 20.123 13.1078 20.2247 13H4.98064Z" fillRule="evenodd"></path>
    </svg>
  );

  const MoreIcon = (
    <svg aria-label="Más" role="img" viewBox="0 0 24 24" className="w-[20px] h-[20px] text-[#a8a8a8] fill-current hover:text-[#f5f5f5] transition-colors">
      <title>Más</title>
      <path clipRule="evenodd" d="M4 14C5.10457 14 6 13.1046 6 12C6 10.8954 5.10457 10 4 10C2.89543 10 2 10.8954 2 12C2 13.1046 2.89543 14 4 14ZM14 12C14 13.1046 13.1046 14 12 14C10.8954 14 10 13.1046 10 12C10 10.8954 10.8954 10 12 10C13.1046 10 14 10.8954 14 12ZM22 12C22 13.1046 21.1046 14 20 14C18.8954 14 18 13.1046 18 12C18 10.8954 18.8954 10 20 10C21.1046 10 22 10.8954 22 12Z" fillRule="evenodd"></path>
    </svg>
  );

  const AvatarIcon = (
    <img 
      src={post.avatar_url || "/avatar_fallback.jpg"} 
      alt={post.username || "Usuario"} 
      className="w-9 h-9 object-cover rounded-full select-none bg-[#1e293b]" 
      draggable={false} 
    />
  );

  return (
    <article 
      className="w-full max-w-[535px] mx-auto border-b border-white/[0.12] pt-4 pb-2 px-4 hover:bg-white/[0.02] transition-colors relative"
      onMouseEnter={() => onWarmRoute?.()} 
      onFocusCapture={() => onWarmRoute?.()}
    >
      <div className="flex flex-row gap-3">
        
        {/* AVATAR COLUMN */}
        <div className="flex flex-col items-center flex-shrink-0 cursor-pointer" onClick={handleProfileClick}>
          {AvatarIcon}
          {commentsOpen ? (
            <div className="w-[1.5px] bg-[#333638] flex-1 mt-2 mb-1 rounded-full" />
          ) : (
            post.comments_count > 0 && <div className="w-[1.5px] bg-[#333638] flex-1 mt-2 mb-1 rounded-full" />
          )}
        </div>

        {/* CONTENT COLUMN */}
        <div className="flex flex-col flex-1 pb-1 min-w-0">
          
          {/* HEADER: username and time */}
          <div className="flex flex-row items-center justify-between mb-[2px]">
            <div className="flex items-center gap-1 min-w-0 pr-2 cursor-pointer group" onClick={handleProfileClick}>
              <span className="font-semibold text-[15px] leading-[20px] text-[#f5f5f5] hover:underline truncate">
                {post.username}
              </span>
              {contextLabel && (
                <span className="text-xs font-semibold text-gray-500 whitespace-nowrap bg-white/5 px-1.5 py-0.5 rounded ml-1">
                  {contextLabel}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-[#a8a8a8] text-[15px] leading-[20px] whitespace-nowrap cursor-pointer hover:text-white transition-colors" onClick={onOpenPost}>
                {publishedAgo}
              </span>
              <button onClick={(e) => { e.stopPropagation(); setOptionsOpen(true); }} className="hover:bg-white/10 rounded-full p-1 -mr-1 transition-colors">
                {MoreIcon}
              </button>
            </div>
          </div>

          {/* CAPTION (Text Content) */}
          <div className="text-[15px] leading-[21px] text-[#f5f5f5] whitespace-pre-wrap break-words mt-0.5 cursor-pointer" onClick={onOpenPost}>
            {post.caption}
          </div>

          {/* ACTIONS (Likes, replies, shares) */}
          <div className="flex flex-row items-center gap-4 mt-3 mb-1">
            <button 
              className="flex items-center gap-1.5 text-[#a8a8a8] hover:text-[#f5f5f5] transition-colors"
              onClick={(e) => { e.stopPropagation(); onToggleLike(); }}
            >
              {LikeIcon}
              {!hideLikeCount && post.likes_count > 0 && (
                <span className="text-[13px] font-medium leading-[14px] mt-0.5">{post.likes_count}</span>
              )}
            </button>
            
            <button 
              className="flex items-center gap-1.5 text-[#a8a8a8] hover:text-[#f5f5f5] transition-colors"
              onClick={(e) => { e.stopPropagation(); setIsReplyModalOpen(true); }}
            >
              {ReplyIcon}
              {post.comments_count > 0 && (
                <span className="text-[13px] font-medium leading-[14px] mt-0.5">{post.comments_count}</span>
              )}
            </button>

            <button className="flex items-center text-[#a8a8a8] hover:text-[#f5f5f5] transition-colors" onClick={(e) => { e.stopPropagation(); }}>
              {RepostIcon}
            </button>

            <button className="flex items-center text-[#a8a8a8] hover:text-[#f5f5f5] transition-colors" onClick={(e) => { e.stopPropagation(); onShare(); }}>
              {ShareIcon}
            </button>
          </div>
        </div>
      </div>

      {/* COMMENTS INLINE COMPOSER */}
      {commentsOpen && (
        <div className="flex flex-row gap-3 mt-1 ml-[46px] pb-3">
          <div className="flex-1">
            {commentsEnabled ? (
              <div className="flex items-center gap-2 bg-[#1e293b] rounded-2xl px-3 py-1.5 border border-white/5">
                <input
                  value={commentInput}
                  onChange={(e) => onCommentInputChange(e.target.value)}
                  placeholder="Responder..."
                  className="flex-1 bg-transparent text-[14px] leading-5 text-white placeholder:text-gray-500 outline-none h-8"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && commentInput.trim()) {
                      e.preventDefault();
                      onSubmitComment();
                    }
                  }}
                />
                <button 
                  onClick={onSubmitComment} 
                  disabled={!commentInput.trim()}
                  className="text-cyan-400 hover:text-cyan-300 disabled:text-cyan-800 disabled:hover:text-cyan-800 text-sm font-semibold transition-colors px-1"
                >
                  Publicar
                </button>
              </div>
            ) : (
              <p className="text-[13px] text-gray-500 italic px-1 pt-1">
                Los comentarios están desactivados.
              </p>
            )}
          </div>
        </div>
      )}

      {/* OPTIONS MODAL OVERLAY (mismo código que original) */}
      {optionsOpen && (
        <div className="ig-post-options-overlay" onClick={() => (menuBusy ? null : setOptionsOpen(false))}>
          <div className="ig-post-options-modal" onClick={(event) => event.stopPropagation()}>
            {isOwnPost ? (
              <>
                <button type="button" disabled={menuBusy} className="ig-post-options-item is-danger" onClick={() => void handleDeletePost()}>
                  {menuBusy ? "Eliminando..." : "Eliminar"}
                </button>
                <button type="button" className="ig-post-options-item" onClick={() => setEditingCaption(true)}>
                  Editar
                </button>
                <button type="button" disabled={menuBusy} className="ig-post-options-item" onClick={() => void handleToggleHideLikes()}>
                  {hideLikeCount ? "Mostrar recuento de Me gusta" : "Ocultar recuento de Me gusta"}
                </button>
                <button type="button" disabled={menuBusy} className="ig-post-options-item" onClick={() => void handleToggleCommentsAvailability()}>
                  {commentsEnabled ? "Desactivar comentarios" : "Activar comentarios"}
                </button>
                <button type="button" className="ig-post-options-item" onClick={onOpenPost}>
                  Ir a la publicacion
                </button>
                <button type="button" className="ig-post-options-item" onClick={onShare}>
                  Compartir en...
                </button>
                <button type="button" className="ig-post-options-item" onClick={() => void handleCopyLink()}>
                  Copiar enlace
                </button>
                <button
                  type="button"
                  className="ig-post-options-item"
                  onClick={() => {
                    const targetUsername = (post.username ?? "").trim().toLowerCase();
                    if (targetUsername) {
                      void prefetchProfileRouteSnapshot(targetUsername, currentUserId ?? null);
                    }
                    setLocation(`/${post.username || "inicio"}`);
                    setOptionsOpen(false);
                  }}
                >
                  Informacion sobre esta cuenta
                </button>
                <button type="button" className="ig-post-options-item" onClick={() => setOptionsOpen(false)}>
                  Cancelar
                </button>
              </>
            ) : (
              <>
                <button type="button" disabled={menuBusy} className="ig-post-options-item is-danger" onClick={() => void handleReportPost()}>
                  {menuBusy ? "Enviando..." : "Reportar"}
                </button>
                <button type="button" disabled={menuBusy} className="ig-post-options-item is-danger" onClick={() => void handleToggleFollowFromMenu()}>
                  {menuBusy ? "Procesando..." : "Deja de seguir"}
                </button>
                <button type="button" disabled={menuBusy} className="ig-post-options-item" onClick={() => void handleToggleFavorite()}>
                  {isFavoriteAuthor ? "Quitar de favoritos" : "Agregar a favoritos"}
                </button>
                <button type="button" className="ig-post-options-item" onClick={onOpenPost}>
                  Ir a la publicacion
                </button>
                <button type="button" className="ig-post-options-item" onClick={onShare}>
                  Compartir en...
                </button>
                <button type="button" className="ig-post-options-item" onClick={() => void handleCopyLink()}>
                  Copiar enlace
                </button>
                <button
                  type="button"
                  className="ig-post-options-item"
                  onClick={() => {
                    const targetUsername = (post.username ?? "").trim().toLowerCase();
                    if (targetUsername) {
                      void prefetchProfileRouteSnapshot(targetUsername, currentUserId ?? null);
                    }
                    setLocation(`/${post.username || "inicio"}`);
                    setOptionsOpen(false);
                  }}
                >
                  Informacion sobre esta cuenta
                </button>
                <button type="button" className="ig-post-options-item" onClick={() => setOptionsOpen(false)}>
                  Cancelar
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* EDIT MODAL OVERLAY */}
      {editingCaption && (
        <div className="ig-post-options-overlay" onClick={() => (menuBusy ? null : setEditingCaption(false))}>
          <div className="ig-post-edit-modal" onClick={(event) => event.stopPropagation()}>
            <h3 className="ig-post-edit-title">Editar publicacion</h3>
            <textarea
              value={captionDraft}
              onChange={(event) => setCaptionDraft(event.target.value)}
              className="ig-post-edit-textarea"
              placeholder="Escribe una descripcion..."
              rows={6}
              maxLength={2200}
            />
            <div className="ig-post-edit-actions">
              <button type="button" className="ig-post-edit-btn" onClick={() => setEditingCaption(false)} disabled={menuBusy}>
                Cancelar
              </button>
              <button type="button" className="ig-post-edit-btn is-primary" onClick={() => void handleSaveCaption()} disabled={menuBusy}>
                {menuBusy ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <FeedTextPostReplyModal
        post={post}
        isOpen={isReplyModalOpen}
        onClose={() => setIsReplyModalOpen(false)}
        commentInput={commentInput}
        onCommentInputChange={onCommentInputChange}
        onSubmitComment={onSubmitComment}
        isSubmitting={menuBusy}
      />
    </article>
  );
}
