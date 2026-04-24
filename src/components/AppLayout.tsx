import { Outlet, useNavigate } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { Bell, LogOut, User as UserIcon, Settings as SettingsIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const initialsOf = (name: string | null | undefined, email: string | null | undefined) => {
  const src = name?.trim() || email?.split("@")[0] || "U";
  return src
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

export const AppLayout = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading, signOut } = useAuth();
  const displayName = profile?.full_name || user?.email || "Operator";
  const tier = profile?.plan?.tier_label ?? null;
  const showTierSkeleton = !tier && (isLoading || !profile);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex bg-background">
      <AppSidebar />
      <main className="flex-1 min-w-0">
        <header className="hidden lg:flex items-center justify-end gap-4 px-10 py-6">
          <button className="w-9 h-9 rounded-full border border-border/40 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors">
            <Bell className="w-4 h-4" strokeWidth={1.5} />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 pl-2 pr-3 py-1.5 border border-border/40 rounded-sm hover:border-primary/40 transition-colors">
                <span className="w-7 h-7 rounded-full bg-primary/15 border border-primary/40 flex items-center justify-center font-sans text-[10px] tracking-widest text-primary">
                  {initialsOf(profile?.full_name, user?.email)}
                </span>
                <span className="text-left">
                  <span className="block font-mono-label text-foreground leading-tight">
                    {displayName}
                  </span>
                  {showTierSkeleton ? (
                    <Skeleton className="h-3 w-12 mt-0.5" />
                  ) : (
                    <span className="block font-mono-label text-primary/80 leading-tight">
                      {tier ?? "FREE"}
                    </span>
                  )}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 bg-card border border-border/40">
              <DropdownMenuLabel className="font-mono-label text-muted-foreground">
                Sovereign Menu
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/app/settings")}>
                <UserIcon className="w-4 h-4 mr-2" /> Profil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/app/settings")}>
                <SettingsIcon className="w-4 h-4 mr-2" /> Einstellungen
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <div className="px-6 lg:px-10 pb-16">
          <Outlet />
        </div>
        <footer className="px-10 py-6 flex items-center justify-between text-[10px] font-sans uppercase tracking-[0.2em] text-muted-foreground/50 border-t border-border/20">
          <span>PALLANX Internal // V.3.0.0-Imperial</span>
          <span>Encrypted Status: Active · System: Optimized</span>
        </footer>
      </main>
    </div>
  );
};
