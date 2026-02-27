import { useCallback, useEffect, useRef } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";

interface PostLike {
  id: string;
}

interface ModalPostRefState {
  postId: string;
  count: number;
}

interface UseProfilePostModalLifecycleParams<TPost extends PostLike> {
  modalIndex: number | null;
  setModalIndex: Dispatch<SetStateAction<number | null>>;
  closePostModal: () => void;
  activeTabPosts: TPost[];
  closeCommentLikesModal: () => void;
  isPostRouteMatch: boolean;
  routePostId: string | null;
  targetUsername: string | null | undefined;
  handledRoutePostKeyRef: MutableRefObject<string | null>;
  openCommentMenuId: string | null;
  setOpenCommentMenuId: Dispatch<SetStateAction<string | null>>;
  modalPostId: string | null;
  modalCommentsLength: number;
  setModalCommentInput: Dispatch<SetStateAction<string>>;
  setModalReplyTarget: Dispatch<SetStateAction<{ commentId: string; username: string } | null>>;
  setExpandedRepliesByCommentId: Dispatch<SetStateAction<Record<string, boolean>>>;
  setForcedVisibleReplyIdsByParent: Dispatch<SetStateAction<Record<string, string[]>>>;
  setReportCommentModalOpen: Dispatch<SetStateAction<boolean>>;
  setReportCommentId: Dispatch<SetStateAction<string | null>>;
  setReportCommentSubmittingReason: Dispatch<SetStateAction<string | null>>;
  loadModalPostState: (postId: string, options?: { background?: boolean }) => Promise<void>;
  modalCommentsHydratedPostsRef: MutableRefObject<Set<string>>;
  modalCommentsScrollRef: MutableRefObject<HTMLDivElement | null>;
  modalCommentsStickToBottomRef: MutableRefObject<boolean>;
  modalCommentsPrevSizeRef: MutableRefObject<ModalPostRefState | null>;
  modalCommentsSuppressAutoScrollRef: MutableRefObject<boolean>;
}

