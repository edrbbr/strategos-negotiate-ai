import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Folder, Mail, MessageCircle, Plus, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useAllCases, useCaseStats, type CaseRow } from "@/hooks/useCases";
import { CaseCard } from "@/components/CaseCard";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type FilterKey = "all" | "active" | "drafts" | "archived";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Alle" },
  { key: "active", label: "Aktiv" },
  { key: "drafts", label: "Entwürfe" },
  { key: "archived", label: "Archiv" },
];

const pad3 = (n: number) => (n > 999 ? String(n) : String(n).padStart(3, "0"));

const Dashboard = () => {
  const navigate = useNavigate();
  const { profile, user, refreshProfile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: cases, isLoading, isError, refetch } = useAllCases();
  const stats = useCaseStats();

  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Handle Stripe checkout return
  useEffect(() => {
    if (searchParams.get("checkout") !== "success") return;

    toast.success("Willkommen im Sovereign-System.", {
      description: "Ihr Plan wird gerade aktiviert.",
    });

    // Clean URL immediately so reloads don't re-trigger the polling
    const next = new URLSearchParams(searchParams);
    next.delete("checkout");
    next.delete("session_id");
    setSearchParams(next, { replace: true });

    // Poll up to 10 times every 1.5s (max ~15s) until plan_id flips off "free".
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 10;
    const intervalId = window.setInterval(async () => {
      if (cancelled) return;
      attempts += 1;
      await refreshProfile();
      const currentPlan = profile?.plan_id;
      if ((currentPlan && currentPlan !== "free") || attempts >= maxAttempts) {
        window.clearInterval(intervalId);
        if (attempts >= maxAttempts && (!currentPlan || currentPlan === "free")) {
          toast.message("Aktivierung dauert länger als üblich.", {
            description: "Bitte in einigen Sekunden die Seite neu laden.",
          });
        }
      }
    }, 1500);

    // Kick off an immediate refresh so the first attempt isn't delayed
    refreshProfile();

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const filtered = useMemo<CaseRow[]>(() => {
    const list = cases ?? [];
    let scoped = list;
    switch (filter) {
      case "all":
        scoped = list.filter((c) => c.status !== "archived");
        break;
      case "active":
        scoped = list.filter((c) => c.status === "active");
        break;
      case "drafts":
        scoped = list.filter((c) => c.status === "draft");
        break;
      case "archived":
        scoped = list.filter((c) => c.status === "archived");
        break;
    }
    if (debouncedSearch) {
      scoped = scoped.filter((c) => {
        const t = c.title?.toLowerCase() ?? "";
        const s = c.situation_text?.toLowerCase() ?? "";
        return t.includes(debouncedSearch) || s.includes(debouncedSearch);
      });
    }
    return scoped;
  }, [cases, filter, debouncedSearch]);

  const ownerName = profile?.full_name ?? user?.email ?? null;
  const isEmptyAccount = !isLoading && (cases?.length ?? 0) === 0;

  const statTiles = [
    { label: "Fälle Gesamt", value: pad3(stats.total), border: "border-primary", text: "text-primary", icon: Folder },
    { label: "Offene Fälle", value: pad3(stats.open), border: "border-secondary", text: "text-secondary", icon: Mail },
    { label: "Neue Nachrichten", value: pad3(stats.messages), border: "border-tertiary", text: "text-tertiary", icon: MessageCircle },
  ];

  return (
    <div className="animate-fade-in">
      {/* Title */}
      <div className="mb-10">
        <p className="font-mono-label text-muted-foreground mb-3">◆ Deine Fälle</p>
        <h1 className="font-serif italic text-5xl">Verhandlungs-Protokoll</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {statTiles.map((s) => (
          <div key={s.label} className={`relative bg-card border-l-2 ${s.border} p-6 rounded-sm`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono-label text-muted-foreground mb-3">{s.label}</p>
                {isLoading ? (
                  <Skeleton className="h-12 w-24" />
                ) : (
                  <p className={`font-serif text-5xl ${s.text}`}>{s.value}</p>
                )}
              </div>
              <s.icon className="w-10 h-10 text-foreground/10" strokeWidth={1.2} />
            </div>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex flex-wrap gap-3">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "px-5 py-2 rounded-full font-sans uppercase tracking-[0.18em] text-[10px] border transition-colors",
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-primary",
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suche…"
            className="bg-transparent border border-border/60 rounded-sm pl-10 pr-4 py-2 font-mono-label text-muted-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none w-full md:w-72"
          />
        </div>
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-6">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[280px] w-full" />
          ))}
        </div>
      ) : isError ? (
        <div className="bg-card border border-destructive/40 rounded-sm p-10 text-center">
          <p className="font-mono-label text-destructive mb-4">Fälle konnten nicht geladen werden</p>
          <button
            onClick={() => refetch()}
            className="font-mono-label text-primary border border-primary/40 px-4 py-2 rounded-sm hover:bg-primary/10"
          >
            Erneut versuchen
          </button>
        </div>
      ) : isEmptyAccount ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Link
            to="/app/case/new"
            className="border border-dashed border-border/40 hover:border-primary/40 rounded-sm p-7 flex flex-col items-center justify-center min-h-[280px] w-full max-w-md transition-colors group"
          >
            <div className="w-12 h-12 border border-border/40 group-hover:border-primary/60 rounded-sm flex items-center justify-center mb-4 transition-colors">
              <Plus className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
            </div>
            <p className="font-mono-label text-muted-foreground group-hover:text-primary">
              Erstelle einen neuen Fall
            </p>
          </Link>
          <p className="text-sm text-muted-foreground/70 font-serif italic mt-6 max-w-md text-center">
            Starte deine erste Verhandlungs-Analyse, um das System zu aktivieren.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {filtered.map((c) => (
            <CaseCard
              key={c.id}
              caseRow={c}
              ownerName={ownerName}
              isArchived={c.status === "archived"}
            />
          ))}

          {filtered.length === 0 && (
            <div className="md:col-span-2 bg-card border border-border/30 rounded-sm p-10 text-center">
              <p className="font-mono-label text-muted-foreground">
                Keine Fälle in dieser Ansicht.
              </p>
            </div>
          )}

          {/* New case card — only on the "all"/"active"/"drafts" filter, not in archive */}
          {filter !== "archived" && (
            <button
              onClick={() => navigate("/app/case/new")}
              className="border border-dashed border-border/40 hover:border-primary/40 rounded-sm p-7 flex flex-col items-center justify-center min-h-[280px] transition-colors group"
            >
              <div className="w-12 h-12 border border-border/40 group-hover:border-primary/60 rounded-sm flex items-center justify-center mb-4 transition-colors">
                <Plus className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
              </div>
              <p className="font-mono-label text-muted-foreground group-hover:text-primary">
                Erstelle einen neuen Fall
              </p>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;