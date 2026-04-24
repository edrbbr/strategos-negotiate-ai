import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";

export const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const { data: roleInfo, isLoading: roleLoading } = useUserRole();

  if (isLoading || roleLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 text-primary animate-spin mb-4" />
        <p className="font-mono-label text-muted-foreground">Berechtigungen werden geprüft…</p>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login?returnUrl=/admin" replace />;
  if (!roleInfo?.isAdmin) return <Navigate to="/app/dashboard" replace />;

  return <>{children}</>;
};
