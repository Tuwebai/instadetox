import { Bookmark, ChevronLeft, ChevronRight, Heart, MessageCircle, MoreHorizontal, Send, X } from "lucide-react";
import type { MutableRefObject } from "react";
import { Link } from "wouter";
import MentionText from "@/components/ui/mention-text";

interface ProfilePostModalPost {
  id: string;
  title: string | null;
  caption: string;
  media_url: string | null;
  mentions?: string[] | null;
  likes_count: number;
  comments_count: number;
  comments_enabled?: boolean;
  created_at: string;
}

interface ProfilePostModalProfile {
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface ProfilePostModalComment {
  id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  likes_count: number;
  liked_by_me: boolean;
}

interface ProfilePostModalProps {
  modalPost: ProfilePostModalPost | null;
  profileData: ProfilePostModalProfile;
  activeTabPostsLength: number;
  modalCommentsScrollRef: MutableRefObject<HTMLDivElement | null>;
  modalCommentInputRef: MutableRefObject<HTMLInputElement | null>;
  modalCommentsLoading: boolean;
  modalComments: ProfilePostModalComment[];
  modalCommentsHasMore: boolean;
  modalCommentsLoadingMore: boolean;
  modalRepliesByParentId: Map<string, ProfilePostModalComment[]>;
  modalTopLevelComments: ProfilePostModalComment[];
  expandedRepliesByCommentId: Record<string, boolean>;
  forcedVisibleReplyIdsByParent: Record<string, string[]>;
  openCommentMenuId: string | null;
  commentMenuBusyById: Record<string, boolean>;
  modalCommentActionBusyById: Record<string, boolean>;
  currentUserId: string | null | undefined;
  modalLikeBusy: boolean;
  modalLikedByMe: boolean;
  modalSaveBusy: boolean;
  modalSavedByMe: boolean;
  modalCommentInput: string;
  parseMediaList: (mediaUrl: string | null) => string[];
  isVideoUrl: (mediaUrl: string | null) => boolean;
  formatRelativeTime: (isoDate: string) => string;
  formatCompact: (value: number) => string;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onCommentsScroll: () => void;
  onLoadOlderComments: (postId: string) => void | Promise<void>;
  onOpenCommentLikesModal: (commentId: string) => void | Promise<void>;
  onSetReplyTarget: (commentId: string, username: string) => void;
  onToggleCommentMenu: (commentId: string) => void;
  onDeleteComment: (commentId: string) => void | Promise<void>;
  onOpenReportCommentModal: (commentId: string) => void;
  onToggleRepliesVisibility: (commentId: string) => void;
  onToggleCommentLike: (commentId: string) => void | Promise<void>;
  onToggleLike: () => void | Promise<void>;
  onFocusCommentInput: () => void;
  onShare: () => void | Promise<void>;
  onToggleSave: () => void | Promise<void>;
  onCommentInputChange: (value: string) => void;
  onSubmitComment: () => void | Promise<void>;
}

const ProfilePostModal = ({
  modalPost,
  profileData,
  activeTabPostsLength,
  modalCommentsScrollRef,
  modalCommentInputRef,
  modalCommentsLoading,
  modalComments,
  modalCommentsHasMore,
  modalCommentsLoadingMore,
  modalRepliesByParentId,
  modalTopLevelComments,
  expandedRepliesByCommentId,
  forcedVisibleReplyIdsByParent,
  openCommentMenuId,
  commentMenuBusyById,
  modalCommentActionBusyById,
  currentUserId,
  modalLikeBusy,
  modalLikedByMe,
  modalSaveBusy,
  modalSavedByMe,
  modalCommentInput,
  parseMediaList,
  isVideoUrl,
  formatRelativeTime,
  formatCompact,
  onClose,
  onPrev,
  onNext,
  onCommentsScroll,
  onLoadOlderComments,
  onOpenCommentLikesModal,
  onSetReplyTarget,
  onToggleCommentMenu,
  onDeleteComment,
  onOpenReportCommentModal,
  onToggleRepliesVisibility,
  onToggleCommentLike,
  onToggleLike,
  onFocusCommentInput,
  onShare,
  onToggleSave,
  onCommentInputChange,
  onSubmitComment,
}: ProfilePostModalProps) => {
  if (!modalPost) return null;

  // Precalcular si el post tiene recursos multimedia para ajustar el layout
  const modalMediaList = parseMediaList(modalPost.media_url);
  const modalMedia = modalMediaList[0] ?? null;
  const hasMedia = Boolean(modalMedia);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm p-3 sm:p-6 flex items-center justify-center" onClick={onClose}>
      <div className={`relative w-full ${hasMedia ? "max-w-5xl" : "max-w-xl"} h-[min(88vh,900px)] rounded-xl overflow-hidden border border-white/20 bg-slate-950/95`} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-black/70 hover:bg-black"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        {activeTabPostsLength > 1 ? (
          <>
            <button
              type="button"
              onClick={onPrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-black/70 hover:bg-black"
              aria-label="Anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={onNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-black/70 hover:bg-black"
              aria-label="Siguiente"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        ) : null}

