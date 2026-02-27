import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
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

const seedAvatarUrl = (seed: string, size: number) =>
  `https://api.dicebear.com/9.x/thumbs/png?seed=${encodeURIComponent(seed)}&size=${size}`;

const formatMessageTime = (isoDate: string) =>
  new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit" }).format(new Date(isoDate));

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
  const latestOwnSentMessageId = [...messages]
    .reverse()
    .find((message) => message.senderId === currentUserId && message.deliveryState === "sent")?.id;

  return (
    <section className="ig-dm-thread">
      <header className="ig-dm-thread-head">
        <img src={seedAvatarUrl(selectedConversation.id, 48)} alt="" width={32} height={32} className="ig-dm-avatar" />
        <div className="min-w-0">
          <strong>{selectedConversation.title}</strong>
          {peerTyping ? <p className="ig-dm-typing-indicator">Escribiendo...</p> : null}
        </div>
      </header>

      <div className="ig-dm-thread-body">
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
          <p className="ig-dm-empty-list">Todavia no hay mensajes en esta conversacion.</p>
        ) : (
          messages.map((message) => {
            const mine = message.senderId === currentUserId;
            const isSeenInDirect = Boolean(
              peerSeenAt && new Date(peerSeenAt).getTime() >= new Date(message.createdAt).getTime(),
            );
            const shouldShowSeen =
              latestOwnSentMessageId === message.id &&
              (otherParticipantCount > 1 ? seenByCount > 0 : isSeenInDirect);
            const deliveryLabel =
              message.deliveryState === "sending"
                ? "Enviando..."
                : message.deliveryState === "failed"
                  ? "Fallido"
                  : shouldShowSeen
                    ? otherParticipantCount > 1
                      ? `Visto por ${seenByCount}`
                      : "Visto"
                    : "Enviado";

            return (
              <div key={message.id} className={`ig-dm-bubble-row${mine ? " is-mine" : ""}`}>
                <article className={`ig-dm-bubble${mine ? " is-mine" : ""}`}>
                  <p>{message.body}</p>
                  <time>
                    {formatMessageTime(message.createdAt)}
                    {mine ? ` · ${deliveryLabel}` : ""}
                  </time>
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
              </div>
            );
          })
        )}
      </div>

      <footer className="ig-dm-thread-composer">
        <input
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder="Escribe un mensaje..."
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSend();
            }
          }}
        />
        <Button type="button" onClick={onSend} disabled={!draft.trim()} className="ig-dm-primary-btn">
          <Send size={16} />
        </Button>
      </footer>
    </section>
  );
};

export default MessagesThreadView;
