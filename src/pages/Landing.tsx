import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { PublicHeader } from "@/components/PublicHeader";
import { Seo } from "@/components/Seo";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Seo
        title="PALLANX — Dein KI-Verhandlungsstratege für Selbständige"
        description="Bessere Honorare, faire Verträge, durchsetzungsfähige Mails. PALLANX liefert in 5 Minuten Analyse, Strategie und fertigen Entwurf. Kostenlos testen."
        path="/"
      />
      <PublicHeader active="home" />
      <main>
      {/* 1. HERO */}
      <section className="container relative min-h-[85vh] flex flex-col justify-center py-24">
        <span className="hidden md:block absolute top-6 right-6 font-sans uppercase tracking-[0.25em] text-[10px] text-muted-foreground">
          Terminal // Live Session // Kostenlos starten
        </span>

        <div className="max-w-4xl">
          <div className="flex items-center gap-4 mb-10">
            <span className="h-px w-10 bg-primary" />
            <span className="font-sans uppercase tracking-[0.25em] text-[11px] text-primary">
              ◆ Dein KI-Verhandlungsstratege
            </span>
          </div>

          <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl leading-[1.02] tracking-tight mb-10">
            Du bist brillant in deinem Fach.
            <br />
            Aber bei jeder Verhandlung lässt du <span className="italic text-primary">Honorar liegen.</span>
          </h1>

          <p className="font-serif text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed mb-12">
            Honorar, Projektpreis, Vertragsklausel, Gehaltsgespräch — PALLANX analysiert
            deine Situation, baut deine Strategie und liefert in 5 Minuten den fertigen
            Mail- oder Gesprächs-Entwurf. Auf Deutsch. Mit Spieltheorie und taktischer Empathie.
          </p>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-16">
            <Link to="/register">
              <Button variant="gold" size="xl">
                Kostenlos testen →
              </Button>
            </Link>
            <Link
              to="/preise"
              className="font-sans uppercase tracking-[0.2em] text-xs text-primary hover:text-primary/80 border-b border-primary/40 pb-1"
            >
              Preise ansehen
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-sans uppercase tracking-[0.3em] text-[10px] text-muted-foreground">
            <span>Ohne Kreditkarte</span>
            <span className="h-px w-6 bg-primary/40" />
            <span>5 Minuten zum Draft</span>
            <span className="h-px w-6 bg-primary/40" />
            <span>Made in DACH</span>
          </div>
        </div>
      </section>

      {/* 2. PAIN */}
      <section className="border-t border-border/40">
        <div className="container py-32">
          <p className="font-sans uppercase tracking-[0.25em] text-[11px] text-primary mb-6">
            ◆ 01 / Kennst du das?
          </p>
          <h2 className="font-serif italic text-4xl md:text-6xl tracking-tight mb-20 max-w-3xl">
            Drei Momente, in denen Selbständige Geld verlieren.
          </h2>

          <div className="grid md:grid-cols-3 gap-px bg-border/40 border border-border/40">
            {[
              {
                label: "Der Preisdruck",
                text: "„Können Sie da preislich noch was machen?" — Und plötzlich rabattierst du 15 %, weil dir kein Argument einfällt. Pro Auftrag. Jedes Jahr.",
              },
              {
                label: "Die Honorarerhöhung",
                text: "Seit zwei Jahren willst du den Stundensatz anheben. Aber wie formulierst du das, ohne den Kunden zu verlieren? Also bleibt alles, wie es ist.",
              },
              {
                label: "Die Klausel",
                text: "Ein Vertrag landet im Postfach: 14 Seiten, juristische Sprache, drei Tage Frist. Was übersiehst du dieses Mal — die Haftung, die Kündigungsfrist oder die Nutzungsrechte?",
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
            Jede dieser Situationen kostet dich vierstellig — oft mehr.
          </p>
        </div>
      </section>

      {/* 3. SOLUTION / DEMO */}
      <section className="border-t border-border/40 bg-card/30">
        <div className="container py-32 grid lg:grid-cols-5 gap-16 items-start">
          <div className="lg:col-span-3">
            <p className="font-sans uppercase tracking-[0.25em] text-[11px] text-primary mb-6">
              ◆ 02 / Die Lösung
            </p>
            <h2 className="font-serif text-4xl md:text-6xl tracking-tight mb-10 leading-[1.05]">
              PALLANX ist kein Chatbot.
              <br />
              Es ist dein <span className="italic text-primary">Strategiestab</span>.
            </h2>
            <div className="space-y-6 font-serif text-lg text-muted-foreground leading-relaxed max-w-xl">
              <p>
                Du beschreibst kurz deine Situation. PALLANX kombiniert Spieltheorie mit der
                Verhandlungs-Doktrin nach Voss („Never Split the Difference") — und gibt dir
                Analyse, Strategie und einen fertigen Entwurf, den du direkt verschicken kannst.
              </p>
              <p className="text-foreground">
                Kein stundenlanges Prompten. Kein 300-€-Coaching-Call. Kein „mal sehen, wie's läuft".
              </p>
            </div>

            <div className="mt-14 divide-y divide-border/40 border-y border-border/40 max-w-xl">
              {[
                {
                  n: "01",
                  t: "Höhere Honorare durchgesetzt.",
                  s: "Du bekommst das passende Framing, die richtigen Anker und die Antwort auf jeden Einwand.",
                },
                {
                  n: "02",
                  t: "Klauseln im Griff.",
                  s: "PALLANX liest Verträge, markiert kritische Stellen und schlägt Gegenformulierungen vor.",
                },
                {
                  n: "03",
                  t: "Fertige Mail in 5 Minuten.",
                  s: "Statt zwei Stunden Grübeln: ein durchdachter Entwurf, den du nur noch absendest.",
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
                  Fall #2089
                </span>
              </div>

              <div className="space-y-5 font-sans text-xs">
                {[
                  ["Situation", "Honorarerhöhung"],
                  ["Kunde", "Bestand, 2 Jahre"],
                  ["Empfohlener Anker", "+22 %"],
                  ["Plausibler Abschluss", "+18 %"],
                  ["Risiko Abwanderung", "Niedrig"],
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
                  Empfohlener Zug
                </p>
                <p className="font-serif italic text-lg text-primary">Hoch ankern. Pause halten.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. VERGLEICH */}
      <section className="border-t border-border/40">
        <div className="container py-32">
          <p className="font-sans uppercase tracking-[0.25em] text-[11px] text-primary mb-6">
            ◆ 03 / Vergleich
          </p>
          <h2 className="font-serif text-4xl md:text-6xl tracking-tight mb-20 max-w-3xl">
            Verhandlungs-Coach für 300 €/Std. — oder PALLANX für 49 €/Monat.
          </h2>

          <div className="grid md:grid-cols-2 gap-px bg-border/40 border border-border/40">
            {[
              {
                n: "I",
                t: "Klassischer Coach",
                s: "180–300 € pro Stunde. Termin in 2 Wochen frei. Du erzählst, er gibt Tipps. Schreiben musst du am Ende selbst — meistens nachts vor dem Termin.",
              },
              {
                n: "II",
                t: "PALLANX",
                s: "49 € im Monat (oder 29 € für einen einzelnen Fall). Sofort verfügbar. Analyse, Strategie und fertiger Mail-Entwurf in unter 5 Minuten — auf Deutsch.",
              },
            ].map((a) => (
              <div key={a.n} className="bg-background p-10 min-h-[260px] flex flex-col">
                <span className="font-serif italic text-primary text-2xl mb-8">{a.n}</span>
                <p className="font-serif text-2xl mb-4">{a.t}</p>
                <p className="text-base text-muted-foreground leading-relaxed">{a.s}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. USE CASES */}
      <section className="border-t border-border/40 bg-card/30">
        <div className="container py-32">
          <p className="font-sans uppercase tracking-[0.25em] text-[11px] text-primary mb-6">
            ◆ 04 / Typische Fälle
          </p>
          <h2 className="font-serif text-4xl md:text-6xl tracking-tight mb-20 max-w-3xl">
            Wofür Selbständige PALLANX nutzen.
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-border/40 border border-border/40">
            {[
              { t: "Honorarerhöhung beim Bestandskunden", s: "Wie heben Sie 15 % an, ohne den Kunden zu verlieren? PALLANX baut Anker, Framing und Antwort auf jeden Einwand." },
              { t: "Projektpreis verteidigen", s: "Kunde will 20 % runter. PALLANX zeigt, warum nicht — und wie du es so sagst, dass es niemand persönlich nimmt." },
              { t: "Vertrag prüfen", s: "Lade den Vertrag hoch. PALLANX markiert kritische Klauseln und liefert Gegenvorschläge." },
              { t: "Kunde will Rabatt", s: "Standardantworten reichen nicht mehr. Du bekommst eine Reaktion, die den Wert betont — nicht den Preis." },
              { t: "Gehalts- oder Konditionsgespräch", s: "Auch als Angestellter mit Nebengewerbe: BATNA, Skripte, Einwand-Behandlung." },
              { t: "Kündigung / Konflikt mit Auftraggeber", s: "Sachlich, juristisch sauber, ohne Eskalation — und doch durchsetzungsfähig." },
            ].map((u) => (
              <div key={u.t} className="bg-background p-8 min-h-[200px] flex flex-col">
                <p className="font-serif text-lg mb-3 text-foreground">{u.t}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{u.s}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. FINAL CTA */}
      <section className="border-y border-primary/60">
        <div className="container py-40 max-w-3xl text-center">
          <p className="font-sans uppercase tracking-[0.3em] text-[11px] text-primary mb-8">
            ◆ Jetzt starten
          </p>
          <h2 className="font-serif text-5xl md:text-7xl tracking-tight leading-[1.05] mb-10">
            Starte deinen ersten Fall.
            <br />
            <span className="italic text-primary">Kostenlos.</span> Ohne Kreditkarte.
          </h2>
          <div className="space-y-6 font-serif text-lg md:text-xl text-muted-foreground leading-relaxed mb-14 max-w-2xl mx-auto">
            <p>
              Beschreibe in 2 Minuten deine Situation — Honorarerhöhung, schwieriger Kunde,
              Vertragsklausel. Du bekommst Analyse, Strategie und fertigen Entwurf.
            </p>
            <p className="text-foreground">
              1 Fall sofort, danach 1 weiterer pro Monat dauerhaft kostenlos.
              Brauchst du mehr? Pro ab 49 € oder ein Single-Case-Pass für 29 €.
            </p>
          </div>

          <div className="flex flex-col items-center gap-6">
            <Link to="/register">
              <Button variant="gold" size="xl">
                Jetzt kostenlos testen →
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

      {/* Footer */}
      </main>
      <footer className="container py-10 flex flex-col md:flex-row gap-4 justify-between items-center text-[10px] font-sans uppercase tracking-[0.25em] text-muted-foreground">
        <Logo />
        <span>PALLANX // Dein KI-Verhandlungsstratege</span>
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
