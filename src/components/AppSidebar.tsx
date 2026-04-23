import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { BarChart3, Award, Gavel, ScrollText, Settings, Plus, LogOut, User } from "lucide-react";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useAllCases } from "@/hooks/useCases";

const navItems = [
  { label: "Analyse", to: "/app/dashboard", icon: BarChart3 },
  { label: "Strategie", to: "/app/dashboard", icon: Award },
  { label: "Execution", to: "/app/execution", icon: Gavel },
  { label: "History", to: "/app/history", icon: ScrollText },
  { label: "Settings", to: "/app/settings", icon: Settings },
];

export const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { data: allCases } = useAllCases();

  const activeCases = (allCases ?? [])
    .filter((c) => c.status === "draft" || c.status === "active")
    .slice(0, 5);

  const planId = profile?.plan_id ?? "free";
  const planName = profile?.plan?.name ?? "Free";
  const tierLabel = profile?.plan?.tier_label ?? planName;
  const limit = profile?.plan?.case_limit;
  const used = profile?.cases_used ?? 0;
  const isFreeTier = planId === "free";
  const showUsage = isFreeTier && limit !== null && limit !== undefined;
  const usagePct = showUsage ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const limitWarn = showUsage && limit && used / limit >= 2 / 3;

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <aside className="hidden lg:flex flex-col w-72 shrink-0 bg-sidebar border-r border-sidebar-border min-h-screen">
      <div className="p-6 border-b border-sidebar-border">
        <Logo subtitle />
      </div>

      <div className="p-6">
        <button
          onClick={() => navigate("/app/case/new")}
          className="w-full border border-primary/60 text-primary py-3 px-4 font-sans uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-2 hover:bg-primary/10 transition-colors rounded-sm"
        >
          <Plus className="w-4 h-4" />
          Neuer Fall
        </button>
      </div>

      <nav className="px-6 flex-1">
        <p className="font-mono-label text-muted-foreground/60 mb-3">Navigation</p>
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to || (item.to.includes('/case/') && location.pathname.includes('/case/'));
            return (
              <li key={item.label} className="relative">
                {isActive && <span className="absolute -left-6 top-0 bottom-0 w-0.5 bg-primary" />}
                <NavLink
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 py-2.5 px-3 rounded-sm font-sans uppercase tracking-[0.18em] text-xs transition-colors",
                    isActive
                      ? "text-primary bg-primary/5"
                      : "text-sidebar-foreground/70 hover:text-primary hover:bg-primary/5"
                  )}
                >
                  <item.icon className="w-4 h-4" strokeWidth={1.5} />
                  {item.label}
                </NavLink>
              </li>
            );
          })}
        </ul>

        {activeCases.length > 0 && (
          <>
            <p className="font-mono-label text-muted-foreground/60 mt-8 mb-3">Aktive Fälle</p>
            <ul className="space-y-2">
              {activeCases.map((c) => {
                const isCurrent = location.pathname === `/app/case/${c.id}`;
                return (
                  <li key={c.id}>
                    <NavLink
                      to={`/app/case/${c.id}`}
                      className="flex items-center gap-2 text-sm font-serif italic text-sidebar-foreground/60 hover:text-primary transition-colors truncate"
                    >
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full shrink-0",
                          isCurrent ? "bg-primary" : "bg-primary/50",
                        )}
                      />
                      <span className="truncate">{c.title}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </nav>

      <div className="p-6 border-t border-sidebar-border space-y-4">
        {showUsage ? (
          <button
            onClick={() => navigate("/preise")}
            className="w-full text-left group"
            aria-label="Plan upgraden"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono-label text-muted-foreground group-hover:text-primary transition-colors">
                Free Plan
              </span>
              <span
                className={cn(
                  "font-sans text-xs transition-colors",
                  limitWarn ? "text-primary" : "text-muted-foreground",
                )}
              >
                {used}/{limit} Fälle
              </span>
            </div>
            <div className="h-0.5 bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all",
                  limitWarn ? "bg-primary" : "bg-muted-foreground/60",
                )}
                style={{ width: `${usagePct}%` }}
              />
            </div>
          </button>
        ) : (
          <div className="flex items-center justify-between">
            <span className="font-mono-label text-muted-foreground">
              {tierLabel} Plan
            </span>
            <span className="font-sans text-xs text-primary">Unlimited</span>
          </div>
        )}
        <div className="space-y-1">
          <NavLink to="/app/settings" className="flex items-center gap-3 py-2 text-sidebar-foreground/70 hover:text-primary font-sans uppercase tracking-[0.18em] text-xs">
            <User className="w-4 h-4" strokeWidth={1.5} />
            Profile
          </NavLink>
          <button
            onClick={handleLogout}
            className="w-full text-left flex items-center gap-3 py-2 text-sidebar-foreground/70 hover:text-primary font-sans uppercase tracking-[0.18em] text-xs"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.5} />
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
};
