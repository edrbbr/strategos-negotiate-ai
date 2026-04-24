import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type ExtraCreditPurchase = {
  id: string;
  quantity: number;
  amount_cents: number;
  currency: string;
  status: string;
  expires_at: string | null;
  created_at: string;
};

export const useExtraCreditPurchases = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["extra-credit-purchases", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<ExtraCreditPurchase[]> => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("extra_credit_purchases")
        .select("id, quantity, amount_cents, currency, status, expires_at, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) {
        console.warn("useExtraCreditPurchases error", error);
        return [];
      }
      return (data ?? []) as ExtraCreditPurchase[];
    },
  });
};