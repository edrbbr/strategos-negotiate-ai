import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

/**
 * Sticky bottom CTA bar — appears once the user has scrolled past the hero.
 * Hidden once user reaches the final CTA section to avoid double-stacking.
 */
export const StickyCTA = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const scrolled = window.scrollY > window.innerHeight * 0.6;
      const nearBottom =
        window.innerHeight + window.scrollY >
        document.documentElement.scrollHeight - window.innerHeight * 0.9;
      setVisible(scrolled && !nearBottom);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      aria-hidden={!visible}
      className={`fixed bottom-0 left-0 right-0 z-40 transition-transform duration-300 ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="bg-background/95 backdrop-blur-md border-t border-primary/40 shadow-[0_-8px_24px_-12px_hsl(var(--primary)/0.25)]">
        <div className="container py-3 flex items-center justify-between gap-4">
          <div className="hidden sm:flex flex-col">
            <span className="font-sans uppercase tracking-[0.25em] text-[10px] text-primary">
              ◆ Bereit?
            </span>
            <span className="font-serif italic text-sm md:text-base text-foreground">
              Dein erster Fall — kostenlos, in 5 Minuten.
            </span>
          </div>
          <Link to="/register" className="ml-auto">
            <Button variant="gold" size="lg">
              Jetzt kostenlos starten →
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
