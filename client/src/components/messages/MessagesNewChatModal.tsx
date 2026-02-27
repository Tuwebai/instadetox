import { useEffect, useMemo, useState } from "react";
import type { NewMessageUserSuggestion } from "@/hooks/useMessagesInbox";

interface MessagesNewChatModalProps {
  open: boolean;
  onClose: () => void;
  onCreateConversation: (participantIds: string[]) => Promise<boolean>;
  searchUsers: (query: string) => Promise<NewMessageUserSuggestion[]>;
}

const fallbackAvatar = (seed: string) =>
  `https://api.dicebear.com/9.x/thumbs/png?seed=${encodeURIComponent(seed)}&size=56`;

const MessagesNewChatModal = ({
  open,
  onClose,
  onCreateConversation,
  searchUsers,
}: MessagesNewChatModalProps) => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [suggestions, setSuggestions] = useState<NewMessageUserSuggestion[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setSuggestions([]);
      setSelectedIds([]);
      setLoading(false);
      setSubmitting(false);
      return;
    }

    let active = true;
    setLoading(true);
    void searchUsers("")
      .then((rows) => {
        if (!active) return;
        setSuggestions(rows);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, searchUsers]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      void searchUsers(query)
        .then((rows) => {
          if (!active) return;
          setSuggestions(rows);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 220);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [open, query, searchUsers]);

  const selectedSummary = useMemo(
    () => suggestions.filter((row) => selectedIds.includes(row.id)).map((row) => row.username).join(", "),
    [selectedIds, suggestions],
  );

  if (!open) return null;

  return (
    <div className="ig-dm-new-chat-backdrop" role="presentation" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Nuevo mensaje"
        className="ig-dm-new-chat-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="ig-dm-new-chat-head">
          <div />
          <h2>Nuevo mensaje</h2>
          <button type="button" className="ig-dm-new-chat-close" onClick={onClose} aria-label="Cerrar">
            <svg aria-label="Cerrar" fill="currentColor" height="18" role="img" viewBox="0 0 24 24" width="18">
              <title>Cerrar</title>
              <polyline
                fill="none"
                points="20.643 3.357 12 12 3.353 20.647"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
              />
              <line
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
                x1="20.649"
                x2="3.354"
                y1="20.649"
                y2="3.354"
              />
            </svg>
          </button>
        </header>

        <div className="ig-dm-new-chat-to">
          <span>Para:</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar..."
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {selectedSummary ? <div className="ig-dm-new-chat-selected">{selectedSummary}</div> : null}

        <div className="ig-dm-new-chat-list-wrap">
          <h3>Sugerencias</h3>
          <div className="ig-dm-new-chat-list">
            {loading ? <p className="ig-dm-empty-list">Buscando...</p> : null}
            {!loading && suggestions.length === 0 ? <p className="ig-dm-empty-list">Sin resultados.</p> : null}
            {!loading
              ? suggestions.map((user) => {
                  const selected = selectedIds.includes(user.id);
                  return (
                    <button
                      key={user.id}
                      type="button"
                      className={`ig-dm-new-chat-item${selected ? " is-selected" : ""}`}
                      onClick={() =>
                        setSelectedIds((prev) =>
                          prev.includes(user.id) ? prev.filter((id) => id !== user.id) : [...prev, user.id],
                        )
                      }
                    >
                      <img src={user.avatarUrl ?? fallbackAvatar(user.id)} alt="" width={44} height={44} />
                      <div>
                        <strong>{user.fullName?.trim() || user.username}</strong>
                        <span>{user.username}</span>
                      </div>
                      <span className={`ig-dm-new-chat-check${selected ? " is-on" : ""}`} aria-hidden="true">
                        {selected ? <span className="ig-dm-new-chat-check-dot" /> : null}
                      </span>
                    </button>
                  );
                })
              : null}
          </div>
        </div>

        <footer className="ig-dm-new-chat-footer">
          <button
            type="button"
            className="ig-dm-primary-btn"
            disabled={selectedIds.length === 0 || submitting}
            aria-disabled={selectedIds.length === 0 || submitting}
            onClick={() => {
              setSubmitting(true);
              void onCreateConversation(selectedIds)
                .then((ok) => {
                  if (ok) onClose();
                })
                .finally(() => setSubmitting(false));
            }}
          >
            {submitting ? "Creando..." : "Chat"}
          </button>
        </footer>
      </section>
    </div>
  );
};

export default MessagesNewChatModal;
