import { cn } from "@/lib/utils";
import pallanxLogo from "@/assets/pallanx-logo.png";

export const Logo = ({ className, subtitle = false }: { className?: string; subtitle?: boolean }) => (
  <div className={cn("flex flex-col", className)}>
    <div className="flex items-center gap-3">
      <img
        src={pallanxLogo}
        alt="PALLANX"
        className="h-9 w-9 shrink-0 object-contain"
      />
      <span className="font-serif italic text-primary text-2xl font-semibold tracking-wide leading-none">
        PALLANX
      </span>
    </div>
    {subtitle && (
      <span className="font-sans uppercase tracking-[0.2em] text-[10px] text-muted-foreground mt-2 ml-11">
        Elite Verhandlungs-System
      </span>
    )}
  </div>
);
