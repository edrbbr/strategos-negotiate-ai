import { Outlet, NavLink, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useBusinessMembership, roleLabel } from "@/hooks/useBusinessAccount";
import { Shield, LayoutDashboard, Files, Inbox, Users, Settings, LifeBuoy, Receipt, BookOpen, LogOut, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

const items = [
  { to: "/retail/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/retail/app/cases", label: "Fälle", icon: Files },
  { to: "/retail/app/approvals", label: "Eskalationen", icon: Inbox },
  { to: "/retail/app/team", label: "Team", icon: Users },
  { to: "/retail/app/policies", label: "Richtlinien", icon: BookOpen },
  { to: "/retail/app/settings", label: "Einstellungen", icon: Settings },
  { to: "/retail/app/support", label: "Support", icon: LifeBuoy },
  { to: "/retail/app/billing", label: "Abrechnung", icon: Receipt },
];

export function RetailLayout() {
  const { signOut } = useAuth();
  const { data: m } = useBusinessMembership();
  const nav = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 w-64 border-r bg-card hidden md:flex flex-col">
        <div className="p-5 border-b">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-semibold tracking-tight">Retail Shield</span>
          </Link>
          {m && (
            <div className="mt-3 text-xs text-muted-foreground">
              <div className="font-medium text-foreground truncate">{m.business_account?.name}</div>
              <div>{roleLabel[m.role]}</div>
            </div>
          )}
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {items.map((it) => (
            <NavLink key={it.to} to={it.to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive ? "bg-primary/10 text-primary" : "hover:bg-accent text-foreground/80"
                }`
              }>
              <it.icon className="w-4 h-4" />{it.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t">
          <Button asChild variant="ghost" className="w-full justify-start mb-1">
            <Link to="/"><Home className="w-4 h-4 mr-2" /> Zur Pallanx-Startseite</Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start" onClick={async () => { await signOut(); nav("/retail/login"); }}>
            <LogOut className="w-4 h-4 mr-2" /> Abmelden
          </Button>
        </div>
      </aside>
      <main className="md:pl-64">
        <div className="md:hidden border-b p-4 flex items-center justify-between bg-card">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-semibold">Retail Shield</span>
          </Link>
          <Link to="/" className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1">
            <Home className="w-3.5 h-3.5" /> Home
          </Link>
        </div>
        <div className="p-6 max-w-7xl mx-auto">
          <Outlet />
        </div>
        <div className="md:hidden fixed bottom-0 inset-x-0 border-t bg-card grid grid-cols-5">
          {items.slice(0,5).map((it) => (
            <NavLink key={it.to} to={it.to}
              className={({ isActive }) => `flex flex-col items-center justify-center py-2 text-xs ${isActive ? "text-primary" : "text-muted-foreground"}`}>
              <it.icon className="w-4 h-4 mb-1" />{it.label}
            </NavLink>
          ))}
        </div>
      </main>
    </div>
  );
}