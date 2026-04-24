import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";

const initialsOf = (name: string | null | undefined, email: string | null | undefined) => {
  const src = name?.trim() || email?.split("@")[0] || "U";
  return src
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

interface PublicHeaderProps {
  /** Which nav item is active. */
  active?: "home" | "preise";
}

export const PublicHeader = ({ active }: PublicHeaderProps) => {
  const { user, profile } = useAuth();
  const isAuthed = !!user;

  return (
    <header className="container flex items-center justify-between py-6">
      <Link to="/" aria-label="PALLANX Startseite">
        <Logo />
      </Link>
      <nav className="hidden md:flex items-center gap-10 font-sans uppercase tracking-[0.18em] text-xs text-muted-foreground">
        <Link
          to="/"
          className={active === "home" ? "text-primary" : "hover:text-primary transition-colors"}
        >
          Home
        </Link>
        <Link
          to="/preise"
          className={active === "preise" ? "text-primary" : "hover:text-primary transition-colors"}
        >
          Preise
        </Link>
      </nav>
      <div className="flex items-center gap-4">
        <ThemeToggle />
        {isAuthed ? (
          <>
            <Link
              to="/app/dashboard"
              className="hidden sm:flex items-center gap-2 font-sans uppercase tracking-[0.2em] text-xs text-muted-foreground hover:text-primary"
            >
              <span className="w-7 h-7 rounded-full bg-primary/15 border border-primary/40 flex items-center justify-center text-[10px] tracking-widest text-primary">
                {initialsOf(profile?.full_name, user?.email)}
              </span>
              Mein Mandat
            </Link>
            <Link to="/app/dashboard">
              <Button variant="gold-outline" size="sm">
                Zur Kommandozentrale
              </Button>
            </Link>
          </>
        ) : (
          <>
            <Link
              to="/login"
              className="font-sans uppercase tracking-[0.2em] text-xs text-muted-foreground hover:text-primary"
            >
              Login
            </Link>
            <Link to="/login">
              <Button variant="gold-outline" size="sm">
                Verhandlung starten
              </Button>
            </Link>
          </>
        )}
      </div>
    </header>
  );
};