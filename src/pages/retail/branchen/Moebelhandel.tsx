import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Shield, ArrowRight, CheckCircle2, Scale, Clock, FileText, Truck, Wrench, Sofa } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Seo } from "@/components/Seo";

const CANONICAL_PATH = "/retail/moebelhandel";
const CTA_HREF = "/retail/register?utm_source=lp&utm_medium=organic&utm_campaign=moebelhandel";

const faqs: { q: string; a: string }[] = [
  {
    q: "Was muss ich bei einem Transportschaden an Möbeln tun?",
    a: "Dokumentieren Sie den Schaden gemeinsam mit der Kundin oder dem Kunden mit Fotos und Lieferschein-Vermerk. Klären Sie intern, ob die Spedition (Transportschaden gemäß HGB) oder Sie als Händler (Sachmangel gemäß § 434 BGB) einstandspflichtig sind, und kommunizieren Sie das transparent. Bieten Sie aktiv eine Nacherfüllung an — Reparatur oder Ersatzlieferung gemäß § 439 BGB. Das Wahlrecht liegt beim Käufer; eine faire Lösung gelingt fast immer schneller als eine streitige Klärung.",
  },
  {
    q: "Wer hat das Wahlrecht bei der Nacherfüllung — Kunde oder Händler?",
    a: "Beim Verbrauchsgüterkauf (B2C) liegt das Wahlrecht zwischen Reparatur und Ersatzlieferung grundsätzlich beim Käufer (§ 439 Abs. 1 BGB). Sie als Händler können eine Variante nur verweigern, wenn sie objektiv unmöglich oder nur mit unverhältnismäßigen Kosten verbunden ist (§ 439 Abs. 4 BGB). Im Möbelhandel ist die Ersatzlieferung bei Maßanfertigungen häufig unverhältnismäßig — dann ist eine sorgfältig dokumentierte Reparatur die korrekte und faire Antwort.",
  },
  {
    q: "Welche Fristen gelten für die Nacherfüllung?",
    a: "Das Gesetz nennt keine starre Frist, verlangt aber eine ‚angemessene Frist‘ (§ 323 BGB). In der Möbelhandels-Praxis sind 14 Tage für die Rückmeldung und 4–6 Wochen für die tatsächliche Nacherfüllung üblich und gerichtsfest. Pallanx hinterlegt branchenübliche Fristen pro Mangelart und erinnert Sie automatisch, bevor Sie in Verzug geraten.",
  },
  {
    q: "Wann greift die Beweislastumkehr bei Möbeln?",
    a: "Bei Verbraucherinnen und Verbrauchern (B2C) wird in den ersten zwölf Monaten nach Übergabe gesetzlich vermutet, dass ein auftretender Mangel bereits bei Lieferung vorlag (§ 477 BGB). In diesem Zeitraum müssen Sie als Händler beweisen, dass die Sache mangelfrei war oder der Mangel durch unsachgemäße Nutzung entstanden ist. In der Praxis bedeutet das: prüfen, dokumentieren, Nacherfüllung anbieten — nicht zuerst diskutieren.",
  },
  {
    q: "Wie gehe ich mit Reklamationen am Aufbauservice um?",
    a: "Der Möbelaufbau durch Sie oder von Ihnen beauftragte Monteure ist ein Werkvertrag (§§ 631 ff. BGB). Bei einem Aufbaufehler hat die Kundin oder der Kunde Anspruch auf kostenfreie Nachbesserung (§ 635 BGB). Übernehmen Sie aktiv die Verantwortung — auch dann, wenn der Monteur ein Subunternehmer war. Regress nehmen Sie intern, nicht über die Kundin oder den Kunden.",
  },
  {
    q: "Wann ist eine Rücknahme statt Reparatur fair?",
    a: "Wenn zwei Nachbesserungsversuche fehlschlagen, ist die Nacherfüllung gemäß § 440 BGB regelmäßig als fehlgeschlagen anzusehen — dann hat die Kundschaft Anspruch auf Rücktritt oder Minderung. Auch bei massiven optischen Mängeln, die für die Käuferin oder den Käufer unzumutbar sind, ist eine kulante Rücknahme oft die fairere und wirtschaftlich klügere Lösung als ein Rechtsstreit. Pallanx schlägt auf Basis Ihrer Richtlinien automatisch den Eskalationsweg vor.",
  },
];

