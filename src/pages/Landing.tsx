import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { PublicHeader } from "@/components/PublicHeader";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader active="home" />

      {/* 1. THE GATE */}
      <section className="container relative min-h-[85vh] flex flex-col justify-center py-24">
        <span className="hidden md:block absolute top-6 right-6 font-sans uppercase tracking-[0.25em] text-[10px] text-muted-foreground">
          Terminal // Session 04.26 // Clearance Required
        </span>

        <div className="max-w-4xl">
          <div className="flex items-center gap-4 mb-10">
            <span className="h-px w-10 bg-primary" />
            <span className="font-sans uppercase tracking-[0.25em] text-[11px] text-primary">
              ◆ PALLANX Intelligence Terminal
            </span>
          </div>

          <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl leading-[1.02] tracking-tight mb-10">
            Sie verlieren Marge.
            <br />
            In jedem Meeting. <span className="italic text-primary">Lautlos.</span>
          </h1>

          <p className="font-serif text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed mb-12">
            Während Sie verhandeln, kalkuliert Ihr Gegenüber. Jeder nachgegebene Prozentpunkt
            auf einem 5-Millionen-Deal kostet Sie 50.000 €. PALLANX beendet die Asymmetrie.
          </p>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-16">
            <Link to="/register">
              <Button variant="gold" size="xl">
                Strategie-Briefing buchen →
              </Button>
            </Link>
            <Link
              to="/register"
              className="font-sans uppercase tracking-[0.2em] text-xs text-primary hover:text-primary/80 border-b border-primary/40 pb-1"
            >
              Terminal-Zugang anfragen
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-sans uppercase tracking-[0.3em] text-[10px] text-muted-foreground">
            <span>Souverän</span>
            <span className="h-px w-6 bg-primary/40" />
            <span>Diskret</span>
            <span className="h-px w-6 bg-primary/40" />
            <span>By Invitation</span>
          </div>
        </div>
      </section>

      {/* 2. THE PAIN */}
      <section className="border-t border-border/40">
        <div className="container py-32">
          <p className="font-sans uppercase tracking-[0.25em] text-[11px] text-primary mb-6">
            ◆ 01 / Die Diagnose
          </p>
          <h2 className="font-serif italic text-4xl md:text-6xl tracking-tight mb-20 max-w-3xl">
            Drei stille Killer Ihres EBITDA.
          </h2>

          <div className="grid md:grid-cols-3 gap-px bg-border/40 border border-border/40">
            {[
              {
                label: "Asymmetrie",
                text: "Ihr Tier-1-Lieferant kennt Ihre Wechselkosten besser als Sie selbst. Er weiß, dass Sie nicht gehen werden. Also bezahlen Sie jedes Jahr 12 % mehr — und nennen es „Inflation\u201C.",
              },
              {
                label: "Emotion",
                text: "Im entscheidenden Moment greift Ihr limbisches System ein. Sie reden, um die Stille zu füllen. Sie geben nach, um die Beziehung zu retten. Sie verlieren — höflich.",
              },
              {
                label: "Improvisation",
                text: "Ihre Gegenseite hat ein Playbook, ein Legal-Team und drei Wochen Vorbereitung. Sie haben ein Bauchgefühl und einen vollen Kalender. Der Ausgang ist mathematisch determiniert.",
              },
            ].map((p) => (
              <div key={p.label} className="bg-background p-10">
                <p className="font-sans uppercase tracking-[0.25em] text-[11px] text-primary mb-6">
                  {p.label}
                </p>
                <p className="font-serif text-base md:text-lg leading-relaxed text-foreground/85">
                  {p.text}
                </p>
              </div>
            ))}
          </div>

          <p className="font-serif italic text-xl md:text-2xl text-primary text-center mt-20 max-w-3xl mx-auto">
            Verhandeln ohne System ist die teuerste Form von Optimismus.
          </p>
        </div>
      </section>

      {/* 3. THE PARADIGM SHIFT */}
      <section className="border-t border-border/40 bg-card/30">
        <div className="container py-32 grid lg:grid-cols-5 gap-16 items-start">
          <div className="lg:col-span-3">
            <p className="font-sans uppercase tracking-[0.25em] text-[11px] text-primary mb-6">
              ◆ 02 / Der unfaire Vorteil
            </p>
            <h2 className="font-serif text-4xl md:text-6xl tracking-tight mb-10 leading-[1.05]">
              PALLANX ist keine Software.
              <br />
              Es ist eine <span className="italic text-primary">Doktrin</span>.
            </h2>
            <div className="space-y-6 font-serif text-lg text-muted-foreground leading-relaxed max-w-xl">
              <p>
                Wir kombinieren die Verhörtaktik des FBI mit den spieltheoretischen Modellen,
                die Hedgefonds für M&amp;A-Mandate einsetzen — und destillieren beides in ein
                Terminal, das jede Ihrer Verhandlungen in Echtzeit kalibriert.
              </p>
              <p className="text-foreground">
                Das Ergebnis ist nicht „bessere Kommunikation". Das Ergebnis ist Souveränität.
              </p>
            </div>

            <div className="mt-14 divide-y divide-border/40 border-y border-border/40 max-w-xl">
              {[
                {
                  n: "01",
                  t: "Wasserdichte Verträge.",
                  s: "Klauseln, die Ihre Gegenseite unterschreibt, weil sie keine andere Wahl sieht.",
                },
                {
                  n: "02",
                  t: "Verteidigte Marge.",
                  s: "Die Konzessionen finden auf der anderen Seite des Tisches statt.",
                },
                {
                  n: "03",
                  t: "Totale Kontrolle.",
                  s: "Sie diktieren das Tempo, das Framing und den Ausgang.",
                },
              ].map((o) => (
                <div key={o.n} className="py-6 flex gap-6">
                  <span className="font-sans text-primary text-sm tracking-widest pt-1">
                    {o.n}
                  </span>
                  <div>
                    <p className="font-serif text-xl mb-1">{o.t}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{o.s}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Terminal Card */}
          <div className="lg:col-span-2 lg:sticky lg:top-24">
            <div className="border border-primary/50 bg-background p-8">
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-primary/30">
                <span className="font-sans uppercase tracking-[0.3em] text-[10px] text-primary">
                  ◆ Pallanx // Live
                </span>
                <span className="font-sans uppercase tracking-[0.25em] text-[10px] text-muted-foreground">
                  Mandate #04-26
                </span>
              </div>

              <div className="space-y-5 font-sans text-xs">
                {[
                  ["Leverage Index", "0.84"],
                  ["BATNA", "Secured"],
                  ["Concession Ceiling", "3.2 %"],
                  ["Counterparty Profile", "Analytical / Risk-Averse"],
                  ["Anchor Position", "+18 % Above Target"],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between gap-4">
                    <span className="uppercase tracking-[0.2em] text-[10px] text-muted-foreground">
                      {k}
                    </span>
                    <span className="text-foreground font-medium tracking-wide">{v}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-primary/30">
                <p className="font-sans uppercase tracking-[0.25em] text-[10px] text-muted-foreground mb-2">
                  Recommended Move
                </p>
                <p className="font-serif italic text-lg text-primary">Anchor High. Hold Silence.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. THE ARENAS */}
      <section className="border-t border-border/40">
        <div className="container py-32">
          <p className="font-sans uppercase tracking-[0.25em] text-[11px] text-primary mb-6">
            ◆ 03 / Einsatzgebiete
          </p>
          <h2 className="font-serif text-4xl md:text-6xl tracking-tight mb-20">
            Wo PALLANX operiert.
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-border/40 border border-border/40">
            {[
              {
                n: "I",
                t: "M&A Earn-Outs",
                s: "Wenn 18 Monate nach Closing entschieden wird, ob Ihr Exit ein Triumph oder eine Fußnote war.",
              },
              {
                n: "II",
                t: "Tier-1 Vendor Renewals",
                s: "Wenn SAP, Salesforce oder AWS das Gespräch mit „geringfügigen Anpassungen\u201C eröffnen.",
              },
              {
                n: "III",
                t: "Hostile B2B Disputes",
                s: "Wenn die Anwaltskanzlei der Gegenseite teurer ist als Ihre Forderung.",
              },
              {
                n: "IV",
                t: "Board & Investor Negotiations",
                s: "Wenn Term Sheets über Kontrollmehrheiten entscheiden und jedes Komma zählt.",
              },
            ].map((a) => (
              <div key={a.n} className="bg-background p-8 min-h-[220px] flex flex-col">
                <span className="font-serif italic text-primary text-2xl mb-8">{a.n}</span>
                <p className="font-serif text-xl mb-3">{a.t}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{a.s}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. THE FINAL GATE */}
      <section className="border-y border-primary/60">
        <div className="container py-40 max-w-3xl text-center">
          <p className="font-sans uppercase tracking-[0.3em] text-[11px] text-primary mb-8">
            ◆ Evaluation
          </p>
          <h2 className="font-serif text-5xl md:text-7xl tracking-tight leading-[1.05] mb-10">
            30 Minuten.
            <br />
            Oder die nächsten <span className="italic text-primary">€500.000</span>.
          </h2>
          <div className="space-y-6 font-serif text-lg md:text-xl text-muted-foreground leading-relaxed mb-14 max-w-2xl mx-auto">
            <p>
              Der nächste 5-Millionen-Deal verliert 10 %, wenn Sie unvorbereitet hineingehen.
              Das sind 500.000 €, die Sie nie sehen werden — und nie vermissen, weil sie nie
              auf Ihrem Konto waren.
            </p>
            <p className="text-foreground">
              Das Strategie-Briefing dauert 30 Minuten. Wir prüfen, ob Ihre Mandatslage PALLANX
              rechtfertigt. Wenn nicht, sagen wir es Ihnen.
            </p>
          </div>

          <div className="flex flex-col items-center gap-6">
            <Link to="/register">
              <Button variant="gold" size="xl">
                Strategie-Briefing anfragen →
              </Button>
            </Link>
            <Link
              to="/register"
              className="font-sans uppercase tracking-[0.2em] text-xs text-primary hover:text-primary/80 border-b border-primary/40 pb-1"
            >
              Eligibility prüfen lassen
            </Link>
          </div>

          <p className="font-serif italic text-sm text-muted-foreground mt-12">
            By invitation. Limitiertes Mandatskontingent pro Quartal.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="container py-10 flex flex-col md:flex-row gap-4 justify-between items-center text-[10px] font-sans uppercase tracking-[0.25em] text-muted-foreground">
        <Logo />
        <span>PALLANX // Elite Negotiation Terminal</span>
        <div className="flex gap-6">
          <a href="#" className="hover:text-primary">Impressum</a>
          <a href="#" className="hover:text-primary">Datenschutz</a>
          <span>© 2026</span>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
