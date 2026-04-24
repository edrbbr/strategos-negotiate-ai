import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Diamond, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface UpgradePreviewPanelProps {
  caseId: string;
  onUpgradeClick: () => void;
}

interface UpgradePreviewRow {
  id: string;
  pro_strategy_label: string | null;
  pro_strategy: string | null;
  pro_first_paragraph: string | null;
  pro_extra_insight: string | null;
  viewed_at: string | null;
}

/**
 * Free-tier-only panel: shows a server-truncated "Pro would have done this"
 * preview to make the upgrade nudge concrete and honest.
 * Fully gated server-side (only Free users get a row inserted).
 */
export function UpgradePreviewPanel({ caseId, onUpgradeClick }: UpgradePreviewPanelProps) {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const tier = profile?.plan_id ?? "free";

  const { data, isLoading } = useQuery({
    queryKey: ["upgrade-preview", caseId, user?.id],
    enabled: !!user && !!caseId && tier === "free",
    refetchInterval: (query) => (query.state.data ? false : 5000),
    queryFn: async (): Promise<UpgradePreviewRow | null> => {
      const { data, error } = await supabase
        .from("upgrade_previews")
        .select("id, pro_strategy_label, pro_strategy, pro_first_paragraph, pro_extra_insight, viewed_at")
        .eq("case_id", caseId)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as UpgradePreviewRow | null) ?? null;
    },
  });

  // Mark as viewed once visible
  useEffect(() => {
    if (!data?.id || data.viewed_at) return;
    void supabase
      .from("upgrade_previews")
      .update({ viewed_at: new Date().toISOString() })
      .eq("id", data.id)
      .then(() => qc.invalidateQueries({ queryKey: ["upgrade-preview", caseId] }));
  }, [data?.id, data?.viewed_at, caseId, qc]);

  if (tier !== "free") return null;

  if (isLoading || !data) {
    return (
      <div className="bg-card border border-dashed border-primary/20 rounded-sm p-5 mt-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-3.5 h-3.5 text-primary/60" />
          <span className="font-mono-label text-primary/70">PRO-VORSCHAU WIRD GENERIERT…</span>
        </div>
        <Skeleton className="h-3 w-3/4 mb-2" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    );
  }

  return (
    <div className="relative bg-card border border-primary/30 rounded-sm p-6 mt-6 overflow-hidden">
      <div className="absolute top-0 right-0 bg-primary/10 text-primary px-3 py-1 font-mono-label text-[10px] tracking-wider">
        PRO-VORSCHAU
      </div>

      <div className="flex items-center gap-2 mb-4 mt-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="font-serif italic text-lg text-foreground">
          Was Pro für diesen Fall zusätzlich liefern würde
        </h3>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-5">
        {data.pro_strategy_label && (
          <div className="bg-background/40 border-l-2 border-primary/60 rounded-sm p-4">
            <p className="font-mono-label text-primary text-[10px] mb-2">PRO-TAKTIK</p>
            <p className="font-mono-label text-foreground mb-2">{data.pro_strategy_label}</p>
            {data.pro_strategy && (
              <p className="font-sans text-[13px] leading-6 text-foreground/80">
                {data.pro_strategy}
              </p>
            )}
          </div>
        )}

        {data.pro_extra_insight && (
          <div className="bg-background/40 border-l-2 border-secondary/60 rounded-sm p-4">
            <p className="font-mono-label text-secondary text-[10px] mb-2 flex items-center gap-1.5">
              <Diamond className="w-2 h-2" fill="currentColor" /> ZUSÄTZLICHER INSIGHT
            </p>
            <p className="font-sans text-[13px] leading-6 text-foreground/80">
              {data.pro_extra_insight}
            </p>
          </div>
        )}
      </div>

      {data.pro_first_paragraph && (
        <div className="relative bg-background/40 border border-border/30 rounded-sm p-4 mb-5">
          <p className="font-mono-label text-tertiary text-[10px] mb-2">
            PRO-ENTWURF · ERSTER ABSATZ
          </p>
          <p className="font-serif italic text-[14px] leading-6 text-foreground/85">
            {data.pro_first_paragraph}
          </p>
          <div className="mt-3 pt-3 border-t border-dashed border-border/40 flex items-center gap-2 text-muted-foreground/70">
            <Lock className="w-3 h-3" />
            <span className="font-mono-label text-[10px]">
              Vollständiger Entwurf, alle Strategiemodule und Verfeinerungen mit Pro freigeschaltet.
            </span>
          </div>
        </div>
      )}

      <Button variant="gold" size="sm" className="w-full" onClick={onUpgradeClick}>
        <Sparkles className="w-3.5 h-3.5 mr-1" /> Pro freischalten
      </Button>
    </div>
  );
}