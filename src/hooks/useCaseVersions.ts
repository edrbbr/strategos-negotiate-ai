import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type CaseVersionKind = "initial" | "refinement" | "restore";

export interface CaseVersionRow {
  id: string;
  case_id: string;
  user_id: string;
  version_number: number;
  kind: CaseVersionKind;
  user_prompt: string | null;
  analysis: string[] | null;
  strategy: string | null;
  draft: string | null;
  strategy_labels: string[];
  model_used: string | null;
  created_at: string;
}

export function useCaseVersions(caseId: string | undefined) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["case-versions", caseId],
    enabled: !!caseId && caseId !== "new",
    queryFn: async (): Promise<CaseVersionRow[]> => {
      const { data, error } = await supabase
        .from("case_versions")
        .select("*")
        .eq("case_id", caseId!)
        .order("version_number", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as CaseVersionRow[];
    },
  });

  useEffect(() => {
    if (!caseId || caseId === "new") return;
    const channel = supabase
      .channel(`case-versions:${caseId}:${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "case_versions", filter: `case_id=eq.${caseId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["case-versions", caseId] });
          qc.invalidateQueries({ queryKey: ["case", caseId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [caseId, qc]);

  return query;
}

export function useRefineVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { case_id: string; instruction: string; attachment_ids?: string[] }) => {
      const { data, error } = await supabase.functions.invoke("strategos-refinement", {
        body: {
          case_id: params.case_id,
          instruction: params.instruction,
          attachment_ids: params.attachment_ids ?? [],
        },
      });
      if (error) throw error;
      return data as { refined_draft: string; version_id: string; version_number: number };
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["case-versions", vars.case_id] });
      qc.invalidateQueries({ queryKey: ["case", vars.case_id] });
      qc.invalidateQueries({ queryKey: ["case_attachments", vars.case_id] });
    },
  });
}

export function useRestoreVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { case_id: string; version_id: string }) => {
      const { data, error } = await supabase.functions.invoke("strategos-restore-version", {
        body: { case_id: params.case_id, version_id: params.version_id },
      });
      if (error) throw error;
      return data as { ok: true; version_id: string; version_number: number };
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["case-versions", vars.case_id] });
      qc.invalidateQueries({ queryKey: ["case", vars.case_id] });
    },
  });
}

export interface QuickSuggestion {
  label: string;
  prompt: string;
}

export function useQuickSuggestions(
  caseId: string | undefined,
  currentVersionId: string | null | undefined,
  cached: { suggestions: QuickSuggestion[] | null; versionId: string | null | undefined },
) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const cacheValid =
    !!cached.suggestions &&
    cached.suggestions.length > 0 &&
    cached.versionId === currentVersionId &&
    !!currentVersionId;

  const query = useQuery({
    queryKey: ["quick-suggestions", caseId, currentVersionId],
    enabled: !!caseId && !!user && !!currentVersionId && !cacheValid,
    staleTime: 5 * 60 * 1000,
    retry: false,
    queryFn: async (): Promise<QuickSuggestion[]> => {
      const { data, error } = await supabase.functions.invoke("strategos-suggest-refinements", {
        body: { case_id: caseId },
      });
      if (error) throw error;
      const suggestions = (data as { suggestions?: QuickSuggestion[] })?.suggestions ?? [];
      qc.invalidateQueries({ queryKey: ["case", caseId] });
      return suggestions;
    },
  });

  return {
    suggestions: cacheValid ? cached.suggestions! : query.data ?? null,
    isLoading: !cacheValid && query.isFetching,
    error: query.error,
  };
}