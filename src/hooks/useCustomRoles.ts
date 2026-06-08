import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CustomRole {
  id: string;
  business_account_id: string;
  role_key: string;
  label: string;
  max_discount_percent: number;
  base_role: "sachbearbeiter" | "manager" | "leitung";
}

export function useCustomRoles(accountId?: string) {
  return useQuery({
    queryKey: ["custom-roles", accountId],
    enabled: !!accountId,
    queryFn: async (): Promise<CustomRole[]> => {
      const { data, error } = await (supabase as any).from("business_custom_roles").select("*").eq("business_account_id", accountId!).order("max_discount_percent");
      if (error) throw error;
      return (data ?? []) as CustomRole[];
    },
  });
}

export function useUpsertCustomRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id?: string; business_account_id: string; role_key: string; label: string; max_discount_percent: number; base_role: string }) => {
      const payload = { ...input, role_key: input.role_key.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_") };
      if (input.id) {
        const { error } = await (supabase as any).from("business_custom_roles").update(payload).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("business_custom_roles").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["custom-roles"] }),
  });
}

export function useDeleteCustomRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("business_custom_roles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["custom-roles"] }),
  });
}