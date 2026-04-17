import { Hexagon } from "lucide-react";
import { cn } from "@/lib/utils";

export const Logo = ({ className, subtitle = false }: { className?: string; subtitle?: boolean }) => (
  <div className={cn("flex flex-col", className)}>
    <div className="flex items-center gap-2">
      <Hexagon className="w-5 h-5 text-primary" strokeWidth={1.5} />
      <span className="font-serif italic text-primary text-2xl font-semibold tracking-wide">
        STRATEGOS
      </span>
    </div>
    {subtitle && (
      <span className="font-sans uppercase tracking-[0.2em] text-[10px] text-muted-foreground mt-1 ml-7">
        Elite Verhandlungs-System
      </span>
    )}
  </div>
);
