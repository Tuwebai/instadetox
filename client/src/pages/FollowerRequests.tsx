import { ChevronLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/AuthContext";
import { FollowRequestStatus, useFollowRequestsInbox } from "@/hooks/useFollowRequestsInbox";

const buildSeedAvatar = (seed: string, size: number) =>
  `https://api.dicebear.com/9.x/thumbs/png?seed=${encodeURIComponent(seed)}&size=${size}`;

const formatTimeLabel = (isoDate: string) => {
  const now = new Date();
  const date = new Date(isoDate);
  const msDiff = now.getTime() - date.getTime();
  const dayDiff = Math.floor(msDiff / (1000 * 60 * 60 * 24));

  if (dayDiff <= 0) return "hoy";
  if (dayDiff === 1) return "1 dia";
  if (dayDiff <= 7) return `${dayDiff} dias`;

  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" }).format(date).replace(".", "");
};

const getFollowRequestStatusLabel = (status: FollowRequestStatus) => {
  if (status === "pending") return "Solicitud pendiente";
  if (status === "accepted") return "Solicitud aceptada";
  if (status === "rejected") return "Solicitud rechazada";
  return "Solicitud cancelada";
};

const FollowerRequests = () => {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const {
    followRequests,
    followRequestsLoading,
    followRequestBusyById,
    handleFollowRequestAction,
    handleToggleFollowBack,
  } = useFollowRequestsInbox({
    userId: user?.id,
  });

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <div className="header-close">
          <button className="close-btn" aria-label="Volver" type="button" onClick={() => navigate("/notificaciones")}>
            <ChevronLeft size={16} />
          </button>
        </div>
        <div className="header-title">
          <h1 className="page-title">Solicitudes de seguidores</h1>
        </div>
      </div>

      {followRequestsLoading ? <p className="notifications-loading">Cargando solicitudes...</p> : null}
      {!followRequestsLoading && followRequests.length === 0 ? (
        <p className="notifications-loading">Sin historial de solicitudes.</p>
      ) : null}

      {followRequests.map((request) => {
        const busy = Boolean(followRequestBusyById[request.requester_id]);
        const statusIso = request.resolved_at ?? request.created_at;

        return (
          <div key={`fr-page-${request.requester_id}-${request.created_at}`} className="notification-item">
            <div className="notification-content">
              <div className="notification-avatars">
                <a className="avatar-link" href={`/${request.username}`}>
                  <img
                    className="avatar-img"
                    src={request.avatar_url ?? buildSeedAvatar(request.requester_id, 44)}
                    alt={`Foto del perfil de ${request.username}`}
                    width={44}
                    height={44}
                  />
                </a>
              </div>

              <div className="notification-text">
                <a className="username-link" href={`/${request.username}`}>
                  {request.username}
                </a>
                <div className="x1xmf6yo">
                  <span className="text-sm text-gray-300">{request.full_name || request.username}</span>
                </div>
                <div className="requests-subtext">
                  <span className="requests-names">
                    {getFollowRequestStatusLabel(request.status)} - {formatTimeLabel(statusIso)}
                  </span>
                </div>
              </div>

              {request.status === "pending" ? (
                <div className="flex items-center gap-2">
                  <button
                    className="btn-following"
                    type="button"
                    disabled={busy}
                    onClick={() => void handleFollowRequestAction(request.requester_id, "accepted")}
                  >
                    {busy ? "..." : "Confirmar"}
                  </button>
                  <button
                    className="btn-following"
                    type="button"
                    disabled={busy}
                    onClick={() => void handleFollowRequestAction(request.requester_id, "rejected")}
                  >
                    {busy ? "..." : "Eliminar"}
                  </button>
                </div>
              ) : (
                <div className="notification-action">
                  <button
                    className="btn-following"
                    type="button"
                    disabled={busy}
                    onClick={() => void handleToggleFollowBack(request.requester_id)}
                  >
                    {busy
                      ? "..."
                      : request.isFollowingByMe
                        ? "Siguiendo"
                        : request.isFollowPendingByMe
                          ? "Pendiente"
                          : "Seguir"}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default FollowerRequests;
