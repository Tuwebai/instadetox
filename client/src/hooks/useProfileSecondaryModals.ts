import { useCallback, useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from "react";

interface UseProfileSecondaryModalsOptions<TCursor, TUser> {
  connectionsOpen: boolean;
  setConnectionsOpen: (next: boolean) => void;
  commentLikesModalCommentId: string | null;
  commentLikesModalLoadingMore: boolean;
  commentLikesModalCursor: TCursor | null;
  commentLikesModalActiveCommentIdRef: MutableRefObject<string | null>;
  reportCommentSubmittingReason: string | null;
  setCommentLikesModalOpen: Dispatch<SetStateAction<boolean>>;
  setCommentLikesModalCommentId: Dispatch<SetStateAction<string | null>>;
  setCommentLikesModalUsers: Dispatch<SetStateAction<TUser[]>>;
  setCommentLikesModalLoading: Dispatch<SetStateAction<boolean>>;
  setCommentLikesModalLoadingMore: Dispatch<SetStateAction<boolean>>;
  setCommentLikesModalHasMore: Dispatch<SetStateAction<boolean>>;
  setCommentLikesModalCursor: Dispatch<SetStateAction<TCursor | null>>;
  setCommentLikesModalActionBusyById: Dispatch<SetStateAction<Record<string, boolean>>>;
  setReportCommentModalOpen: Dispatch<SetStateAction<boolean>>;
  setReportCommentId: Dispatch<SetStateAction<string | null>>;
  loadCommentLikesModalPage: (
    commentId: string,
    cursor: TCursor | null,
    options?: { append?: boolean },
  ) => Promise<void>;
}

export const useProfileSecondaryModals = <TCursor, TUser>({
  connectionsOpen,
  setConnectionsOpen,
  commentLikesModalCommentId,
  commentLikesModalLoadingMore,
  commentLikesModalCursor,
  commentLikesModalActiveCommentIdRef,
  reportCommentSubmittingReason,
  setCommentLikesModalOpen,
  setCommentLikesModalCommentId,
  setCommentLikesModalUsers,
  setCommentLikesModalLoading,
  setCommentLikesModalLoadingMore,
  setCommentLikesModalHasMore,
  setCommentLikesModalCursor,
  setCommentLikesModalActionBusyById,
  setReportCommentModalOpen,
  setReportCommentId,
  loadCommentLikesModalPage,
}: UseProfileSecondaryModalsOptions<TCursor, TUser>) => {
  const resetCommentLikesModalState = useCallback(() => {
    commentLikesModalActiveCommentIdRef.current = null;
    setCommentLikesModalCommentId(null);
    setCommentLikesModalUsers([]);
    setCommentLikesModalLoading(false);
    setCommentLikesModalLoadingMore(false);
    setCommentLikesModalHasMore(false);
    setCommentLikesModalCursor(null);
    setCommentLikesModalActionBusyById({});
  }, [
    commentLikesModalActiveCommentIdRef,
    setCommentLikesModalActionBusyById,
    setCommentLikesModalCommentId,
    setCommentLikesModalCursor,
    setCommentLikesModalHasMore,
    setCommentLikesModalLoading,
    setCommentLikesModalLoadingMore,
    setCommentLikesModalUsers,
  ]);

  const closeCommentLikesModal = useCallback(() => {
    setCommentLikesModalOpen(false);
    resetCommentLikesModalState();
  }, [resetCommentLikesModalState, setCommentLikesModalOpen]);

  const closeReportCommentModal = useCallback(() => {
    if (reportCommentSubmittingReason) return;
    setReportCommentModalOpen(false);
    setReportCommentId(null);
  }, [reportCommentSubmittingReason, setReportCommentId, setReportCommentModalOpen]);

  const handleLoadMoreCommentLikesFromModal = useCallback(() => {
    if (!commentLikesModalCommentId || commentLikesModalLoadingMore) return;
    if (!commentLikesModalCursor) return;
    void loadCommentLikesModalPage(commentLikesModalCommentId, commentLikesModalCursor, { append: true });
  }, [commentLikesModalCommentId, commentLikesModalCursor, commentLikesModalLoadingMore, loadCommentLikesModalPage]);

  useEffect(() => {
    if (!connectionsOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setConnectionsOpen(false);
      }
    };
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [connectionsOpen, setConnectionsOpen]);

  return {
    closeCommentLikesModal,
    closeReportCommentModal,
    handleLoadMoreCommentLikesFromModal,
  };
};
