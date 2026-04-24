import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";

interface ThemeToggleProps {
  variant?: "compact" | "full";
  className?: string;
}

export const ThemeToggle = ({
  variant = "compact",
  className,
}: ThemeToggleProps) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const Icon = isDark ? Sun : Moon;
  const label = isDark ? "Hellmodus" : "Dunkelmodus";

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={`Wechsel zu ${label}`}
        className={cn(
          "inline-flex items-center gap-3 border border-border/60 px-4 py-2 rounded-sm font-sans uppercase tracking-[0.18em] text-xs text-foreground hover:text-primary hover:border-primary/60 transition-colors",
          className,
        )}
      >
        <Icon className="w-4 h-4" strokeWidth={1.5} />
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Wechsel zu ${label}`}
      title={label}
      className={cn(
        "inline-flex items-center justify-center w-9 h-9 rounded-sm border border-border/40 text-muted-foreground hover:text-primary hover:border-primary/60 transition-colors",
        className,
      )}
    >
      <Icon className="w-4 h-4" strokeWidth={1.5} />
    </button>
  );
};