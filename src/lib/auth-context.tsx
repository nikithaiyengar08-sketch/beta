import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface AuthCtx {
  session: Session | null;
  user: User | null;
  currentUser: User | null;
  loading: boolean;
  displayName: string;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  resetPasswordForEmail: (email: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  session: null,
  user: null,
  currentUser: null,
  loading: true,
  displayName: "",
  signIn: async () => ({}),
  signUp: async () => ({}),
  signInWithGoogle: async () => ({}),
  resetPasswordForEmail: async () => ({}),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();
  const prevUserId = useRef<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setLoading(false);
      const newId = s?.user?.id ?? null;
      if (event === "SIGNED_OUT" && prevUserId.current) {
        toast.message("You've been signed out.", { description: "Your session has ended. Please sign in again." });
      }
      if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        qc.invalidateQueries();
      }
      prevUserId.current = newId;
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      prevUserId.current = data.session?.user?.id ?? null;
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, [qc]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { error: error.message } : {};
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    const redirect = typeof window !== "undefined" ? `${window.location.origin}/home` : undefined;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirect,
        data: { display_name: displayName, full_name: displayName },
      },
    });
    return error ? { error: error.message } : {};
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: typeof window !== "undefined" ? `${window.location.origin}/home` : "",
      },
    });
    return error ? { error: error.message } : {};
  }, []);

  const resetPasswordForEmail = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined,
    });
    return error ? { error: error.message } : {};
  }, []);

  const user = session?.user ?? null;
  const displayName =
    (user?.user_metadata?.display_name as string) ||
    (user?.user_metadata?.full_name as string) ||
    user?.email?.split("@")[0] ||
    "";

  return (
    <Ctx.Provider
      value={{
        session,
        user,
        currentUser: user,
        loading,
        displayName,
        signIn,
        signUp,
        signInWithGoogle,
        resetPasswordForEmail,
        signOut: async () => { await supabase.auth.signOut(); },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
