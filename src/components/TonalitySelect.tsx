import { Lock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useTonalityProfiles } from "@/hooks/useTonalityProfiles";
import { usePlanLimits } from "@/hooks/usePlanLimits";

interface TonalitySelectProps {
  value: string;
  onChange: (key: string) => void;
  onLockedClick?: () => void;
  disabled?: boolean;
}

/**
 * Tier-aware tonality picker. Free users see the selector locked with a
 * single "Standard" option and a Pro-upsell on click.
 */
export function TonalitySelect({ value, onChange, onLockedClick, disabled }: TonalitySelectProps) {
  const limits = usePlanLimits();
  const { data: profiles, isLoading } = useTonalityProfiles(limits.tier);

  if (!limits.allowsTonality) {
    return (
      <button
        type="button"
        onClick={onLockedClick}
        className="w-full flex items-center justify-between bg-transparent border border-dashed border-border/40 rounded-sm px-4 py-3 font-mono-label text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
      >
        <span>Standard · neutral-professionell</span>
        <Lock className="w-3.5 h-3.5 opacity-70" />
      </button>
    );
  }

  if (isLoading) return <Skeleton className="h-11 w-full" />;

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full bg-transparent border border-border/40 rounded-sm px-4 py-3 h-auto font-mono-label text-foreground hover:border-primary/40 transition-colors">
        <SelectValue placeholder="Tonalität wählen" />
      </SelectTrigger>
      <SelectContent>
        {(profiles ?? []).map((p) => (
          <SelectItem key={p.key} value={p.key} className="font-mono-label">
            <div className="flex flex-col">
              <span>{p.label}</span>
              {p.description && (
                <span className="text-[10px] text-muted-foreground/70">{p.description}</span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}