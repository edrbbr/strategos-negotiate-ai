import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "pallanx-theme";

const applyThemeClass = (theme: Theme) => {
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
};

const readInitialTheme = (): Theme => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    // ignore
  }
  // Default per spec: Light
  return "light";
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { user, profile, refreshProfile } = useAuth();
  const [theme, setThemeState] = useState<Theme>(() => readInitialTheme());
  const lastAppliedFromProfile = useRef<string | null>(null);

  // Apply DOM class whenever theme changes
  useEffect(() => {
    applyThemeClass(theme);
  }, [theme]);

  // When the authed profile loads, adopt its preference (once per profile fetch)
  useEffect(() => {
    if (!profile) {
      lastAppliedFromProfile.current = null;
      return;
    }
    const pref = profile.theme_preference;
    const key = `${profile.id}:${pref ?? "null"}`;
    if (lastAppliedFromProfile.current === key) return;
    lastAppliedFromProfile.current = key;
    if (pref === "dark" || pref === "light") {
      setThemeState(pref);
      try {
        localStorage.setItem(STORAGE_KEY, pref);
      } catch {
        // ignore
      }
    }
  }, [profile]);

  const setTheme = useCallback(
    (next: Theme) => {
      setThemeState(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // ignore
      }
      if (user?.id) {
        // Persist async; ignore failure (local change still applies)
        supabase
          .from("profiles")
          .update({ theme_preference: next })
          .eq("id", user.id)
          .then(({ error }) => {
            if (error) {
              console.warn("Failed to persist theme preference", error);
              return;
            }
            // Keep profile cache in sync, but avoid re-running the adopt effect
            lastAppliedFromProfile.current = `${user.id}:${next}`;
            void refreshProfile();
          });
      }
    },
    [user?.id, refreshProfile],
  );

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};