import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface BusinessCase {
  id: string;
  business_account_id: string;
  created_by_user_id: string;
  case_number: string;
  title: string;
  product_category: string | null;
  sku: string | null;
  product_name: string | null;
  purchase_price_total: number;
  quantity: number;
  claimed_amount: number;
  suggested_offer: number | null;
  suggested_offer_percent: number | null;
  final_granted_amount: number | null;
  final_granted_percent: number | null;
  required_approval_role: string | null;
  status: "open"|"in_review"|"waiting_approval"|"closed"|"rejected";
  channel: string;
  customer_type: string | null;
  situation_text: string | null;
  notes: string | null;
  ai_analysis: any;
  ai_options: any;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export function useBusinessCases(accountId?: string) {
  return useQuery({
    queryKey: ["business-cases", accountId],
    enabled: !!accountId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("business_cases").select("*")
        .eq("business_account_id", accountId!).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BusinessCase[];
    },
  });
}

export function useBusinessCase(caseId?: string) {
  return useQuery({
    queryKey: ["business-case", caseId],
    enabled: !!caseId && caseId !== "new",
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("business_cases").select("*").eq("id", caseId!).maybeSingle();
      if (error) throw error;
      return data as BusinessCase | null;
    },
  });
}

export function useBusinessCaseRealtime(caseId?: string) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!caseId || caseId === "new") return;
    const ch = supabase
      .channel(`bcase:${caseId}`)
      .on("postgres_changes" as any, { event: "UPDATE", schema: "public", table: "business_cases", filter: `id=eq.${caseId}` },
        (p: any) => qc.setQueryData(["business-case", caseId], p.new))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [caseId, qc]);
}

export function useCreateBusinessCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      business_account_id: string; created_by_user_id: string;
      product_category?: string; product_name?: string; sku?: string;
      purchase_price_total: number; quantity: number; claimed_amount: number;
      channel?: string; customer_type?: string; situation_text?: string; notes?: string;
    }) => {
      // generate case_number client-side via RPC
      const { data: num } = await (supabase as any).rpc("generate_business_case_number", { _account_id: input.business_account_id });
      const { data, error } = await (supabase as any).from("business_cases").insert({
        ...input,
        case_number: num,
        title: input.product_name ? `Reklamation: ${input.product_name}` : "Reklamationsfall",
      }).select("*").single();
      if (error) throw error;
      return data as BusinessCase;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["business-cases"] }); },
  });
}

export function useRunPipeline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (case_id: string) => {
      // cold-start retry: edge function may have just booted; retry transient network/5xx once
      const isTransient = (err: any) => {
        if (!err) return false;
        const name = String(err?.name ?? "");
        const msg = String(err?.message ?? "");
        const status = Number((err?.context && err.context.status) ?? err?.status ?? 0);
        if (name === "FunctionsFetchError") return true;
        if (status === 0 || status === 502 || status === 503 || status === 504) return true;
        if (/fetch|network|failed to send|timeout|aborted/i.test(msg)) return true;
        return false;
      };
      const invokeOnce = async () => {
        const res = await supabase.functions.invoke("retail-shield-pipeline", { body: { case_id } });
        return res;
      };
      let { data, error } = await invokeOnce();
      if (error && isTransient(error)) {
        await new Promise((r) => setTimeout(r, 1500));
        ({ data, error } = await invokeOnce());
      }
      if (error) {
        // The edge function may have completed server-side even though the
        // HTTP connection dropped (long-running Anthropic call + HTTP/2 reset).
        // Poll the case row for up to ~90s to detect successful completion.
        const deadline = Date.now() + 90_000;
        while (Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, 3000));
          const { data: row } = await (supabase as any)
            .from("business_cases")
            .select("ai_analysis, ai_options, updated_at")
            .eq("id", case_id)
            .maybeSingle();
          const hasAnalysis = row && row.ai_analysis && Object.keys(row.ai_analysis || {}).length > 0;
          const hasOptions = row && Array.isArray(row.ai_options) && row.ai_options.length > 0;
          if (hasAnalysis && hasOptions) {
            return { ok: true, recovered: true } as any;
          }
        }
        throw error;
      }
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: (_d, case_id) => {
      qc.invalidateQueries({ queryKey: ["business-case", case_id] });
      qc.invalidateQueries({ queryKey: ["business-cases"] });
      qc.invalidateQueries({ queryKey: ["business-approvals"] });
    },
  });
}

