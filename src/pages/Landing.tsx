import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { PublicHeader } from "@/components/PublicHeader";
import { Seo } from "@/components/Seo";
import { Check, X, Plus, Minus } from "lucide-react";
import { HeroCaseInput } from "@/components/landing/HeroCaseInput";
import { StickyCTA } from "@/components/landing/StickyCTA";
import { ExitIntentModal } from "@/components/landing/ExitIntentModal";

/** Persist a case-type hint for the post-signup first-case flow (Phase 2). */
const stashCaseType = (key: string) => {
  try {
    sessionStorage.setItem("pallanx_case_type", key);
  } catch {
    /* ignore */
  }
};

const OUTCOMES = [
  { metric: "+18 %", label: "Honorar im Schnitt", caption: "vs. Erst-Angebot" },
  { metric: "5 min", label: "bis fertiger Mail-Draft", caption: "statt 2 h Grübeln" },
  { metric: "0 €", label: "für Coaching-Calls", caption: "statt 180–300 €/Std." },
  { metric: "24/7", label: "verfügbar", caption: "auch um 23:47 Uhr" },
];

const COMPARISON_ROWS: Array<{
  feature: string;
  coach: boolean | string;
  chatgpt: boolean | string;
  pallanx: boolean | string;
}> = [
  { feature: "Sofort verfügbar", coach: false, chatgpt: true, pallanx: true },
  { feature: "Auf Deutsch & DACH-Kontext", coach: true, chatgpt: "teilweise", pallanx: true },
  { feature: "Spieltheorie + Voss-Doktrin", coach: "variabel", chatgpt: false, pallanx: true },
  { feature: "Fertiger Mail-Draft", coach: false, chatgpt: "nach 30 min Prompting", pallanx: true },
  { feature: "Vertragsklauseln markieren", coach: "extra", chatgpt: false, pallanx: true },
  { feature: "Daten bleiben in Europa", coach: true, chatgpt: false, pallanx: true },
  { feature: "Preis pro Fall", coach: "180–300 €", chatgpt: "20 €/Mon. + Zeit", pallanx: "ab 2,45 €" },
];

const USE_CASES = [
  { key: "honorar", t: "Honorarerhöhung beim Bestandskunden", s: "Wie hebst du 15 % an, ohne den Kunden zu verlieren? PALLANX baut Anker, Framing und Antwort auf jeden Einwand." },
  { key: "projektpreis", t: "Projektpreis verteidigen", s: "Kunde will 20 % runter. PALLANX zeigt, warum nicht — und wie du es so sagst, dass es niemand persönlich nimmt." },
  { key: "vertrag", t: "Vertrag prüfen", s: "Lade den Vertrag hoch. PALLANX markiert kritische Klauseln und liefert Gegenvorschläge." },
  { key: "rabatt", t: "Kunde will Rabatt", s: "Standardantworten reichen nicht mehr. Du bekommst eine Reaktion, die den Wert betont — nicht den Preis." },
  { key: "gehalt", t: "Gehalts- oder Konditionsgespräch", s: "Auch als Angestellter mit Nebengewerbe: BATNA, Skripte, Einwand-Behandlung." },
  { key: "konflikt", t: "Konflikt mit Auftraggeber", s: "Sachlich, juristisch sauber, ohne Eskalation — und doch durchsetzungsfähig." },
];

const FAQS = [
  {
    q: "Warum nicht einfach ChatGPT?",
    a: "ChatGPT liefert generische Tipps. PALLANX hat die Verhandlungs-Doktrin (Voss, Spieltheorie, BATNA) als festen Rahmen, kennt den DACH-Kontext und liefert dir in 5 Minuten Analyse + Strategie + fertigen Draft — ohne dass du 30 Minuten prompten musst.",
  },
  {
    q: "Was passiert mit meinen Daten?",
    a: "Alles bleibt in Europa (DACH-Hosting). Wir verkaufen keine Daten und trainieren keine fremden Modelle damit. Du kannst Fälle jederzeit löschen.",
  },
  {
    q: "Was, wenn es bei meinem Fall nicht funktioniert?",
    a: "Der erste Fall ist kostenlos. Wenn die Strategie für deine Situation nicht passt, hast du außer 5 Minuten nichts verloren. Pro ist monatlich kündbar.",
  },
  {
    q: "Ich bin kein Verhandlungs-Profi — ist das zu kompliziert?",
    a: "Im Gegenteil. PALLANX ist genau für Selbständige gebaut, die keine Verhandlungs-Profis sind. Du beschreibst die Situation in Alltagssprache, du bekommst eine fertige Mail.",
  },
  {
    q: "Funktioniert das auch für Vertragsklauseln?",
    a: "Ja. Du lädst den Vertrag hoch (PDF/DOCX), PALLANX markiert kritische Stellen — Haftung, Kündigungsfristen, Nutzungsrechte — und liefert Gegenformulierungen.",
  },
  {
    q: "Was kostet es genau?",
    a: "Free: 1 Fall pro Monat dauerhaft kostenlos. Single-Case-Pass: 29 € für einen einzelnen Fall ohne Abo. Pro: 49 €/Monat oder 490 €/Jahr für unbegrenzte Fälle.",
  },
];