export const useProfilePostModalLifecycle = <TPost extends PostLike>({
  modalIndex,
  setModalIndex,
  closePostModal,
  activeTabPosts,
  closeCommentLikesModal,
  isPostRouteMatch,
  routePostId,
  targetUsername,
  handledRoutePostKeyRef,
  openCommentMenuId,
  setOpenCommentMenuId,
  modalPostId,
  modalCommentsLength,
  setModalCommentInput,
  setModalReplyTarget,
  setExpandedRepliesByCommentId,
  setForcedVisibleReplyIdsByParent,
  setReportCommentModalOpen,
  setReportCommentId,
  setReportCommentSubmittingReason,
  loadModalPostState,
  modalCommentsHydratedPostsRef,
  modalCommentsScrollRef,
  modalCommentsStickToBottomRef,
  modalCommentsPrevSizeRef,
  modalCommentsSuppressAutoScrollRef,
}: UseProfilePostModalLifecycleParams<TPost>) => {
  const hydratedModalPostIdRef = useRef<string | null>(null);

  const handleModalCommentsScroll = useCallback(() => {
    const container = modalCommentsScrollRef.current;
    if (!container) return;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    modalCommentsStickToBottomRef.current = distanceFromBottom <= 48;
  }, [modalCommentsScrollRef, modalCommentsStickToBottomRef]);

  const scrollModalCommentsToBottom = useCallback(() => {
    const container = modalCommentsScrollRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [modalCommentsScrollRef]);

  useEffect(() => {
    if (modalIndex === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePostModal();
      if (event.key === "ArrowLeft") {
        setModalIndex((prev) => {
          if (prev === null || activeTabPosts.length === 0) return prev;
          return (prev - 1 + activeTabPosts.length) % activeTabPosts.length;
        });
      }
      if (event.key === "ArrowRight") {
        setModalIndex((prev) => {
          if (prev === null || activeTabPosts.length === 0) return prev;
          return (prev + 1) % activeTabPosts.length;
        });
      }
    };
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeTabPosts.length, closePostModal, modalIndex, setModalIndex]);

  useEffect(() => {
    if (modalIndex !== null) return;
    closeCommentLikesModal();
  }, [closeCommentLikesModal, modalIndex]);

  useEffect(() => {
    const resolvedRoutePostId = isPostRouteMatch
      ? routePostId
      : new URLSearchParams(window.location.search).get("post");
    if (!resolvedRoutePostId || activeTabPosts.length === 0) return;
    const postIndex = activeTabPosts.findIndex((post) => post.id === resolvedRoutePostId);
    if (postIndex === -1) return;
    const routeKey = `${isPostRouteMatch ? "post" : targetUsername ?? "unknown"}::${resolvedRoutePostId}`;
    if (handledRoutePostKeyRef.current === routeKey) return;
    handledRoutePostKeyRef.current = routeKey;
    setModalIndex(postIndex);
  }, [activeTabPosts, handledRoutePostKeyRef, isPostRouteMatch, routePostId, setModalIndex, targetUsername]);

  useEffect(() => {
    if (!openCommentMenuId) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-comment-menu]")) return;
      setOpenCommentMenuId(null);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenCommentMenuId(null);
    };
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onEscape);
    };
  }, [openCommentMenuId, setOpenCommentMenuId]);

  useEffect(() => {
    if (!modalPostId) {
      hydratedModalPostIdRef.current = null;
      return;
    }
    if (hydratedModalPostIdRef.current === modalPostId) return;
    hydratedModalPostIdRef.current = modalPostId;
    setModalCommentInput("");
    setModalReplyTarget(null);
    setExpandedRepliesByCommentId({});
    setForcedVisibleReplyIdsByParent({});
    setOpenCommentMenuId(null);
    setReportCommentModalOpen(false);
    setReportCommentId(null);
    setReportCommentSubmittingReason(null);
    const alreadyHydrated = modalCommentsHydratedPostsRef.current.has(modalPostId);
    void loadModalPostState(modalPostId, { background: alreadyHydrated });
  }, [
    loadModalPostState,
    modalCommentsHydratedPostsRef,
    modalPostId,
    setExpandedRepliesByCommentId,
    setForcedVisibleReplyIdsByParent,
    setModalCommentInput,
    setModalReplyTarget,
    setOpenCommentMenuId,
    setReportCommentId,
    setReportCommentModalOpen,
    setReportCommentSubmittingReason,
  ]);

  useEffect(() => {
    if (!modalPostId) {
      modalCommentsPrevSizeRef.current = null;
      return;
    }
    modalCommentsStickToBottomRef.current = true;
    requestAnimationFrame(() => {
      scrollModalCommentsToBottom();
      handleModalCommentsScroll();
    });
  }, [
    handleModalCommentsScroll,
    modalCommentsPrevSizeRef,
    modalCommentsStickToBottomRef,
    modalPostId,
    scrollModalCommentsToBottom,
  ]);

  useEffect(() => {
    if (!modalPostId) return;
    const currentCount = modalCommentsLength;
    const prev = modalCommentsPrevSizeRef.current;
    if (!prev || prev.postId !== modalPostId) {
      modalCommentsPrevSizeRef.current = { postId: modalPostId, count: currentCount };
      return;
    }

    const grew = currentCount > prev.count;
    if (grew && modalCommentsStickToBottomRef.current && !modalCommentsSuppressAutoScrollRef.current) {
      requestAnimationFrame(() => {
        scrollModalCommentsToBottom();
        handleModalCommentsScroll();
      });
    }

    modalCommentsPrevSizeRef.current = { postId: modalPostId, count: currentCount };
  }, [
    handleModalCommentsScroll,
    modalCommentsLength,
    modalCommentsPrevSizeRef,
    modalCommentsStickToBottomRef,
    modalCommentsSuppressAutoScrollRef,
    modalPostId,
    scrollModalCommentsToBottom,
  ]);

  return {
    handleModalCommentsScroll,
    scrollModalCommentsToBottom,
  };
};
