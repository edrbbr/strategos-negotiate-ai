import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Shield, ArrowRight, CheckCircle2, Scale, FileText, Smartphone, Battery, Droplets, Cpu, ShieldCheck, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Seo } from "@/components/Seo";

const CANONICAL_PATH = "/retail/elektronikhandel";
const CTA_HREF = "/retail/register?utm_source=lp&utm_medium=organic&utm_campaign=elektronikhandel";

const faqs: { q: string; a: string }[] = [
  {
    q: "Was ist der Unterschied zwischen Gewährleistung und Garantie?",
    a: "Die Gewährleistung ist eine gesetzliche Pflicht des Händlers (§§ 437 ff. BGB) und beträgt gegenüber Verbraucherinnen und Verbrauchern in der Regel 24 Monate. Die Garantie ist eine freiwillige Zusage, meist des Herstellers, mit eigenen — oft engeren — Bedingungen. Wichtig: Eine abgelaufene Garantie sagt nichts darüber aus, ob die gesetzliche Gewährleistung noch greift. Korrekt ist, jeden Fall zuerst gegen die Gewährleistung zu prüfen und erst dann auf die Herstellergarantie zu verweisen.",
  },
  {
    q: "Wann greift die Beweislastumkehr nach § 477 BGB?",
    a: "Bei Verbraucherinnen und Verbrauchern wird in den ersten 12 Monaten nach Übergabe gesetzlich vermutet, dass ein auftretender Mangel bereits bei Lieferung vorlag (§ 477 BGB). In diesem Zeitraum muss der Händler den Gegenbeweis führen — nicht die Kundschaft. Praktisch heißt das: in den ersten 12 Monaten zuerst prüfen, dokumentieren und Nacherfüllung anbieten, statt die Ursache zu bestreiten.",
  },
  {
    q: "Hat der Händler oder der Hersteller zu haften?",
    a: "Im Gewährleistungsfall ist immer der Händler erste Anlaufstelle und in der Pflicht — unabhängig davon, was der Hersteller anbietet. Die Kundschaft braucht den Hersteller nicht selbst zu kontaktieren. Der Regress beim Hersteller (§ 445a BGB) erfolgt intern. Faire Linie: Den Fall sofort übernehmen, den Hersteller-Regress separat führen und die Kundschaft nicht zwischen zwei Stellen pendeln lassen.",
  },
  {
    q: "Was gilt bei einem vermuteten Wasserschaden?",
    a: "Ein Flüssigkeitskontakt-Indikator (LCI) allein ist kein automatischer Ausschlussgrund. Der Händler muss nachweisen, dass der Schaden auf unsachgemäßer Nutzung beruht und kausal für den Defekt ist — innerhalb der ersten 12 Monate sogar gegen die gesetzliche Vermutung des § 477 BGB. Korrekt ist eine technische Prüfung mit dokumentiertem Befund (Foto, Messprotokoll), bevor eine Reparatur kostenpflichtig angeboten oder die Gewährleistung verneint wird.",
  },
  {
    q: "Welche Fristen gelten für die Nacherfüllung?",
    a: "Das Gesetz fordert eine ‚angemessene Frist‘ (§ 323 BGB). In der Elektronik-Praxis sind 7–14 Tage für die Rückmeldung und 2–4 Wochen für die tatsächliche Reparatur oder Ersatzlieferung üblich und gerichtsfest. In Pallanx tragen Sie die mit der Kundschaft vereinbarte Frist im Fall ein; Pallanx hält Datum und Wortlaut in der Versionshistorie des Falls fest.",
  },
  {
    q: "Wann ist Ersatz statt Reparatur die richtige Antwort?",
    a: "Wenn die Reparatur unverhältnismäßig teuer ist, der zweite Nachbesserungsversuch fehlgeschlagen ist (§ 440 BGB) oder die Reparaturdauer der Kundschaft nicht zumutbar wäre. Bei hochwertigen oder zeitkritischen Geräten — Smartphones, Laptops — ist eine schnelle Ersatzlieferung oft die wirtschaftlich klügere und kundenfreundlichere Lösung als ein wochenlanger Versand. Pallanx erzeugt zu jedem Fall drei abgestufte Optionen und leitet kulante Lösungen, die Ihr Limit übersteigen, automatisch zur Freigabe weiter.",
  },
];

