import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "user";

export const useUserRole = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user-role", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<{ isAdmin: boolean; roles: AppRole[] }> => {
      if (!user?.id) return { isAdmin: false, roles: [] };
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (error) {
        console.warn("useUserRole error", error);
        return { isAdmin: false, roles: [] };
      }
      const roles = (data ?? []).map((r) => r.role as AppRole);
      return { isAdmin: roles.includes("admin"), roles };
    },
  });
};