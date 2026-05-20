import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export const FloatingThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const Icon = isDark ? Sun : Moon;
  const label = isDark ? "Hellmodus" : "Dunkelmodus";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Wechsel zu ${label}`}
      title={label}
      className="fixed bottom-6 right-6 z-50 inline-flex items-center justify-center w-11 h-11 rounded-full border border-border/60 bg-background/90 backdrop-blur text-foreground shadow-lg hover:text-primary hover:border-primary/60 transition-colors"
    >
      <Icon className="w-5 h-5" strokeWidth={1.5} />
    </button>
  );
};