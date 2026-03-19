import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AuthProfile = {
  nome: string;
  avatar_url: string | null;
  turma_id: string | null;
  avatar_locked: boolean;
  avatar_style: unknown;
  avatar_unlocks: unknown;
  avatar_shop_spent: number;
};

export type AuthRole = "admin" | "professor" | "aluno";

interface AuthContext {
  user: User | null;
  session: Session | null;
  profile: AuthProfile | null;
  role: AuthRole | null;
  loading: boolean;
  signIn: (identifier: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthCtx = createContext<AuthContext>({
  user: null,
  session: null,
  profile: null,
  role: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthContext["profile"]>(null);
  const [role, setRole] = useState<AuthContext["role"]>(null);
  const [loading, setLoading] = useState(true);

  const clearAuthState = () => {
    setSession(null);
    setUser(null);
    setProfile(null);
    setRole(null);
  };

  const fetchSupabaseProfile = async (userId: string) => {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("nome, avatar_url, turma_id, avatar_locked, avatar_style, avatar_unlocks, avatar_shop_spent")
      .eq("user_id", userId)
      .single();
    if (profileData) setProfile(profileData);

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .limit(1)
      .single();
    setRole(roleData?.role ?? "aluno");
  };

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setLoading(true);

      if (nextSession?.user) {
        setSession(nextSession);
        setUser(nextSession.user);
        setTimeout(async () => {
          try {
            await fetchSupabaseProfile(nextSession.user.id);
          } finally {
            setLoading(false);
          }
        }, 0);
        return;
      }

      clearAuthState();
      setLoading(false);
    });

    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      setLoading(true);

      if (initialSession?.user) {
        setSession(initialSession);
        setUser(initialSession.user);
        try {
          await fetchSupabaseProfile(initialSession.user.id);
        } finally {
          setLoading(false);
        }
        return;
      }

      clearAuthState();
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (identifier: string, password: string) => {
    const normalizedIdentifier = identifier.trim().toLowerCase();
    const { error } = await supabase.auth.signInWithPassword({ email: normalizedIdentifier, password });

    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    clearAuthState();
  };

  const refreshProfile = async () => {
    if (!user) return;
    await fetchSupabaseProfile(user.id);
  };

  return (
    <AuthCtx.Provider value={{ user, session, profile, role, loading, signIn, signOut, refreshProfile }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
