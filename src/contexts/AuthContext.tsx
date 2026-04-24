import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export type AuthProfile = {
  id: string;
  full_name: string | null;
  organization: string | null;
  avatar_url: string | null;
  plan_id: string;
  plan: {
    id: string;
    name: string;
    tier_label: string;
    case_limit: number | null;
    case_limit_type: string;
  } | null;
  cases_used: number;
  extra_credits: number;
  cases_period_start: string | null;
  aggressive_mode: boolean;
  archive_mode: boolean;
  subscription_status: string | null;
  billing_cycle: string | null;
  theme_preference: "light" | "dark" | null;
};

type AuthResult = { error: string | null };
type OAuthResult = { error: string | null; redirected: boolean };

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: AuthProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signInWithEmail: (email: string, password: string) => Promise<AuthResult>;
  signUpWithEmail: (
    email: string,
    password: string,
    fullName: string,
  ) => Promise<AuthResult>;
  signInWithGoogle: () => Promise<OAuthResult>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const PROFILE_SELECT =
  "id, full_name, organization, avatar_url, plan_id, cases_used, extra_credits, cases_period_start, aggressive_mode, archive_mode, subscription_status, billing_cycle, theme_preference, plan:plans!inner(id, name, tier_label, case_limit, case_limit_type)";

const fetchProfile = async (userId: string): Promise<AuthProfile | null> => {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.error("Failed to load profile", error);
    return null;
  }
  if (!data) return null;
  // Supabase returns `plan` as object due to !inner single FK
  const planRel = data.plan as unknown;
  const plan = Array.isArray(planRel)
    ? (planRel[0] as AuthProfile["plan"]) ?? null
    : ((planRel as AuthProfile["plan"]) ?? null);
  return { ...(data as Omit<AuthProfile, "plan">), plan };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(async (uid: string) => {
    const p = await fetchProfile(uid);
    setProfile(p);
  }, []);

  useEffect(() => {
    // 1) subscribe FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        // defer to avoid deadlock
        setTimeout(() => loadProfile(sess.user.id), 0);
      } else {
        setProfile(null);
      }
    });

    // 2) THEN check existing session
    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        loadProfile(sess.user.id).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const signInWithEmail = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error: error?.message ?? null };
    },
    [],
  );

  const signUpWithEmail = useCallback(
    async (
      email: string,
      password: string,
      fullName: string,
    ): Promise<AuthResult> => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/app/dashboard`,
          data: { full_name: fullName },
        },
      });
      return { error: error?.message ?? null };
    },
    [],
  );

  const signInWithGoogle = useCallback(async (): Promise<OAuthResult> => {
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/app/dashboard`,
      });
      if (result.error) {
        const msg =
          result.error instanceof Error
            ? result.error.message
            : String(result.error);
        console.error("[Google OAuth] error:", result.error);
        return { error: msg, redirected: false };
      }
      const redirected = !!(result as { redirected?: boolean }).redirected;
      return { error: null, redirected };
    } catch (e) {
      console.error("[Google OAuth] exception:", e);
      return {
        error: e instanceof Error ? e.message : "Google sign-in fehlgeschlagen.",
        redirected: false,
      };
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) await loadProfile(user.id);
  }, [user?.id, loadProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      profile,
      isLoading,
      isAuthenticated: !!user,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signOut,
      refreshProfile,
    }),
    [
      user,
      session,
      profile,
      isLoading,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signOut,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
