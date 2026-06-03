import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBusinessMembership, type BusinessRole, roleRank } from "@/hooks/useBusinessAccount";

export function RetailProtectedRoute({ children, minRole }: { children: React.ReactNode; minRole?: BusinessRole }) {
  const { isAuthenticated, isLoading } = useAuth();
  const { data: m, isLoading: mLoading } = useBusinessMembership();
  const loc = useLocation();

  if (isLoading || (isAuthenticated && mLoading)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to={`/retail/login?returnUrl=${encodeURIComponent(loc.pathname)}`} replace />;
  if (!m) return <Navigate to="/retail/register" replace />;
  if (minRole && roleRank[m.role] < roleRank[minRole]) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-8 text-center">
        <h1 className="text-xl font-semibold mb-2">Keine Berechtigung</h1>
        <p className="text-muted-foreground">Diese Aktion erfordert mindestens die Rolle „{minRole}".</p>
      </div>
    );
  }
  return <>{children}</>;
}