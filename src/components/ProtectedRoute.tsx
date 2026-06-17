import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBusinessMembership } from "@/hooks/useBusinessAccount";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading, profile } = useAuth();
  const { data: membership, isLoading: mLoading } = useBusinessMembership();
  const location = useLocation();

  if (isLoading || (isAuthenticated && mLoading)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 text-primary animate-spin mb-4" />
        <p className="font-mono-label text-muted-foreground">
          Identität wird verifiziert…
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    const returnUrl = `${location.pathname}${location.search}`;
    return (
      <Navigate
        to={`/login?returnUrl=${encodeURIComponent(returnUrl)}`}
        replace
      />
    );
  }

  // B2B-only user trying to access B2C area → redirect to retail app
  if (profile && profile.b2c_enabled === false) {
    if (membership) {
      return <Navigate to="/retail/app/dashboard" replace />;
    }
    return <Navigate to="/select-context?enable=b2c" replace />;
  }

  return <>{children}</>;
};