const examples = [
  {
    icon: Truck,
    title: "Transportschaden Sofa — Kratzer am Bezug",
    situation: "Ein Polstersofa kommt mit einem 6 cm langen Kratzer am Sitzbezug an. Die Kundin reklamiert innerhalb von zwei Tagen mit Fotos.",
    law: "Es liegt ein Sachmangel im Sinne von § 434 BGB vor. Die Kundin hat Anspruch auf Nacherfüllung nach § 439 BGB und das Wahlrecht zwischen Reparatur und Ersatzlieferung.",
    fair: "Bieten Sie beide Optionen aktiv an: kostenfreie Reparatur durch einen Polsterer vor Ort oder Austausch des Bezugs ab Werk. Lassen Sie die Kundin wählen, nennen Sie realistische Termine (z. B. 3 Wochen) und übernehmen Sie alle Kosten — auch der Spedition.",
    workflow: "Pallanx legt automatisch den Vorgang an, hinterlegt die 14-Tage-Frist zur Rückmeldung, erzeugt rechtssichere Antwortvorlagen und dokumentiert die Wahl der Kundin revisionssicher.",
  },
  {
    icon: Clock,
    title: "Quietschende Federung im Boxspringbett nach 8 Monaten",
    situation: "Ein Kunde meldet acht Monate nach Lieferung deutlich hörbare Quietschgeräusche der Bettfederung.",
    law: "Innerhalb der ersten zwölf Monate gilt die Beweislastumkehr nach § 477 BGB. Es wird vermutet, dass der Mangel bereits bei Übergabe vorlag — den Gegenbeweis müssen Sie führen, nicht der Kunde.",
    fair: "Vereinbaren Sie zeitnah eine Begutachtung beim Kunden zu Hause oder eine Abholung. Bieten Sie parallel ein Leihbett für die Dauer der Prüfung an. Reparieren oder tauschen Sie die Federung kostenfrei — diskutieren Sie nicht über die Ursache, solange die Vermutung gegen Sie spricht.",
    workflow: "Pallanx erkennt die § 477-Frist anhand des Kaufdatums, weist auf die Beweislast hin und schlägt eine kundenfreundliche Vor-Ort-Begutachtung als Standardweg vor.",
  },
  {
    icon: Sofa,
    title: "Schubladenfront eines Kleiderschranks gelöst nach 4 Wochen",
    situation: "Vier Wochen nach Lieferung löst sich die Front einer Schublade aufgrund einer mangelhaften Verklebung.",
    law: "Eindeutiger Sachmangel nach § 434 BGB. Die Beweislastumkehr greift, eine längere Prüfung ist unverhältnismäßig.",
    fair: "Versenden Sie unbürokratisch das Ersatzteil oder bieten Sie eine Monteur-Anfahrt an. Verzichten Sie auf Rücksendung der defekten Front, wenn die Bilder eindeutig sind — das spart Aufwand auf beiden Seiten und stärkt das Vertrauen in Ihre Marke.",
    workflow: "Pallanx erkennt anhand der Schadensbeschreibung den Standardfall ‚Verarbeitungsmangel‘ und schlägt Ersatzteilversand mit vorformulierter Kundenkommunikation vor.",
  },
  {
    icon: FileText,
    title: "Farbabweichung Massivholz-Tisch — natürliche Maserung",
    situation: "Eine Kundin reklamiert, dass die Tischplatte aus Wildeiche deutlich dunkler ist als auf dem Online-Foto.",
    law: "Bei Massivholz sind farbliche Schwankungen und Maserungsunterschiede produkttypisch und in der Regel kein Sachmangel — sofern die Produktbeschreibung darauf hinweist (vgl. § 434 Abs. 1 Satz 2 BGB, Beschaffenheitsvereinbarung).",
    fair: "Klären Sie sachlich auf, mit Verweis auf die Produktbeschreibung und vergleichbare Belegfotos. Wenn die Abweichung für die Kundin trotzdem unzumutbar ist, bieten Sie ein kulantes Widerrufsrecht über die gesetzliche Frist hinaus an. Das ist günstiger als ein verlorener Bewertungs- oder Verbraucherschutzfall.",
    workflow: "Pallanx hinterlegt für natürliche Materialien Standardbausteine zur sachlichen Aufklärung und schlägt nach Schwellwert (z. B. >150 € Tischpreis) automatisch die Kulanzoption zur Freigabe vor.",
  },
  {
    icon: Wrench,
    title: "Aufbaufehler durch beauftragten Monteur",
    situation: "Der von Ihnen beauftragte Monteur hat eine Esstischverschraubung über Kreuz nicht festgezogen — der Tisch wackelt.",
    law: "Der Aufbau ist ein Werkvertrag nach §§ 631 ff. BGB. Bei einem Werkmangel hat die Kundin Anspruch auf kostenfreie Nachbesserung (§ 635 BGB), unabhängig davon, ob ein Subunternehmer beauftragt war.",
    fair: "Übernehmen Sie die Verantwortung sofort und ohne Verweis auf den Monteur. Vereinbaren Sie binnen 7 Tagen einen Nachbesserungstermin. Regress beim Monteur regeln Sie intern — die Kundin sieht nur Sie als Ansprechpartner.",
    workflow: "Pallanx unterscheidet Kauf- und Werkvertragsfälle, verknüpft den Monteurseinsatz mit dem Vorgang und stellt für interne Regressansprüche eine separate Dokumentationsspur bereit.",
  },
];

