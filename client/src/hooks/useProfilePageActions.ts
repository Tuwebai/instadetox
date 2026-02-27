import { useCallback } from "react";
import type React from "react";

interface ToastNotifier {
  title: string;
  description: string;
}

interface UseProfilePageActionsOptions<TPost extends { id: string }> {
  activeTabPosts: TPost[];
  setLocation: (to: string) => void;
  setModalIndex: React.Dispatch<React.SetStateAction<number | null>>;
  setConnectionsOpen: (next: boolean) => void;
  warmProfilePostRouteSnapshot: (post: TPost) => void;
  handleAvatarFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  notify: (payload: ToastNotifier) => void;
}

export const useProfilePageActions = <TPost extends { id: string }>({
  activeTabPosts,
  setLocation,
  setModalIndex,
  setConnectionsOpen,
  warmProfilePostRouteSnapshot,
  handleAvatarFileChange,
  notify,
}: UseProfilePageActionsOptions<TPost>) => {
  const handleHeaderEditProfile = useCallback(() => {
    setLocation("/accounts/edit/");
  }, [setLocation]);

  const handleHeaderOpenSettings = useCallback(() => {
    notify({
      title: "Configuracion",
      description: "Funcionalidad proximamente.",
    });
  }, [notify]);

  const handleOpenPostFromGrid = useCallback(
    (index: number) => {
      const post = activeTabPosts[index];
      if (!post) return;
      warmProfilePostRouteSnapshot(post);
      setModalIndex(index);
      setLocation(`/p/${post.id}`);
    },
    [activeTabPosts, setLocation, setModalIndex, warmProfilePostRouteSnapshot],
  );

  const handlePrevModalPost = useCallback(() => {
    setModalIndex((prev) => {
      if (prev === null) return prev;
      return (prev - 1 + activeTabPosts.length) % activeTabPosts.length;
    });
  }, [activeTabPosts.length, setModalIndex]);

  const handleNextModalPost = useCallback(() => {
    setModalIndex((prev) => {
      if (prev === null) return prev;
      return (prev + 1) % activeTabPosts.length;
    });
  }, [activeTabPosts.length, setModalIndex]);

  const handleCloseConnectionsModal = useCallback(() => {
    setConnectionsOpen(false);
  }, [setConnectionsOpen]);

  const handleAvatarInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      void handleAvatarFileChange(event);
    },
    [handleAvatarFileChange],
  );

  return {
    handleHeaderEditProfile,
    handleHeaderOpenSettings,
    handleOpenPostFromGrid,
    handlePrevModalPost,
    handleNextModalPost,
    handleCloseConnectionsModal,
    handleAvatarInputChange,
  };
};
