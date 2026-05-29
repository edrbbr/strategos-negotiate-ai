import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

/**
 * Hero conversion input — captures the user's situation in one line and
 * carries it through to /register via sessionStorage. The post-signup flow
 * (Phase 2) reads `pallanx_prefill` and seeds the first case automatically.
 */
export const HeroCaseInput = () => {
  const navigate = useNavigate();
  const [value, setValue] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed) {
      try {
        sessionStorage.setItem("pallanx_prefill", trimmed);
      } catch {
        /* ignore */
      }
    }
    navigate("/register");
  };

  return (
    <form
      onSubmit={submit}
      className="border border-primary/40 bg-background/60 backdrop-blur-sm p-2 flex flex-col sm:flex-row gap-2 max-w-2xl"
    >
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="z. B. Kunde will 20 % Rabatt auf mein Projektangebot"
        className="flex-1 bg-transparent px-4 py-3 font-serif text-base md:text-lg placeholder:text-muted-foreground/60 focus:outline-none"
        aria-label="Deine Verhandlungs-Situation in einem Satz"
      />
      <Button type="submit" variant="gold" size="lg" className="shrink-0">
        Analysieren <ArrowRight className="w-4 h-4" />
      </Button>
    </form>
  );
};
