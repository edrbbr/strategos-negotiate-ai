import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Shield, ArrowRight, CheckCircle2, Scale, FileText, Wrench, Car, ShieldCheck, Receipt, AlertTriangle, Cog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Seo } from "@/components/Seo";

const CANONICAL_PATH = "/retail/kfz-werkstatt";
const CTA_HREF = "/retail/register?utm_source=lp&utm_medium=organic&utm_campaign=kfz-werkstatt";

const faqs: { q: string; a: string }[] = [
  {
    q: "Welches Recht gilt für Reparaturaufträge in der Kfz-Werkstatt?",
    a: "Reparaturaufträge sind in der Regel Werkverträge nach §§ 631 ff. BGB. Die Werkstatt schuldet einen konkreten Erfolg — das mangelfreie Ergebnis der vereinbarten Arbeit. Tritt nach Übergabe ein Mangel auf, hat die Kundin oder der Kunde zunächst Anspruch auf Nacherfüllung in Form der Mängelbeseitigung (§ 635 BGB). Erst wenn diese fehlschlägt, kommen Rücktritt, Minderung oder Schadensersatz in Betracht.",
  },
  {
    q: "Wie weit darf ein Kostenvoranschlag überschritten werden?",
    a: "Ein nicht ausdrücklich als verbindlich vereinbarter Kostenvoranschlag darf nach § 650 BGB nur unwesentlich überschritten werden. Die Rechtsprechung zieht die Grenze regelmäßig bei rund 15–20 %. Zeichnet sich eine wesentliche Überschreitung ab, müssen Sie die Kundschaft unverzüglich informieren — sonst riskieren Sie, auf den Mehrkosten sitzen zu bleiben. Korrekt und fair ist: anrufen, Mehrkosten erläutern, Freigabe einholen und das Ergebnis schriftlich festhalten.",
  },
  {
    q: "Darf die Werkstatt Zusatzarbeiten ohne Rücksprache durchführen?",
    a: "Nein. Nicht beauftragte Arbeiten muss die Kundschaft grundsätzlich nicht bezahlen — unabhängig davon, wie sinnvoll sie waren. Ausnahmen gelten nur in engen Notfällen (Verkehrssicherheit) oder bei vorab erteilter genereller Freigabe. Korrekt ist: bei jedem zusätzlichen Befund kurz anrufen, Aufwand und Kosten nennen, Freigabe dokumentieren — und erst dann schrauben.",
  },
  {
    q: "Wann greift die Beweislastumkehr bei Werkstattleistungen?",
    a: "Bei Verbraucherinnen und Verbrauchern gilt im Kaufrecht § 477 BGB (12 Monate Beweislastumkehr). Im Werkvertragsrecht wird in der Rechtsprechung — insbesondere bei zeitnah auftretenden Mängeln nach der Reparatur — häufig ein Anscheinsbeweis zugunsten der Kundschaft angenommen. Praktisch bedeutet das: Tritt ein Mangel kurz nach Ihrer Arbeit am genau bearbeiteten Bereich auf, müssen Sie überzeugend darlegen, dass er nicht aus Ihrer Reparatur stammt. Faire Linie: zuerst nachsehen, dann diskutieren.",
  },
  {
    q: "Welche Gewährleistung gilt auf eingebaute Ersatzteile?",
    a: "Auf das verbaute Ersatzteil gilt grundsätzlich die zweijährige Gewährleistung nach Kaufrecht; auf die Einbauarbeit die werkvertragliche Mängelhaftung — beides regelmäßig 24 Monate gegenüber Verbraucherinnen und Verbrauchern. Eine Herstellergarantie kommt zusätzlich hinzu, ersetzt die gesetzliche Gewährleistung aber nicht. Wichtig: Wer im Rahmen der Gewährleistung tauscht, schuldet Teil und Einbau kostenfrei — auch dann, wenn der Hersteller das Teil nur kulant ersetzt.",
  },
  {
    q: "Wie dokumentiere ich Werkstattfälle so, dass sie im Streitfall halten?",
    a: "Sauber dokumentiert sind Auftragsumfang, Kostenvoranschlag, jede Freigabe von Mehrkosten oder Zusatzarbeiten, der Befund vor und nach der Reparatur sowie die Kundenkommunikation. In Pallanx erfassen Sie den Fall strukturiert; die getroffene Entscheidung, die Lösungsoption und der versendete Wortlaut werden mit Versionshistorie pro Fall festgehalten — als nachvollziehbarer Aktionsverlauf für interne Klärungen, Versicherung oder Schiedsstelle.",
  },
];

