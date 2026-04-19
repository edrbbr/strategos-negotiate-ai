import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { BarChart3, Award, Gavel, ScrollText, Settings, Plus, LogOut, User } from "lucide-react";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { label: "Analyse", to: "/app/dashboard", icon: BarChart3 },
  { label: "Strategie", to: "/app/case/882-X9", icon: Award },
  { label: "Execution", to: "/app/execution", icon: Gavel },
  { label: "History", to: "/app/history", icon: ScrollText },
  { label: "Settings", to: "/app/settings", icon: Settings },
];

const activeCases = [
  { id: "882-X9", title: "Autoreklamation BMW", active: true },
  { id: "991-A2", title: "Mietminderung Berlin", active: false },
];

export const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const planName = profile?.plan?.name ?? "Free";
  const limit = profile?.plan?.case_limit;
  const used = profile?.cases_used ?? 0;
  const showUsage = limit !== null && limit !== undefined;
  const usagePct = showUsage ? Math.min(100, Math.round((used / limit) * 100)) : 0;

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
              <li key={item.to} className="relative">
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

        <p className="font-mono-label text-muted-foreground/60 mt-8 mb-3">Aktive Fälle</p>
        <ul className="space-y-2">
          {activeCases.map((c) => (
            <li key={c.id}>
              <NavLink
                to={`/app/case/${c.id}`}
                className="flex items-center gap-2 text-sm font-serif italic text-sidebar-foreground/60 hover:text-primary transition-colors"
              >
                <span className={cn("w-1 h-1 rounded-full", c.active ? "bg-primary" : "bg-muted-foreground/40")} />
                {c.title}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-6 border-t border-sidebar-border space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono-label text-muted-foreground">{planName} Plan</span>
            {showUsage ? (
              <span className="font-sans text-xs text-primary">{used}/{limit} Fälle</span>
            ) : (
              <span className="font-sans text-xs text-primary">Unlimited</span>
            )}
          </div>
          <div className="h-0.5 bg-muted overflow-hidden">
            <div
              className="h-full bg-primary"
              style={{ width: showUsage ? `${usagePct}%` : "100%" }}
            />
          </div>
        </div>
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
