import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User as SupabaseAuthUser } from "@supabase/supabase-js";
import { hasSupabaseConfig, supabase } from "./supabase";

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  full_name: string;
  avatar_url: string;
  website: string;
}

interface SignUpPayload {
  email: string;
  password: string;
  username?: string;
  fullName?: string;
}

interface AuthContextProps {
  user: AuthUser | null;
  loading: boolean;
  error: Error | null;
  updateUserProfile: (patch: Partial<Pick<AuthUser, "username" | "full_name" | "avatar_url" | "website">>) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (payload: SignUpPayload) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);
const PROFILE_TIMEOUT_MS = 6000;
const SUPABASE_AUTH_KEY_SUFFIX = "-auth-token";

const isSupabaseAuthLikeUser = (value: unknown): value is Pick<SupabaseAuthUser, "id" | "email" | "user_metadata"> =>
  Boolean(
    value &&
      typeof value === "object" &&
      "id" in value &&
      typeof (value as { id?: unknown }).id === "string",
  );

const extractCachedSessionUser = (rawValue: unknown): Pick<SupabaseAuthUser, "id" | "email" | "user_metadata"> | null => {
  if (!rawValue || typeof rawValue !== "object") return null;

  const rawRecord = rawValue as Record<string, unknown>;
  const candidateSources = [
    rawRecord.user,
    (rawRecord.currentSession as Record<string, unknown> | undefined)?.user,
    (rawRecord.session as Record<string, unknown> | undefined)?.user,
  ];

  for (const source of candidateSources) {
    if (isSupabaseAuthLikeUser(source)) return source;
  }

  return null;
};

const readCachedAuthUser = (): AuthUser | null => {
  if (typeof window === "undefined" || !window.localStorage) return null;

  try {
    const authKey = Object.keys(window.localStorage).find(
      (key) => key.startsWith("sb-") && key.endsWith(SUPABASE_AUTH_KEY_SUFFIX),
    );
    if (!authKey) return null;

    const raw = window.localStorage.getItem(authKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;
    const cachedSessionUser = extractCachedSessionUser(parsed);
    if (!cachedSessionUser) return null;

    return mapAuthUser(cachedSessionUser as SupabaseAuthUser, null);
  } catch {
    return null;
  }
};

const withTimeout = async <T,>(promise: Promise<T>, ms = PROFILE_TIMEOUT_MS): Promise<T> => {
  const timeoutPromise = new Promise<never>((_, reject) => {
    const id = window.setTimeout(() => {
      window.clearTimeout(id);
      reject(new Error("Timeout al cargar perfil"));
    }, ms);
  });

  return Promise.race([promise, timeoutPromise]);
};

const mapAuthUser = (
  authUser: SupabaseAuthUser,
  profile?: {
    username?: string | null;
    full_name?: string | null;
    avatar_url?: string | null;
    website?: string | null;
  } | null,
): AuthUser => {
  const email = authUser.email ?? "";
  const emailUsername = email.split("@")[0] || "instadetox_user";

  return {
    id: authUser.id,
    email,
    username:
      profile?.username ||
      (authUser.user_metadata?.username as string | undefined) ||
      emailUsername,
    full_name:
      profile?.full_name ||
      (authUser.user_metadata?.full_name as string | undefined) ||
      emailUsername,
    avatar_url:
      profile?.avatar_url ||
      (authUser.user_metadata?.avatar_url as string | undefined) ||
      "",
    website:
      profile?.website ||
      (authUser.user_metadata?.website as string | undefined) ||
      "",
  };
};

const loadProfile = async (userId: string) => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("username, full_name, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  if (error) return null;
  return data;
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe ser usado dentro de un AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readCachedAuthUser());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (!hasSupabaseConfig || !supabase) {
      if (isMounted) {
        setError(new Error("Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY"));
        setLoading(false);
      }
      return;
    }

    const client = supabase;

    const hydrateFromSession = async (sessionUser: SupabaseAuthUser | null) => {
      if (!sessionUser) {
        if (isMounted) setUser(null);
        return;
      }

      // Primero usuario base desde session (sin bloquear UI por perfil)
      if (isMounted) setUser(mapAuthUser(sessionUser, null));

      // Luego perfil enriquecido (fallback silencioso si falla)
      const profile = await withTimeout(loadProfile(sessionUser.id)).catch(() => null);
      if (isMounted) setUser(mapAuthUser(sessionUser, profile));
    };

    const init = async () => {
      try {
        setLoading(true);
        setError(null);

        const {
          data: { session },
          error: sessionError,
        } = await client.auth.getSession();

        if (sessionError) throw sessionError;
        await hydrateFromSession(session?.user ?? null);
      } catch (err) {
        if (isMounted) {
          setUser(null);
          setError(err as Error);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void init();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(async (_event, session) => {
      try {
        await hydrateFromSession(session?.user ?? null);
      } catch (err) {
        if (session?.user) {
          if (isMounted) setUser(mapAuthUser(session.user, null));
        } else {
          if (isMounted) setUser(null);
        }
        if (isMounted) setError(err as Error);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!supabase) return;

    try {
      setError(null);

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      if (data.user) {
        setUser(mapAuthUser(data.user, null));
        const profile = await withTimeout(loadProfile(data.user.id)).catch(() => null);
        setUser(mapAuthUser(data.user, profile));
      }
    } catch (err) {
      setError(err as Error);
    }
  };

  const signUp = async ({ email, password, username, fullName }: SignUpPayload) => {
    if (!supabase) return;

    try {
      setError(null);

      const emailBase = email.split("@")[0] || "instadetox_user";
      const safeUsername = (username || emailBase).toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 30);

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: safeUsername || "instadetox_user",
            full_name: fullName || emailBase,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (data.user && data.session) {
        setUser(mapAuthUser(data.user, null));
        const profile = await withTimeout(loadProfile(data.user.id)).catch(() => null);
        setUser(mapAuthUser(data.user, profile));
      }
    } catch (err) {
      setError(err as Error);
    }
  };

  const signOut = async () => {
    if (!supabase) return;

    try {
      setError(null);
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      setUser(null);
    } catch (err) {
      setError(err as Error);
    }
  };

  const updateUserProfile = (patch: Partial<Pick<AuthUser, "username" | "full_name" | "avatar_url" | "website">>) => {
    setUser((prev) => {
      if (!prev) return prev;
      return { ...prev, ...patch };
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, updateUserProfile, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
