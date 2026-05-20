import { Link } from "react-router-dom";
import { PublicHeader } from "@/components/PublicHeader";
import { Seo } from "@/components/Seo";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Seo
        title="Datenschutzerklärung — PALLANX"
        description="Datenschutzerklärung von PALLANX: Welche Daten wir verarbeiten, Rechtsgrundlagen, eingesetzte Dienstleister und Ihre Rechte nach DSGVO."
        path="/datenschutz"
      />
      <PublicHeader />
      <main className="container max-w-3xl py-16 space-y-10">
        <header>
          <h1 className="text-4xl md:text-5xl font-serif mb-4">Datenschutzerklärung</h1>
          <p className="text-sm text-muted-foreground">
            Stand: {new Date().toLocaleDateString("de-DE", { year: "numeric", month: "long" })}. Diese
            Erklärung beschreibt die Verarbeitung personenbezogener Daten beim Besuch und der Nutzung
            von PALLANX (pallanx.com).
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-2xl font-serif">1. Verantwortlicher</h2>
          <p className="text-muted-foreground">
            [Name / Firma]<br />
            [Anschrift]<br />
            E-Mail: [datenschutz@pallanx.com]<br />
            <span className="text-xs">Bitte vor Veröffentlichung durch die tatsächlichen Daten ersetzen.</span>
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-serif">2. Erhobene Daten</h2>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Account-Daten: E-Mail-Adresse, Name, Passwort-Hash.</li>
            <li>Nutzungsdaten: Verhandlungsinhalte, Fälle, hochgeladene Dokumente.</li>
            <li>Zahlungsdaten: bei kostenpflichtigen Plänen verarbeitet durch Stripe.</li>
            <li>Technische Daten: IP-Adresse, Browser, Betriebssystem, Zeitpunkt des Zugriffs (Server-Logs).</li>
            <li>Cookies und ähnliche Technologien (siehe Abschnitt 5).</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-serif">3. Zwecke und Rechtsgrundlagen</h2>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Bereitstellung des Dienstes (Art. 6 Abs. 1 lit. b DSGVO — Vertrag).</li>
            <li>Sicherheit, Missbrauchsabwehr, Logging (Art. 6 Abs. 1 lit. f DSGVO — berechtigtes Interesse).</li>
            <li>Abrechnung und Buchhaltung (Art. 6 Abs. 1 lit. b und c DSGVO).</li>
            <li>Analyse und Marketing nur mit Einwilligung (Art. 6 Abs. 1 lit. a DSGVO).</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-serif">4. Auftragsverarbeiter und Drittanbieter</h2>
          <p className="text-muted-foreground">
            Wir setzen sorgfältig ausgewählte Dienstleister ein. Soweit Daten in Drittländer übermittelt
            werden, geschieht dies auf Grundlage von Standardvertragsklauseln (SCC) der EU-Kommission.
          </p>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">Lovable Cloud (Supabase)</h3>
              <p className="text-sm text-muted-foreground">
                Hosting der Datenbank, Authentifizierung, Edge Functions, Datei-Speicher. Region EU.
                Verarbeitet: Account-, Nutzungs- und Inhaltsdaten.
              </p>
            </div>
            <div>
              <h3 className="font-medium">Lovable</h3>
              <p className="text-sm text-muted-foreground">
                Bereitstellung und Deployment der Web-Anwendung. Verarbeitet: technische Anfragedaten.
              </p>
            </div>
            <div>
              <h3 className="font-medium">Stripe Payments Europe, Ltd.</h3>
              <p className="text-sm text-muted-foreground">
                Zahlungsabwicklung für Abonnements. Verarbeitet: Name, E-Mail, Zahlungsdaten,
                Rechnungsadresse. Übermittlung in die USA auf Basis von SCC.
              </p>
            </div>
            <div>
              <h3 className="font-medium">E-Mail-Versand (transaktionale E-Mails)</h3>
              <p className="text-sm text-muted-foreground">
                Versand von System-E-Mails (z.&nbsp;B. Bestätigung, Passwort-Reset). Verarbeitet:
                E-Mail-Adresse, Inhalt der Nachricht.
              </p>
            </div>
            <div>
              <h3 className="font-medium">KI-Anbieter über das Lovable AI Gateway</h3>
              <p className="text-sm text-muted-foreground">
                Verarbeitung von Verhandlungs- und Texteingaben durch Modelle von Google (Gemini) und
                OpenAI (GPT) zur Erstellung von Antworten und Analysen. Eingaben werden für die Dauer der
                Antwortgenerierung übertragen.
              </p>
            </div>
            <div>
              <h3 className="font-medium">Google Search Console</h3>
              <p className="text-sm text-muted-foreground">
                Reichweiten- und Indexierungsmessung der öffentlichen Seiten. Verarbeitet: aggregierte
                Suchanfragen, Klicks, Impressionen.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-serif">5. Cookies und ähnliche Technologien</h2>
          <p className="text-muted-foreground">
            Wir verwenden technisch notwendige Cookies (Session, Authentifizierung, CSRF-Schutz) sowie
            optional Analyse- und Marketing-Cookies. Optionale Cookies werden ausschließlich nach Ihrer
            Einwilligung über das Cookie-Banner gesetzt. Sie können Ihre Auswahl jederzeit anpassen,
            indem Sie den lokalen Speicher Ihres Browsers für diese Domain löschen.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-serif">6. Speicherdauer</h2>
          <p className="text-muted-foreground">
            Account- und Inhaltsdaten werden gespeichert, solange Ihr Konto besteht, und nach Löschung
            innerhalb von 30 Tagen entfernt — soweit keine gesetzlichen Aufbewahrungspflichten
            (insbesondere handels- und steuerrechtlich, bis zu 10 Jahre) entgegenstehen. Server-Logs
            werden nach 30 Tagen anonymisiert oder gelöscht.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-serif">7. Ihre Rechte</h2>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Auskunft (Art. 15 DSGVO)</li>
            <li>Berichtigung (Art. 16 DSGVO)</li>
            <li>Löschung (Art. 17 DSGVO)</li>
            <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
            <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
            <li>Widerspruch (Art. 21 DSGVO) und Widerruf erteilter Einwilligungen (Art. 7 Abs. 3 DSGVO)</li>
            <li>Beschwerde bei einer Aufsichtsbehörde (Art. 77 DSGVO)</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-serif">8. Kontakt Datenschutz</h2>
          <p className="text-muted-foreground">
            Anfragen richten Sie bitte an: [datenschutz@pallanx.com]
          </p>
        </section>

        <p className="text-xs text-muted-foreground pt-8 border-t border-border/40">
          Hinweis: Diese Datenschutzerklärung ist eine Vorlage und ersetzt keine individuelle
          Rechtsberatung. Bitte vor Veröffentlichung durch eine fachkundige Stelle prüfen lassen.
        </p>

        <div>
          <Link to="/" className="text-sm text-primary hover:underline">
            ← Zurück zur Startseite
          </Link>
        </div>
      </main>
    </div>
  );
};

export default Privacy;