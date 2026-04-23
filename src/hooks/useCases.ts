import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type CaseIcon = "car" | "home" | "cash" | "document" | "briefcase" | "handshake";
export type CaseStatus = "draft" | "active" | "archived";

export interface CaseRow {
  id: string;
  user_id: string;
  title: string;
  icon_hint: CaseIcon;
  situation_text: string | null;
  analysis: string[] | null;
  strategy: string | null;
  draft: string | null;
  model_used: string | null;
  status: CaseStatus;
  last_analyzed_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useCase(caseId: string | undefined) {
  return useQuery({
    queryKey: ["case", caseId],
    enabled: !!caseId && caseId !== "new",
    queryFn: async (): Promise<CaseRow | null> => {
      const { data, error } = await supabase
        .from("cases")
        .select("*")
        .eq("id", caseId!)
        .maybeSingle();
      if (error) throw error;
      return data as CaseRow | null;
    },
  });
}

/** List all cases for the current user, sorted by updated_at DESC. */
export function useAllCases() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["cases", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<CaseRow[]> => {
      const { data, error } = await supabase
        .from("cases")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CaseRow[];
    },
  });
}

export interface CaseStats {
  total: number;
  open: number;
  messages: number;
}

export function useCaseStats(): CaseStats {
  const { data } = useAllCases();
  const cases = data ?? [];
  return {
    total: cases.length,
    open: cases.filter((c) => c.status === "draft" || c.status === "active").length,
    messages: 0,
  };
}

/** Subscribe to realtime UPDATEs on a single case while `enabled` is true. */
export function useCaseRealtime(caseId: string | undefined, enabled: boolean) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!enabled || !caseId || caseId === "new") return;
    const channel = supabase
      .channel(`case:${caseId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "cases",
          filter: `id=eq.${caseId}`,
        },
        (payload) => {
          qc.setQueryData(["case", caseId], payload.new as CaseRow);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [caseId, enabled, qc]);
}

export function useCreateCase() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input?: {
      situation_text?: string;
      medium?: string;
      language_code?: string;
      language_label?: string;
    }): Promise<CaseRow> => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("cases")
        .insert({
          user_id: user.id,
          ...(input?.situation_text ? { situation_text: input.situation_text } : {}),
          ...(input?.medium ? { medium: input.medium } : {}),
          ...(input?.language_code ? { language_code: input.language_code } : {}),
          ...(input?.language_label ? { language_label: input.language_label } : {}),
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as CaseRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cases"] });
    },
  });
}

export function useUpdateCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; patch: Partial<CaseRow> }) => {
      const { data, error } = await supabase
        .from("cases")
        .update(params.patch)
        .eq("id", params.id)
        .select("*")
        .single();
      if (error) throw error;
      return data as CaseRow;
    },
    onSuccess: (data) => {
      qc.setQueryData(["case", data.id], data);
      qc.invalidateQueries({ queryKey: ["cases"] });
    },
  });
}

export function useArchiveCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; archived: boolean }) => {
      const { data, error } = await supabase
        .from("cases")
        .update({ status: params.archived ? "archived" : "active" })
        .eq("id", params.id)
        .select("*")
        .single();
      if (error) throw error;
      return data as CaseRow;
    },
    onSuccess: (data) => {
      qc.setQueryData(["case", data.id], data);
      qc.invalidateQueries({ queryKey: ["cases"] });
    },
  });
}

export function useDeleteCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cases").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      qc.removeQueries({ queryKey: ["case", id] });
      qc.invalidateQueries({ queryKey: ["cases"] });
    },
  });
}