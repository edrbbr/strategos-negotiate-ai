import { Link } from "react-router-dom";
import { Folder, Mail, MessageCircle, Search, Car, Briefcase, Home, Plus, ChevronRight } from "lucide-react";

const stats = [
  { label: "Fälle Gesamt", value: "012", color: "primary", icon: Folder },
  { label: "Offene Fälle", value: "003", color: "secondary", icon: Mail },
  { label: "Neue Nachrichten", value: "007", color: "tertiary", icon: MessageCircle },
];

const filters = ["Alle", "E-Mail", "Verträge", "Archiv"];

const cases = [
  {
    id: "882-X9",
    agent: "Analyse",
    color: "secondary",
    icon: Car,
    title: "Autoreklamation BMW — Mängelbeseitigung",
    desc: "Strategische Korrespondenz bezüglich Getriebeschaden. Aktueller Status: Warte auf Antwort der Rechtsabteilung…",
  },
  {
    id: "991-A2",
    agent: "Strategie",
    color: "primary",
    icon: Briefcase,
    title: "Gehaltsverhandlung Q4 — TechCorp AG",
    desc: "Vorbereitung des Jahresgesprächs. Fokus auf Leistungsmetriken und Benchmark-Vergleich. Eskalationsstufen definiert.",
  },
  {
    id: "551-B7",
    agent: "Execution",
    color: "tertiary",
    icon: Home,
    title: "Mietstreit Friedrichshain — Kaution",
    desc: "Forderung zur Rückzahlung der Kaution nach Auszug. Letzte Mahnung generiert. Rechtliche Prüfung durch Agent…",
  },
];

const Dashboard = () => {
  return (
    <div className="animate-fade-in">
      {/* Title */}
      <div className="mb-10">
        <p className="font-mono-label text-muted-foreground mb-3">◆ Deine Fälle</p>
        <h1 className="font-serif italic text-5xl">Verhandlungs-Protokoll</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {stats.map((s) => (
          <div key={s.label} className={`relative bg-card border-l-2 border-${s.color} p-6 rounded-sm`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono-label text-muted-foreground mb-3">{s.label}</p>
                <p className={`font-serif text-5xl text-${s.color}`}>{s.value}</p>
              </div>
              <s.icon className="w-10 h-10 text-foreground/10" strokeWidth={1.2} />
            </div>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex flex-wrap gap-3">
          {filters.map((f, i) => (
            <button
              key={f}
              className={`px-5 py-2 rounded-full font-sans uppercase tracking-[0.18em] text-[10px] border transition-colors ${
                i === 0 ? "bg-primary text-primary-foreground border-primary" : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-primary"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Suche…"
            className="bg-transparent border border-border/60 rounded-sm pl-10 pr-4 py-2 font-mono-label text-muted-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none w-full md:w-72"
          />
        </div>
      </div>

      {/* Cases grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {cases.map((c) => (
          <Link
            key={c.id}
            to={`/app/case/${c.id}`}
            className="group bg-card border border-border/30 hover:border-primary/40 p-7 rounded-sm transition-colors flex flex-col"
          >
            <div className="flex items-start justify-between mb-6">
              <span className={`font-mono-label text-${c.color} border border-${c.color}/40 px-3 py-1`}>
                Agent: {c.agent}
              </span>
              <div className="flex items-center gap-2 text-muted-foreground/40">
                <span className="font-mono-label">ID: {c.id}</span>
                <c.icon className="w-5 h-5" strokeWidth={1.5} />
              </div>
            </div>
            <h3 className="font-serif text-2xl mb-3 leading-snug">{c.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-8 flex-1">{c.desc}</p>
            <div className="flex items-center justify-between pt-6 border-t border-border/20">
              <div className="flex -space-x-2">
                <span className="w-7 h-7 rounded-full bg-muted border border-border flex items-center justify-center text-[10px] font-sans text-muted-foreground">JD</span>
                <span className="w-7 h-7 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-[10px] font-sans text-primary">S</span>
              </div>
              <span className="font-mono-label text-primary group-hover:translate-x-1 transition-transform flex items-center gap-2">
                Öffnen <ChevronRight className="w-4 h-4" />
              </span>
            </div>
          </Link>
        ))}

        {/* New case card */}
        <Link
          to="/app/case/new"
          className="border border-dashed border-border/40 hover:border-primary/40 rounded-sm p-7 flex flex-col items-center justify-center min-h-[280px] transition-colors group"
        >
          <div className="w-12 h-12 border border-border/40 group-hover:border-primary/60 rounded-sm flex items-center justify-center mb-4 transition-colors">
            <Plus className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
          </div>
          <p className="font-mono-label text-muted-foreground group-hover:text-primary">Erstelle einen neuen Fall</p>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;
