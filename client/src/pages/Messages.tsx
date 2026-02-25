import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Send, RefreshCw } from "lucide-react";
import { Glass } from "@/components/ui/glass";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";

interface ConversationRow {
  id: string;
  title: string | null;
  updated_at: string;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

const Messages = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const conversationMap = useMemo(
    () => Object.fromEntries(conversations.map((c) => [c.id, c])),
    [conversations],
  );

  const loadConversations = async () => {
    if (!supabase || !user?.id) {
      setConversations([]);
      setSelectedConversation(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data: participantRows } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", user.id);

    const ids = (participantRows ?? []).map((r) => r.conversation_id);
    if (ids.length === 0) {
      setConversations([]);
      setSelectedConversation(null);
      setMessages([]);
      setLoading(false);
      return;
    }

    const { data: convRows } = await supabase
      .from("conversations")
      .select("id, title, updated_at")
      .in("id", ids)
      .order("updated_at", { ascending: false });

    const list = (convRows ?? []) as ConversationRow[];
    setConversations(list);
    setSelectedConversation((prev) => prev ?? list[0]?.id ?? null);
    setLoading(false);
  };

  const loadMessages = async (conversationId: string) => {
    if (!supabase) return;

    const { data } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_id, body, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(200);

    setMessages((data ?? []) as MessageRow[]);
  };

  useEffect(() => {
    void loadConversations();
  }, [user?.id]);

  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      return;
    }
    void loadMessages(selectedConversation);
  }, [selectedConversation]);

  const handleSend = async () => {
    if (!supabase || !user?.id || !selectedConversation || !newMessage.trim()) return;

    const body = newMessage.trim();
    setNewMessage("");

    const { error } = await supabase.from("messages").insert({
      conversation_id: selectedConversation,
      sender_id: user.id,
      body,
    });

    if (error) return;

    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", selectedConversation);

    await loadMessages(selectedConversation);
    await loadConversations();
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-8 animate-in fade-in duration-500">
        <Glass className="p-0 overflow-hidden min-h-[620px]">
          <div className="grid md:grid-cols-[280px_1fr] min-h-[620px]">
            <div className="border-r border-white/15 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center text-white">
                  <MessageCircle className="w-5 h-5 mr-2 text-primary" />
                  Mensajes
                </h2>
                <Button variant="outline" size="sm" onClick={() => void loadConversations()}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>

              {loading ? (
                <p className="text-gray-300 text-sm">Cargando chats...</p>
              ) : conversations.length === 0 ? (
                <p className="text-gray-300 text-sm">No tenes conversaciones aun.</p>
              ) : (
                <div className="space-y-2">
                  {conversations.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedConversation(c.id)}
                      className={`w-full text-left rounded-lg p-3 transition ${
                        selectedConversation === c.id ? "bg-primary/20 border border-primary/40" : "frosted"
                      }`}
                    >
                      <p className="text-sm font-medium text-white truncate">{c.title || "Conversacion"}</p>
                      <p className="text-xs text-gray-300 mt-1">{new Date(c.updated_at).toLocaleString()}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 flex flex-col">
              {!selectedConversation ? (
                <div className="flex-1 grid place-items-center text-gray-300">Selecciona una conversacion</div>
              ) : (
                <>
                  <div className="mb-3 pb-3 border-b border-white/15">
                    <p className="text-white font-medium">{conversationMap[selectedConversation]?.title || "Conversacion"}</p>
                  </div>

                  <div className="flex-1 space-y-2 overflow-y-auto pr-1">
                    {messages.length === 0 ? (
                      <p className="text-gray-300 text-sm">No hay mensajes en esta conversacion.</p>
                    ) : (
                      messages.map((m) => {
                        const isMine = m.sender_id === user?.id;
                        return (
                          <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[80%] rounded-xl px-3 py-2 ${isMine ? "bg-primary/30" : "frosted"}`}>
                              <p className="text-sm text-white whitespace-pre-line">{m.body}</p>
                              <p className="text-[11px] text-gray-300 mt-1">{new Date(m.created_at).toLocaleTimeString()}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Escribe un mensaje..."
                      className="frosted flex-1 rounded-lg px-3 py-2 text-white placeholder:text-gray-400"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void handleSend();
                        }
                      }}
                    />
                    <Button onClick={() => void handleSend()} disabled={!newMessage.trim()}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </Glass>
    </div>
  );
};

export default Messages;
