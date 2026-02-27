import { useMemo, useState } from "react";
import { User } from "lucide-react";

interface ProfileHeaderSectionProps {
  username: string;
  fullName: string | null;
  bio: string | null;
  website?: string | null;
  avatarUrl: string | null;
  postCountLabel: string;
  followersLabel: string;
  followingLabel: string;
  detoxDays: number;
  isOwnProfile: boolean;
  isFollowing: boolean;
  isFollowPending: boolean;
  canOpenConnections: boolean;
  followLoading: boolean;
  avatarBusy: boolean;
  onAvatarClick: () => void;
  onOpenFollowers: () => void;
  onOpenFollowing: () => void;
  onToggleFollow: () => void;
  onEditProfile: () => void;
  onOpenSettings: () => void;
}

const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+)/i;

const normalizeUrl = (value: string) => {
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
};

const ProfileHeaderSection = ({
  username,
  fullName,
  bio,
  website,
  avatarUrl,
  postCountLabel,
  followersLabel,
  followingLabel,
  detoxDays,
  isOwnProfile,
  isFollowing,
  isFollowPending,
  canOpenConnections,
  followLoading,
  avatarBusy,
  onAvatarClick,
  onOpenFollowers,
  onOpenFollowing,
  onToggleFollow,
  onEditProfile,
  onOpenSettings,
}: ProfileHeaderSectionProps) => {
  const [bioExpanded, setBioExpanded] = useState(false);
  const bioText = bio?.trim() ?? "";
  const shouldClampBio = bioText.length > 180;
  const visibleBio = shouldClampBio && !bioExpanded ? `${bioText.slice(0, 180).trimEnd()}...` : bioText;

  const externalLink = useMemo(() => {
    const profileWebsite = website?.trim();
    if (profileWebsite) return profileWebsite;
    const match = bioText.match(URL_REGEX);
    return match?.[0] ?? null;
  }, [bioText, website]);

  return (
    <header className="inst-profile-header">
      <div className="inst-profile-header-main">
        <section className="inst-profile-avatar-col" aria-label="Foto de perfil">
          <div className="inst-profile-avatar-wrap">
            <div className="inst-profile-avatar-ring">
              <button
                type="button"
                className="inst-profile-avatar-button"
                onClick={onAvatarClick}
                disabled={!isOwnProfile || avatarBusy}
                aria-label={isOwnProfile ? "Cambiar foto del perfil" : "Foto de perfil"}
                title={isOwnProfile ? "Cambiar foto del perfil" : undefined}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt={username} className="inst-profile-avatar-img" />
                ) : (
                  <span className="inst-profile-avatar-fallback" aria-hidden>
                    <User size={52} />
                  </span>
                )}
              </button>
            </div>
          </div>
        </section>

        <section className="inst-profile-info-col">
          <div className="inst-profile-username-row">
            <h1 className="inst-profile-username">{username}</h1>
            {isOwnProfile ? (
              <button type="button" className="inst-profile-options-btn" onClick={onOpenSettings} aria-label="Opciones">
                <svg aria-label="Opciones" fill="currentColor" height="24" role="img" viewBox="0 0 24 24" width="24"><title>Opciones</title><circle cx="12" cy="12" fill="none" r="8.635" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /><path d="M14.232 3.656a1.269 1.269 0 0 1-.796-.66L12.93 2h-1.86l-.505.996a1.269 1.269 0 0 1-.796.66m-.001 16.688a1.269 1.269 0 0 1 .796.66l.505.996h1.862l.505-.996a1.269 1.269 0 0 1 .796-.66M3.656 9.768a1.269 1.269 0 0 1-.66.796L2 11.07v1.862l.996.505a1.269 1.269 0 0 1 .66.796m16.688-.001a1.269 1.269 0 0 1 .66-.796L22 12.93v-1.86l-.996-.505a1.269 1.269 0 0 1-.66-.796M7.678 4.522a1.269 1.269 0 0 1-1.03.096l-1.06-.348L4.27 5.587l.348 1.062a1.269 1.269 0 0 1-.096 1.03m11.8 11.799a1.269 1.269 0 0 1 1.03-.096l1.06.348 1.318-1.317-.348-1.062a1.269 1.269 0 0 1 .096-1.03m-14.956.001a1.269 1.269 0 0 1 .096 1.03l-.348 1.06 1.317 1.318 1.062-.348a1.269 1.269 0 0 1 1.03.096m11.799-11.8a1.269 1.269 0 0 1-.096-1.03l.348-1.06-1.317-1.318-1.062.348a1.269 1.269 0 0 1-1.03-.096" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" /></svg>
              </button>
            ) : null}
          </div>

          <div className="inst-profile-bio-section pb-3">
            <span className="inst-profile-display-name">{fullName || "Usuario InstaDetox"}</span>
          </div>

          <div className="inst-profile-stats-row">
            <span className="inst-profile-stat-item">
              <strong>{postCountLabel}</strong>
              <span>publicaciones</span>
            </span>
            <button
              type="button"
              className="inst-profile-stat-item inst-profile-stat-btn"
              onClick={onOpenFollowers}
              disabled={!canOpenConnections}
              aria-disabled={!canOpenConnections}
            >
              <strong>{followersLabel}</strong>
              <span>seguidores</span>
            </button>
            <button
              type="button"
              className="inst-profile-stat-item inst-profile-stat-btn"
              onClick={onOpenFollowing}
              disabled={!canOpenConnections}
              aria-disabled={!canOpenConnections}
            >
              <strong>{followingLabel}</strong>
              <span>seguidos</span>
            </button>
          </div>

          <div className="inst-profile-bio-section">
            {bioText ? (
              <p className="inst-profile-bio-text">
                <span>{visibleBio}</span>
                {shouldClampBio ? (
                  <button type="button" className="inst-profile-more-btn" onClick={() => setBioExpanded((prev) => !prev)}>
                    {bioExpanded ? "menos" : "más"}
                  </button>
                ) : null}
              </p>
            ) : (
              <p className="inst-profile-bio-text">
                <span>Detox streak: {detoxDays} dias</span>
                <br />
                <span>Tiempo recuperado: {detoxDays * 90} min</span>
              </p>
            )}

            {externalLink ? (
              <div className="inst-profile-link-row">
                <svg aria-label="Enlace" className="inst-profile-link-icon" height="16" width="16" viewBox="0 0 24 24">
                  <path
                    d="M17.536 3.464a5 5 0 0 1 0 7.072l-2.121 2.121a1 1 0 0 1-1.414-1.414l2.12-2.121a3 3 0 1 0-4.242-4.243l-2.12 2.122a1 1 0 1 1-1.415-1.414l2.122-2.123a5 5 0 0 1 7.07 0ZM9.88 11.343a1 1 0 0 1 0 1.414L7.757 14.88a3 3 0 1 0 4.243 4.243l2.121-2.122a1 1 0 1 1 1.414 1.414l-2.12 2.122a5 5 0 0 1-7.072-7.071l2.122-2.122a1 1 0 0 1 1.414 0Z"
                    fill="currentColor"
                  />
                </svg>
                <a
                  href={normalizeUrl(externalLink)}
                  className="inst-profile-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {externalLink}
                </a>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <section className="inst-profile-actions-row" aria-label="Acciones de perfil">
        {isOwnProfile ? (
          <>
            <button type="button" className="inst-profile-action-btn" onClick={onEditProfile}>
              Editar perfil
            </button>
          </>
        ) : (
          <button type="button" className="inst-profile-action-btn inst-profile-follow-btn" onClick={onToggleFollow} disabled={followLoading}>
            {followLoading ? "Procesando..." : isFollowing ? "Siguiendo" : isFollowPending ? "Pendiente" : "Seguir"}
          </button>
        )}
      </section>
    </header>
  );
};

export default ProfileHeaderSection;
