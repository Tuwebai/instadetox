import { X } from "lucide-react";
import { Link } from "wouter";

interface CommentLikesUser {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  isPrivate: boolean;
  isFollowingByMe: boolean;
  isFollowPendingByMe: boolean;
}

interface CommentLikesModalProps {
  open: boolean;
  users: CommentLikesUser[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  hasCursor: boolean;
  commentId: string | null;
  currentUserId: string | null | undefined;
  actionBusyById: Record<string, boolean>;
  onClose: () => void;
  onToggleFollow: (targetId: string) => void | Promise<void>;
  onLoadMore: () => void | Promise<void>;
}

const CommentLikesModal = ({
  open,
  users,
  loading,
  loadingMore,
  hasMore,
  hasCursor,
  commentId,
  currentUserId,
  actionBusyById,
  onClose,
  onToggleFollow,
  onLoadMore,
}: CommentLikesModalProps) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm p-3 sm:p-4 flex items-center justify-center" onClick={onClose}>
      <div
        className="w-full max-w-[520px] max-h-[70vh] rounded-2xl overflow-hidden border border-white/15 bg-slate-900/95 flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative h-12 border-b border-white/10 flex items-center justify-center">
          <h3 className="text-[16px] font-semibold text-white">Me gusta</h3>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md border border-white/30 hover:bg-white/10"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-invisible px-3 py-2">
          {loading ? (
            <p className="text-sm text-gray-400 py-4 text-center">Cargando...</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Este comentario aun no tiene me gusta.</p>
          ) : (
            <div className="space-y-2">
              <ul className="space-y-1.5">
                {users.map((row) => {
                  const actionLoading = Boolean(actionBusyById[row.id]);
                  const isSelf = row.id === currentUserId;
                  return (
                    <li key={`comment-like-${commentId}-${row.id}`} className="flex items-center gap-3 px-2 py-2">
                      <Link href={`/${row.username}`} className="w-11 h-11 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center flex-shrink-0">
                        {row.avatar_url ? (
                          <img src={row.avatar_url} alt={row.username} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm text-white">{row.username.slice(0, 1).toUpperCase()}</span>
                        )}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link href={`/${row.username}`} className="block text-sm font-semibold text-white truncate hover:text-cyan-200">
                          {row.username}
                        </Link>
                        <p className="text-xs text-gray-400 truncate">{row.full_name || row.username}</p>
                      </div>
                      {isSelf ? null : (
                        <button
                          type="button"
                          onClick={() => void onToggleFollow(row.id)}
                          disabled={actionLoading}
                          className={`h-8 px-4 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 ${
                            row.isFollowingByMe || row.isFollowPendingByMe
                              ? "bg-white/10 text-white hover:bg-white/20"
                              : "bg-blue-500 text-white hover:bg-blue-400"
                          }`}
                        >
                          {actionLoading ? "..." : row.isFollowingByMe ? "Siguiendo" : row.isFollowPendingByMe ? "Pendiente" : "Seguir"}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
              {hasMore ? (
                <div className="px-2 py-2">
                  <button
                    type="button"
                    onClick={() => void onLoadMore()}
                    disabled={loadingMore || !hasCursor}
                    className="w-full h-9 rounded-md border border-white/15 text-sm font-semibold text-gray-200 hover:bg-white/10 disabled:opacity-60"
                  >
                    {loadingMore ? "Cargando..." : "Ver mas"}
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommentLikesModal;
