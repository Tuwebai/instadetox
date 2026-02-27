import { useCallback, useRef } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { supabase as supabaseClient } from "@/lib/supabase";
import { fetchModalInitialData, fetchOlderModalCommentsData } from "@/lib/profileModalData";

interface ModalCommentsDataCursor {
  oldestCreatedAt: string;
  oldestId: string;
}

interface ModalCommentLike {
  id: string;
}

interface UseProfileModalCommentsDataParams<TComment extends ModalCommentLike, TCursor extends ModalCommentsDataCursor> {
  supabase: NonNullable<typeof supabaseClient> | null;
  userId: string | null | undefined;
  commentsPageSize: number;
  toast: (payload: { title: string; description: string }) => void;
  dedupeAndSortModalComments: (comments: TComment[]) => TComment[];
  modalCommentsHydratedPostsRef: MutableRefObject<Set<string>>;
  modalCommentsScrollRef: MutableRefObject<HTMLDivElement | null>;
  modalCommentsSuppressAutoScrollRef: MutableRefObject<boolean>;
  modalCommentsCursorByPost: Record<string, TCursor | null>;
  modalCommentsLoadingMoreByPost: Record<string, boolean>;
  setModalCommentsLoading: Dispatch<SetStateAction<boolean>>;
  setModalLikedByMe: Dispatch<SetStateAction<boolean>>;
  setModalSavedByMe: Dispatch<SetStateAction<boolean>>;
  setModalCommentsByPost: Dispatch<SetStateAction<Record<string, TComment[]>>>;
  setModalCommentsCursorByPost: Dispatch<SetStateAction<Record<string, TCursor | null>>>;
  setModalCommentsHasMoreByPost: Dispatch<SetStateAction<Record<string, boolean>>>;
  setModalCommentsLoadingMoreByPost: Dispatch<SetStateAction<Record<string, boolean>>>;
}

