import { Search as SearchIcon, X } from "lucide-react";
import { Link } from "wouter";

interface ConnectionUser {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  isPrivate: boolean;
  isFollowingByMe: boolean;
  isFollowPendingByMe: boolean;
}

interface ProfileConnectionsModalProps {
  open: boolean;
  type: "followers" | "following";
  loading: boolean;
  query: string;
  filteredConnections: ConnectionUser[];
  suggestions: ConnectionUser[];
  actionLoadingById: Record<string, boolean>;
  isOwnProfile: boolean;
  currentUserId: string | null | undefined;
  onClose: () => void;
  onQueryChange: (value: string) => void;
  onToggleFollow: (targetId: string, fromSuggestion?: boolean) => void | Promise<void>;
  onRemoveFollower: (targetId: string) => void | Promise<void>;
}

const ProfileConnectionsModal = ({
  open,
  type,
  loading,
  query,
  filteredConnections,
  suggestions,
  actionLoadingById,
  isOwnProfile,
  currentUserId,
  onClose,
  onQueryChange,
  onToggleFollow,
  onRemoveFollower,
}: ProfileConnectionsModalProps) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm p-3 sm:p-4 flex items-center justify-center" onClick={onClose}>
      <div
        className="w-full max-w-[520px] max-h-[78vh] rounded-2xl overflow-hidden border border-white/15 bg-slate-900/95 flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative h-12 border-b border-white/10 flex items-center justify-center">
          <h3 className="text-[16px] font-semibold text-white">{type === "followers" ? "Seguidores" : "Seguidos"}</h3>
          <button
            type="button"
            onClick={onClose}
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
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Buscar"
              className="w-full h-9 rounded-md bg-white/10 border border-white/10 pl-9 pr-3 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
            />
          </div>
        </div>

        <div className="overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="py-8 text-center text-sm text-gray-300">Cargando lista...</div>
          ) : filteredConnections.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-300">
              {query.trim() ? "Sin resultados para esa busqueda." : "No hay usuarios para mostrar."}
            </div>
          ) : (
            filteredConnections.map((row) => {
              const actionLoading = Boolean(actionLoadingById[row.id]);
              const canRemoveFollower = type === "followers" && isOwnProfile && row.id !== currentUserId;
              const showFollowAction = !canRemoveFollower && row.id !== currentUserId;
              const showInlineFollowInFollowers =
                type === "followers" &&
                row.id !== currentUserId &&
                !row.isFollowingByMe &&
                !row.isFollowPendingByMe;

              return (
                <div key={`${type}-${row.id}`} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-white/5">
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
                            void onToggleFollow(row.id);
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
                        void onRemoveFollower(row.id);
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
                        void onToggleFollow(row.id);
                      }}
                      className={`h-8 px-3 rounded-lg text-sm font-semibold ${
                        row.isFollowingByMe || row.isFollowPendingByMe
                          ? "bg-white/10 text-white hover:bg-white/20"
                          : "bg-blue-500 text-white hover:bg-blue-400"
                      } disabled:opacity-60`}
                    >
                      {actionLoading ? "..." : row.isFollowingByMe ? "Siguiendo" : row.isFollowPendingByMe ? "Pendiente" : "Seguir"}
                    </button>
                  ) : null}
                </div>
              );
            })
          )}

          {!query.trim() && suggestions.length > 0 ? (
            <div className="pt-3 mt-2 border-t border-white/10">
              <p className="text-[15px] font-semibold text-white mb-2">Sugerencias para ti</p>
              <div className="space-y-2">
                {suggestions.map((row) => {
                  const actionLoading = Boolean(actionLoadingById[row.id]);
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
                          void onToggleFollow(row.id, true);
                        }}
                        className={`h-8 px-3 rounded-lg text-sm font-semibold ${
                          row.isFollowingByMe || row.isFollowPendingByMe
                            ? "bg-white/10 text-white hover:bg-white/20"
                            : "bg-blue-500 text-white hover:bg-blue-400"
                        } disabled:opacity-60`}
                      >
                        {actionLoading ? "..." : row.isFollowingByMe ? "Siguiendo" : row.isFollowPendingByMe ? "Pendiente" : "Seguir"}
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
  );
};

export default ProfileConnectionsModal;