export function useApprovals(accountId?: string) {
  return useQuery({
    queryKey: ["business-approvals", accountId],
    enabled: !!accountId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("business_approvals").select("*, case:business_cases(case_number,product_name,situation_text,purchase_price_total,claimed_amount)")
        .eq("business_account_id", accountId!).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useDecideApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { approval_id: string; decision: "accepted"|"modified"|"rejected"; final_amount?: number; final_percent?: number; notes?: string; }) => {
      const { data, error } = await supabase.functions.invoke("b2b-approval-decide", { body: input });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["business-approvals"] });
      qc.invalidateQueries({ queryKey: ["business-cases"] });
    },
  });
}

export function useDecideCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { case_id: string; final_amount: number; final_percent: number; notes?: string; }) => {
      const { data, error } = await supabase.functions.invoke("b2b-case-decide", { body: input });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["business-cases"] });
      qc.invalidateQueries({ queryKey: ["business-case"] });
    },
  });
}

export function useReopenCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { case_id: string }) => {
      const { data, error } = await supabase.functions.invoke("b2b-case-decide", {
        body: { ...input, action: "reopen" },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["business-cases"] });
      qc.invalidateQueries({ queryKey: ["business-case"] });
    },
  });
}

export function useRequestApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { case_id: string; requested_amount: number; requested_percent: number; justification: string; }) => {
      const { data: caseRow, error: cErr } = await (supabase as any)
        .from("business_cases").select("business_account_id, ai_options").eq("id", input.case_id).single();
      if (cErr) throw cErr;
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes?.user?.id;
      if (!userId) throw new Error("Nicht angemeldet");
      const { data: mem } = await (supabase as any)
        .from("business_users").select("role").eq("auth_user_id", userId).eq("business_account_id", caseRow.business_account_id).eq("status","active").maybeSingle();
      const rec = Array.isArray(caseRow.ai_options) ? caseRow.ai_options[0] : null;
      const { error } = await (supabase as any).from("business_approvals").insert({
        case_id: input.case_id,
        business_account_id: caseRow.business_account_id,
        requested_by_user_id: userId,
        requested_by_role: mem?.role ?? "sachbearbeiter",
        required_role: "manager",
        requested_amount: input.requested_amount,
        requested_percent: input.requested_percent,
        ai_recommendation: rec ?? null,
        justification: input.justification,
      });
      if (error) throw error;
      await (supabase as any).from("business_cases").update({ status: "waiting_approval" }).eq("id", input.case_id);
      return { ok: true };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["business-cases"] });
      qc.invalidateQueries({ queryKey: ["business-case"] });
      qc.invalidateQueries({ queryKey: ["business-approvals"] });
    },
  });
}

export function useBusinessKpis(accountId?: string) {
  return useQuery({
    queryKey: ["business-kpis", accountId],
    enabled: !!accountId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("business_case_kpis").select("*").eq("business_account_id", accountId!).maybeSingle();
      if (error) throw error;
      return data ?? { total_cases: 0, open_cases: 0, waiting_approval_cases: 0, closed_cases: 0, sum_purchase: 0, sum_claimed: 0, sum_granted: 0, sum_saved: 0, avg_granted_percent: 0, escalated_count: 0 };
    },
  });
}

// ---------- Versions / Refinement ----------
export interface BusinessCaseVersion {
  id: string;
  case_id: string;
  business_account_id: string;
  version_number: number;
  kind: "initial" | "refinement" | "restore";
  user_prompt: string | null;
  ai_analysis: any;
  ai_options: any;
  recommended_index: number | null;
  required_role: string | null;
  created_by_user_id: string | null;
  created_at: string;
}

export function useBusinessCaseVersions(caseId?: string) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!caseId || caseId === "new") return;
    const ch = supabase
      .channel(`bcv:${caseId}:${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes" as any, { event: "INSERT", schema: "public", table: "business_case_versions", filter: `case_id=eq.${caseId}` },
        () => qc.invalidateQueries({ queryKey: ["business-case-versions", caseId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [caseId, qc]);
  return useQuery({
    queryKey: ["business-case-versions", caseId],
    enabled: !!caseId && caseId !== "new",
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("business_case_versions").select("*").eq("case_id", caseId!).order("version_number", { ascending: true });
      if (error) throw error;
      return (data ?? []) as BusinessCaseVersion[];
    },
  });
}

export function useRefineBusinessCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { case_id: string; instruction: string; customer_response?: string }) => {
      const { data, error } = await supabase.functions.invoke("b2b-case-refine", { body: input });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["business-case", vars.case_id] });
      qc.invalidateQueries({ queryKey: ["business-case-versions", vars.case_id] });
      qc.invalidateQueries({ queryKey: ["business-approvals"] });
    },
  });
}