const Cell = ({ value }: { value: boolean | string }) => {
  if (value === true) return <Check className="w-5 h-5 text-primary mx-auto" />;
  if (value === false) return <X className="w-5 h-5 text-muted-foreground/40 mx-auto" />;
  return (
    <span className="font-sans text-[11px] uppercase tracking-[0.15em] text-muted-foreground text-center block">
      {value}
    </span>
  );
};

const FAQItem = ({ q, a, isOpen, onToggle }: { q: string; a: string; isOpen: boolean; onToggle: () => void }) => (
  <div className="border-b border-border/40">
    <button
      onClick={onToggle}
      className="w-full py-6 flex items-start justify-between gap-6 text-left group"
      aria-expanded={isOpen}
    >
      <span className="font-serif text-lg md:text-xl text-foreground group-hover:text-primary transition-colors">
        {q}
      </span>
      <span className="shrink-0 mt-1 text-primary">
        {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
      </span>
    </button>
    {isOpen && (
      <p className="font-serif text-base text-muted-foreground leading-relaxed pb-6 pr-12 max-w-3xl">
        {a}
      </p>
    )}
  </div>
);

const Landing = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Seo
        title="PALLANX — KI-Verhandlungsstratege für Selbstständige"
        description="Bessere Honorare, faire Verträge, durchsetzungsfähige Mails. PALLANX liefert in 5 Minuten Analyse, Strategie und fertigen Entwurf. 1 Fall kostenlos."
        path="/"
      />
      <PublicHeader active="home" />

      <main>
        {/* 1. HERO — Conversion-first */}
        <section className="container relative py-20 md:py-28">
          <div className="max-w-4xl">
            <div className="flex items-center gap-4 mb-8">
              <span className="h-px w-10 bg-primary" />
              <span className="font-sans uppercase tracking-[0.25em] text-[11px] text-primary">
                ◆ KI-Verhandlungsstratege · DACH
              </span>
            </div>

            <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl leading-[1.02] tracking-tight mb-8">
              In 5 Minuten zur perfekten <span className="italic text-primary">Verhandlungs-Mail.</span>
            </h1>

            <p className="font-serif text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed mb-10">
              Beschreibe deine Situation in einem Satz. PALLANX liefert Analyse, Strategie und
              fertigen Entwurf — auf Deutsch, mit Spieltheorie und Voss-Doktrin.
            </p>

            <div className="mb-6">
              <HeroCaseInput />
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-sans uppercase tracking-[0.3em] text-[10px] text-muted-foreground">
              <span>Ohne Kreditkarte</span>
              <span className="h-px w-6 bg-primary/40" />
              <span>1 Fall kostenlos</span>
              <span className="h-px w-6 bg-primary/40" />
              <span>Made in DACH</span>
              <span className="h-px w-6 bg-primary/40" />
              <span>Monatlich kündbar</span>
            </div>
          </div>
        </section>

        {/* 2. SOCIAL PROOF */}
        <section className="border-y border-border/40 bg-card/30">
          <div className="container py-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-baseline gap-3">
              <span className="font-serif text-3xl text-primary">2.089</span>
              <span className="font-sans uppercase tracking-[0.2em] text-[10px] text-muted-foreground">
                Fälle analysiert
              </span>
            </div>
            <blockquote className="font-serif italic text-base md:text-lg text-foreground/85 max-w-xl text-center">
              „14 % mehr Honorar beim Bestandskunden. Hat sich für 5 Jahre Pro amortisiert."
              <span className="block font-sans uppercase tracking-[0.2em] text-[10px] text-muted-foreground not-italic mt-2">
                — M. K., UX-Beraterin
              </span>
            </blockquote>
            <div className="flex items-baseline gap-3">
              <span className="font-serif text-3xl text-primary">4,8</span>
              <span className="font-sans uppercase tracking-[0.2em] text-[10px] text-muted-foreground">
                ★ Ø Bewertung
              </span>
            </div>
          </div>
        </section>

        {/* 3. HOW IT WORKS — 3-Step */}
        <section className="container py-24 md:py-32">
          <p className="font-sans uppercase tracking-[0.25em] text-[11px] text-primary mb-6">
            ◆ 01 / So funktioniert es
          </p>
          <h2 className="font-serif text-4xl md:text-6xl tracking-tight mb-16 max-w-3xl">
            Drei Schritte. Fünf Minuten. <span className="italic text-primary">Fertige Mail.</span>
          </h2>

          <div className="grid md:grid-cols-3 gap-px bg-border/40 border border-border/40">
            {[
              { n: "01", t: "Situation beschreiben", s: "In 2 Minuten: Was ist passiert? Wer ist die Gegenseite? Was willst du erreichen?" },
              { n: "02", t: "Strategie erhalten", s: "PALLANX analysiert, wählt Doktrin (Voss, Anker, BATNA) und baut die Verhandlungs-Logik." },
              { n: "03", t: "Mail kopieren & senden", s: "Du bekommst Analyse + Strategie + fertigen Draft. Anpassen, kopieren, senden — fertig." },
            ].map((s) => (
              <div key={s.n} className="bg-background p-10">
                <span className="font-sans text-primary text-xs tracking-[0.3em] mb-6 block">{s.n}</span>
                <h3 className="font-serif text-2xl mb-3">{s.t}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.s}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 4. OUTCOMES (statt Pain) */}
        <section className="border-t border-border/40 bg-card/30">
          <div className="container py-24 md:py-32">
            <p className="font-sans uppercase tracking-[0.25em] text-[11px] text-primary mb-6">
              ◆ 02 / Was du bekommst
            </p>
            <h2 className="font-serif text-4xl md:text-6xl tracking-tight mb-16 max-w-3xl">
              Konkrete Zahlen. Keine Versprechen.
            </h2>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border/40 border border-border/40">
              {OUTCOMES.map((o) => (
                <div key={o.label} className="bg-background p-8 min-h-[200px] flex flex-col justify-between">
                  <span className="font-serif text-5xl md:text-6xl text-primary">{o.metric}</span>
                  <div>
                    <p className="font-serif text-base text-foreground">{o.label}</p>
                    <p className="font-sans uppercase tracking-[0.2em] text-[10px] text-muted-foreground mt-1">
                      {o.caption}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5. VERGLEICH — Matrix */}
        <section className="border-t border-border/40">
          <div className="container py-24 md:py-32">
            <p className="font-sans uppercase tracking-[0.25em] text-[11px] text-primary mb-6">
              ◆ 03 / Vergleich
            </p>
            <h2 className="font-serif text-4xl md:text-6xl tracking-tight mb-16 max-w-3xl">
              Coach. ChatGPT. <span className="italic text-primary">Oder PALLANX.</span>
            </h2>

            <div className="overflow-x-auto -mx-4 px-4">
              <table className="w-full min-w-[640px] border border-border/40">
                <thead>
                  <tr className="border-b border-border/40 bg-card/40">
                    <th className="text-left p-5 font-sans uppercase tracking-[0.2em] text-[10px] text-muted-foreground">
                      Feature
                    </th>
                    <th className="p-5 font-sans uppercase tracking-[0.2em] text-[10px] text-muted-foreground text-center">
                      Coach
                    </th>
                    <th className="p-5 font-sans uppercase tracking-[0.2em] text-[10px] text-muted-foreground text-center">
                      ChatGPT
                    </th>
                    <th className="p-5 font-sans uppercase tracking-[0.2em] text-[10px] text-primary text-center border-l border-primary/30 bg-primary/5">
                      PALLANX
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row) => (
                    <tr key={row.feature} className="border-b border-border/30 last:border-b-0">
                      <td className="p-5 font-serif text-foreground">{row.feature}</td>
                      <td className="p-5"><Cell value={row.coach} /></td>
                      <td className="p-5"><Cell value={row.chatgpt} /></td>
                      <td className="p-5 border-l border-primary/30 bg-primary/5"><Cell value={row.pallanx} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 6. USE CASES — Deep-Links */}
        <section className="border-t border-border/40 bg-card/30">
          <div className="container py-24 md:py-32">
            <p className="font-sans uppercase tracking-[0.25em] text-[11px] text-primary mb-6">
              ◆ 04 / Typische Fälle
            </p>
            <h2 className="font-serif text-4xl md:text-6xl tracking-tight mb-16 max-w-3xl">
              Welcher davon ist <span className="italic text-primary">dein</span> Fall?
            </h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-border/40 border border-border/40">
              {USE_CASES.map((u) => (
                <Link
                  key={u.key}
                  to="/register"
                  onClick={() => stashCaseType(u.key)}
                  className="bg-background p-8 min-h-[220px] flex flex-col group hover:bg-primary/5 transition-colors"
                >
                  <p className="font-serif text-lg mb-3 text-foreground group-hover:text-primary transition-colors">
                    {u.t}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed flex-1">{u.s}</p>
                  <span className="font-sans uppercase tracking-[0.2em] text-[10px] text-primary mt-6 inline-flex items-center gap-2 opacity-70 group-hover:opacity-100">
                    Diesen Fall starten →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* 7. FAQ — Einwand-Killer */}
        <section className="border-t border-border/40">
          <div className="container py-24 md:py-32 max-w-4xl">
            <p className="font-sans uppercase tracking-[0.25em] text-[11px] text-primary mb-6">
              ◆ 05 / Fragen
            </p>
            <h2 className="font-serif text-4xl md:text-6xl tracking-tight mb-12">
              Was du wissen willst, <span className="italic text-primary">bevor</span> du startest.
            </h2>

            <div className="border-t border-border/40">
              {FAQS.map((f, i) => (
                <FAQItem
                  key={f.q}
                  q={f.q}
                  a={f.a}
                  isOpen={openFaq === i}
                  onToggle={() => setOpenFaq(openFaq === i ? null : i)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* 8. FINAL CTA */}
        <section className="border-y border-primary/60">
          <div className="container py-32 md:py-40 max-w-3xl text-center">
            <p className="font-sans uppercase tracking-[0.3em] text-[11px] text-primary mb-8">
              ◆ Jetzt starten
            </p>
            <h2 className="font-serif text-5xl md:text-7xl tracking-tight leading-[1.05] mb-10">
              Dein erster Fall.
              <br />
              <span className="italic text-primary">Kostenlos.</span> Ohne Kreditkarte.
            </h2>
            <p className="font-serif text-lg md:text-xl text-muted-foreground leading-relaxed mb-12 max-w-2xl mx-auto">
              Beschreibe in 2 Minuten deine Situation. Du bekommst Analyse, Strategie und
              fertigen Entwurf — in unter 5 Minuten.
            </p>

            <div className="flex flex-col items-center gap-6">
              <Link to="/register">
                <Button variant="gold" size="xl">
                  Jetzt kostenlos starten →
                </Button>
              </Link>
              <Link
                to="/preise"
                className="font-sans uppercase tracking-[0.2em] text-xs text-primary hover:text-primary/80 border-b border-primary/40 pb-1"
              >
                Alle Tarife ansehen
              </Link>
            </div>

            <p className="font-serif italic text-sm text-muted-foreground mt-12">
              Made in DACH · Daten bleiben in Europa · Jederzeit kündbar
            </p>
          </div>
        </section>
      </main>

      <footer className="container py-10 flex flex-col md:flex-row gap-4 justify-between items-center text-[10px] font-sans uppercase tracking-[0.25em] text-muted-foreground">
        <Logo />
        <span>PALLANX // KI-Verhandlungsstratege</span>
        <div className="flex gap-6">
          <a href="#" className="hover:text-primary">Impressum</a>
          <Link to="/datenschutz" className="hover:text-primary">Datenschutz</Link>
          <span>© 2026</span>
        </div>
      </footer>

      <StickyCTA />
      <ExitIntentModal />
    </div>
  );
};

export default Landing;
