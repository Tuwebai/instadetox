import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useLocation } from "wouter";

interface ConversationRow {
  id: string;
  title: string | null;
  is_group: boolean;
  updated_at: string;
}

interface ParticipantRow {
  conversation_id: string;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export interface InboxConversation {
  id: string;
  title: string;
  isGroup: boolean;
  updatedAt: string;
  preview: string | null;
  previewAt: string | null;
  avatarUrl: string | null;
  username?: string | null;
}

export interface InboxMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  deliveryState: "sending" | "sent" | "failed";
}

interface UseMessagesInboxParams {
  userId: string | undefined;
}

export interface NewMessageUserSuggestion {
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
}

const PAGE_SIZE = 50;

export const useMessagesInbox = ({ userId }: UseMessagesInboxParams) => {
  const [conversations, setConversations] = useState<InboxConversation[]>([]);
  const [location, setLocation] = useLocation();

  const urlConversationId = useMemo(() => {
    if (location.startsWith("/direct/t/")) {
      const parts = location.split("/");
      return parts[parts.length - 1];
    }
    return null;
  }, [location]);

  const [selectedConversationId, setLocalSelectedConversationId] = useState<string | null>(urlConversationId);

  // Sync state con URL al navegar directamente
  useEffect(() => {
    if (urlConversationId && urlConversationId !== selectedConversationId) {
      selectedConversationIdRef.current = urlConversationId;
      setLocalSelectedConversationId(urlConversationId);
    } else if (!urlConversationId && selectedConversationId) {
       selectedConversationIdRef.current = null;
       setLocalSelectedConversationId(null);
    }
  }, [urlConversationId]);

  const setSelectedConversationId = useCallback((id: string | null) => {
    selectedConversationIdRef.current = id;
    if (id) {
      setLocation(`/direct/t/${id}`);
    } else {
      setLocation("/direct/inbox");
    }
    setLocalSelectedConversationId(id);
  }, [setLocation]);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const [unreadByConversation, setUnreadByConversation] = useState<Record<string, number>>({});
  const [peerSeenAtByConversation, setPeerSeenAtByConversation] = useState<Record<string, string | null>>({});
  const [requestConversationIds, setRequestConversationIds] = useState<string[]>([]);
  const [otherParticipantCountByConversation, setOtherParticipantCountByConversation] = useState<Record<string, number>>({});
  const [seenByCountByConversation, setSeenByCountByConversation] = useState<Record<string, number>>({});
  const hasBootstrappedRef = useRef(false);
  const messagesCacheRef = useRef<Record<string, InboxMessage[]>>({});
  const failedMessagesRef = useRef<Record<string, InboxMessage[]>>({});
  const typingChannelRef = useRef<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentAtRef = useRef(0);
  // Ref para selectedConversationId — evita stale closures en handlers de realtime
  const selectedConversationIdRef = useRef<string | null>(null);
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const mergeMessagesById = (items: InboxMessage[]) => {
    const map = new Map<string, InboxMessage>();
    items.forEach((item) => map.set(item.id, item));
    return Array.from(map.values()).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  };

  const loadUnreadCounts = useCallback(
    async (conversationIds: string[]) => {
      if (!supabase || !userId || conversationIds.length === 0) {
        setUnreadByConversation({});
        return;
      }

      const { data } = await supabase.rpc("get_unread_counts", {
        p_conversation_ids: conversationIds,
      });

      const next = ((data ?? []) as Array<{ conversation_id: string; unread_count: number }>).reduce<Record<string, number>>(
        (acc, row) => {
          acc[row.conversation_id] = Math.max(0, Number(row.unread_count ?? 0));
          return acc;
        },
        {},
      );

      if (selectedConversationId) {
        next[selectedConversationId] = 0;
      }

      setUnreadByConversation(next);
    },
    [selectedConversationId, userId],
  );

  const markConversationSeen = useCallback(
    async (conversationId: string) => {
      if (!supabase || !userId) return;
      
      const now = new Date().toISOString();
      // Persistencia
      void supabase.from("conversation_reads").upsert(
        {
          conversation_id: conversationId,
          user_id: userId,
          seen_at: now,
          updated_at: now,
        },
        { onConflict: "conversation_id,user_id" }
      );

      // --- BROADCAST INSTANTÁNEO ---
      // Solo emitir si el canal de la conversación activa está listo
      if (typingChannelRef.current && typingChannelRef.current.state === "joined") {
        void typingChannelRef.current.send({
          type: "broadcast",
          event: "seen",
          payload: { userId, seenAt: now }
        });
      }

      setUnreadByConversation((prev) => ({ ...prev, [conversationId]: 0 }));
    },
    [userId],
  );

  const loadPeerSeenAt = useCallback(
    async (conversationId: string) => {
      if (!supabase || !userId) return;

      const { data } = await supabase
        .from("conversation_reads")
        .select("seen_at")
        .eq("conversation_id", conversationId)
        .neq("user_id", userId)
        .order("seen_at", { ascending: false })
        .limit(1);

      const latestSeenAt =
        Array.isArray(data) && data.length > 0 && typeof data[0]?.seen_at === "string"
          ? data[0].seen_at
          : null;

      setPeerSeenAtByConversation((prev) => ({ ...prev, [conversationId]: latestSeenAt }));
    },
    [userId],
  );

  const loadSeenByCount = useCallback(
    async (conversationId: string, lastOwnSentAt: string | null) => {
      if (!supabase || !userId || !lastOwnSentAt) {
        setSeenByCountByConversation((prev) => ({ ...prev, [conversationId]: 0 }));
        return;
      }

      const { data } = await supabase
        .from("conversation_reads")
        .select("user_id")
        .eq("conversation_id", conversationId)
        .neq("user_id", userId)
        .gte("seen_at", lastOwnSentAt);

      setSeenByCountByConversation((prev) => ({
        ...prev,
        [conversationId]: Array.isArray(data) ? data.length : 0,
      }));
    },
    [userId],
  );

  const moveConversationToTopWithPreview = useCallback((conversationId: string, preview: string, updatedAt: string) => {
    setConversations((prev) => {
      const next = prev.map((conversation) =>
        conversation.id === conversationId
          ? { ...conversation, preview, previewAt: updatedAt, updatedAt }
          : conversation,
      );
      next.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      return next;
    });
  }, []);

  const loadConversations = useCallback(async (options?: { silent?: boolean }) => {
    if (!supabase || !userId) {
      setConversations([]);
      setSelectedConversationId(null);
      setLoadingConversations(false);
      hasBootstrappedRef.current = true;
      return;
    }

    const shouldShowLoading = !options?.silent && !hasBootstrappedRef.current;
    if (shouldShowLoading) {
      setLoadingConversations(true);
    }

    try {
      let participantRows: ParticipantRow[] = [];
      let participantError: Error | null = null;

      for (let attempt = 0; attempt < 3; attempt += 1) {
        const response = await supabase
          .from("conversation_participants")
          .select("conversation_id")
          .eq("user_id", userId);
        participantRows = (response.data ?? []) as ParticipantRow[];
        participantError = response.error;
        if (!participantError) break;
        await sleep(150 * (attempt + 1));
      }

      if (participantError) {
        setConversations([]);
        setSelectedConversationId(null);
        setMessages([]);
        return;
      }

      const conversationIds = participantRows.map((row) => row.conversation_id);

      if (conversationIds.length === 0) {
        setConversations([]);
        if (selectedConversationId) {
          setLocation("/direct/inbox");
        }
        setSelectedConversationId(null);
        setMessages([]);
        return;
      }

      let conversationRows: ConversationRow[] = [];
      let conversationError: Error | null = null;

      for (let attempt = 0; attempt < 3; attempt += 1) {
        const response = await supabase
          .from("conversations")
          .select("id, title, is_group, updated_at")
          .in("id", conversationIds)
          .order("updated_at", { ascending: false });
        conversationRows = (response.data ?? []) as ConversationRow[];
        conversationError = response.error;
        if (!conversationError) break;
        await sleep(150 * (attempt + 1));
      }

      if (conversationError) {
        setConversations([]);
        setSelectedConversationId(null);
        setMessages([]);
        return;
      }

      const baseConversations = conversationRows.map((row) => ({
        id: row.id,
        title: row.title?.trim() || "Conversacion",
        isGroup: row.is_group,
        updatedAt: row.updated_at,
        preview: null,
        previewAt: null,
        avatarUrl: null,
      }));

      const { data: participantDetailRows } = await supabase
        .from("conversation_participants")
        .select("conversation_id, user_id")
        .in("conversation_id", conversationIds);

      const participantRowsByConversation = new Map<string, string[]>();
      ((participantDetailRows ?? []) as Array<{ conversation_id: string; user_id: string }>).forEach((row) => {
        const current = participantRowsByConversation.get(row.conversation_id) ?? [];
        participantRowsByConversation.set(row.conversation_id, [...current, row.user_id]);
      });

      const otherParticipantIds = Array.from(
        new Set(
          Array.from(participantRowsByConversation.values())
            .flatMap((participantIds) => participantIds)
            .filter((participantId) => participantId !== userId),
        ),
      );

      const profileById = new Map<
        string,
        { username: string | null; full_name: string | null; avatar_url: string | null }
      >();
      if (otherParticipantIds.length > 0) {
        const { data: profileRows } = await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url")
          .in("id", otherParticipantIds);
        (
          (profileRows ?? []) as Array<{
            id: string;
            username: string | null;
            full_name: string | null;
            avatar_url: string | null;
          }>
        ).forEach((row) => {
          profileById.set(row.id, {
            username: row.username,
            full_name: row.full_name,
            avatar_url: row.avatar_url,
          });
        });
      }

      let followingSet = new Set<string>();
      if (otherParticipantIds.length > 0) {
        const { data: followingRows } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", userId)
          .in("following_id", otherParticipantIds);

        followingSet = new Set(
          ((followingRows ?? []) as Array<{ following_id: string | null }>)
            .map((row) => row.following_id)
            .filter((id): id is string => typeof id === "string"),
        );
      }

      const { data: recentRows } = await supabase
        .from("messages")
        .select("id, conversation_id, sender_id, body, created_at")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false })
        .limit(500);

      const previewByConversationId = new Map<string, MessageRow>();

      ((recentRows ?? []) as MessageRow[]).forEach((row) => {
        if (!previewByConversationId.has(row.conversation_id)) {
          previewByConversationId.set(row.conversation_id, row);
        }
      });

      const nextConversations = baseConversations.map((row) => {
        const latest = previewByConversationId.get(row.id);
        const participantIds = participantRowsByConversation.get(row.id) ?? [];
        const counterpartIds = participantIds.filter((participantId) => participantId !== userId);
        const directCounterpart = !row.isGroup && counterpartIds.length === 1 ? profileById.get(counterpartIds[0]) : null;

        const resolvedTitle =
          directCounterpart?.full_name?.trim() ||
          directCounterpart?.username ||
          row.title;

        return {
          ...row,
          title: resolvedTitle,
          preview: latest?.body ?? null,
          previewAt: latest?.created_at ?? null,
          avatarUrl: directCounterpart?.avatar_url ?? null,
          username: directCounterpart?.username ?? null,
        };
      });

      const nextOtherParticipantCountByConversation = nextConversations.reduce<Record<string, number>>((acc, conversation) => {
        const participantIds = participantRowsByConversation.get(conversation.id) ?? [];
        acc[conversation.id] = participantIds.filter((participantId) => participantId !== userId).length;
        return acc;
      }, {});

      const nextRequestConversationIds = nextConversations
        .filter((conversation) => !conversation.isGroup)
        .filter((conversation) => {
          const participantIds = participantRowsByConversation.get(conversation.id) ?? [];
          const counterpartIds = participantIds.filter((participantId) => participantId !== userId);
          if (counterpartIds.length !== 1) return false;
          return !followingSet.has(counterpartIds[0]);
        })
        .map((conversation) => conversation.id);

      setConversations(nextConversations);
      setOtherParticipantCountByConversation(nextOtherParticipantCountByConversation);
      setRequestConversationIds(nextRequestConversationIds);
      if (!urlConversationId && nextConversations.length > 0) {
        const id = nextConversations[0]?.id;
        if (id) {
           setSelectedConversationId(null); // Deja la URI en /direct/inbox explicitamente.
        }
      }
      
      void loadUnreadCounts(nextConversations.map((row) => row.id));
    } finally {
      setLoadingConversations(false);
      hasBootstrappedRef.current = true;
    }
  }, [loadUnreadCounts, userId]);

  const searchNewMessageCandidates = useCallback(
    async (query: string) => {
      if (!supabase || !userId) return [] as NewMessageUserSuggestion[];

      const trimmed = query.trim();
      if (trimmed.length === 0) {
        const { data: followingRows } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", userId)
          .limit(30);

        const followingIds = ((followingRows ?? []) as Array<{ following_id: string | null }>)
          .map((row) => row.following_id)
          .filter((id): id is string => typeof id === "string");

        if (followingIds.length > 0) {
          const { data: profilesRows } = await supabase
            .from("profiles")
            .select("id, username, full_name, avatar_url")
            .in("id", followingIds)
            .limit(25);

          return ((profilesRows ?? []) as Array<{ id: string; username: string | null; full_name: string | null; avatar_url: string | null }>)
            .filter((row) => row.id !== userId && typeof row.username === "string")
            .map((row) => ({
              id: row.id,
              username: row.username ?? "",
              fullName: row.full_name,
              avatarUrl: row.avatar_url,
            }));
        }
      }

      const { data: rows } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .neq("id", userId)
        .or(`username.ilike.%${trimmed}%,full_name.ilike.%${trimmed}%`)
        .limit(25);

      return ((rows ?? []) as Array<{ id: string; username: string | null; full_name: string | null; avatar_url: string | null }>)
        .filter((row) => typeof row.username === "string")
        .map((row) => ({
          id: row.id,
          username: row.username ?? "",
          fullName: row.full_name,
          avatarUrl: row.avatar_url,
        }));
    },
    [userId],
  );

  const findExistingDirectConversation = useCallback(
    async (targetUserId: string) => {
      if (!supabase || !userId) return null;

      const { data: myRows } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", userId);

      const myConversationIds = ((myRows ?? []) as Array<{ conversation_id: string }>).map((row) => row.conversation_id);
      if (myConversationIds.length === 0) return null;

      const { data: targetRows } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", targetUserId)
        .in("conversation_id", myConversationIds);

      const candidateIds = ((targetRows ?? []) as Array<{ conversation_id: string }>).map((row) => row.conversation_id);
      if (candidateIds.length === 0) return null;

      const [{ data: participantRows }, { data: conversationRows }] = await Promise.all([
        supabase.from("conversation_participants").select("conversation_id, user_id").in("conversation_id", candidateIds),
        supabase.from("conversations").select("id, is_group, updated_at").in("id", candidateIds).eq("is_group", false),
      ]);

      const allowedConversationIds = new Set(
        ((conversationRows ?? []) as Array<{ id: string }>).map((row) => row.id),
      );
      if (allowedConversationIds.size === 0) return null;

      const byConversation = new Map<string, Set<string>>();
      ((participantRows ?? []) as Array<{ conversation_id: string; user_id: string }>).forEach((row) => {
        if (!allowedConversationIds.has(row.conversation_id)) return;
        const set = byConversation.get(row.conversation_id) ?? new Set<string>();
        set.add(row.user_id);
        byConversation.set(row.conversation_id, set);
      });

      const directCandidates = ((conversationRows ?? []) as Array<{ id: string; updated_at: string }>).filter((row) => {
        const participants = byConversation.get(row.id);
        if (!participants || participants.size !== 2) return false;
        return participants.has(userId) && participants.has(targetUserId);
      });

      directCandidates.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      return directCandidates[0]?.id ?? null;
    },
    [userId],
  );

  const createOrOpenConversation = useCallback(
    async (participantIds: string[]) => {
      if (!supabase || !userId) return null;

      const uniqueParticipantIds = Array.from(
        new Set(
          participantIds
            .map((id) => id.trim())
            .filter((id) => id.length > 0 && id !== userId),
        ),
      );
      if (uniqueParticipantIds.length === 0) return null;

      if (uniqueParticipantIds.length === 1) {
        const existingId = await findExistingDirectConversation(uniqueParticipantIds[0]);
        if (existingId) {
          setSelectedConversationId(existingId);
          await loadConversations({ silent: true });
          return existingId;
        }
      }

      const isGroup = uniqueParticipantIds.length > 1;
      const { data: conversation, error: conversationError } = await supabase
        .from("conversations")
        .insert({
          created_by: userId,
          is_group: isGroup,
          title: isGroup ? "Grupo" : null,
        })
        .select("id")
        .single();

      if (conversationError || !conversation?.id) {
        return null;
      }

      const rows = [userId, ...uniqueParticipantIds].map((id) => ({
        conversation_id: conversation.id,
        user_id: id,
      }));

      const { error: participantsError } = await supabase
        .from("conversation_participants")
        .insert(rows);

      if (participantsError) {
        return null;
      }

      setSelectedConversationId(conversation.id);
      await loadConversations({ silent: true });
      return conversation.id;
    },
    [findExistingDirectConversation, loadConversations, userId],
  );

  const loadMessages = useCallback(async (conversationId: string, options?: { silent?: boolean }) => {
    if (!supabase) return;

    const shouldShowLoading = !options?.silent;
    if (shouldShowLoading) {
      setLoadingMessages(true);
    }

    try {
      let data: MessageRow[] = [];
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const response = await supabase
          .from("messages")
          .select("id, conversation_id, sender_id, body, created_at")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true })
          .limit(PAGE_SIZE);
        data = (response.data ?? []) as MessageRow[];
        if (!response.error) break;
        await sleep(150 * (attempt + 1));
      }

      const nextMessages = data.map((row) => ({
        id: row.id,
        conversationId: row.conversation_id,
        senderId: row.sender_id,
        body: row.body,
        createdAt: row.created_at,
        deliveryState: "sent" as const,
      }));

      const failedMessages = failedMessagesRef.current[conversationId] ?? [];
      const merged = [...nextMessages, ...failedMessages].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );

      messagesCacheRef.current[conversationId] = merged;
      setMessages(merged);
      setHasMoreMessages(nextMessages.length >= PAGE_SIZE);
    } finally {
      if (shouldShowLoading) {
        setLoadingMessages(false);
      }
    }
  }, []);

  const loadOlderMessages = useCallback(async () => {
    if (!supabase || !selectedConversationId || loadingOlderMessages || !hasMoreMessages) return;

    const current = messagesCacheRef.current[selectedConversationId] ?? messages;
    const sentMessages = current.filter((message) => !message.id.startsWith("optimistic-"));
    const oldest = sentMessages[0];
    if (!oldest) {
      setHasMoreMessages(false);
      return;
    }

    setLoadingOlderMessages(true);
    try {
      const { data } = await supabase
        .from("messages")
        .select("id, conversation_id, sender_id, body, created_at")
        .eq("conversation_id", selectedConversationId)
        .lt("created_at", oldest.createdAt)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      const chunk = ((data ?? []) as MessageRow[])
        .map((row) => ({
          id: row.id,
          conversationId: row.conversation_id,
          senderId: row.sender_id,
          body: row.body,
          createdAt: row.created_at,
          deliveryState: "sent" as const,
        }))
        .reverse();

      const merged = mergeMessagesById([...chunk, ...current]);
      messagesCacheRef.current[selectedConversationId] = merged;
      setMessages(merged);
      setHasMoreMessages(chunk.length >= PAGE_SIZE);
    } finally {
      setLoadingOlderMessages(false);
    }
  }, [hasMoreMessages, loadingOlderMessages, messages, selectedConversationId]);

  const sendMessage = useCallback(
    async (body: string) => {
      if (!supabase || !userId || !selectedConversationId) return false;
      const trimmed = body.trim();
      if (!trimmed) return false;

      const finalId = self.crypto.randomUUID();
      const now = new Date().toISOString();
      const message: InboxMessage = {
        id: finalId,
        conversationId: selectedConversationId,
        senderId: userId,
        body: trimmed,
        createdAt: now,
        deliveryState: "sent", // Estado inmediato para UX fluida
      };

      // 1. Actualización Local Instantánea
      setMessages((prev) => [...prev, message]);
      messagesCacheRef.current[selectedConversationId] = [
        ...(messagesCacheRef.current[selectedConversationId] ?? []),
        message,
      ];
      moveConversationToTopWithPreview(selectedConversationId, trimmed, now);

      // 2. BROADCAST PARALELO (0ms delay)
      if (typingChannelRef.current && typingChannelRef.current.state === "joined") {
        void typingChannelRef.current.send({
          type: "broadcast",
          event: "new_message",
          payload: message
        });
      }

      // 3. Persistencia Silenciosa (Segundo plano)
      void (async () => {
        const { error } = await supabase.from("messages").insert({
          id: finalId,
          conversation_id: selectedConversationId,
          sender_id: userId,
          body: trimmed,
          created_at: now
        });

        if (error) {
          console.error("Error persistencia mensaje:", error);
          setMessages((prev) =>
            prev.map((m) => (m.id === finalId ? { ...m, deliveryState: "failed" } : m)),
          );
        } else {
          void supabase
            .from("conversations")
            .update({ updated_at: now })
            .eq("id", selectedConversationId);
        }
      })();

      return true;
    },
    [moveConversationToTopWithPreview, selectedConversationId, userId],
  );

  const retryFailedMessage = useCallback(
    async (messageId: string) => {
      if (!selectedConversationId) return false;
      const failedMessages = failedMessagesRef.current[selectedConversationId] ?? [];
      const target = failedMessages.find((message) => message.id === messageId);
      if (!target) return false;

      failedMessagesRef.current[selectedConversationId] = failedMessages.filter((message) => message.id !== messageId);
      setMessages((prev) => prev.filter((message) => message.id !== messageId));
      messagesCacheRef.current[selectedConversationId] = (messagesCacheRef.current[selectedConversationId] ?? []).filter(
        (message) => message.id !== messageId,
      );

      return sendMessage(target.body);
    },
    [selectedConversationId, sendMessage],
  );

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      setPeerTyping(false);
      return;
    }
    setUnreadByConversation((prev) => {
      if (!prev[selectedConversationId]) return prev;
      return { ...prev, [selectedConversationId]: 0 };
    });
    const cachedMessages = messagesCacheRef.current[selectedConversationId];
    if (cachedMessages && cachedMessages.length > 0) {
      setMessages(cachedMessages);
      void loadMessages(selectedConversationId, { silent: true });
      void loadPeerSeenAt(selectedConversationId);
      return;
    }
    void loadMessages(selectedConversationId);
    void loadPeerSeenAt(selectedConversationId);
  }, [loadMessages, loadPeerSeenAt, selectedConversationId]);

  useEffect(() => {
    if (!selectedConversationId) return;
    const latestOwnSentAt =
      [...messages]
        .reverse()
        .find((message) => message.senderId === userId && message.deliveryState === "sent")?.createdAt ?? null;
    void loadSeenByCount(selectedConversationId, latestOwnSentAt);
  }, [loadSeenByCount, messages, selectedConversationId, userId]);

  useEffect(() => {
    if (!supabase || !userId) return;

    const client = supabase;
    // CANAL GLOBAL: PERSISTENTE DURANTE TODA LA SESIÓN
    // Recibe mensajes de CUALQUIER conversación
    const globalChannel = client.channel(`inbox:${userId}`);

    globalChannel.on("broadcast", { event: "new_message" }, ({ payload }) => {
      const msg = payload as InboxMessage | null;
      if (!msg || !msg.id || !msg.conversationId) return;

      moveConversationToTopWithPreview(msg.conversationId, msg.body, msg.createdAt);

      if (selectedConversationIdRef.current === msg.conversationId) {
        void markConversationSeen(msg.conversationId);
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          const next = [...prev, msg].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          messagesCacheRef.current[msg.conversationId] = next;
          return next;
        });
      } else {
        setUnreadByConversation((prev) => ({
          ...prev,
          [msg.conversationId]: (prev[msg.conversationId] ?? 0) + 1,
        }));
      }
    });

    globalChannel.subscribe();

    const handleMessageEvent = (payload: RealtimePostgresChangesPayload<MessageRow>) => {
      const isInsert = payload.eventType === "INSERT";
      const row = isInsert ? payload.new : payload.old;
      const rawConversationId = row?.conversation_id;
      const rawSenderId = row?.sender_id;

      if (typeof rawConversationId !== "string") return;
      const currentConversationId = selectedConversationIdRef.current;

      if (isInsert) {
        const msg: InboxMessage = {
          id: row.id!,
          conversationId: rawConversationId,
          senderId: rawSenderId!,
          body: row.body!,
          createdAt: row.created_at!,
          deliveryState: "sent"
        };

        moveConversationToTopWithPreview(msg.conversationId, msg.body, msg.createdAt);

        if (currentConversationId === msg.conversationId) {
          if (msg.senderId !== userId) {
            void markConversationSeen(msg.conversationId);
          }
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            const next = [...prev, msg].sort(
              (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
            messagesCacheRef.current[msg.conversationId] = next;
            return next;
          });
        } else if (msg.senderId !== userId) {
          setUnreadByConversation((prev) => ({
            ...prev,
            [msg.conversationId]: (prev[msg.conversationId] ?? 0) + 1,
          }));
        }
      } else {
        // DELETE o UPDATE
        void loadConversations({ silent: true });
        if (currentConversationId === rawConversationId) {
          void loadMessages(rawConversationId, { silent: true });
        }
      }
    };

    globalChannel.on("postgres_changes", { event: "*", schema: "public", table: "messages" }, handleMessageEvent);
    globalChannel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "conversation_participants", filter: `user_id=eq.${userId}` },
      () => { void loadConversations({ silent: true }); },
    );
    globalChannel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "conversations" },
      () => { void loadConversations({ silent: true }); },
    );
    globalChannel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "conversation_reads" },
      (payload) => {
        const row = payload.eventType === "DELETE" ? payload.old : payload.new;
        const rawConversationId = row?.conversation_id;
        if (typeof rawConversationId !== "string") return;
        const currentConversationId = selectedConversationIdRef.current;
        if (currentConversationId === rawConversationId) {
          void loadPeerSeenAt(rawConversationId);
          // Actualizar contador "Visto por n"
          const currentMessages = messagesCacheRef.current[rawConversationId] ?? [];
          const latestOwnSentAt = [...currentMessages]
            .reverse()
            .find((m) => m.senderId === userId && m.deliveryState === "sent")?.createdAt ?? null;
          void loadSeenByCount(rawConversationId, latestOwnSentAt);
        }
      },
    );

    return () => {
      void client.removeChannel(globalChannel);
    };
  }, [loadConversations, loadMessages, loadPeerSeenAt, markConversationSeen, moveConversationToTopWithPreview, userId]);

  useEffect(() => {
    if (!supabase || !selectedConversationId || !userId) return;
    const client = supabase;

    if (typingChannelRef.current) {
      void client.removeChannel(typingChannelRef.current);
      typingChannelRef.current = null;
    }

    const channel = client.channel(`conversation:${selectedConversationId}`);
    typingChannelRef.current = channel;

    channel.on("broadcast", { event: "typing" }, ({ payload }) => {
      const senderId = payload?.senderId;
      if (typeof senderId !== "string" || senderId === userId) return;

      setPeerTyping(Boolean(payload?.isTyping));
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setPeerTyping(false);
      }, 2400);
    });

    channel.on("broadcast", { event: "seen" }, ({ payload }) => {
      const { userId: peerId, seenAt } = payload || {};
      if (!peerId || peerId === userId || !seenAt) return;
      
      setPeerSeenAtByConversation(prev => ({
        ...prev,
        [selectedConversationId]: seenAt
      }));
    });

    // 3. Evento Mensaje Nuevo (Entrega 0ms si el chat está abierto)
    channel.on("broadcast", { event: "new_message" }, ({ payload }) => {
      const msg = payload as InboxMessage | null;
      if (!msg || !msg.id || !msg.conversationId) return;
      if (msg.senderId === userId) return;

      // Actualizar el preview del sidebar
      moveConversationToTopWithPreview(msg.conversationId, msg.body, msg.createdAt);

      // Si la conversación está abierta, agregar el mensaje al hilo
      void markConversationSeen(msg.conversationId);
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        const next = [...prev, msg].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        messagesCacheRef.current[msg.conversationId] = next;
        return next;
      });
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        void markConversationSeen(selectedConversationId);
      }
    });

    return () => {
      void client.removeChannel(channel);
    };
  }, [markConversationSeen, selectedConversationId, userId]);

  useEffect(() => {
    const onResume = () => {
      void loadConversations({ silent: true });
      if (selectedConversationId) {
        void loadMessages(selectedConversationId, { silent: true });
      }
    };
    const onVisibility = () => {
      if (!document.hidden) onResume();
    };
    window.addEventListener("focus", onResume);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onResume);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [loadConversations, loadMessages, selectedConversationId]);

  useEffect(() => {
    if (!selectedConversationId) return;
    void markConversationSeen(selectedConversationId);
  }, [markConversationSeen, selectedConversationId]);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  );

  const notifyTyping = useCallback(
    (isTyping: boolean) => {
      if (!typingChannelRef.current || !userId || typingChannelRef.current.state !== "joined") return;
      const now = Date.now();
      if (isTyping && now - lastTypingSentAtRef.current < 800) return;
      lastTypingSentAtRef.current = now;
      void typingChannelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: { senderId: userId, isTyping },
      });
    },
    [userId],
  );

  return {
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
    peerSeenAt: selectedConversationId ? (peerSeenAtByConversation[selectedConversationId] ?? null) : null,
    seenByCount: selectedConversationId ? (seenByCountByConversation[selectedConversationId] ?? 0) : 0,
    otherParticipantCount: selectedConversationId ? (otherParticipantCountByConversation[selectedConversationId] ?? 1) : 1,
    hasMoreMessages,
    loadingOlderMessages,
    loadConversations,
    sendMessage,
    retryFailedMessage,
    notifyTyping,
    loadOlderMessages,
    searchNewMessageCandidates,
    createOrOpenConversation,
  };
};