const examples = [
  {
    icon: Monitor,
    title: "Display-Totpixel nach 3 Monaten",
    situation: "Drei Monate nach dem Kauf eines Monitors meldet die Kundin zwei dauerhaft schwarze Pixel im sichtbaren Bildbereich.",
    law: "Sachmangel nach § 434 BGB; innerhalb der ersten 12 Monate greift die Beweislastumkehr nach § 477 BGB. Pixelfehler sind nicht generell hinzunehmen — relevant sind Anzahl, Lage und die Norm ISO 9241-307 in Verbindung mit Ihrer eigenen Beschaffenheitsvereinbarung.",
    fair: "Prüfen Sie das Gerät anhand der Klassifizierung, die Sie verkauft haben (z. B. Pixelfehlerklasse II). Liegt der Fehler oberhalb der zugesicherten Toleranz, bieten Sie Reparatur oder Austausch nach Wahl der Kundin an (§ 439 BGB). Liegt er innerhalb der Toleranz, erklären Sie das verständlich mit Verweis auf die Produktbeschreibung — und bieten bei sichtbaren Pixeln im zentralen Bildbereich gegebenenfalls eine kulante Lösung an.",
    workflow: "Ihr Team erfasst den Fall in einer strukturierten Maske (Modell, Kaufdatum, Pixelanzahl, Lage). Pallanx zieht die hinterlegte Pixelfehlerklasse aus Ihrer Wissensbasis (RAG) heran und erzeugt eine Kurzanalyse plus drei abgestufte Optionen — jeweils mit vorformuliertem Antworttext und sachlicher Begründung.",
  },
  {
    icon: Battery,
    title: "Akku-Schwäche nach 8 Monaten",
    situation: "Ein Smartphone-Kunde meldet acht Monate nach Kauf eine deutlich reduzierte Akku-Laufzeit (laut Geräteinfo 78 % Kapazität).",
    law: "Sachmangel nach § 434 BGB ist denkbar, wenn die Kapazität deutlich unter dem branchenüblichen Erwartungswert für diese Nutzungsdauer liegt. Da die Reklamation in den ersten 12 Monaten erfolgt, greift § 477 BGB — die Vermutung steht zugunsten des Kunden, der Händler muss den Gegenbeweis führen.",
    fair: "Lassen Sie das Gerät prüfen und bieten Sie aktiv Reparatur (Akkutausch) oder Ersatz an. Verzichten Sie auf reflexhafte Hinweise auf ‚natürlichen Verschleiß‘, solange die Beweislast bei Ihnen liegt. Stellen Sie für die Reparaturdauer nach Möglichkeit ein Leihgerät zur Verfügung — das vermeidet Eskalationen, gerade bei Geschäftskundinnen.",
    workflow: "Im Fall hinterlegen Sie Kaufdatum und gemessene Kapazität. Die KI-Analyse berücksichtigt § 477 BGB ausdrücklich und schlägt Akkutausch als konservative Standardoption sowie Geräteersatz als kulante Option vor — jede mit Antworttext und einer Empfehlung, wann eine Eskalation an Manager/Leitung sinnvoll ist.",
  },
  {
    icon: Droplets,
    title: "Streit um Wasserschaden",
    situation: "Eine Kundin reklamiert ein Tablet, das nach 5 Monaten nicht mehr startet. Der LCI im Geräteinneren ist ausgelöst — die Kundin bestreitet jeden Wasserkontakt.",
    law: "Beweislastumkehr nach § 477 BGB gilt weiter. Ein ausgelöster LCI allein reicht in der Rechtsprechung regelmäßig nicht aus, um den Gegenbeweis zu führen. Erforderlich ist eine technische Prüfung mit dokumentiertem Befund, der Kausalität (Wasser → konkreter Defekt) belegt.",
    fair: "Bieten Sie eine kostenfreie Diagnose an, dokumentieren Sie den Befund mit Foto und Prüfprotokoll. Bestätigt sich ein Wasserschaden eindeutig, erklären Sie das transparent und bieten ein faires Kostenangebot für die Reparatur. Bleibt es zweifelhaft, übernehmen Sie den Fall innerhalb der § 477-Frist — die Beweislast liegt bei Ihnen, nicht bei der Kundin.",
    workflow: "Im Fall hinterlegen Sie Kaufdatum, Befund und vorhandene Belege. Die KI-Analyse weist auf die Beweislastumkehr und die Anforderungen an einen tragfähigen Gegenbeweis hin und schlägt eine konservative Option (Diagnose vor Entscheidung) sowie eine kulante Option (Reparatur trotz LCI auf Kulanz) vor — mit Rollen- und Limit-Freigabe.",
  },
  {
    icon: Cpu,
    title: "Software-Defekt nach Update",
    situation: "Nach einem Hersteller-Update startet ein Notebook nicht mehr stabil. Der Kunde verlangt Rückabwicklung.",
    law: "Auch Software-Mängel können einen Sachmangel begründen — insbesondere seit Inkrafttreten der §§ 327 ff. BGB für digitale Produkte. Liegt der Mangel im Verantwortungsbereich des Geräts (z. B. inkompatible Firmware), greifen Nacherfüllung nach § 439 BGB und ggf. § 327i BGB. Rückabwicklung kommt erst nach fehlgeschlagener Nacherfüllung in Betracht.",
    fair: "Bieten Sie zuerst eine geführte Wiederherstellung an (Recovery, Treiber-Update, ggf. Werksrücksetzung) — möglichst per Fernwartung oder in der Filiale, kostenfrei. Bleibt das Gerät instabil, ist Reparatur oder Austausch korrekt. Verweigern Sie nicht reflexhaft mit Hinweis auf den Hersteller — die Gewährleistung verpflichtet Sie als Händler.",
    workflow: "Sie erfassen den Fall mit Modell, Fehlerbild und Update-Stand. Die KI-Analyse ordnet den Fall §§ 434/439, ggf. § 327i BGB zu und erzeugt eine konservative Option (geführte Wiederherstellung), eine mittlere (Reparatur/Werkstattprüfung) und eine kulante (Austausch) — jeweils mit Antworttext und sauberer Begründung.",
  },
  {
    icon: Smartphone,
    title: "Garantie abgelaufen, Gewährleistung greift noch",
    situation: "14 Monate nach Kauf fällt der Ladeport eines Smartphones aus. Der Hersteller verweist auf die abgelaufene 12-Monats-Garantie und lehnt ab.",
    law: "Die Herstellergarantie ist abgelaufen, die gesetzliche Gewährleistung des Händlers (24 Monate, §§ 437 ff. BGB) läuft jedoch weiter. Die Beweislastumkehr nach § 477 BGB ist nach 12 Monaten beendet — die Kundschaft muss nun darlegen, dass der Mangel bei Übergabe angelegt war.",
    fair: "Lassen Sie das Gerät prüfen. Liegt ein Material- oder Konstruktionsfehler nahe (z. B. typisches Bauteil-Schwächebild), übernehmen Sie die Nacherfüllung und führen den Regress beim Hersteller (§ 445a BGB) separat. Verweisen Sie die Kundschaft nicht zurück an den Hersteller — dafür sind Sie als Händler zuständig.",
    workflow: "Im Fall hinterlegen Sie Kaufdatum und Befund. Die KI-Analyse trennt sauber zwischen Garantie und Gewährleistung, verweist auf § 445a BGB für den internen Regress und erzeugt drei abgestufte Optionen — von kostenpflichtiger Reparatur (bei klar kundenseitiger Ursache) bis zur kulanten Übernahme im Gewährleistungsrahmen.",
  },
];

