import { useRef, useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { type InboxConversation, type InboxMessage } from "@/hooks/useMessagesInbox";

interface MessagesThreadViewProps {
  currentUserId: string | null;
  selectedConversation: InboxConversation;
  messages: InboxMessage[];
  loadingMessages: boolean;
  hasMoreMessages: boolean;
  loadingOlderMessages: boolean;
  peerTyping: boolean;
  peerSeenAt: string | null;
  seenByCount: number;
  otherParticipantCount: number;
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onRetryFailedMessage: (messageId: string) => void;
  onLoadOlderMessages: () => void;
}

/** Fallback tipo Instagram cuando no hay avatar. */
const AVATAR_FALLBACK_URL = "/avatar_fallback.jpg";

/** Umbral en px desde el bottom para considerar "cerca del bottom" */
const NEAR_BOTTOM_THRESHOLD = 120;

const formatMessageTime = (isoDate: string) =>
  new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit" }).format(new Date(isoDate));

const formatSeenTime = (isoDate: string) => {
  const now = Date.now();
  const value = new Date(isoDate).getTime();
  const deltaMs = Math.max(0, now - value);
  const deltaSeconds = Math.floor(deltaMs / 1000);
  const deltaMinutes = Math.floor(deltaSeconds / 60);
  const deltaHours = Math.floor(deltaMinutes / 60);

  if (deltaMinutes < 1) return "Visto hace un momento";
  if (deltaMinutes < 60) return `Visto Hace ${deltaMinutes} min`;
  if (deltaHours < 24) return `Visto Hace ${deltaHours} h`;
  return `Visto el ${new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" }).format(new Date(isoDate))}`;
};

const MessagesThreadView = ({
  currentUserId,
  selectedConversation,
  messages,
  loadingMessages,
  hasMoreMessages,
  loadingOlderMessages,
  peerTyping,
  peerSeenAt,
  seenByCount,
  otherParticipantCount,
  draft,
  onDraftChange,
  onSend,
  onRetryFailedMessage,
  onLoadOlderMessages,
}: MessagesThreadViewProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomAnchorRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(messages.length);
  const latestPeerMsgIdRef = useRef<string | null>(null);

  /** Mensajes nuevos del peer que el user no ha visto (está scrolleado arriba) */
  const [unreadPeerCount, setUnreadPeerCount] = useState(0);
  /** ID del último mensaje del peer para hacer scroll hacia él */
  const [latestPeerMsgId, setLatestPeerMsgId] = useState<string | null>(null);

  const isNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_THRESHOLD;
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomAnchorRef.current?.scrollIntoView({ behavior });
    setUnreadPeerCount(0);
    setLatestPeerMsgId(null);
  }, []);

  const scrollToMessage = useCallback((messageId: string) => {
    const el = document.getElementById(`dm-msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      scrollToBottom("smooth");
    }
    setUnreadPeerCount(0);
    setLatestPeerMsgId(null);
  }, [scrollToBottom]);

  // Scroll instantáneo al cargar la conversación (primera vez)
  useEffect(() => {
    if (!loadingMessages && messages.length > 0) {
      scrollToBottom("instant");
    }
  // Solo cuando cambia la conversación (se resetea loadingMessages)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation.id, loadingMessages]);

  // Detectar mensajes nuevos y decisión de auto-scroll vs botón
  useEffect(() => {
    const prevLen = prevMessagesLengthRef.current;
    const currentLen = messages.length;
    prevMessagesLengthRef.current = currentLen;

    if (currentLen <= prevLen || loadingMessages) return;

    // Mensajes nuevos detectados
    const newMessages = messages.slice(prevLen);
    const newPeerMessages = newMessages.filter((m) => m.senderId !== currentUserId);
    const newOwnMessages = newMessages.filter((m) => m.senderId === currentUserId);

    if (newOwnMessages.length > 0) {
      // Propio mensaje enviado → siempre scroll to bottom
      scrollToBottom("smooth");
      return;
    }

    if (newPeerMessages.length > 0) {
      const lastPeerMsg = newPeerMessages[newPeerMessages.length - 1];
      if (isNearBottom()) {
        // Usuario cerca del bottom → auto-scroll
        scrollToBottom("smooth");
      } else {
        // Usuario scrolleado arriba → mostrar botón
        latestPeerMsgIdRef.current = lastPeerMsg.id;
        setLatestPeerMsgId(lastPeerMsg.id);
        setUnreadPeerCount((prev) => prev + newPeerMessages.length);
      }
    }
  }, [messages, currentUserId, isNearBottom, scrollToBottom, loadingMessages]);

  // Reset del estado de nuevos mensajes cuando el usuario scrollea manualmente al bottom
  const handleScroll = useCallback(() => {
    if (isNearBottom() && unreadPeerCount > 0) {
      setUnreadPeerCount(0);
      setLatestPeerMsgId(null);
    }
  }, [isNearBottom, unreadPeerCount]);

  const latestOwnSentMessageId = [...messages]
    .reverse()
    .find((message) => message.senderId === currentUserId && message.deliveryState === "sent")?.id;

  return (
    <section className="ig-dm-thread">
      <header className="ig-dm-thread-head">
        <div className="ig-dm-thread-head-left">
          <Link href="/direct/inbox">
            <button type="button" className="ig-dm-mobile-back-btn" aria-label="Atrás">
              <svg aria-label="Atrás" fill="currentColor" height="24" role="img" viewBox="0 0 24 24" width="24">
                <line fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" x1="2.909" x2="22.001" y1="12.004" y2="12.004"></line>
                <polyline fill="none" points="9.276 4.726 2.001 12.004 9.276 19.274" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></polyline>
              </svg>
            </button>
          </Link>
          <img
            src={selectedConversation.avatarUrl ?? AVATAR_FALLBACK_URL}
            alt="user-profile-picture"
            className="ig-dm-avatar-44"
          />
          <div className="ig-dm-thread-head-info">
            <strong>{selectedConversation.title}</strong>
            <span>{selectedConversation.username ? `${selectedConversation.username} · Instadetox` : "Instadetox"}</span>
          </div>
        </div>
        <div className="ig-dm-thread-head-actions">
          <button type="button" aria-label="Llamada de audio">
            <svg aria-label="Llamada de audio" fill="currentColor" height="24" role="img" viewBox="0 0 24 24" width="24">
              <path d="M18.227 22.912c-4.913 0-9.286-3.627-11.486-5.828C4.486 14.83.731 10.291.921 5.231a3.289 3.289 0 0 1 .908-2.138 17.116 17.116 0 0 1 1.865-1.71 2.307 2.307 0 0 1 3.004.174 13.283 13.283 0 0 1 3.658 5.325 2.551 2.551 0 0 1-.19 1.941l-.455.853a.463.463 0 0 0-.024.387 7.57 7.57 0 0 0 4.077 4.075.455.455 0 0 0 .386-.024l.853-.455a2.548 2.548 0 0 1 1.94-.19 13.278 13.278 0 0 1 5.326 3.658 2.309 2.309 0 0 1 .174 3.003 17.319 17.319 0 0 1-1.71 1.866 3.29 3.29 0 0 1-2.138.91 10.27 10.27 0 0 1-.368.006Zm-13.144-20a.27.27 0 0 0-.167.054A15.121 15.121 0 0 0 3.28 4.47a1.289 1.289 0 0 0-.36.836c-.161 4.301 3.21 8.34 5.235 10.364s6.06 5.403 10.366 5.236a1.284 1.284 0 0 0 .835-.36 15.217 15.217 0 0 0 1.504-1.637.324.324 0 0 0-.047-.41 11.62 11.62 0 0 0-4.457-3.119.545.545 0 0 0-.411.044l-.854.455a2.452 2.452 0 0 1-2.071.116 9.571 9.571 0 0 1-5.189-5.188 2.457 2.457 0 0 1 .115-2.071l.456-.855a.544.544 0 0 0 .043-.41 11.629 11.629 0 0 0-3.118-4.458.36.36 0 0 0-.244-.1Z"></path>
            </svg>
          </button>
          <button type="button" aria-label="Videollamada">
            <svg aria-label="Videollamada" fill="currentColor" height="24" role="img" viewBox="0 0 24 24" width="24">
              <rect fill="none" height="18" rx="3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" width="16.999" x="1" y="3"></rect>
              <path d="m17.999 9.146 2.495-2.256A1.5 1.5 0 0 1 23 8.003v7.994a1.5 1.5 0 0 1-2.506 1.113L18 14.854" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
            </svg>
          </button>
          <button type="button" aria-label="Información de la conversación">
            <svg aria-label="Información de la conversación" fill="currentColor" height="24" role="img" viewBox="0 0 24 24" width="24">
              <circle cx="12.001" cy="12.005" fill="none" r="10.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></circle>
              <circle cx="11.819" cy="7.709" r="1.25"></circle>
              <line fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" x1="10.569" x2="13.432" y1="16.777" y2="16.777"></line>
              <polyline fill="none" points="10.569 11.05 12 11.05 12 16.777" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></polyline>
            </svg>
          </button>
        </div>
        {peerTyping ? <p className="ig-dm-typing-indicator-absolute">Escribiendo...</p> : null}
      </header>

      {/* Contenedor de scroll del hilo */}
      <div className="ig-dm-thread-body" ref={scrollRef} onScroll={handleScroll}>
        {hasMoreMessages ? (
          <button
            type="button"
            className="ig-dm-load-older-btn"
            onClick={onLoadOlderMessages}
            disabled={loadingOlderMessages}
          >
            {loadingOlderMessages ? "Cargando..." : "Cargar anteriores"}
          </button>
        ) : null}
        {loadingMessages ? (
          <p className="ig-dm-empty-list">Cargando conversacion...</p>
        ) : messages.length === 0 ? (
          <div className="ig-dm-empty-thread">
            <img
              src={selectedConversation.avatarUrl ?? AVATAR_FALLBACK_URL}
              alt="user-profile-picture"
              className="ig-dm-empty-avatar"
            />
            <h2 className="ig-dm-empty-name">{selectedConversation.title}</h2>
            <p className="ig-dm-empty-username">
              {selectedConversation.username ? `${selectedConversation.username} · Instadetox` : "Instadetox"}
            </p>
            <button type="button" className="ig-dm-empty-profile-btn" aria-label="Ver perfil">
              Ver perfil
            </button>
          </div>
        ) : (
          messages.map((message, index) => {
            const mine = message.senderId === currentUserId;
            // Lógica de agrupación (First, Middle, Last)
            const prevMessage = messages[index - 1];
            const nextMessage = messages[index + 1];
            const isFirstInGroup = !prevMessage || prevMessage.senderId !== message.senderId;
            const isLastInGroup = !nextMessage || nextMessage.senderId !== message.senderId;
            const isMiddleInGroup = !isFirstInGroup && !isLastInGroup;
            const isSingle = isFirstInGroup && isLastInGroup;

            // Clases de grupo prioritarias para border-radius
            const groupClass = isSingle ? "is-single" : isFirstInGroup ? "is-first" : isLastInGroup ? "is-last" : isMiddleInGroup ? "is-middle" : "";

            return (
              <div
                key={message.id}
                id={`dm-msg-${message.id}`}
                className={`ig-dm-bubble-row${mine ? " is-mine" : ""}${isLastInGroup ? " last-in-group" : ""}`}
              >
                {/* Avatar del otro usuario — solo en el último mensaje del grupo */}
                {!mine ? (
                  <div className="ig-dm-msg-avatar-wrap" aria-hidden="true">
                    {isLastInGroup ? (
                      <img
                        src={selectedConversation.avatarUrl ?? AVATAR_FALLBACK_URL}
                        alt=""
                        className="ig-dm-msg-avatar"
                      />
                    ) : null}
                  </div>
                ) : null}

                <div className={`ig-dm-bubble-wrapper${mine ? " is-mine" : ""}`}>
                  <article className={`ig-dm-bubble ${groupClass} ${mine ? "is-mine" : ""}${message.deliveryState === "sending" ? " is-sending" : ""}`}>
                    <p>{message.body}</p>
                    {mine && message.deliveryState === "failed" ? (
                      <button
                        type="button"
                        className="ig-dm-retry-btn"
                        onClick={() => onRetryFailedMessage(message.id)}
                      >
                        Reintentar
                      </button>
                    ) : null}
                  </article>
                  {mine && 
                   messages[messages.length - 1]?.id === message.id && 
                   peerSeenAt && 
                   new Date(peerSeenAt).getTime() >= new Date(message.createdAt).getTime() && (
                    <span 
                      className="x1lliihq x1plvlek xryxfnj x1n2onr6 xyejjpt x15dsfln x193iq5w xeuugli x1fj9vlw x13faqbe x1vvkbs x1s928wv xhkezso x1gmr53x x1cpjm7i x1fgarty x1943h6x x1i0vuye x1fhwpqd xo1l8bm x1roi4f4 x1s3etm8 x676frb x10wh9bi xpm28yp x8viiok x1o7cslx ig-dm-seen-status" 
                      dir="auto"
                    >
                      {formatSeenTime(peerSeenAt)}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
        {/* Anchor invisible al final para scrollToBottom */}
        <div ref={bottomAnchorRef} aria-hidden="true" style={{ height: 1 }} />
      </div>

      {/* Botón flotante "Nuevos mensajes" — aparece cuando el user está scrolleado arriba */}
      {unreadPeerCount > 0 && latestPeerMsgId ? (
        <div className="ig-dm-new-msgs-banner-wrap" aria-live="polite">
          <button
            type="button"
            className="ig-dm-new-msgs-banner"
            onClick={() => scrollToMessage(latestPeerMsgId)}
            aria-label={`${unreadPeerCount} mensajes nuevos`}
          >
            <svg className="ig-dm-new-msgs-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="6 9 12 15 18 9" />
            </svg>
            <span>
              {unreadPeerCount === 1
                ? "1 mensaje nuevo"
                : `${unreadPeerCount} mensajes nuevos`}
            </span>
          </button>
        </div>
      ) : null}

      <footer className="ig-dm-thread-composer">
        <div className="ig-dm-composer-wrap">
          <div className="ig-dm-composer-left">
            <button type="button" aria-label="Elegir un emoji">
              <svg aria-label="Elegir un emoji" fill="currentColor" height="24" role="img" viewBox="0 0 24 24" width="24">
                <path d="M15.83 10.997a1.167 1.167 0 1 0 1.167 1.167 1.167 1.167 0 0 0-1.167-1.167Zm-6.5 1.167a1.167 1.167 0 1 0-1.166 1.167 1.167 1.167 0 0 0 1.166-1.167Zm5.163 3.24a3.406 3.406 0 0 1-4.982.007 1 1 0 1 0-1.557 1.256 5.397 5.397 0 0 0 8.09 0 1 1 0 0 0-1.55-1.263ZM12 .503a11.5 11.5 0 1 0 11.5 11.5A11.513 11.513 0 0 0 12 .503Zm0 21a9.5 9.5 0 1 1 9.5-9.5 9.51 9.51 0 0 1-9.5 9.5Z"></path>
              </svg>
            </button>
          </div>
          <div className="ig-dm-composer-input">
            <textarea
              rows={1}
              value={draft}
              onChange={(event) => {
                onDraftChange(event.target.value);
                event.target.style.height = "auto";
                event.target.style.height = `${Math.min(event.target.scrollHeight, 100)}px`;
              }}
              placeholder="Enviar mensaje..."
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  if (draft.trim().length > 0) {
                    onSend();
                    const target = event.target as HTMLTextAreaElement;
                    setTimeout(() => { target.style.height = "auto"; }, 0);
                  }
                }
              }}
            />
          </div>
          {draft.trim().length > 0 ? (
            <button type="button" className="ig-dm-send-text-btn" onClick={onSend} disabled={!draft.trim()}>
              Enviar
            </button>
          ) : (
            <div className="ig-dm-composer-right">
              <button type="button" aria-label="Clip de voz">
                <svg aria-label="Clip de voz" fill="currentColor" height="24" role="img" viewBox="0 0 24 24" width="24">
                  <path d="M19.5 10.671v.897a7.5 7.5 0 0 1-15 0v-.897" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                  <line fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" x1="12" x2="12" y1="19.068" y2="22"></line>
                  <line fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" x1="8.706" x2="15.104" y1="22" y2="22"></line>
                  <path d="M12 15.745a4 4 0 0 1-4-4V6a4 4 0 0 1 8 0v5.745a4 4 0 0 1-4 4Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                </svg>
              </button>

              <input
                id="ig-dm-media-upload"
                accept="audio/*,.mp4,.mov,.png,.jpg,.jpeg"
                multiple
                type="file"
                style={{ display: "none" }}
              />
              <label htmlFor="ig-dm-media-upload" className="ig-dm-icon-label" aria-label="Agregar foto o video">
                <svg aria-label="Agregar foto o video" fill="currentColor" height="24" role="img" viewBox="0 0 24 24" width="24">
                  <path d="M6.549 5.013A1.557 1.557 0 1 0 8.106 6.57a1.557 1.557 0 0 0-1.557-1.557Z" fillRule="evenodd"></path>
                  <path d="m2 18.605 3.901-3.9a.908.908 0 0 1 1.284 0l2.807 2.806a.908.908 0 0 0 1.283 0l5.534-5.534a.908.908 0 0 1 1.283 0l3.905 3.905" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="2"></path>
                  <path d="M18.44 2.004A3.56 3.56 0 0 1 22 5.564h0v12.873a3.56 3.56 0 0 1-3.56 3.56H5.568a3.56 3.56 0 0 1-3.56-3.56V5.563a3.56 3.56 0 0 1 3.56-3.56Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                </svg>
              </label>

              <button type="button" aria-label="Elige un GIF o sticker">
                <svg aria-label="Elige un GIF o sticker" fill="currentColor" height="24" role="img" viewBox="0 0 24 24" width="24">
                  <path d="M13.11 22H7.416A5.417 5.417 0 0 1 2 16.583V7.417A5.417 5.417 0 0 1 7.417 2h9.166A5.417 5.417 0 0 1 22 7.417v5.836a2.083 2.083 0 0 1-.626 1.488l-6.808 6.664A2.083 2.083 0 0 1 13.11 22Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                  <circle cx="8.238" cy="9.943" r="1.335"></circle>
                  <circle cx="15.762" cy="9.943" r="1.335"></circle>
                  <path d="M15.174 15.23a4.887 4.887 0 0 1-6.937-.301" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                  <path d="M22 10.833v1.629a1.25 1.25 0 0 1-1.25 1.25h-1.79a5.417 5.417 0 0 0-5.417 5.417v1.62a1.25 1.25 0 0 1-1.25 1.25H9.897" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                </svg>
              </button>
            </div>
          )}
        </div>
      </footer>
    </section>
  );
};

export default MessagesThreadView;