export const useProfileModalCommentsData = <TComment extends ModalCommentLike, TCursor extends ModalCommentsDataCursor>({
  supabase,
  userId,
  commentsPageSize,
  toast,
  dedupeAndSortModalComments,
  modalCommentsHydratedPostsRef,
  modalCommentsScrollRef,
  modalCommentsSuppressAutoScrollRef,
  modalCommentsCursorByPost,
  modalCommentsLoadingMoreByPost,
  setModalCommentsLoading,
  setModalLikedByMe,
  setModalSavedByMe,
  setModalCommentsByPost,
  setModalCommentsCursorByPost,
  setModalCommentsHasMoreByPost,
  setModalCommentsLoadingMoreByPost,
}: UseProfileModalCommentsDataParams<TComment, TCursor>) => {
  const initialLoadInFlightRef = useRef<Map<string, Promise<void>>>(new Map());
  const olderLoadInFlightRef = useRef<Set<string>>(new Set());

  const loadModalPostState = useCallback(
    async (postId: string, options?: { background?: boolean }) => {
      if (!supabase) return;
      const inFlight = initialLoadInFlightRef.current.get(postId);
      if (inFlight) {
        await inFlight;
        return;
      }

      const isHydrated = modalCommentsHydratedPostsRef.current.has(postId);
      const shouldShowBlockingLoading = !options?.background && !isHydrated;
      const run = (async () => {
        setModalCommentsLoading(shouldShowBlockingLoading);

        const result = await fetchModalInitialData({
          client: supabase,
          postId,
          commentsPageSize,
          userId,
        });

        if (!result.ok) {
          setModalCommentsLoading(false);
          if (!isHydrated) {
            toast({ title: "Error", description: "No se pudieron cargar los comentarios." });
          }
          return;
        }
        setModalLikedByMe(result.likedByMe);
        setModalSavedByMe(result.savedByMe);

        if (result.comments.length === 0) {
          setModalCommentsByPost((prev) => ({ ...prev, [postId]: [] }));
          setModalCommentsCursorByPost((prev) => ({ ...prev, [postId]: null }));
          setModalCommentsHasMoreByPost((prev) => ({ ...prev, [postId]: false }));
          setModalCommentsLoadingMoreByPost((prev) => ({ ...prev, [postId]: false }));
          modalCommentsHydratedPostsRef.current.add(postId);
          setModalCommentsLoading(false);
          return;
        }
        setModalCommentsByPost((prev) => ({
          ...prev,
          [postId]: dedupeAndSortModalComments(result.comments as unknown as TComment[]),
        }));
        setModalCommentsCursorByPost((prev) => ({
          ...prev,
          [postId]: result.cursor as TCursor | null,
        }));
        setModalCommentsHasMoreByPost((prev) => ({ ...prev, [postId]: result.hasMore }));
        setModalCommentsLoadingMoreByPost((prev) => ({ ...prev, [postId]: false }));
        modalCommentsHydratedPostsRef.current.add(postId);
        setModalCommentsLoading(false);
      })();

      initialLoadInFlightRef.current.set(postId, run);
      try {
        await run;
      } finally {
        initialLoadInFlightRef.current.delete(postId);
      }
    },
    [
      commentsPageSize,
      dedupeAndSortModalComments,
      initialLoadInFlightRef,
      modalCommentsHydratedPostsRef,
      setModalCommentsByPost,
      setModalCommentsCursorByPost,
      setModalCommentsHasMoreByPost,
      setModalCommentsLoading,
      setModalCommentsLoadingMoreByPost,
      setModalLikedByMe,
      setModalSavedByMe,
      supabase,
      toast,
      userId,
    ],
  );

  const loadOlderModalComments = useCallback(
    async (postId: string) => {
      if (!supabase) return;
      if (olderLoadInFlightRef.current.has(postId)) return;
      const cursor = modalCommentsCursorByPost[postId];
      if (!cursor || modalCommentsLoadingMoreByPost[postId]) return;
      const scrollContainer = modalCommentsScrollRef.current;
      const prevHeight = scrollContainer?.scrollHeight ?? 0;
      const prevTop = scrollContainer?.scrollTop ?? 0;
      modalCommentsSuppressAutoScrollRef.current = true;
      olderLoadInFlightRef.current.add(postId);
      try {
        setModalCommentsLoadingMoreByPost((prev) => ({ ...prev, [postId]: true }));

        const result = await fetchOlderModalCommentsData({
          client: supabase,
          postId,
          cursor,
          commentsPageSize,
          userId,
        });

        if (!result.ok) {
          setModalCommentsLoadingMoreByPost((prev) => ({ ...prev, [postId]: false }));
          modalCommentsSuppressAutoScrollRef.current = false;
          toast({ title: "Error", description: "No se pudieron cargar mas comentarios." });
          return;
        }

        if (result.comments.length === 0) {
          setModalCommentsHasMoreByPost((prev) => ({ ...prev, [postId]: false }));
          setModalCommentsLoadingMoreByPost((prev) => ({ ...prev, [postId]: false }));
          modalCommentsSuppressAutoScrollRef.current = false;
          return;
        }

        setModalCommentsByPost((prev) => ({
          ...prev,
          [postId]: dedupeAndSortModalComments([...(prev[postId] ?? []), ...(result.comments as unknown as TComment[])]),
        }));
        setModalCommentsCursorByPost((prev) => ({
          ...prev,
          [postId]: result.cursor as TCursor | null,
        }));
        setModalCommentsHasMoreByPost((prev) => ({ ...prev, [postId]: result.hasMore }));
        setModalCommentsLoadingMoreByPost((prev) => ({ ...prev, [postId]: false }));

        requestAnimationFrame(() => {
          const container = modalCommentsScrollRef.current;
          if (container) {
            const delta = container.scrollHeight - prevHeight;
            container.scrollTop = prevTop + Math.max(0, delta);
          }
          modalCommentsSuppressAutoScrollRef.current = false;
        });
      } finally {
        olderLoadInFlightRef.current.delete(postId);
      }
    },
    [
      commentsPageSize,
      dedupeAndSortModalComments,
      modalCommentsCursorByPost,
      modalCommentsLoadingMoreByPost,
      modalCommentsScrollRef,
      modalCommentsSuppressAutoScrollRef,
      olderLoadInFlightRef,
      setModalCommentsByPost,
      setModalCommentsCursorByPost,
      setModalCommentsHasMoreByPost,
      setModalCommentsLoadingMoreByPost,
      supabase,
      toast,
      userId,
    ],
  );

  return {
    loadModalPostState,
    loadOlderModalComments,
  };
};
