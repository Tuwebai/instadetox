import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/AuthContext";
import { useFollowRequestsInbox } from "@/hooks/useFollowRequestsInbox";
import { supabase } from "@/lib/supabase";

interface NotificationItem {
  id: string;
  actor_id: string | null;
  post_id: string | null;
  type: "like" | "comment" | "follow" | "message" | "system" | "goal_reminder";
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
}

interface NotificationActor {
  id: string;
  username: string;
  avatar_url: string | null;
}

interface NotificationPostMedia {
  id: string;
  media_url: string | null;
  video_cover_url?: string | null;
}

interface NotificationsCacheSnapshot {
  items: NotificationItem[];
  actorById: Record<string, NotificationActor>;
  postMediaById: Record<string, string | null>;
  followingActorIds: string[];
  pendingActorIds: string[];
}

type NotificationSection = "Esta semana" | "Este mes" | "Anteriores";

const buildSeedAvatar = (seed: string, size: number) =>
  `https://api.dicebear.com/9.x/thumbs/png?seed=${encodeURIComponent(seed)}&size=${size}`;
const POSTS_MEDIA_BUCKET = (import.meta.env.VITE_SUPABASE_POSTS_BUCKET as string | undefined)?.trim() || "post-media";

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
            if (item && typeof item === "object" && "url" in item && typeof (item as { url: unknown }).url === "string") {
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

let notificationsCache: NotificationsCacheSnapshot | null = null;

const isVideoUrl = (value: string) => /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(value) || value.includes(".m3u8");

const resolveStoragePublicUrl = (candidate: string | null): string | null => {
  if (!candidate) return null;
  const raw = candidate.trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw) || raw.startsWith("data:") || raw.startsWith("blob:")) return raw;
  if (!supabase) return raw;
  const path = raw.replace(/^\/+/, "");
  const { data } = supabase.storage.from(POSTS_MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl || raw;
};

const getSectionLabel = (isoDate: string): NotificationSection => {
  const now = new Date();
  const date = new Date(isoDate);
  const msDiff = now.getTime() - date.getTime();
  const dayDiff = Math.floor(msDiff / (1000 * 60 * 60 * 24));

  if (dayDiff <= 7) return "Esta semana";
  if (now.getFullYear() === date.getFullYear() && now.getMonth() === date.getMonth()) return "Este mes";
  return "Anteriores";
};

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

