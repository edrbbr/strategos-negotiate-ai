import { NavLink } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

interface SettingsSideNavProps {
  active: "profile" | "billing";
}

export const SettingsSideNav = ({ active }: SettingsSideNavProps) => {
  const { profile } = useAuth();
  const limit = profile?.plan?.case_limit;
  const used = profile?.cases_used ?? 0;
  const extra = profile?.extra_credits ?? 0;
  const isUnlimited = profile != null && limit === null;
  const showUsage = limit !== null && limit !== undefined;
  const totalCapacity = (limit ?? 0) + extra;
  const usagePct = showUsage && totalCapacity > 0
    ? Math.min(100, Math.round((used / totalCapacity) * 100))
    : 0;
  const tierLabel = (profile?.plan?.tier_label ?? "FREE").toUpperCase();

  const items: { label: string; key: "profile" | "billing"; to: string }[] = [
    { label: "Profileinstellungen", key: "profile", to: "/app/settings" },
    { label: "Plan & Abrechnung", key: "billing", to: "/app/billing" },
  ];

  return (
    <aside>
      <p className="font-mono-label text-muted-foreground mb-6">Einstellungen</p>
      <ul className="space-y-3 mb-10">
        {items.map((item) => (
          <li key={item.key}>
            <NavLink
              to={item.to}
              className={`flex items-center gap-2 font-mono-label text-left ${
                active === item.key
                  ? "text-primary"
                  : "text-muted-foreground hover:text-primary"
              } transition-colors`}
            >
              {active === item.key && <span className="text-primary">◆</span>}
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>

      {!profile ? (
        <div className="border border-border/30 p-5 rounded-sm space-y-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-0.5 w-full" />
        </div>
      ) : isUnlimited ? (
        <div className="border border-primary/30 p-5 rounded-sm">
          <p className="font-mono-label text-muted-foreground mb-3">Status Quo</p>
          <div className="flex items-center justify-between text-xs font-sans uppercase tracking-[0.18em]">
            <span className="text-muted-foreground">Mandat</span>
            <span className="text-primary">{tierLabel} · UNBEGRENZT</span>
          </div>
        </div>
      ) : showUsage && (
        <div className="border border-border/30 p-5 rounded-sm">
          <p className="font-mono-label text-muted-foreground mb-3">Status Quo</p>
          <div className="flex items-center justify-between text-xs font-sans uppercase tracking-[0.18em] mb-2">
            <span className="text-muted-foreground">Dossiers</span>
            <span className="text-primary">
              {used} / {limit}
              {extra > 0 && (
                <span className="ml-1 text-muted-foreground/70">+{extra}</span>
              )}
            </span>
          </div>
          <div className="h-0.5 bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${usagePct}%` }}
            />
          </div>
        </div>
      )}
    </aside>
  );
};