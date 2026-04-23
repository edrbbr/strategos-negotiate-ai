import { cn } from "@/lib/utils";
import strategosLogo from "@/assets/strategos-logo.svg";

export const Logo = ({ className, subtitle = false }: { className?: string; subtitle?: boolean }) => (
  <div className={cn("flex flex-col", className)}>
    <div className="flex items-center gap-3">
      <img
        src={strategosLogo}
        alt="Strategos"
        className="h-8 w-8 shrink-0 rounded-sm"
      />
      <span className="font-serif italic text-primary text-2xl font-semibold tracking-wide leading-none">
        STRATEGOS
      </span>
    </div>
    {subtitle && (
      <span className="font-sans uppercase tracking-[0.2em] text-[10px] text-muted-foreground mt-2 ml-11">
        Elite Verhandlungs-System
      </span>
    )}
  </div>
);
