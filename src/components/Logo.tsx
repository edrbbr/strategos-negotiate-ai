import { cn } from "@/lib/utils";

export const Logo = ({
  className,
  subtitle = false,
}: {
  className?: string;
  subtitle?: boolean | string;
}) => {
  return (
    <div className={cn("flex flex-col", className)}>
      <span className="font-serif italic text-primary text-2xl font-semibold tracking-wide leading-none">
        PALLANX
      </span>
      {subtitle && (
        <span className="font-sans uppercase tracking-[0.2em] text-[10px] text-muted-foreground mt-2">
          {typeof subtitle === "string" ? subtitle : "Elite Verhandlungs-System"}
        </span>
      )}
    </div>
  );
};