export default function Moebelhandel() {
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
      { "@type": "ListItem", position: 3, name: "Möbelhandel", item: "https://pallanx.com/retail/moebelhandel" },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Reklamationen im Möbelhandel rechtssicher & fair bearbeiten | Pallanx"
        description="Möbel-Reklamationen nach BGB §§ 434, 437, 439 korrekt und fair abwickeln: Transportschäden, Aufbau, Beweislastumkehr. Mit Pallanx in Minuten dokumentiert."
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
          <li className="text-foreground">Möbelhandel</li>
        </ol>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-28">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-card text-xs font-medium mb-6">
            <Sofa className="w-3.5 h-3.5 text-primary" /> Branche · Möbelhandel DE
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight max-w-3xl">
            Reklamationen im Möbelhandel — <span className="text-primary">rechtssicher und fair</span> in Minuten bearbeitet.
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl">
            Transportschäden, Aufbaufehler, Beweislastumkehr, Maßanfertigungen: Pallanx führt Ihr Team Schritt für Schritt durch jeden Möbel-Reklamationsfall — gesetzeskonform nach BGB und fair gegenüber Ihrer Kundschaft. Sie sparen Bearbeitungszeit, vermeiden Eskalationen und schützen Ihre Marke.
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
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Warum Möbel-Reklamationen besonders sind</h2>
          <div className="mt-6 grid md:grid-cols-2 gap-8 text-muted-foreground leading-relaxed">
            <p>
              Möbel sind Sperrgut. Sie reisen per Spedition, werden vor Ort aufgebaut, häufig in mehreren Teilen geliefert und sind oft hochpreisig oder maßgefertigt. Jeder dieser Schritte schafft eigene Mangel- und Schadensquellen — vom Transportkratzer über lose Verschraubungen bis zur natürlichen Farbabweichung bei Massivholz. Laut EHI Retail Institute liegen die internen Bearbeitungskosten je Retoure im Möbelhandel branchenüblich zwischen 10 € und 20 €, bei Speditionsware deutlich höher.
            </p>
            <p>
              Hinzu kommt: Ob Spedition, Hersteller oder Sie als Händler haftet, entscheidet sich nicht nach Bauchgefühl, sondern nach BGB, HGB und den vertraglichen Vereinbarungen. Wer diese Trennlinien sauber zieht, kann Kundinnen und Kunden schneller und fairer helfen — und vermeidet, Kosten zu tragen, die woanders hingehören. Genau dafür ist Pallanx gebaut: Struktur und Rechtssicherheit, nicht Abwehr.
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
            <CardHeader><CardTitle className="text-base">Sachmangel & Käuferrechte</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>§ 434 BGB</strong> definiert, wann eine Sache mangelhaft ist — auch in Abweichung von der vereinbarten Beschaffenheit.</p>
              <p><strong>§ 437 BGB</strong> gibt der Käuferin oder dem Käufer vier Rechte: Nacherfüllung, Rücktritt, Minderung und Schadensersatz.</p>
              <p><strong>§ 439 BGB</strong> regelt die Nacherfüllung — Wahlrecht zwischen Reparatur und Ersatzlieferung liegt grundsätzlich beim Käufer.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Fristen, Beweislast & Werkvertrag</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>§ 323 BGB</strong> verlangt vor Rücktritt eine angemessene Frist zur Nacherfüllung — in der Möbelpraxis i. d. R. 4–6 Wochen.</p>
              <p><strong>§ 441 BGB</strong> erlaubt Minderung statt Rücktritt; nützlich bei optischen Mängeln, die die Funktion nicht beeinträchtigen.</p>
              <p><strong>§ 477 BGB</strong>: Beweislastumkehr in den ersten 12 Monaten zugunsten der Verbraucherin oder des Verbrauchers.</p>
              <p><strong>§§ 631 ff. BGB</strong> regeln den Aufbauservice als Werkvertrag — bei Mängeln gilt § 635 BGB (Nachbesserung).</p>
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
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">5 typische Möbel-Reklamationen — so bearbeiten Sie sie korrekt und fair</h2>
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
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Was Pallanx im Möbelhandel konkret leistet</h2>
        <div className="mt-8 grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader><div className="flex items-center gap-2"><FileText className="w-5 h-5 text-primary" /><CardTitle className="text-base">Rechtssichere Vorlagen</CardTitle></div></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Vorlagen für Nacherfüllung, Wahlrechtsangebot, Fristsetzung und Rücknahme — abgestimmt auf §§ 434/437/439 BGB und auf typische Möbel-Mangelarten. Sie wählen, Pallanx formuliert.
            </CardContent>
          </Card>
          <Card>
            <CardHeader><div className="flex items-center gap-2"><Clock className="w-5 h-5 text-primary" /><CardTitle className="text-base">Fristen-Tracker</CardTitle></div></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              14-Tage-Rückmeldefristen, 4–6-Wochen-Nacherfüllung, 12-Monats-Beweislastumkehr nach § 477 BGB: Pallanx erkennt den passenden Rahmen automatisch und erinnert Sie, bevor Sie in Verzug geraten.
            </CardContent>
          </Card>
          <Card>
            <CardHeader><div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-primary" /><CardTitle className="text-base">Faire Lösungen pro Fall</CardTitle></div></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Statt Standardabsagen schlägt Pallanx auf Basis Ihrer Richtlinien die korrekte und kundenfreundlichste Lösung vor — Reparatur, Ersatzteil, Kulanz-Rücknahme — und dokumentiert die Entscheidung revisionssicher.
            </CardContent>
          </Card>
        </div>
        <div className="mt-8 rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          <strong className="text-foreground">Branchen-Benchmark:</strong> Bei 10–20 € interner Bearbeitungskosten je Retoure (EHI) und einer typischen Reduktion von 20–30 % unnötiger Eskalationen sparen Möbelhändler mit strukturierter Reklamationsführung schnell vierstellige Beträge pro Monat — ohne Service-Qualität zu verlieren.
        </div>
      </section>

      {/* INTERNE VERLINKUNG */}
      <section className="border-t bg-muted/30">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <h2 className="text-xl font-semibold tracking-tight">Weiter lesen</h2>
          <p className="mt-3 text-muted-foreground max-w-3xl">
            Pallanx wird laufend um weitere Branchen erweitert. Aktuell in Vorbereitung: Reklamationsleitfäden für Kfz-Werkstätten (Werkvertragsrecht, Kulanz, ZDK-Richtlinien) und für den Elektronikhandel (Gewährleistung, § 477 BGB, Hersteller-Garantie). Eine Übersicht aller Funktionen finden Sie auf der{" "}
            <Link to="/retail" className="underline">Retail-Shield-Startseite</Link>, Preise und Pakete auf der{" "}
            <Link to="/preise" className="underline">Preisseite</Link>.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Häufige Fragen aus dem Möbelhandel</h2>
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
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Bereit, Möbel-Reklamationen sauber zu führen?</h2>
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