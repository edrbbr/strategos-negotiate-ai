import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Industry {
  key: string;
  label: string;
  ai_context: string | null;
  is_active: boolean;
}

export function useIndustries() {
  return useQuery({
    queryKey: ["industries"],
    queryFn: async (): Promise<Industry[]> => {
      const { data, error } = await (supabase as any).from("industries").select("key,label,ai_context,is_active").eq("is_active", true).order("label");
      if (error) throw error;
      return (data ?? []) as Industry[];
    },
  });
}

export function useCreateIndustry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { key: string; label: string; ai_context?: string }) => {
      const key = input.key.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
      const { error } = await (supabase as any).from("industries").insert({
        key, label: input.label.trim(), ai_context: input.ai_context ?? null, is_active: true,
      });
      if (error) throw error;
      return { key };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["industries"] }),
  });
}