const examples = [
  {
    icon: Cog,
    title: "Motorgeräusch nach Inspektion",
    situation: "Drei Tage nach einer großen Inspektion meldet der Kunde ein neues metallisches Klackern aus dem Motorraum, das vorher nicht da war.",
    law: "Auf den Reparaturauftrag findet Werkvertragsrecht Anwendung (§§ 631 ff. BGB). Tritt der Mangel räumlich und zeitlich im Zusammenhang mit der ausgeführten Arbeit auf, spricht ein Anscheinsbeweis für einen Werkmangel; die Werkstatt schuldet zunächst Nachbesserung nach § 635 BGB.",
    fair: "Bieten Sie unverzüglich einen Diagnose-Termin an, möglichst kostenfrei, und stellen Sie für die Dauer der Prüfung nach Möglichkeit ein Ersatzfahrzeug. Liegt die Ursache im Bereich Ihrer Arbeit, beheben Sie den Mangel kostenfrei. Liegt sie nachweisbar woanders, erklären Sie das verständlich mit Bild- oder Messbelegen.",
    workflow: "Ihr Team erfasst den Fall in einer strukturierten Maske (Fahrzeug, Auftragsumfang, Kundenbeschwerde, eigene Erstdiagnose). Pallanx erzeugt eine Kurzanalyse mit Verweis auf §§ 631 ff./635 BGB und drei abgestufte Lösungsoptionen — von kostenfreier Diagnose bis zur vollständigen Nachbesserung — jeweils mit vorformuliertem Antworttext für die Kundschaft.",
  },
  {
    icon: Receipt,
    title: "Kostenvoranschlag deutlich überschritten",
    situation: "Ein KV über 850 € Bremsenservice wird am Ende mit 1.180 € abgerechnet, ohne dass zwischendurch jemand mit der Kundin gesprochen hat.",
    law: "Nach § 650 BGB ist ein unverbindlicher Kostenvoranschlag nur unwesentlich überschreitbar (Rechtsprechung: ca. 15–20 %). Bei wesentlicher Überschreitung besteht eine Anzeigepflicht; ohne rechtzeitigen Hinweis riskiert die Werkstatt, den Mehrbetrag nicht durchsetzen zu können — und die Kundschaft kann unter Umständen kündigen.",
    fair: "Übernehmen Sie das Versäumnis offen. Faire Linie: Rechnung auf den ursprünglichen KV plus die Mehrkosten begrenzen, die mit hoher Wahrscheinlichkeit auch nach Information freigegeben worden wären; den Rest als interne Lehre verbuchen. Das schützt die Kundenbeziehung und vermeidet einen Zivilstreit, den die Werkstatt voraussichtlich verliert.",
    workflow: "Sie tragen KV-Höhe, Endsumme und Zeitpunkt des Mehrkosten-Anrufs (oder dessen Fehlen) im Fall ein. Die KI-Analyse zieht § 650 BGB sowie die 15–20-%-Praxis ausdrücklich heran und schlägt drei abgestufte Optionen vor — von Reduzierung auf KV+20 % bis zur kulanten Begrenzung auf den ursprünglichen KV — jeweils mit Kundentext und Begründung.",
  },
  {
    icon: AlertTriangle,
    title: "Nicht beauftragte Zusatzarbeiten",
    situation: "Beim Ölwechsel werden ohne Rückfrage zwei Wischerblätter und ein Innenraumfilter getauscht und mit 78 € berechnet.",
    law: "Ohne ausdrückliche oder konkludente Beauftragung schuldet die Kundschaft die Zusatzarbeiten nicht (§ 631 BGB, Grundsatz der Vertragsfreiheit). Eine Bezahlpflicht aus Geschäftsführung ohne Auftrag (§§ 677 ff. BGB) kommt nur in engen Ausnahmefällen in Betracht und nicht bei reinen Verschleißteilen.",
    fair: "Stornieren Sie die nicht beauftragten Positionen ohne Diskussion. Bieten Sie der Kundschaft an, die Teile auf Wunsch nachträglich freizugeben oder kostenfrei wieder auszubauen. Halten Sie intern fest, an welchem Schritt die Freigabe-Routine gerissen ist, und schließen Sie die Lücke (z. B. Pflicht-Anruf bei jedem Zusatzposten über 0 €).",
    workflow: "Im Fall hinterlegen Sie die strittigen Positionen. Pallanx liefert eine Analyse zum fehlenden Auftrag, erzeugt eine konservative Option (Storno der Positionen) und eine kulante Option (Storno + Gutschein für nächsten Service) — jeweils mit vorformuliertem Antworttext. Die Freigabe einer kulanten Gutschrift kann über Rollen- und Limit-Regeln automatisch an die Werkstattleitung eskaliert werden.",
  },
  {
    icon: Wrench,
    title: "Mangel nach Reparatur — Bremse rubbelt weiter",
    situation: "Vier Wochen nach Tausch der Bremsscheiben und -beläge rubbelt die Bremse beim Anhalten weiterhin spürbar.",
    law: "Werkvertragsrecht: Die Kundschaft hat Anspruch auf Nachbesserung nach § 635 BGB. Erst nach erfolglosem zweiten Nachbesserungsversuch gilt die Nacherfüllung in der Regel als fehlgeschlagen (§ 636 BGB analog zu § 440 BGB) — dann kommen Rücktritt, Minderung oder Selbstvornahme mit Aufwendungsersatz in Betracht.",
    fair: "Bieten Sie aktiv einen kostenfreien Nachbesserungstermin samt Probefahrt und Bremsenprüfstand-Messung an. Lassen Sie die Kundschaft den Termin wählen. Ist die Ursache ein Materialfehler des Ersatzteils, übernehmen Sie Teil und Einbau und regeln den Regress mit dem Hersteller intern — nicht über die Kundin.",
    workflow: "Beim Erfassen des Falls hinterlegen Sie Reparaturdatum und Befund. Die KI-Analyse ordnet den Fall §§ 631 ff./635 BGB zu, weist auf den Anscheinsbeweis bei zeitnahen Mängeln im Reparaturbereich hin und schlägt eine geführte Nachbesserung als Standardoption vor. Jede Entscheidung wird mit Versionshistorie pro Fall protokolliert.",
  },
  {
    icon: Car,
    title: "Gewährleistung auf Ersatzteil — Lichtmaschine nach 14 Monaten",
    situation: "14 Monate nach Einbau einer neuen Lichtmaschine fällt diese aus. Der Kunde beruft sich auf Gewährleistung.",
    law: "Auf das verbaute Teil gilt — gegenüber einer Verbraucherin oder einem Verbraucher — die zweijährige Gewährleistung (§§ 437, 438 BGB). Die Beweislastumkehr nach § 477 BGB ist nach 12 Monaten abgelaufen, der Anspruch auf Nacherfüllung besteht jedoch weiter; ab dem 13. Monat trägt die Kundschaft die Beweislast für das Vorliegen eines Mangels bei Übergabe.",
    fair: "Lassen Sie das Teil prüfen — möglichst kostenfrei. Bestätigt sich ein Material- oder Konstruktionsfehler, tauschen Sie kostenfrei (Teil und Einbau) und nehmen ggf. Regress beim Hersteller. Ist der Fehler eindeutig auf äußere Ursachen (z. B. Wasserschaden, Spannungsspitze) zurückzuführen, erklären Sie das mit Belegfotos und bieten ein faires Kostenangebot für die Reparatur an.",
    workflow: "Sie hinterlegen Einbaudatum, Teil und Fehlerbild. Die KI-Analyse berücksichtigt § 477 BGB (Frist abgelaufen) und § 438 BGB (Gewährleistung läuft weiter) und schlägt sowohl eine konservative Option (kostenfreie Diagnose, danach Entscheidung) als auch eine kulante Option (Kulanztausch trotz erschwerter Beweislage) vor — jeweils mit Antworttext und Rollen-basierter Freigabe.",
  },
];

