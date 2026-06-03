import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type BusinessRole = "support_readonly" | "sachbearbeiter" | "manager" | "leitung";
export const roleRank: Record<BusinessRole, number> = {
  support_readonly: 0, sachbearbeiter: 1, manager: 2, leitung: 3,
};
export const roleLabel: Record<BusinessRole, string> = {
  support_readonly: "Support (Lese-Zugriff)",
  sachbearbeiter: "Sachbearbeiter:in",
  manager: "Manager:in",
  leitung: "Leitung",
};

export interface BusinessMembership {
  business_account_id: string;
  role: BusinessRole;
  full_name: string;
  email: string;
  is_primary_contact: boolean;
  business_account: {
    id: string;
    name: string;
    industry: string | null;
    status: string;
  };
}

export function useBusinessMembership() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["business-membership", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<BusinessMembership | null> => {
      const { data, error } = await (supabase as any)
        .from("business_users")
        .select("business_account_id, role, full_name, email, is_primary_contact, business_account:business_accounts!inner(id,name,industry,status)")
        .eq("auth_user_id", user!.id)
        .eq("status", "active")
        .maybeSingle();
      if (error) {
        console.warn("membership query", error);
        return null;
      }
      return data as any;
    },
  });
}

export function useBusinessSettings(accountId?: string) {
  return useQuery({
    queryKey: ["business-settings", accountId],
    enabled: !!accountId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("business_settings").select("*").eq("business_account_id", accountId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}