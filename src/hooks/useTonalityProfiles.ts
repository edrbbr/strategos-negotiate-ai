import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TonalityProfile {
  key: string;
  label: string;
  description: string | null;
  min_tier: string;
  sort_order: number;
}

const TIER_RANK: Record<string, number> = { free: 0, pro: 1, elite: 2 };

async function fetchTonalityProfiles(): Promise<TonalityProfile[]> {
  const { data, error } = await supabase
    .from("tonality_profiles" as never)
    .select("key, label, description, min_tier, sort_order, is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown as TonalityProfile[]);
}

export function useTonalityProfiles(currentTier: string) {
  return useQuery({
    queryKey: ["tonality_profiles"],
    queryFn: fetchTonalityProfiles,
    staleTime: 10 * 60 * 1000,
    select: (profiles) => {
      const userRank = TIER_RANK[currentTier] ?? 0;
      return profiles.filter((p) => (TIER_RANK[p.min_tier] ?? 0) <= userRank);
    },
  });
}