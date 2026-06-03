import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";

interface PublicHeaderProps {
  /** Which nav item is active. */
  active?: "home" | "preise";
}

export const PublicHeader = ({ active }: PublicHeaderProps) => {
  const { user } = useAuth();
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
        <Link to="/retail" className="hover:text-primary transition-colors">
          Geschäftskunden
        </Link>
      </nav>
      <div className="flex items-center gap-4">
        {isAuthed ? (
          <Link to="/app/dashboard">
            <Button variant="gold-outline" size="sm" className="normal-case tracking-normal">
              {user?.email}
            </Button>
          </Link>
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
                Ersten Fall starten
              </Button>
            </Link>
          </>
        )}
      </div>
    </header>
  );
};