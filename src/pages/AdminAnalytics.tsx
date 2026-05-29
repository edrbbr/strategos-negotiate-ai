import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, TrendingUp, Users, ArrowRight } from "lucide-react";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";

type EventRow = { event_name: string; user_id: string | null; session_id: string | null; created_at: string };

const FUNNEL: { key: string; label: string }[] = [
  { key: "hero_input_submitted", label: "Hero-Input abgesendet" },
  { key: "register_started", label: "Registrierung gestartet" },
  { key: "register_completed", label: "Registrierung abgeschlossen" },
  { key: "case_started", label: "Erster Fall gestartet" },
  { key: "case_completed", label: "Fall abgeschlossen" },
  { key: "case_limit_hit", label: "Limit erreicht" },
  { key: "upgrade_modal_shown", label: "Upgrade-Modal gezeigt" },
  { key: "upgrade_cta_clicked", label: "Upgrade-CTA geklickt" },
  { key: "checkout_started", label: "Checkout gestartet" },
];

const LINKEDIN_EVENTS = [
  { key: "linkedin_consent_shown", label: "Consent gezeigt" },
  { key: "linkedin_consent_accepted", label: "Akzeptiert" },
  { key: "linkedin_consent_declined", label: "Abgelehnt" },
];

const RANGES = [
  { key: "24h", label: "24 h", hours: 24 },
  { key: "7d", label: "7 Tage", hours: 24 * 7 },
  { key: "30d", label: "30 Tage", hours: 24 * 30 },
  { key: "all", label: "Alle", hours: 0 },
];

const pct = (n: number, base: number) =>
  base === 0 ? "—" : `${((n / base) * 100).toFixed(1)} %`;

const AdminAnalytics = () => {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<(typeof RANGES)[number]["key"]>("7d");

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const hours = RANGES.find((r) => r.key === range)?.hours ?? 0;
      let query = supabase
        .from("analytics_events")
        .select("event_name,user_id,session_id,created_at")
        .order("created_at", { ascending: false })
        .limit(10000);
      if (hours > 0) {
        const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
        query = query.gte("created_at", since);
      }
      const { data } = await query;
      if (active) {
        setEvents((data as EventRow[]) ?? []);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [range]);

  const counts = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const e of events) {
      const key = e.user_id ?? e.session_id ?? `${e.event_name}-${e.created_at}`;
      if (!map.has(e.event_name)) map.set(e.event_name, new Set());
      map.get(e.event_name)!.add(key);
    }
    const out: Record<string, number> = {};
    map.forEach((set, k) => (out[k] = set.size));
    return out;
  }, [events]);

  const total = events.length;
  const uniqueUsers = useMemo(
    () => new Set(events.map((e) => e.user_id ?? e.session_id).filter(Boolean)).size,
    [events]
  );
  const heroBase = counts["hero_input_submitted"] || 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/30 px-8 py-5 flex items-center justify-between">
        <Logo subtitle="Conversion Analytics" />
        <div className="flex items-center gap-4">
          <Link to="/admin" className="font-mono-label text-muted-foreground hover:text-foreground text-xs">
            ← Elite-Anfragen
          </Link>
          <Link to="/admin/content" className="font-mono-label text-muted-foreground hover:text-foreground text-xs">
            LinkedIn Content →
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-12">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="font-mono-label text-primary mb-2">Pallanx · Analytics</p>
            <h1 className="font-serif text-4xl md:text-5xl">Conversion-Funnel</h1>
          </div>
          <div className="flex gap-2">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`px-3 py-2 font-mono-label text-xs border ${
                  range === r.key
                    ? "border-primary text-primary"
                    : "border-border/30 text-muted-foreground hover:text-foreground"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="grid md:grid-cols-3 gap-4 mb-12">
              <div className="border border-border/30 rounded-sm p-6">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <p className="font-mono-label text-xs text-muted-foreground">Events gesamt</p>
                </div>
                <p className="font-serif text-4xl">{total.toLocaleString("de-DE")}</p>
              </div>
              <div className="border border-border/30 rounded-sm p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-primary" />
                  <p className="font-mono-label text-xs text-muted-foreground">Unique Sessions/User</p>
                </div>
                <p className="font-serif text-4xl">{uniqueUsers.toLocaleString("de-DE")}</p>
              </div>
              <div className="border border-border/30 rounded-sm p-6">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowRight className="w-4 h-4 text-primary" />
                  <p className="font-mono-label text-xs text-muted-foreground">Hero → Checkout</p>
                </div>
                <p className="font-serif text-4xl">
                  {pct(counts["checkout_started"] || 0, heroBase)}
                </p>
              </div>
            </div>

            {/* Funnel */}
            <section className="mb-16">
              <h2 className="font-serif text-2xl mb-6">Acquisition → Activation → Revenue</h2>
              <div className="space-y-2">
                {FUNNEL.map((step, i) => {
                  const count = counts[step.key] || 0;
                  const base = heroBase || (FUNNEL[0] ? counts[FUNNEL[0].key] || 0 : 0);
                  const prev = i > 0 ? counts[FUNNEL[i - 1].key] || 0 : count;
                  const widthPct = base === 0 ? 0 : Math.min(100, (count / Math.max(base, 1)) * 100);
                  return (
                    <div key={step.key} className="border border-border/30 rounded-sm p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-mono-label text-xs text-muted-foreground">{step.key}</p>
                          <p className="text-sm">{step.label}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-serif text-2xl">{count}</p>
                          <p className="font-mono-label text-xs text-muted-foreground">
                            vom Hero: {pct(count, base)} · Step-CR: {i === 0 ? "—" : pct(count, prev)}
                          </p>
                        </div>
                      </div>
                      <div className="h-1.5 bg-muted/30 rounded-sm overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* LinkedIn */}
            <section>
              <h2 className="font-serif text-2xl mb-6">LinkedIn-Consent-Flow</h2>
              <div className="grid md:grid-cols-3 gap-4">
                {LINKEDIN_EVENTS.map((e) => (
                  <div key={e.key} className="border border-border/30 rounded-sm p-6">
                    <p className="font-mono-label text-xs text-muted-foreground mb-2">{e.label}</p>
                    <p className="font-serif text-3xl">{counts[e.key] || 0}</p>
                  </div>
                ))}
              </div>
              <p className="font-mono-label text-xs text-muted-foreground mt-4">
                Akzeptanzrate:{" "}
                {pct(
                  counts["linkedin_consent_accepted"] || 0,
                  counts["linkedin_consent_shown"] || 0
                )}
              </p>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default AdminAnalytics;