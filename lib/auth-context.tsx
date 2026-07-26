"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AppUser, Profile } from "@/types/index";

/**
 * Loading is a state machine, not a boolean. The previous implementation only
 * exposed `loading`, and every page rendered `if (!user) return "Loading..."`,
 * so any failed query left the screen stuck forever with no way out.
 *
 *   loading         — first fetch in flight
 *   unauthenticated — no session; caller should bounce to /app/login
 *   error           — a query failed; surface it with a retry affordance
 *   ready           — user (and possibly profile) loaded
 */
export type AuthStatus = "loading" | "unauthenticated" | "error" | "ready";

interface AuthContextValue {
  user: AppUser | null;
  profile: Profile | null;
  status: AuthStatus;
  /** Kept for call-site compatibility: true only during the very first load. */
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  // Guards against a stale in-flight load overwriting a newer one, and against
  // Supabase's TOKEN_REFRESHED / focus events triggering a redundant refetch.
  const requestId = useRef(0);
  const loadedUserId = useRef<string | null>(null);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setError(null);
    setStatus((s) => (s === "ready" ? s : "loading"));

    try {
      const supabase = createClient();
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (id !== requestId.current) return;

      if (authError) throw authError;

      if (!authUser) {
        loadedUserId.current = null;
        setUser(null);
        setProfile(null);
        setStatus("unauthenticated");
        return;
      }

      const [userRes, profileRes] = await Promise.all([
        supabase.from("users").select("*").eq("id", authUser.id).maybeSingle(),
        supabase.from("profiles").select("*").eq("user_id", authUser.id).maybeSingle(),
      ]);

      if (id !== requestId.current) return;

      // A missing users row means the post-signup trigger never ran — that is a
      // real error the user needs to see, not an empty dashboard.
      if (userRes.error) throw userRes.error;
      if (profileRes.error) throw profileRes.error;
      if (!userRes.data) {
        throw new Error(
          "Your account record hasn't finished setting up yet. Give it a moment and try again."
        );
      }

      loadedUserId.current = authUser.id;
      setUser(userRes.data as AppUser);
      setProfile((profileRes.data as Profile) ?? null);
      setStatus("ready");
    } catch (err) {
      if (id !== requestId.current) return;
      setError(err instanceof Error ? err.message : "Failed to load your account");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    load();

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const nextId = session?.user?.id ?? null;

      if (event === "SIGNED_OUT" || !nextId) {
        loadedUserId.current = null;
        setUser(null);
        setProfile(null);
        setStatus("unauthenticated");
        return;
      }

      // Only refetch when the identity actually changed. TOKEN_REFRESHED and
      // the SIGNED_IN that fires on tab focus must not re-trigger a load —
      // that was the source of the loading flash when switching nav tabs.
      if (nextId !== loadedUserId.current) load();
    });

    return () => subscription.unsubscribe();
  }, [load]);

  return (
    <AuthContext.Provider
      value={{ user, profile, status, loading: status === "loading", error, refresh: load, setProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Same name and shape as the old hook so call sites barely change, but it now
 * reads from a single provider instead of refetching per page.
 */
export function useAppUser(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAppUser must be used inside an <AuthProvider>. Mount it in the route-group layout.");
  }
  return ctx;
}