export default function Elektronikhandel() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Start", item: "https://pallanx.com/" },
      { "@type": "ListItem", position: 2, name: "Retail Shield", item: "https://pallanx.com/retail" },
      { "@type": "ListItem", position: 3, name: "Elektronikhandel", item: "https://pallanx.com/retail/elektronikhandel" },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Reklamationen im Elektronikhandel rechtssicher & fair bearbeiten | Pallanx"
        description="Elektronik-Reklamationen nach §§ 437, 439, 477 BGB korrekt führen: Pixelfehler, Akku, Wasserschaden, Garantie vs. Gewährleistung. Pallanx unterstützt strukturiert."
        path={CANONICAL_PATH}
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</script>
      </Helmet>

      {/* HEADER */}
      <header className="border-b bg-card/50 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/retail" className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <span className="font-semibold tracking-tight">Pallanx Retail Shield</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/retail/login"><Button variant="ghost" size="sm">Anmelden</Button></Link>
            <Link to={CTA_HREF}><Button size="sm">Demo anfragen</Button></Link>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="max-w-6xl mx-auto px-6 pt-6 text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-2">
          <li><Link to="/" className="hover:text-foreground">Start</Link></li>
          <li aria-hidden>›</li>
          <li><Link to="/retail" className="hover:text-foreground">Retail Shield</Link></li>
          <li aria-hidden>›</li>
          <li className="text-foreground">Elektronikhandel</li>
        </ol>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-28">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-card text-xs font-medium mb-6">
            <Smartphone className="w-3.5 h-3.5 text-primary" /> Branche · Elektronikhandel DE
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight max-w-3xl">
            Reklamationen im Elektronikhandel — <span className="text-primary">rechtssicher und fair</span> in Minuten bearbeitet.
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl">
            Pixelfehler, Akku-Schwäche, Wasserschaden, Software-Defekte, Garantie vs. Gewährleistung: Pallanx führt Ihr Team Schritt für Schritt durch jeden Elektronik-Reklamationsfall — gesetzeskonform nach BGB und fair gegenüber Ihrer Kundschaft.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={CTA_HREF}><Button size="lg" className="gap-2">Kostenlose Demo anfragen <ArrowRight className="w-4 h-4" /></Button></Link>
            <a href="#funktioniert"><Button size="lg" variant="outline">Wie es funktioniert</Button></a>
          </div>
        </div>
      </section>

      {/* PROBLEMKONTEXT */}
      <section className="border-y bg-muted/30">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Warum Elektronik-Reklamationen besonders sind</h2>
          <div className="mt-6 grid md:grid-cols-2 gap-8 text-muted-foreground leading-relaxed">
            <p>
              Elektronikgeräte sind technisch komplex, oft hochpreisig und tragen häufig Herstellergarantien, deren Bedingungen mit der gesetzlichen Gewährleistung verwechselt werden. Hinzu kommen Sonderfälle wie Pixelfehlerklassen, Akku-Verschleiß, Software-Defekte und Wasserschäden — alles Bereiche, in denen ein vorschneller Verweis auf den Hersteller oder ein reflexhaftes ‚Verschleißteil‘ rechtlich schnell unhaltbar wird.
            </p>
            <p>
              Wer Elektronik-Reklamationen sauber führt, trennt zwischen Gewährleistung (Pflicht des Händlers) und Garantie (freiwillige Zusage des Herstellers), berücksichtigt § 477 BGB in den ersten 12 Monaten und übernimmt aktiv die Verantwortung gegenüber der Kundschaft — den Regress beim Hersteller führt der Händler intern. Genau dafür ist Pallanx gebaut: Struktur und Rechtssicherheit, nicht Abwehr.
            </p>
          </div>
        </div>
      </section>

      {/* RECHTSRAHMEN */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex items-center gap-3 mb-6">
          <Scale className="w-6 h-6 text-primary" />
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Rechtsrahmen kompakt</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Gewährleistung & Nacherfüllung</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>§ 434 BGB</strong> definiert den Sachmangel — auch Abweichungen von zugesicherter Beschaffenheit (z. B. Pixelfehlerklasse).</p>
              <p><strong>§ 437 BGB</strong> gewährt vier Rechte: Nacherfüllung, Rücktritt, Minderung, Schadensersatz.</p>
              <p><strong>§ 439 BGB</strong>: Wahlrecht zwischen Reparatur und Ersatzlieferung liegt beim Käufer.</p>
              <p><strong>§§ 327 ff. BGB</strong>: Eigene Regeln für digitale Produkte und Geräte mit digitalen Elementen, inkl. Aktualisierungspflicht.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Beweislast, Garantie & Regress</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>§ 477 BGB</strong>: 12 Monate Beweislastumkehr zugunsten der Verbraucherin oder des Verbrauchers.</p>
              <p><strong>§ 443 BGB</strong>: Eine Garantie ist eine zusätzliche, freiwillige Zusage — sie ersetzt die gesetzliche Gewährleistung nicht.</p>
              <p><strong>§ 445a BGB</strong>: Lieferantenregress des Händlers gegenüber dem Hersteller — gehört intern, nicht zur Kundenkommunikation.</p>
              <p><strong>§ 323 BGB</strong>: Rücktritt setzt eine angemessene Frist zur Nacherfüllung voraus.</p>
            </CardContent>
          </Card>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Hinweis: Diese Übersicht dient der Orientierung und ersetzt keine Rechtsberatung im Einzelfall.
        </p>
      </section>

      {/* BEISPIELE */}
      <section id="beispiele" className="border-y bg-muted/30">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">5 typische Elektronik-Reklamationen — so bearbeiten Sie sie korrekt und fair</h2>
          <p className="mt-3 text-muted-foreground max-w-3xl">
            Jeder Fall mit Sachverhalt, rechtlicher Einordnung, fairer Bearbeitung und konkretem Pallanx-Workflow.
          </p>
          <div className="mt-10 grid md:grid-cols-2 gap-6">
            {examples.map((ex, i) => {
              const Icon = ex.icon;
              return (
                <Card key={i} className="h-full">
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-md bg-primary/10 text-primary"><Icon className="w-5 h-5" /></div>
                      <CardTitle className="text-lg leading-snug">{ex.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm space-y-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sachverhalt</div>
                      <p className="text-foreground/90">{ex.situation}</p>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rechtliche Einordnung</div>
                      <p className="text-foreground/90">{ex.law}</p>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Faire & korrekte Bearbeitung</div>
                      <p className="text-foreground/90">{ex.fair}</p>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="text-xs font-semibold uppercase tracking-wide text-primary">Mit Pallanx</div>
                      <p className="text-foreground/90">{ex.workflow}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* VALUE / FEATURES */}
      <section id="funktioniert" className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Was Pallanx im Elektronikhandel konkret leistet</h2>
        <div className="mt-8 grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader><div className="flex items-center gap-2"><FileText className="w-5 h-5 text-primary" /><CardTitle className="text-base">Vorformulierte Antworten</CardTitle></div></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Zu jedem Fall erzeugt die KI je Lösungsoption einen vorformulierten Antworttext — abgestimmt auf §§ 437/439/477 BGB, Ihre eigenen Richtlinien (z. B. Pixelfehlerklasse, Akku-Toleranzen) und das konkrete Gerät. Mitarbeitende übernehmen den Text oder passen ihn an.
            </CardContent>
          </Card>
          <Card>
            <CardHeader><div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-primary" /><CardTitle className="text-base">Rollen- & Limit-basierte Freigaben</CardTitle></div></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Sie definieren Kulanz- und Erstattungsgrenzen je Rolle (Service, Filialleitung, Zentrale). Überschreitet eine Option das Limit, leitet Pallanx automatisch eine Freigabe-Anfrage an die zuständige Rolle ein — inklusive KI-Begründung und Fallkontext.
            </CardContent>
          </Card>
          <Card>
            <CardHeader><div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-primary" /><CardTitle className="text-base">Drei abgestufte Optionen pro Fall</CardTitle></div></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Statt pauschaler Ablehnung erhalten Sie pro Fall drei Vorschläge — konservativ, mittel, kulant — mit Begründung, Kundentext und konkretem Aufwand. Jede Entscheidung wird mit Versionshistorie pro Fall protokolliert.
            </CardContent>
          </Card>
        </div>
        <div className="mt-8 rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          <strong className="text-foreground">Praxis-Effekt:</strong> Mit strukturierter Trennung von Gewährleistung, Garantie und Herstellerregress reduzieren Elektronikhändler unnötige Eskalationen, verkürzen die Bearbeitungszeit pro Fall und behalten gleichzeitig Kontrolle über Kulanzkosten — ohne die Servicequalität zu schwächen.
        </div>
      </section>

      {/* INTERNE VERLINKUNG */}
      <section className="border-t bg-muted/30">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <h2 className="text-xl font-semibold tracking-tight">Weiter lesen</h2>
          <p className="mt-3 text-muted-foreground max-w-3xl">
            Pallanx ist branchenübergreifend aufgebaut. Auch relevant: der Leitfaden für den{" "}
            <Link to="/retail/moebelhandel" className="underline">Möbelhandel</Link> (Transportschäden, Aufbau, Maßanfertigungen) und für die{" "}
            <Link to="/retail/kfz-werkstatt" className="underline">Kfz-Werkstatt</Link> (Werkvertrag, Kostenvoranschlag, Ersatzteile). Eine Übersicht aller Funktionen finden Sie auf der{" "}
            <Link to="/retail" className="underline">Retail-Shield-Startseite</Link>, Preise auf der{" "}
            <Link to="/preise" className="underline">Preisseite</Link>.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Häufige Fragen aus dem Elektronikhandel</h2>
        <Accordion type="single" collapsible className="mt-6">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA FOOTER */}
      <section className="border-t">
        <div className="max-w-6xl mx-auto px-6 py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Bereit, Elektronik-Reklamationen sauber zu führen?</h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            In einer kostenlosen Demo zeigen wir Ihnen anhand Ihrer realen Fälle, wie Pallanx Ihr Team in Minuten zu rechtssicheren und fairen Entscheidungen führt.
          </p>
          <div className="mt-6">
            <Link to={CTA_HREF}><Button size="lg" className="gap-2">Kostenlose Demo anfragen <ArrowRight className="w-4 h-4" /></Button></Link>
          </div>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Pallanx · <Link to="/datenschutz" className="underline">Datenschutz</Link>
      </footer>
    </div>
  );
}