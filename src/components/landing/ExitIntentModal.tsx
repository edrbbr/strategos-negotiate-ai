import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const DISMISS_KEY = "pallanx_exit_intent_dismissed";

/**
 * Desktop-only exit-intent modal. Fires when the mouse leaves through the
 * top of the viewport. Sessions persist via sessionStorage so we don't nag.
 */
export const ExitIntentModal = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (sessionStorage.getItem(DISMISS_KEY)) return;

    let armed = false;
    const armTimer = setTimeout(() => {
      armed = true;
    }, 8000);

    const onLeave = (e: MouseEvent) => {
      if (!armed) return;
      if (e.clientY > 0) return;
      if (e.relatedTarget) return;
      setOpen(true);
      document.removeEventListener("mouseleave", onLeave);
    };

    document.addEventListener("mouseleave", onLeave);
    return () => {
      clearTimeout(armTimer);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      onClick={dismiss}
    >
      <div
        className="relative bg-background border border-primary/50 max-w-lg w-full p-10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          aria-label="Schließen"
          onClick={dismiss}
          className="absolute top-4 right-4 text-muted-foreground hover:text-primary"
        >
          <X className="w-4 h-4" />
        </button>
        <p className="font-sans uppercase tracking-[0.3em] text-[10px] text-primary mb-6">
          ◆ Bevor du gehst
        </p>
        <h3 className="font-serif text-3xl md:text-4xl leading-tight mb-6">
          Ein Fall <span className="italic text-primary">geschenkt.</span>
        </h3>
        <p className="font-serif text-base text-muted-foreground leading-relaxed mb-8">
          Beschreibe in 2 Minuten deine schwierigste aktuelle Verhandlung.
          Du bekommst Analyse, Strategie und fertigen Entwurf — ohne Kreditkarte.
        </p>
        <div className="flex flex-col gap-3">
          <Link to="/register" onClick={dismiss}>
            <Button variant="gold" size="xl" className="w-full">
              Jetzt ersten Fall starten →
            </Button>
          </Link>
          <button
            onClick={dismiss}
            className="font-sans uppercase tracking-[0.2em] text-[10px] text-muted-foreground hover:text-foreground"
          >
            Nein danke
          </button>
        </div>
      </div>
    </div>
  );
};
