import { useState } from "react";
import { Link } from "react-router-dom";
import { Shield, ShieldCheck, AlertTriangle, BarChart3, Users, Lock, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Seo } from "@/components/Seo";

export default function RetailLanding() {
  const { toast } = useToast();
  const [form, setForm] = useState({ company_name: "", industry: "", contact_name: "", email: "", phone: "", store_count: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company_name || !form.industry || !form.contact_name || !form.email) {
      toast({ title: "Bitte alle Pflichtfelder ausfüllen", variant: "destructive" }); return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("b2b-lead-submit", { body: form });
      if (error || (data as any)?.error) throw new Error(error?.message || (data as any)?.error);
      setSent(true);
      toast({ title: "Vielen Dank!", description: "Wir melden uns innerhalb von 24 Stunden." });
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-background">
      <Seo title="Pallanx Retail Shield — AI für Reklamationsentscheidungen" description="DSGVO-konformer AI-Verhandlungsassistent für Reklamations- und Kulanzfälle im Einzelhandel. Marge schützen, Mitarbeitende entlasten, faire Entscheidungen." />
      <header className="border-b bg-card/50 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/retail" className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <span className="font-semibold tracking-tight">Pallanx Retail Shield</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/retail/login"><Button variant="ghost" size="sm">Anmelden</Button></Link>
            <a href="#kontakt"><Button size="sm">Demo anfragen</Button></a>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="relative max-w-6xl mx-auto px-6 py-24 md:py-32">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-card text-xs font-medium mb-6">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Speziell für den Einzelhandel · DSGVO-konform
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-3xl">
            AI-Schutzschild für Ihre <span className="text-primary">Reklamationsentscheidungen</span>.
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl">
            Ihre Kund:innen verhandeln mit ChatGPT. Ihre Mitarbeitenden dürfen das nicht. Pallanx Retail Shield bringt Ihr Team auf Augenhöhe — mit verhandlungswissenschaftlichem Wissen, Ihren eigenen Richtlinien und automatischer Limit-Eskalation.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#kontakt"><Button size="lg" className="gap-2">Demo anfragen <ArrowRight className="w-4 h-4" /></Button></a>
            <a href="#loesung"><Button size="lg" variant="outline">Mehr erfahren</Button></a>
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="border-y bg-muted/30">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-destructive/10 text-destructive text-xs font-medium mb-4">
                <AlertTriangle className="w-3.5 h-3.5" /> Das Problem
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Kund:innen sind besser vorbereitet als Ihr Personal.</h2>
            </div>
            <div className="space-y-5 text-muted-foreground">
              <p>Kund:innen formulieren Reklamationen mit ChatGPT, Gemini & Co. — maximal ausgereizt, juristisch verpackt, emotional eskaliert.</p>
              <p>Ihre Mitarbeitenden stehen unter Zeitdruck, haben wenig Verhandlungstraining — und dürfen <strong className="text-foreground">aus DSGVO-Gründen keine Kundendaten in ChatGPT eingeben</strong>.</p>
              <p>Die Folge: inkonsistente Rabatte, Margeverlust, unfaire Entscheidungen, schlechte Bewertungen.</p>
            </div>
          </div>
        </div>
      </section>

      {/* LÖSUNG */}
      <section id="loesung" className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium mb-4">
              <Shield className="w-3.5 h-3.5" /> Die Lösung
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Ein AI-Assistent, der Ihre Regeln kennt.</h2>
            <p className="mt-4 text-muted-foreground">Pallanx Retail Shield kombiniert verhandlungswissenschaftliches Wissen mit Ihren firmeneigenen Kulanzregeln, Rabattgrenzen und Freigabe-Limits.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: ShieldCheck, title: "Marge geschützt", text: "Konsistente Entscheidungen entlang Ihrer Rabattgrenzen. Keine Bauchentscheidungen mehr." },
              { icon: Users, title: "Mitarbeitende entlastet", text: "2–3 Vorschläge mit Formulierung — der Mitarbeiter wählt, das System protokolliert." },
              { icon: Lock, title: "DSGVO-konform", text: "Daten bleiben in Ihrem Mandanten-Bereich. Kein ChatGPT, kein externer Datenabfluss." },
              { icon: BarChart3, title: "Voll dokumentiert", text: "Jede Forderung, jeder Vorschlag, jede Freigabe wird mit Beträgen geloggt." },
              { icon: Inbox2Icon, title: "Auto-Eskalation", text: "Überschreitet ein Fall das Limit des Sachbearbeiters, wird automatisch ein Antrag an Manager oder Leitung erzeugt." },
              { icon: BookOpenIcon, title: "Eigenes Wissen", text: "Laden Sie Ihre Richtlinien hoch — die AI nutzt sie zusätzlich zum Verhandlungswissen." },
            ].map((f) => (
              <div key={f.title} className="p-6 rounded-lg border bg-card">
                <f.icon className="w-6 h-6 text-primary mb-3" />
                <h3 className="font-semibold mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WIE ES FUNKTIONIERT */}
      <section className="bg-muted/30 border-y py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-center mb-14">In drei Schritten zur fairen Entscheidung</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { n: "1", t: "Fall erfassen", d: "Mitarbeitende geben Produkt, Kaufpreis und Kundenforderung in 30 Sekunden ein." },
              { n: "2", t: "Vorschläge erhalten", d: "Die AI liefert 2–3 Optionen mit Betrag, Begründung und kundenfreundlichem Wortlaut." },
              { n: "3", t: "Entscheiden oder eskalieren", d: "Innerhalb des Limits: direkt freigeben. Darüber: automatischer Eskalationsantrag an Manager/Leitung." },
            ].map((s) => (
              <div key={s.n} className="relative p-6 rounded-lg border bg-card">
                <div className="absolute -top-4 -left-4 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">{s.n}</div>
                <h3 className="font-semibold mb-1.5 mt-2">{s.t}</h3>
                <p className="text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FÜR WEN */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Für Einzelhändler mit täglichen Reklamationen</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-10">Baumärkte, Möbelhäuser, Elektronikmärkte, Modeketten, Sportfachhändler — überall, wo Mitarbeitende täglich mit Forderungen umgehen müssen.</p>
          <div className="flex flex-wrap justify-center gap-2">
            {["Baumärkte","Möbelhäuser","Elektronikmärkte","Modeketten","Sportfachhandel","Spielwaren","Gartencenter","Küchenstudios"].map((b) => (
              <span key={b} className="px-3 py-1.5 rounded-full border bg-card text-sm">{b}</span>
            ))}
          </div>
        </div>
      </section>

      {/* KONTAKT FORM */}
      <section id="kontakt" className="border-t bg-gradient-to-br from-primary/5 to-background py-20">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Demo anfragen</h2>
            <p className="text-muted-foreground">Wir melden uns innerhalb von 24 Stunden zurück.</p>
          </div>
          {sent ? (
            <div className="p-8 rounded-lg border bg-card text-center">
              <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-3" />
              <h3 className="font-semibold text-xl mb-2">Anfrage erhalten</h3>
              <p className="text-muted-foreground">Wir melden uns in Kürze bei {form.contact_name}.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4 p-6 md:p-8 rounded-lg border bg-card">
              <div className="grid md:grid-cols-2 gap-4">
                <div><Label>Firmenname *</Label><Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} required /></div>
                <div><Label>Branche *</Label><Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="z. B. Baumarkt" required /></div>
                <div><Label>Ansprechpartner *</Label><Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} required /></div>
                <div><Label>E-Mail *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
                <div><Label>Telefon</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div><Label>Anzahl Filialen</Label><Input value={form.store_count} onChange={(e) => setForm({ ...form, store_count: e.target.value })} placeholder="z. B. 12" /></div>
              </div>
              <div><Label>Nachricht</Label><Textarea rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Was ist Ihr aktuelles Problem mit Reklamationen?" /></div>
              <Button type="submit" size="lg" className="w-full" disabled={loading}>{loading ? "Wird gesendet..." : "Anfrage senden"}</Button>
              <p className="text-xs text-muted-foreground text-center">Mit dem Absenden willigen Sie der Verarbeitung Ihrer Daten zum Zweck der Kontaktaufnahme ein.</p>
            </form>
          )}
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
          <div>© {new Date().getFullYear()} Pallanx Retail Shield</div>
          <div className="flex gap-4"><Link to="/datenschutz" className="hover:text-foreground">Datenschutz</Link><Link to="/" className="hover:text-foreground">Pallanx B2C</Link></div>
        </div>
      </footer>
    </div>
  );
}

function Inbox2Icon(props: any) { return <Inbox {...props} />; }
function BookOpenIcon(props: any) { return <BookOpen {...props} />; }
import { Inbox, BookOpen } from "lucide-react";