export default function KfzWerkstatt() {
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
      { "@type": "ListItem", position: 3, name: "Kfz-Werkstatt", item: "https://pallanx.com/retail/kfz-werkstatt" },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Reklamationen in der Kfz-Werkstatt rechtssicher & fair bearbeiten | Pallanx"
        description="Werkstatt-Reklamationen nach §§ 631 ff., 635, 650 BGB korrekt führen: Kostenvoranschlag, Zusatzarbeiten, Nachbesserung, Gewährleistung. Pallanx unterstützt strukturiert."
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
          <li className="text-foreground">Kfz-Werkstatt</li>
        </ol>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-28">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-card text-xs font-medium mb-6">
            <Car className="w-3.5 h-3.5 text-primary" /> Branche · Kfz-Werkstatt DE
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight max-w-3xl">
            Werkstatt-Reklamationen — <span className="text-primary">rechtssicher und fair</span> in Minuten bearbeitet.
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl">
            Kostenvoranschlags-Überschreitungen, nicht beauftragte Zusatzarbeiten, Mängel nach Reparatur, Gewährleistung auf Ersatzteile: Pallanx führt Ihr Team Schritt für Schritt durch jeden Werkstattfall — gesetzeskonform nach BGB und fair gegenüber Ihrer Kundschaft.
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
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Warum Werkstatt-Reklamationen besonders sind</h2>
          <div className="mt-6 grid md:grid-cols-2 gap-8 text-muted-foreground leading-relaxed">
            <p>
              In der Kfz-Werkstatt liegen Kosten- und Reputationsrisiken eng beieinander. Ein einziger nicht freigegebener Mehrkostenposten, eine zu spät angekündigte KV-Überschreitung oder ein Mangel kurz nach der Reparatur — und schon steht eine Rechnung im Raum, die rechtlich nicht durchsetzbar oder nur mit erheblichem Aufwand zu klären ist. Hinzu kommt der Verbraucherschutz: Werkstätten gehören zu den Branchen, die in Schiedsstellen und Bewertungen besonders kritisch beobachtet werden.
            </p>
            <p>
              Wer Werkstattfälle strukturiert führt — mit klarer Trennung zwischen Werkvertragsrecht, Kaufrecht am Ersatzteil und Garantieansprüchen gegen den Hersteller — bearbeitet Reklamationen schneller, faktisch korrekt und ohne unnötige Eskalation. Genau dafür ist Pallanx gebaut: Struktur und Rechtssicherheit, nicht Abwehr.
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
            <CardHeader><CardTitle className="text-base">Werkvertrag & Nachbesserung</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>§§ 631 ff. BGB</strong> regeln den Werkvertrag — die Werkstatt schuldet den vereinbarten Erfolg, nicht nur den Versuch.</p>
              <p><strong>§ 635 BGB</strong> gibt der Kundschaft bei Mängeln zunächst einen Anspruch auf Nachbesserung; die Werkstatt darf die Form (Reparatur oder Neuherstellung) grundsätzlich wählen.</p>
              <p><strong>§ 636 BGB</strong>: Erst nach erfolglosen Nachbesserungsversuchen kommen Rücktritt, Minderung oder Schadensersatz in Betracht.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Kostenvoranschlag, Ersatzteile & Beweis</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>§ 650 BGB</strong>: Ein unverbindlicher Kostenvoranschlag darf nur unwesentlich überschritten werden — die Rechtsprechung sieht 15–20 % als Richtwert.</p>
              <p><strong>§§ 437, 438 BGB</strong>: Auf das verbaute Ersatzteil gilt die zweijährige Gewährleistung gegenüber Verbraucherinnen und Verbrauchern.</p>
              <p><strong>§ 477 BGB</strong>: In den ersten 12 Monaten wird zugunsten der Kundschaft vermutet, dass ein Mangel am Teil bereits bei Übergabe vorlag.</p>
              <p><strong>Anscheinsbeweis</strong>: Tritt ein Mangel zeitnah und im Bereich der ausgeführten Arbeit auf, spricht der erste Anschein für einen Werkmangel — die Werkstatt muss ihn entkräften.</p>
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
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">5 typische Werkstatt-Reklamationen — so bearbeiten Sie sie korrekt und fair</h2>
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
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Was Pallanx in der Kfz-Werkstatt konkret leistet</h2>
        <div className="mt-8 grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader><div className="flex items-center gap-2"><FileText className="w-5 h-5 text-primary" /><CardTitle className="text-base">Vorformulierte Antworten</CardTitle></div></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Zu jedem Fall erzeugt die KI je Lösungsoption einen vorformulierten Antworttext — abgestimmt auf §§ 631 ff., 635, 650 BGB, Ihre eigenen Werkstattrichtlinien und den konkreten Auftrag. Mitarbeitende übernehmen den Text oder passen ihn an.
            </CardContent>
          </Card>
          <Card>
            <CardHeader><div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-primary" /><CardTitle className="text-base">Rollen- & Limit-basierte Freigaben</CardTitle></div></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Sie definieren Kulanz- und Gutschrift-Grenzen je Rolle (Serviceberatung, Werkstattmeister, Leitung). Überschreitet eine Option das Limit, leitet Pallanx automatisch eine Freigabe-Anfrage an die zuständige Rolle ein — mit KI-Begründung und Fallkontext.
            </CardContent>
          </Card>
          <Card>
            <CardHeader><div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-primary" /><CardTitle className="text-base">Drei abgestufte Optionen pro Fall</CardTitle></div></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Statt pauschaler Ablehnung erhalten Sie pro Fall drei Vorschläge — konservativ, mittel, kulant — mit Begründung, Kundentext und konkretem Aufwand. Jede Entscheidung wird mit Versionshistorie protokolliert.
            </CardContent>
          </Card>
        </div>
        <div className="mt-8 rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          <strong className="text-foreground">Praxis-Effekt:</strong> Strukturierte Reklamationsführung reduziert nach Erfahrungswerten aus Werkstattbetrieben unnötige Eskalationen, verkürzt die Durchlaufzeit pro Fall deutlich und entlastet die Serviceberatung von wiederkehrenden Standardantworten — ohne dass Kulanz dem Bauchgefühl überlassen bleibt.
        </div>
      </section>

      {/* INTERNE VERLINKUNG */}
      <section className="border-t bg-muted/30">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <h2 className="text-xl font-semibold tracking-tight">Weiter lesen</h2>
          <p className="mt-3 text-muted-foreground max-w-3xl">
            Pallanx ist branchenübergreifend aufgebaut. Auch relevant: der Leitfaden für den{" "}
            <Link to="/retail/moebelhandel" className="underline">Möbelhandel</Link> (Transportschäden, Aufbau, Maßanfertigungen) und für den{" "}
            <Link to="/retail/elektronikhandel" className="underline">Elektronikhandel</Link> (Gewährleistung, § 477 BGB, Garantie vs. Gewährleistung). Eine Übersicht aller Funktionen finden Sie auf der{" "}
            <Link to="/retail" className="underline">Retail-Shield-Startseite</Link>, Preise auf der{" "}
            <Link to="/preise" className="underline">Preisseite</Link>.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Häufige Fragen aus der Kfz-Werkstatt</h2>
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
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Bereit, Werkstattfälle sauber zu führen?</h2>
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