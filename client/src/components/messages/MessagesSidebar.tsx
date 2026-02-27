import { type InboxConversation } from "@/hooks/useMessagesInbox";

interface MessagesSidebarProps {
  username: string;
  conversations: InboxConversation[];
  selectedConversationId: string | null;
  unreadByConversation: Record<string, number>;
  requestConversationIds: string[];
  activeTab: "primary" | "general" | "requests";
  searchValue: string;
  onSearchChange: (value: string) => void;
  onTabChange: (tab: "primary" | "general" | "requests") => void;
  onSelectConversation: (conversationId: string) => void;
  onCreateMessage: () => void;
}

const seedAvatarUrl = (seed: string, size: number) =>
  `https://api.dicebear.com/9.x/thumbs/png?seed=${encodeURIComponent(seed)}&size=${size}`;

const formatRelativeTime = (isoDate: string) => {
  const now = Date.now();
  const value = new Date(isoDate).getTime();
  const deltaMs = Math.max(0, now - value);
  const deltaHours = Math.floor(deltaMs / (1000 * 60 * 60));
  const deltaDays = Math.floor(deltaHours / 24);

  if (deltaHours < 1) return "ahora";
  if (deltaHours < 24) return `${deltaHours} h`;
  if (deltaDays < 7) return `${deltaDays} d`;
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" }).format(new Date(isoDate));
};