        <div className={`grid ${hasMedia ? "grid-cols-1 md:grid-cols-[minmax(0,1fr)_360px]" : "grid-cols-1"} h-full min-h-0`}>
          {hasMedia && (
            <div className="bg-black min-h-[240px] md:min-h-0 md:h-full flex items-center justify-center">
              {isVideoUrl(modalMedia) ? (
                <video src={modalMedia} className="w-full h-full max-h-[80vh] object-contain" controls autoPlay playsInline />
              ) : (
                <img src={modalMedia} alt={modalPost.title ?? "post"} className="w-full h-full max-h-[80vh] object-contain" />
              )}
            </div>
          )}

          <div className={`${hasMedia ? "border-t md:border-t-0 md:border-l" : ""} border-white/10 flex flex-col min-h-0 h-full`}>
            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
                <img src={profileData.avatar_url || "/avatar_fallback.jpg"} alt={profileData.username} className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{profileData.username}</p>
                <p className="text-xs text-gray-400 truncate">{profileData.full_name || "Usuario InstaDetox"}</p>
              </div>
            </div>

            <div
              ref={modalCommentsScrollRef}
              onScroll={onCommentsScroll}
              className="px-4 py-3 border-b border-white/10 overflow-y-auto scrollbar-invisible flex-1 min-h-0 max-h-[40vh] md:max-h-none space-y-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 flex items-center justify-center flex-shrink-0">
                  <img src={profileData.avatar_url || "/avatar_fallback.jpg"} alt={profileData.username} className="w-full h-full object-cover" />
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
                <>
                  {modalCommentsHasMore ? (
                    <div className="pb-1">
                      <button
                        type="button"
                        onClick={() => {
                          void onLoadOlderComments(modalPost.id);
                        }}
                        disabled={modalCommentsLoadingMore}
                        className="text-xs font-semibold text-cyan-300 hover:text-cyan-200 disabled:opacity-60"
                      >
                        {modalCommentsLoadingMore ? "Cargando..." : "Ver comentarios anteriores"}
                      </button>
                    </div>
                  ) : null}
                  {(() => {
                    const renderCommentNode = (comment: ProfilePostModalComment, depth = 0): JSX.Element => {
                      const replies = modalRepliesByParentId.get(comment.id) ?? [];
                      const repliesExpanded = Boolean(expandedRepliesByCommentId[comment.id]);
                      const forcedVisibleReplyIds = forcedVisibleReplyIdsByParent[comment.id] ?? [];
                      const forcedVisibleReplies = replies.filter((reply) => forcedVisibleReplyIds.includes(reply.id));
                      const visibleReplies = repliesExpanded ? replies : forcedVisibleReplies;
                      const showReplies = visibleReplies.length > 0;
                      const isOwnComment = comment.user_id === currentUserId;
                      const menuBusy = Boolean(commentMenuBusyById[comment.id]);

                      return (
                        <div key={comment.id} className="space-y-1.5" style={{ paddingLeft: depth > 0 ? depth * 16 : 0 }}>
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 flex items-center justify-center flex-shrink-0">
                              <img src={comment.avatar_url || "/avatar_fallback.jpg"} alt={comment.username} className="w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="min-w-0 text-sm leading-5">
                                <Link href={`/${comment.username}`} className="font-semibold text-white mr-1 hover:text-cyan-200">
                                  {comment.username}
                                </Link>
                                <span className="text-white whitespace-pre-line">{comment.content}</span>
                              </div>
                              <div className="mt-1 flex items-center gap-3 text-[11px] text-gray-400">
                                <span>{formatRelativeTime(comment.created_at)}</span>
                                {comment.likes_count > 0 ? (
                                  <button
                                    type="button"
                                    onClick={() => void onOpenCommentLikesModal(comment.id)}
                                    className="font-semibold hover:text-gray-200 transition-colors"
                                  >
                                    {comment.likes_count} Me gusta
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() => onSetReplyTarget(comment.id, comment.username)}
                                  className="font-semibold hover:text-gray-200 transition-colors"
                                >
                                  Responder
                                </button>
                                <div className="relative" data-comment-menu>
                                  <button
                                    type="button"
                                    onClick={() => onToggleCommentMenu(comment.id)}
                                    className="inline-flex items-center text-gray-400 hover:text-gray-200 transition-colors"
                                    aria-label="Opciones del comentario"
                                  >
                                    <MoreHorizontal className="w-3.5 h-3.5" />
                                  </button>
                                  {openCommentMenuId === comment.id ? (
                                    <div className="absolute right-0 top-6 z-20 min-w-[150px] rounded-md border border-white/15 bg-slate-900/95 shadow-lg overflow-hidden">
                                      {isOwnComment ? (
                                        <button
                                          type="button"
                                          onClick={() => void onDeleteComment(comment.id)}
                                          disabled={menuBusy}
                                          className="w-full text-left px-3 py-2 text-sm text-red-300 hover:bg-white/10 disabled:opacity-60"
                                        >
                                          {menuBusy ? "Eliminando..." : "Eliminar"}
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => onOpenReportCommentModal(comment.id)}
                                          className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-white/10"
                                        >
                                          Reportar
                                        </button>
                                      )}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                              {replies.length > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => onToggleRepliesVisibility(comment.id)}
                                  className="mt-1.5 inline-flex items-center gap-2 text-[11px] text-gray-400 hover:text-gray-200 transition-colors"
                                >
                                  <span className="inline-block w-6 h-px bg-gray-500/50" />
                                  {repliesExpanded ? "Ocultar respuestas" : `Ver respuestas (${replies.length})`}
                                </button>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              onClick={() => void onToggleCommentLike(comment.id)}
                              disabled={Boolean(modalCommentActionBusyById[comment.id])}
                              className={`pt-1 transition-colors disabled:opacity-50 ${
                                comment.liked_by_me ? "text-red-400" : "text-gray-400 hover:text-gray-200"
                              }`}
                              aria-label="Me gusta comentario"
                            >
                              <Heart className={`w-3.5 h-3.5 ${comment.liked_by_me ? "fill-red-400" : ""}`} />
                            </button>
                          </div>

                          {showReplies ? <div className="space-y-2">{visibleReplies.map((reply) => renderCommentNode(reply, depth + 1))}</div> : null}
                        </div>
                      );
                    };

                    return modalTopLevelComments.map((comment) => renderCommentNode(comment, 0));
                  })()}
                </>
              )}
            </div>

