import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type EliteRequest = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  profession: string;
  primary_use_case: string;
  monthly_negotiation_volume: string;
  biggest_pain_point: string;
  status: "pending" | "sent" | "accepted" | "declined";
  sent_at: string | null;
  created_at: string;
};

export const useEliteRequests = () =>
  useQuery({
    queryKey: ["elite-requests"],
    queryFn: async (): Promise<EliteRequest[]> => {
      const { data, error } = await supabase
        .from("elite_requests")
        .select("id,user_id,full_name,email,profession,primary_use_case,monthly_negotiation_volume,biggest_pain_point,status,sent_at,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as EliteRequest[];
    },
  });

export const useSendEliteOffer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (request_id: string) => {
      const { data, error } = await supabase.functions.invoke("send-elite-offer", {
        body: { request_id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["elite-requests"] }),
  });
};

export const useDeclineEliteRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (request_id: string) => {
      const { error } = await supabase
        .from("elite_requests")
        .update({ status: "declined", updated_at: new Date().toISOString() })
        .eq("id", request_id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["elite-requests"] }),
  });
};
