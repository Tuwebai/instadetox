import { useCallback, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

export type ProfileTab = "posts" | "saved" | "tagged";

export interface TabPageState<TItem> {
  items: TItem[];
  page: number;
  hasMore: boolean;
  loading: boolean;
  initialized: boolean;
}

export interface TabPrefetchState<TItem> {
  page: number;
  rows: TItem[];
  hasMore: boolean;
}

export const createInitialTabState = <TItem>(): Record<ProfileTab, TabPageState<TItem>> => ({
  posts: { items: [], page: 0, hasMore: true, loading: false, initialized: false },
  saved: { items: [], page: 0, hasMore: true, loading: false, initialized: false },
  tagged: { items: [], page: 0, hasMore: true, loading: false, initialized: false },
});

export const createInitialPrefetchState = <TItem>(): Record<ProfileTab, TabPrefetchState<TItem> | null> => ({
  posts: null,
  saved: null,
  tagged: null,
});

export const createInitialPrefetchingState = (): Record<ProfileTab, boolean> => ({
  posts: false,
  saved: false,
  tagged: false,
});

const resolveSetState = <TItem>(
  action: SetStateAction<Record<ProfileTab, TabPageState<TItem>>>,
  prev: Record<ProfileTab, TabPageState<TItem>>,
) => {
  if (typeof action === "function") {
    return (action as (prevState: Record<ProfileTab, TabPageState<TItem>>) => Record<ProfileTab, TabPageState<TItem>>)(prev);
  }
  return action;
};

export const useProfileTabsState = <TItem>() => {
  const [tabState, setTabStateInternal] = useState<Record<ProfileTab, TabPageState<TItem>>>(() => createInitialTabState<TItem>());
  const tabStateRef = useRef<Record<ProfileTab, TabPageState<TItem>>>(createInitialTabState<TItem>());
  const prefetchedPageRef = useRef<Record<ProfileTab, TabPrefetchState<TItem> | null>>(createInitialPrefetchState<TItem>());
  const prefetchingRef = useRef<Record<ProfileTab, boolean>>(createInitialPrefetchingState());

  const setTabState: Dispatch<SetStateAction<Record<ProfileTab, TabPageState<TItem>>>> = useCallback((action) => {
    setTabStateInternal((prev) => {
      const next = resolveSetState(action, prev);
      tabStateRef.current = next;
      return next;
    });
  }, []);

  const resetTabsState = useCallback(() => {
    tabStateRef.current = createInitialTabState<TItem>();
    prefetchedPageRef.current = createInitialPrefetchState<TItem>();
    prefetchingRef.current = createInitialPrefetchingState();
    setTabStateInternal(tabStateRef.current);
  }, []);

  return {
    tabState,
    setTabState,
    tabStateRef,
    prefetchedPageRef,
    prefetchingRef,
    resetTabsState,
  };
};

