import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import MessagesEmptyState from "@/components/messages/MessagesEmptyState";
import MessagesSidebar from "@/components/messages/MessagesSidebar";
import MessagesThreadView from "@/components/messages/MessagesThreadView";
import MessagesNewChatModal from "@/components/messages/MessagesNewChatModal";
import { useMessagesInbox } from "@/hooks/useMessagesInbox";

const Messages = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [inboxTab, setInboxTab] = useState<"primary" | "general" | "requests">("primary");
  const [newChatOpen, setNewChatOpen] = useState(false);
  const username = user?.username ?? "usuario";

  const {
    conversations,
    selectedConversationId,
    setSelectedConversationId,
    selectedConversation,
    messages,
    loadingConversations,
    loadingMessages,
    peerTyping,
    unreadByConversation,
    requestConversationIds,
    peerSeenAt,
    seenByCount,
    otherParticipantCount,
    hasMoreMessages,
    loadingOlderMessages,
    sendMessage,
    retryFailedMessage,
    notifyTyping,
    loadOlderMessages,
    searchNewMessageCandidates,
    createOrOpenConversation,
  } = useMessagesInbox({ userId: user?.id });

  const showMobileThread = Boolean(selectedConversationId);

  return (
    <div className="ig-dm-page">
      <div className="ig-dm-shell">
        <div className={`ig-dm-shell-grid${showMobileThread ? " is-thread-open" : ""}`}>
          <div className="ig-dm-sidebar-col">
            <MessagesSidebar
              username={username}
              conversations={conversations}
              selectedConversationId={selectedConversationId}
              unreadByConversation={unreadByConversation}
              requestConversationIds={requestConversationIds}
              activeTab={inboxTab}
              searchValue={search}
              onSearchChange={setSearch}
              onTabChange={setInboxTab}
              onSelectConversation={setSelectedConversationId}
              onCreateMessage={() => setNewChatOpen(true)}
              loadingConversations={loadingConversations}
            />
          </div>

          <div className="ig-dm-main-col">
            {selectedConversation ? (
              <MessagesThreadView
                currentUserId={user?.id ?? null}
                selectedConversation={selectedConversation}
                messages={messages}
                loadingMessages={loadingMessages}
                hasMoreMessages={hasMoreMessages}
                loadingOlderMessages={loadingOlderMessages}
                peerTyping={peerTyping}
                peerSeenAt={peerSeenAt}
                seenByCount={seenByCount}
                otherParticipantCount={otherParticipantCount}
                draft={draft}
                onDraftChange={(value) => {
                  setDraft(value);
                  notifyTyping(value.trim().length > 0);
                }}
                onSend={() => {
                  const current = draft;
                  setDraft("");
                  notifyTyping(false);
                  void sendMessage(current).then((success) => {
                    if (!success) {
                      setDraft(current);
                      notifyTyping(current.trim().length > 0);
                    }
                  });
                }}
                onRetryFailedMessage={(messageId) => {
                  void retryFailedMessage(messageId);
                }}
                onLoadOlderMessages={() => {
                  void loadOlderMessages();
                }}
              />
            ) : loadingConversations ? null : (
              <MessagesEmptyState onStartMessage={() => setNewChatOpen(true)} />
            )}
          </div>
        </div>
      </div>
      <MessagesNewChatModal
        open={newChatOpen}
        onClose={() => setNewChatOpen(false)}
        searchUsers={searchNewMessageCandidates}
        onCreateConversation={async (participantIds) => {
          const conversationId = await createOrOpenConversation(participantIds);
          return Boolean(conversationId);
        }}
      />
    </div>
  );
};

export default Messages;