            <div className="px-4 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => void onToggleLike()}
                    disabled={modalLikeBusy}
                    className={`${modalLikedByMe ? "text-red-400" : "text-white"} disabled:opacity-60`}
                    aria-label="Like"
                  >
                    <Heart className={`w-6 h-6 ${modalLikedByMe ? "fill-red-400" : ""}`} />
                  </button>
                  <button type="button" onClick={onFocusCommentInput} className="inline-flex text-white" aria-label="Comentar">
                    <MessageCircle className="w-6 h-6" />
                  </button>
                  <button type="button" onClick={() => void onShare()} className="inline-flex text-white" aria-label="Compartir">
                    <Send className="w-6 h-6" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => void onToggleSave()}
                  disabled={modalSaveBusy}
                  className={`inline-flex ${modalSavedByMe ? "text-cyan-300" : "text-white"} disabled:opacity-60`}
                  aria-label="Guardar"
                >
                  <Bookmark className={`w-6 h-6 ${modalSavedByMe ? "fill-cyan-300" : ""}`} />
                </button>
              </div>
              {modalPost.likes_count > 0 ? (
                <p className="text-sm font-semibold text-white mt-2">{formatCompact(modalPost.likes_count)} Me gusta</p>
              ) : (
                <p className="text-sm text-gray-200 mt-2">
                  Sé el primero en{" "}
                  <button
                    type="button"
                    onClick={() => void onToggleLike()}
                    disabled={modalLikeBusy}
                    className="font-semibold text-white hover:text-cyan-200 disabled:opacity-60"
                  >
                    indicar que te gusta esto
                  </button>
                </p>
              )}
              <p className="text-[11px] text-gray-400 mt-1">{formatRelativeTime(modalPost.created_at)}</p>
            </div>

            <div className="px-4 py-3 border-t border-white/10">
              {modalPost.comments_enabled === false ? (
                <p className="text-sm text-gray-400">Comentarios desactivados.</p>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    ref={modalCommentInputRef}
                    value={modalCommentInput}
                    onChange={(event) => onCommentInputChange(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void onSubmitComment();
                      }
                    }}
                    placeholder="Agrega un comentario..."
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => void onSubmitComment()}
                    disabled={!modalCommentInput.trim()}
                    className="text-sm font-semibold text-cyan-300 hover:text-cyan-200 disabled:opacity-40"
                  >
                    Publicar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePostModal;