const MessagesSidebar = ({
  username,
  conversations,
  selectedConversationId,
  unreadByConversation,
  requestConversationIds,
  activeTab,
  searchValue,
  onSearchChange,
  onTabChange,
  onSelectConversation,
  onCreateMessage,
}: MessagesSidebarProps) => {
  const requestSet = new Set(requestConversationIds);

  const filteredConversations = conversations.filter((conversation) => {
    const term = searchValue.trim().toLowerCase();
    if (!term) return true;
    return (
      conversation.title.toLowerCase().includes(term) ||
      (conversation.preview ?? "").toLowerCase().includes(term)
    );
  });

  const sortByRecentActivity = (a: InboxConversation, b: InboxConversation) => {
    const aTime = new Date(a.previewAt ?? a.updatedAt).getTime();
    const bTime = new Date(b.previewAt ?? b.updatedAt).getTime();
    return bTime - aTime;
  };

  const requestConversations = filteredConversations
    .filter((conversation) => requestSet.has(conversation.id))
    .sort(sortByRecentActivity);

  const unreadConversations = filteredConversations
    .filter((conversation) => !requestSet.has(conversation.id))
    .filter((conversation) => (unreadByConversation[conversation.id] ?? 0) > 0)
    .sort((a, b) => {
      const unreadDelta = (unreadByConversation[b.id] ?? 0) - (unreadByConversation[a.id] ?? 0);
      if (unreadDelta !== 0) return unreadDelta;
      return sortByRecentActivity(a, b);
    });

  const primaryConversations = filteredConversations
    .filter((conversation) => !requestSet.has(conversation.id))
    .filter((conversation) => (unreadByConversation[conversation.id] ?? 0) === 0)
    .sort(sortByRecentActivity);

  const generalConversations = primaryConversations;

  const quickItems = filteredConversations.slice(0, 8);

  return (
    <aside className="ig-dm-sidebar">
      <header className="ig-dm-sidebar-header">
        <button className="ig-dm-username-btn" type="button" aria-label="Cuenta activa">
          <span className="ig-dm-username">{username}</span>
          <svg
            aria-label="Icono de comilla angular abajo"
            className="ig-dm-chevron-icon"
            fill="currentColor"
            height="12"
            role="img"
            viewBox="0 0 24 24"
            width="12"
          >
            <title>Icono de comilla angular abajo</title>
            <path d="M12 17.502a1 1 0 0 1-.707-.293l-9-9.004a1 1 0 0 1 1.414-1.414L12 15.087l8.293-8.296a1 1 0 0 1 1.414 1.414l-9 9.004a1 1 0 0 1-.707.293Z" />
          </svg>
        </button>

        <button className="ig-dm-icon-btn" type="button" aria-label="Nuevo mensaje" onClick={onCreateMessage}>
          <svg aria-label="Nuevo mensaje" fill="currentColor" height="24" role="img" viewBox="0 0 24 24" width="24">
            <title>Nuevo mensaje</title>
            <path
              d="M12.202 3.203H5.25a3 3 0 0 0-3 3V18.75a3 3 0 0 0 3 3h12.547a3 3 0 0 0 3-3v-6.952"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
            <path
              d="M10.002 17.226H6.774v-3.228L18.607 2.165a1.417 1.417 0 0 1 2.004 0l1.224 1.225a1.417 1.417 0 0 1 0 2.004Z"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
            <line
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              x1="16.848"
              x2="20.076"
              y1="3.924"
              y2="7.153"
            />
          </svg>
        </button>
      </header>

      <div className="ig-dm-search-wrap">
        <label className="ig-dm-search">
          <div className="ig-dm-search-icon">
            <svg aria-label="Buscar" fill="currentColor" height="16" role="img" viewBox="0 0 24 24" width="16">
              <title>Buscar</title>
              <path d="M19 10.5A8.5 8.5 0 1 1 10.5 2a8.5 8.5 0 0 1 8.5 8.5Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              <line fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" x1="16.511" x2="22" y1="16.511" y2="22" />
            </svg>
          </div>
          <input
            autoCapitalize="none"
            autoComplete="off"
            type="text"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar"
            spellCheck
            name="searchInput"
            aria-label="Buscar conversaciones"
          />
        </label>
      </div>

      {quickItems.length > 0 ? (
        <div className="ig-dm-story-strip" aria-label="Accesos rapidos">
          {quickItems.map((conversation) => (
            <button
              key={`quick-${conversation.id}`}
              className="ig-dm-story-chip"
              type="button"
              onClick={() => onSelectConversation(conversation.id)}
            >
              <img src={seedAvatarUrl(conversation.id, 60)} alt="" width={56} height={56} />
              <span>{conversation.title}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="ig-dm-sidebar-list-head">
        <h1>Mensajes</h1>
      </div>

      <div className="ig-dm-inbox-tabs" role="tablist" aria-label="Categorias de inbox">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "primary"}
          className={`ig-dm-inbox-tab${activeTab === "primary" ? " is-active" : ""}`}
          onClick={() => onTabChange("primary")}
        >
          Principal
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "general"}
          className={`ig-dm-inbox-tab${activeTab === "general" ? " is-active" : ""}`}
          onClick={() => onTabChange("general")}
        >
          General
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "requests"}
          className={`ig-dm-inbox-tab${activeTab === "requests" ? " is-active" : ""}`}
          onClick={() => onTabChange("requests")}
        >
          Solicitudes
          {requestConversations.length > 0 ? (
            <span className="ig-dm-tab-badge">
              {requestConversations.length > 9 ? "9+" : requestConversations.length}
            </span>
          ) : null}
        </button>
      </div>

      <div className="ig-dm-conversations">
        {activeTab === "requests" && requestConversations.length === 0 ? (
          <p className="ig-dm-empty-list">No hay solicitudes de mensajes.</p>
        ) : null}
        {activeTab === "general" && generalConversations.length === 0 ? (
          <p className="ig-dm-empty-list">No hay conversaciones en general.</p>
        ) : null}
        {activeTab === "primary" && filteredConversations.length === 0 ? (
          <p className="ig-dm-empty-list">No hay conversaciones.</p>
        ) : null}
        {activeTab === "requests" ? (
          requestConversations.map((conversation) => {
            const selected = selectedConversationId === conversation.id;
            return (
              <button
                key={conversation.id}
                type="button"
                className={`ig-dm-conversation-item${selected ? " is-active" : ""}`}
                onClick={() => onSelectConversation(conversation.id)}
              >
                <img
                  src={seedAvatarUrl(conversation.id, 64)}
                  alt=""
                  width={56}
                  height={56}
                  className="ig-dm-avatar"
                />
                <div className="ig-dm-conversation-body">
                  <p className="ig-dm-conversation-title">{conversation.title}</p>
                  <p className="ig-dm-conversation-preview">
                    <span>{conversation.preview ?? "Solicitud de mensaje."}</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatRelativeTime(conversation.previewAt ?? conversation.updatedAt)}</span>
                  </p>
                </div>
                <span className="ig-dm-request-chip">Nueva</span>
              </button>
            );
          })
        ) : null}
        {activeTab === "general" ? (
          generalConversations.map((conversation) => {
            const selected = selectedConversationId === conversation.id;
            return (
              <button
                key={conversation.id}
                type="button"
                className={`ig-dm-conversation-item${selected ? " is-active" : ""}`}
                onClick={() => onSelectConversation(conversation.id)}
              >
                <img
                  src={seedAvatarUrl(conversation.id, 64)}
                  alt=""
                  width={56}
                  height={56}
                  className="ig-dm-avatar"
                />
                <div className="ig-dm-conversation-body">
                  <p className="ig-dm-conversation-title">{conversation.title}</p>
                  <p className="ig-dm-conversation-preview">
                    <span>{conversation.preview ?? "Envia un mensaje para iniciar la charla."}</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatRelativeTime(conversation.previewAt ?? conversation.updatedAt)}</span>
                  </p>
                </div>
              </button>
            );
          })
        ) : null}
        {activeTab === "primary" ? (
          <>
            {unreadConversations.length > 0 ? (
              <section className="ig-dm-section">
                <h2 className="ig-dm-section-title">No leidos</h2>
                {unreadConversations.map((conversation) => {
                  const selected = selectedConversationId === conversation.id;
                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      className={`ig-dm-conversation-item${selected ? " is-active" : ""}`}
                      onClick={() => onSelectConversation(conversation.id)}
                    >
                      <img
                        src={seedAvatarUrl(conversation.id, 64)}
                        alt=""
                        width={56}
                        height={56}
                        className="ig-dm-avatar"
                      />
                      <div className="ig-dm-conversation-body">
                        <p className="ig-dm-conversation-title">{conversation.title}</p>
                        <p className="ig-dm-conversation-preview">
                          <span>{conversation.preview ?? "Envia un mensaje para iniciar la charla."}</span>
                          <span aria-hidden="true">·</span>
                          <span>{formatRelativeTime(conversation.previewAt ?? conversation.updatedAt)}</span>
                        </p>
                      </div>
                      <span className="ig-dm-unread-badge">
                        {unreadByConversation[conversation.id] > 9 ? "9+" : unreadByConversation[conversation.id]}
                      </span>
                    </button>
                  );
                })}
              </section>
            ) : null}

            {unreadConversations.length === 0 && primaryConversations.length === 0 ? (
              <p className="ig-dm-empty-list">No hay conversaciones.</p>
            ) : null}

            {primaryConversations.map((conversation) => {
              const selected = selectedConversationId === conversation.id;
              return (
                <button
                  key={conversation.id}
                  type="button"
                  className={`ig-dm-conversation-item${selected ? " is-active" : ""}`}
                  onClick={() => onSelectConversation(conversation.id)}
                >
                  <img
                    src={seedAvatarUrl(conversation.id, 64)}
                    alt=""
                    width={56}
                    height={56}
                    className="ig-dm-avatar"
                  />
                  <div className="ig-dm-conversation-body">
                    <p className="ig-dm-conversation-title">{conversation.title}</p>
                    <p className="ig-dm-conversation-preview">
                      <span>{conversation.preview ?? "Envia un mensaje para iniciar la charla."}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatRelativeTime(conversation.previewAt ?? conversation.updatedAt)}</span>
                    </p>
                  </div>
                </button>
              );
            })}
          </>
        ) : null}
      </div>
    </aside>
  );
};

export default MessagesSidebar;


