import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { PublicHeader } from "@/components/PublicHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, Target, MessageSquare, Car, FileWarning, Briefcase, Home, ShoppingBag, Diamond, Plus } from "lucide-react";
import { useState } from "react";
import { usePlans } from "@/hooks/usePlans";
import { PlansGrid } from "@/components/pricing/PlanCard";

const Landing = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    { q: "Ist die KI wirklich so gut wie ein menschlicher Coach?", a: "PALLANX basiert auf den Verhandlungstaktiken des FBI sowie spieltheoretischen Modellen der Harvard Business School. Die KI analysiert Muster, die selbst erfahrenen Profis entgehen." },
    { q: "Funktioniert das auch bei emotionalen Konflikten?", a: "Ja. Unser psychologisches Profiling-Modul ist speziell für hoch-emotionale Szenarien wie Mietstreit, Trennung oder Familienkonflikte trainiert." },
    { q: "Sind meine Daten sicher?", a: "Alle Dossier-Daten werden Ende-zu-Ende verschlüsselt. Im Elite-Plan werden Daten auf Wunsch nach 30 Tagen automatisch gelöscht." },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader active="home" />

      {/* Hero */}
      <section className="container py-24 md:py-32 text-center">
        <p className="font-mono-label text-primary mb-8">
          <span className="text-primary mr-2">◆</span>
          Souverän · Diskret · Präzise
        </p>
        <h1 className="font-serif text-6xl md:text-8xl leading-[1.05] tracking-tight mb-8">
          Verhandle wie ein Profi.<br />
          <span className="italic text-primary">Immer.</span>
        </h1>
        <p className="max-w-2xl mx-auto text-muted-foreground text-lg leading-relaxed mb-12">
          PALLANX ist die erste Intelligence-Plattform, die taktische Empathie und
          spieltheoretische Präzision für Ihre täglichen Verhandlungen automatisiert.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/register">
            <Button variant="gold" size="xl">▸ Kostenlos Starten</Button>
          </Link>
          <Button variant="ghost-label" size="xl">Demo Ansehen →</Button>
        </div>
      </section>

      {/* Process */}
      <section id="process" className="bg-card/40 py-24">
        <div className="container">
          <p className="text-center font-mono-label text-primary mb-4">◆ So es Funktioniert</p>
          <h2 className="text-center font-serif text-4xl md:text-5xl mb-16">Das PALLANX-Protokoll</h2>
          <div className="grid md:grid-cols-3 gap-px bg-border/40">
            {[
              { num: "01", title: "Situation", icon: Brain, iconClass: "text-secondary", text: "Beschreiben Sie die Rahmenbedingungen. Wer sind die Akteure? Was sind die harten Fakten? Unsere KI erkennt sofort die Machtdynamik." },
              { num: "02", title: "Strategie", icon: Target, iconClass: "text-primary", text: "Wir berechnen den optimalen Verhandlungspfad basierend auf FBI-Geiselnahme-Taktiken und Harvard-Prinzipien.", featured: true },
              { num: "03", title: "Text erhalten", icon: MessageSquare, iconClass: "text-tertiary", text: "Sie erhalten fertige Textbausteine oder Skripte, die psychologisch darauf optimiert sind, Widerstände abzubauen." },
            ].map((step) => (
              <div key={step.num} className={`bg-background p-10 ${step.featured ? "border-y border-primary/40" : ""}`}>
                <div className="flex items-start justify-between mb-8">
                  <span className="font-mono-label text-muted-foreground/60">{step.num}</span>
                  <step.icon className={`w-6 h-6 ${step.iconClass}`} strokeWidth={1.5} />
                </div>
                <h3 className="font-serif text-2xl mb-4">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section id="capabilities" className="container py-24">
        <p className="font-mono-label text-primary mb-4">◆ Use Cases</p>
        <h2 className="font-serif text-4xl md:text-5xl mb-16">Optimiert für jede Arena</h2>
        <div className="grid md:grid-cols-3 gap-px bg-border/40 border border-border/40">
          {[
            { icon: Car, title: "Automobil", text: "Leasing-Rückgabe oder Neuwagenkauf mit maximaler Hebelwirkung." },
            { icon: FileWarning, title: "Reklamation", text: "Kulanz erhalten, wo andere nur Standard-Antworten bekommen." },
            { icon: Briefcase, title: "Gehalt", text: "Die Kunst der Forderung ohne die Beziehung zu gefährden." },
            { icon: Home, title: "Miete", text: "Mietminderungen oder Staffelmieten professionell verhandeln." },
            { icon: ShoppingBag, title: "Kleinanzeigen", text: "Den 'letzten Preis' definieren, nicht akzeptieren." },
            { icon: Diamond, title: "Geschäft", text: "B2B-Konditionen und Lieferantenverträge auf Elite-Niveau." },
          ].map((uc) => (
            <div key={uc.title} className="bg-background p-8">
              <uc.icon className="w-5 h-5 text-primary mb-6" strokeWidth={1.5} />
              <p className="font-mono-label text-foreground mb-3">{uc.title}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{uc.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <PricingSection />


      {/* FAQ */}
      <section id="intelligence" className="container py-24 max-w-3xl">
        <p className="font-mono-label text-primary mb-4">◆ Briefing</p>
        <h2 className="font-serif text-4xl md:text-5xl mb-12">Intelligenz-Briefing</h2>
        <div className="divide-y divide-border/40 border-y border-border/40">
          {faqs.map((faq, i) => (
            <div key={i}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between py-6 text-left font-serif italic text-lg hover:text-primary transition-colors"
              >
                <span>{faq.q}</span>
                <Plus className={`w-4 h-4 text-primary shrink-0 transition-transform ${openFaq === i ? "rotate-45" : ""}`} />
              </button>
              {openFaq === i && (
                <p className="pb-6 text-sm text-muted-foreground leading-relaxed animate-fade-in">{faq.a}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container pb-24">
        <div className="bg-card border border-border/40 p-16 text-center scanline-bg">
          <h3 className="font-serif text-3xl md:text-4xl mb-8 max-w-xl mx-auto">
            Überlassen Sie den Ausgang nicht dem Zufall.
          </h3>
          <Link to="/register">
            <Button variant="gold" size="lg">Verhandlung Starten</Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="container py-10 border-t border-border/40 flex flex-col md:flex-row gap-4 justify-between items-center text-[10px] font-sans uppercase tracking-[0.2em] text-muted-foreground">
        <Logo />
        <div className="flex gap-8">
          <a href="#" className="hover:text-primary">Impressum</a>
          <a href="#" className="hover:text-primary">Datenschutz</a>
          <a href="#" className="hover:text-primary">AGB</a>
        </div>
        <span>© 2026 PALLANX Elite System</span>
      </footer>
    </div>
  );
};

const PricingSection = () => {
  const { data: plans, isLoading, isError, refetch } = usePlans();

  return (
    <section id="pricing" className="container py-24">
      <p className="text-center font-mono-label text-primary mb-4">◆ Preise</p>
      <h2 className="text-center font-serif text-4xl md:text-5xl mb-16">Wählen Sie Ihre Kapazität</h2>

      {isLoading && (
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {[0, 1, 2].map((i) => (
            <div key={i} className="p-8 border border-border/40 bg-card/40 space-y-6">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-12 w-32" />
              {[...Array(4)].map((_, j) => (
                <Skeleton key={j} className="h-4 w-full" />
              ))}
              <Skeleton className="h-11 w-full" />
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="text-center">
          <p className="font-serif italic text-muted-foreground mb-6">
            Preisinformationen vorübergehend nicht verfügbar. Bitte Seite neu laden.
          </p>
          <Button variant="gold-outline" onClick={() => refetch()}>Erneut versuchen</Button>
        </div>
      )}

      {!isLoading && !isError && plans && plans.length > 0 && (
        <PlansGrid plans={plans} />
      )}
    </section>
  );
};

export default Landing;
