import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RoleRow {
  id: string;
  business_account_id: string;
  role_key: string;
  label: string;
  max_discount_percent: number;
  base_role: "sachbearbeiter" | "manager" | "leitung";
  rank: number;
  is_active: boolean;
  is_builtin: boolean;
}

export function useRoleHierarchy(accountId?: string) {
  return useQuery({
    queryKey: ["role-hierarchy", accountId],
    enabled: !!accountId,
    queryFn: async (): Promise<RoleRow[]> => {
      const { data, error } = await (supabase as any)
        .from("business_custom_roles")
        .select("*")
        .eq("business_account_id", accountId!)
        .order("rank", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RoleRow[];
    },
  });
}

export function useCanManageRoles(accountId?: string) {
  return useQuery({
    queryKey: ["can-manage-roles", accountId],
    enabled: !!accountId,
    queryFn: async (): Promise<boolean> => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return false;
      const { data, error } = await (supabase as any).rpc("can_manage_roles", { _user: u.user.id, _account: accountId });
      if (error) return false;
      return !!data;
    },
  });
}

export function useUpsertRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<RoleRow> & { business_account_id: string; role_key: string; label: string; max_discount_percent: number; base_role: string; }) => {
      const payload: any = { ...input, role_key: input.role_key.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_") };
      if (input.id) {
        const { id, ...rest } = payload;
        const { error } = await (supabase as any).from("business_custom_roles").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        // Determine rank: insert just above sachbearbeiter built-in by default → fetch min rank and place below it
        const { data: rows } = await (supabase as any).from("business_custom_roles")
          .select("rank").eq("business_account_id", input.business_account_id).order("rank", { ascending: true }).limit(1);
        const minRank = rows?.[0]?.rank ?? 10;
        payload.rank = Math.max(1, minRank - 5);
        payload.is_builtin = false;
        payload.is_active = true;
        const { error } = await (supabase as any).from("business_custom_roles").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["role-hierarchy"] }),
  });
}

export function useToggleRoleActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any).from("business_custom_roles").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["role-hierarchy"] }),
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("business_custom_roles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["role-hierarchy"] }),
  });
}

export function useReorderRoles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ accountId, orderedIds }: { accountId: string; orderedIds: string[] }) => {
      // orderedIds is top→bottom (highest rank first). Assign ranks descending: 10*N, 10*(N-1), ...
      const { data, error } = await supabase.functions.invoke("b2b-roles-reorder", {
        body: { account_id: accountId, ordered_ids: orderedIds },
      });
      if (error || (data as any)?.error) throw new Error(error?.message || (data as any)?.error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["role-hierarchy"] }),
  });
}