const Notifications = () => {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [items, setItems] = useState<NotificationItem[]>(() => notificationsCache?.items ?? []);
  const [actorById, setActorById] = useState<Record<string, NotificationActor>>(() => notificationsCache?.actorById ?? {});
  const [postMediaById, setPostMediaById] = useState<Record<string, string | null>>(() => notificationsCache?.postMediaById ?? {});
  const [followingActorIds, setFollowingActorIds] = useState<Set<string>>(
    () => new Set(notificationsCache?.followingActorIds ?? []),
  );
  const [pendingActorIds, setPendingActorIds] = useState<Set<string>>(
    () => new Set(notificationsCache?.pendingActorIds ?? []),
  );
  const [followActionBusyById, setFollowActionBusyById] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(() => !notificationsCache);
  const hasHydratedRef = useRef(Boolean(notificationsCache));
  const {
    followRequests,
    followRequestBusyById,
    pendingFollowItems,
    loadFollowRequests,
    handleFollowRequestAction,
    handleToggleFollowBack,
  } = useFollowRequestsInbox({
    userId: user?.id,
  });

  const loadNotifications = useCallback(async (silent = false) => {
    if (!supabase || !user?.id) {
      setItems([]);
      setLoading(false);
      return;
    }

    if (!silent && !hasHydratedRef.current) {
      setLoading(true);
    }
    const notificationsRes = await supabase
      .from("notifications")
      .select("id, actor_id, post_id, type, title, body, is_read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    const nextItems = (notificationsRes.data ?? []) as NotificationItem[];
    setItems(nextItems);

    const actorIds = Array.from(
      new Set(
        nextItems
          .map((item) => item.actor_id)
          .filter((id): id is string => Boolean(id)),
      ),
    );
    const postIds = Array.from(
      new Set(
        nextItems
          .map((item) => item.post_id)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    const [actorsRes, followsRes, pendingRes, postsRes] = await Promise.all([
      actorIds.length
        ? supabase
            .from("profiles")
            .select("id, username, avatar_url")
            .in("id", actorIds)
        : Promise.resolve({ data: [], error: null }),
      actorIds.length
        ? supabase
            .from("follows")
            .select("following_id")
            .eq("follower_id", user.id)
            .in("following_id", actorIds)
        : Promise.resolve({ data: [], error: null }),
      actorIds.length
        ? supabase
            .from("follow_requests")
            .select("target_id")
            .eq("requester_id", user.id)
            .eq("status", "pending")
            .in("target_id", actorIds)
        : Promise.resolve({ data: [], error: null }),
      postIds.length
        ? supabase
            .from("posts")
            .select("id, media_url, video_cover_url")
            .in("id", postIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const nextActorById = ((actorsRes.data ?? []) as NotificationActor[]).reduce<Record<string, NotificationActor>>((acc, actor) => {
      acc[actor.id] = actor;
      return acc;
    }, {});
    const nextPostMediaById = ((postsRes.data ?? []) as NotificationPostMedia[]).reduce<Record<string, string | null>>(
      (acc, post) => {
        const mediaList = parseMediaList(post.media_url).map((url) => resolveStoragePublicUrl(url)).filter(Boolean) as string[];
        const firstImage = mediaList.find((url) => !isVideoUrl(url)) ?? null;
        const cover = resolveStoragePublicUrl(post.video_cover_url ?? null);
        acc[post.id] = firstImage ?? cover ?? mediaList[0] ?? null;
        return acc;
      },
      {},
    );

    setActorById(nextActorById);
    setPostMediaById(nextPostMediaById);
    const nextFollowing = new Set((followsRes.data ?? []).map((row) => row.following_id as string));
    const nextPending = new Set((pendingRes.data ?? []).map((row) => row.target_id as string));
    setFollowingActorIds(nextFollowing);
    setPendingActorIds(nextPending);
    notificationsCache = {
      items: nextItems,
      actorById: nextActorById,
      postMediaById: nextPostMediaById,
      followingActorIds: Array.from(nextFollowing),
      pendingActorIds: Array.from(nextPending),
    };
    hasHydratedRef.current = true;
    setLoading(false);
  }, [user?.id]);

  const markAsRead = async (id: string) => {
    if (!supabase) return;
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, is_read: true } : item)));
  };

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (!supabase || !user?.id) return;
    const client = supabase;
    const channel = client.channel(`notifications-realtime:${user.id}:${Date.now()}`);

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
      () => {
        void loadNotifications(true);
      },
    );

    channel.subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [loadNotifications, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const onFocus = () => {
      void loadNotifications(true);
      void loadFollowRequests();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
    };
  }, [loadFollowRequests, loadNotifications, user?.id]);

  const handleToggleFollowActor = async (actorId: string) => {
    if (!supabase || !user?.id || !actorId || actorId === user.id) return;
    const actor = actorById[actorId];
    if (!actor) return;

    const currentlyFollowing = followingActorIds.has(actorId);
    const currentlyPending = pendingActorIds.has(actorId);
    setFollowActionBusyById((prev) => ({ ...prev, [actorId]: true }));

    if (currentlyFollowing) {
      setFollowingActorIds((prev) => {
        const next = new Set(prev);
        next.delete(actorId);
        return next;
      });

      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", actorId);

      if (error) {
        setFollowingActorIds((prev) => new Set(prev).add(actorId));
      }

      setFollowActionBusyById((prev) => ({ ...prev, [actorId]: false }));
      return;
    }

    if (currentlyPending) {
      setPendingActorIds((prev) => {
        const next = new Set(prev);
        next.delete(actorId);
        return next;
      });

      const { error } = await supabase
        .from("follow_requests")
        .update({ status: "canceled", resolved_at: new Date().toISOString() })
        .eq("requester_id", user.id)
        .eq("target_id", actorId)
        .eq("status", "pending");

      if (error) {
        setPendingActorIds((prev) => new Set(prev).add(actorId));
      }

      setFollowActionBusyById((prev) => ({ ...prev, [actorId]: false }));
      return;
    }

    const { data: targetProfile } = await supabase.from("profiles").select("is_private").eq("id", actorId).maybeSingle();
    const targetIsPrivate = Boolean(targetProfile?.is_private);

    if (targetIsPrivate) {
      setPendingActorIds((prev) => new Set(prev).add(actorId));
      const { error } = await supabase.from("follow_requests").upsert(
        {
          requester_id: user.id,
          target_id: actorId,
          status: "pending",
          resolved_at: null,
        },
        { onConflict: "requester_id,target_id" },
      );

      if (error) {
        setPendingActorIds((prev) => {
          const next = new Set(prev);
          next.delete(actorId);
          return next;
        });
      }
    } else {
      setFollowingActorIds((prev) => new Set(prev).add(actorId));
      const { error } = await supabase.from("follows").insert({
        follower_id: user.id,
        following_id: actorId,
      });

      if (error) {
        setFollowingActorIds((prev) => {
          const next = new Set(prev);
          next.delete(actorId);
          return next;
        });
      }
    }

    setFollowActionBusyById((prev) => ({ ...prev, [actorId]: false }));
  };

  const grouped = useMemo(() => {
    const base: Record<NotificationSection, NotificationItem[]> = {
      "Esta semana": [],
      "Este mes": [],
      Anteriores: [],
    };

    items.forEach((item) => {
      const section = getSectionLabel(item.created_at);
      base[section].push(item);
    });

    return base;
  }, [items]);

  const followSummary = useMemo(() => {
    if (pendingFollowItems.length === 0) return "Sin solicitudes pendientes";
    if (pendingFollowItems.length === 1) return pendingFollowItems[0].username;
    return `${pendingFollowItems[0].username} + ${pendingFollowItems.length - 1} mas`;
  }, [pendingFollowItems]);

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <div className="header-close">
          <button className="close-btn" aria-label="Cerrar" type="button" onClick={() => navigate("/inicio")}>
            <X size={16} />
          </button>
        </div>
        <div className="header-title">
          <h1 className="page-title">Notificaciones</h1>
        </div>
      </div>

      <div
        className="follow-requests-banner"
        role="button"
        tabIndex={0}
        onClick={() => navigate("/notificaciones/solicitudes")}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            navigate("/notificaciones/solicitudes");
          }
        }}
      >
        <div className="requests-avatars">
          <div className="avatar-stack">
            <img
              className="avatar-main"
              src={pendingFollowItems[0]?.avatar_url ?? buildSeedAvatar(pendingFollowItems[0]?.requester_id ?? "follow-main", 32)}
              alt=""
              width={32}
              height={32}
            />
            <img
              className="avatar-secondary"
              src={pendingFollowItems[1]?.avatar_url ?? buildSeedAvatar(pendingFollowItems[1]?.requester_id ?? "follow-secondary", 32)}
              alt=""
              width={32}
              height={32}
            />
          </div>
        </div>
        <div className="requests-text">
          <span className="requests-label">Solicitudes de seguidores</span>
          <div className="requests-subtext">
            <span className="requests-names">{followSummary}</span>
          </div>
        </div>
      </div>

      {!loading && items.length === 0 && followRequests.length === 0 ? (
        <p className="notifications-loading">No hay notificaciones nuevas</p>
      ) : null}

      {!loading && followRequests.length > 0 ? (
        <div className="notification-section">
          <div className="section-divider">
            <hr className="divider-line" />
          </div>
          <h2 className="section-title">Solicitudes de seguidores</h2>

          {followRequests.map((request) => {
            const busy = Boolean(followRequestBusyById[request.requester_id]);
            const statusIso = request.resolved_at ?? request.created_at;
            return (
              <div key={`fr-inline-${request.requester_id}-${request.created_at}`} className="notification-item">
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
                    <span className="notification-body">
                      <a className="username-link" href={`/${request.username}`}>
                        {request.username}
                      </a>{" "}
                      {request.status === "pending"
                        ? "solicito seguirte."
                        : request.status === "accepted"
                          ? "comenzo a seguirte."
                          : request.status === "rejected"
                            ? "rechazaste su solicitud."
                            : "cancelo su solicitud."}{" "}
                      <span className="timestamp">
                        <abbr title={new Date(statusIso).toLocaleString("es-AR")}>{formatTimeLabel(statusIso)}</abbr>
                      </span>
                    </span>
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
      ) : null}

      {!loading
        ? (Object.keys(grouped) as NotificationSection[]).map((section) => {
            const sectionItems = grouped[section];
            if (sectionItems.length === 0) return null;

            return (
              <div key={section} className="notification-section">
                <div className="section-divider">
                  <hr className="divider-line" />
                </div>
                <h2 className="section-title">{section}</h2>

                {sectionItems.map((item, index) => {
                  const actor = item.actor_id ? actorById[item.actor_id] : undefined;
                  const isThreads = item.type === "message";
                  const showMedia = item.type === "like" || item.type === "comment";
                  const showFollowingButton = item.type === "follow";
                  const profileHref = actor?.username ? `/${actor.username}/` : `/${user?.username ?? "usuario"}/`;
                  const primarySeed = `${item.id}-primary`;

                  return (
                    <div key={item.id} className="notification-item" onClick={() => void markAsRead(item.id)}>
                      <div className="notification-content">
                        <div className="notification-avatars">
                          <a className="avatar-link" href={profileHref}>
                            <img
                              className={`avatar-img${isThreads ? " avatar-threads" : ""}`}
                              src={actor?.avatar_url ?? buildSeedAvatar(primarySeed, 44)}
                              alt="Foto de perfil"
                              width={44}
                              height={44}
                            />
                          </a>
                        </div>

                        <div className="notification-text">
                          <span className="notification-body">
                            <a className="username-link" href={profileHref}>
                              {actor?.username ?? item.title}
                            </a>
                            {item.body ? ` ${item.body} ` : actor?.username ? " te envio una notificacion. " : " "}
                            <span className="timestamp">
                              <abbr title={new Date(item.created_at).toLocaleString("es-AR")}>{formatTimeLabel(item.created_at)}</abbr>
                            </span>
                          </span>
                        </div>

                        {showMedia ? (
                          <div className="notification-media">
                            <a className="media-link" href={item.post_id ? `/p/${item.post_id}` : "/inicio"}>
                              <img
                                className="media-thumb"
                                src={item.post_id ? postMediaById[item.post_id] ?? buildSeedAvatar(`${item.id}-thumb-${index}`, 44) : buildSeedAvatar(`${item.id}-thumb-${index}`, 44)}
                                alt="Miniatura"
                                width={44}
                                height={44}
                                onError={(event) => {
                                  const img = event.currentTarget;
                                  if (img.dataset.fallbackApplied === "1") return;
                                  img.dataset.fallbackApplied = "1";
                                  img.src = buildSeedAvatar(`${item.id}-thumb-fallback-${index}`, 44);
                                }}
                              />
                            </a>
                          </div>
                        ) : null}

                        {showFollowingButton ? (
                          <div className="notification-action">
                            <button
                              className="btn-following"
                              type="button"
                              disabled={!item.actor_id || Boolean(followActionBusyById[item.actor_id])}
                              onClick={() => {
                                if (!item.actor_id) return;
                                void handleToggleFollowActor(item.actor_id);
                              }}
                            >
                              {!item.actor_id || !actor
                                ? "Seguir"
                                : followActionBusyById[item.actor_id]
                                  ? "..."
                                  : followingActorIds.has(item.actor_id)
                                    ? "Siguiendo"
                                    : pendingActorIds.has(item.actor_id)
                                      ? "Pendiente"
                                      : "Seguir tambien"}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })
        : null}
    </div>
  );
};

export default Notifications;

