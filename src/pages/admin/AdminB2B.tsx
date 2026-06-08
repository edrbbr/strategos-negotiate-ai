import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Inbox, Ticket, Plus, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { IndustryPicker } from "@/components/admin/IndustryPicker";

export default function AdminB2B() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const emptyForm = {
    company_name: "", industry: "", store_count: "", billing_email: "",
    monthly_fee_cents: "",
    primary_contact_name: "", primary_contact_email: "", primary_contact_temp_password: "",
  };
  const [f, setF] = useState(emptyForm);

  const { data: accounts } = useQuery({
    queryKey: ["admin-b2b-accounts"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("business_accounts").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: leads } = useQuery({
    queryKey: ["admin-b2b-leads-count"],
    queryFn: async () => {
      const { count } = await (supabase as any).from("b2b_leads").select("id", { count: "exact", head: true }).eq("status", "new");
      return count ?? 0;
    },
  });

  async function submit() {
    if (!f.company_name || !f.billing_email) {
      toast({ title: "Pflichtfelder fehlen", description: "Firmenname und Rechnungs-E-Mail sind erforderlich.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const payload: any = {
        company_name: f.company_name,
        industry: f.industry || null,
        store_count: f.store_count ? Number(f.store_count) : null,
        billing_email: f.billing_email,
        monthly_fee_cents: f.monthly_fee_cents ? Number(f.monthly_fee_cents) : 0,
      };
      if (f.primary_contact_email && f.primary_contact_name && f.primary_contact_temp_password) {
        payload.primary_contact_email = f.primary_contact_email;
        payload.primary_contact_name = f.primary_contact_name;
        payload.primary_contact_temp_password = f.primary_contact_temp_password;
      }
      const { data, error } = await supabase.functions.invoke("b2b-admin-create-account", { body: payload });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: "Geschäftskonto angelegt" });
      setF(emptyForm); setOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-b2b-accounts"] });
    } catch (e: any) {
      toast({ title: "Fehler", description: e.message ?? String(e), variant: "destructive" });
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-semibold">B2B Verwaltung</h1>
            <p className="text-sm text-muted-foreground">Pallanx Retail Shield</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" />Neues Konto</Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader><DialogTitle>Neues Geschäftskonto anlegen</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="space-y-1"><Label>Firmenname *</Label><Input value={f.company_name} onChange={(e) => setF({ ...f, company_name: e.target.value })} /></div>
                    <div className="space-y-1"><Label>Branche</Label>
                      <IndustryPicker value={f.industry} onChange={(key) => setF({ ...f, industry: key })} />
                    </div>
                    <div className="space-y-1"><Label>Anzahl Filialen</Label><Input type="number" value={f.store_count} onChange={(e) => setF({ ...f, store_count: e.target.value })} /></div>
                    <div className="space-y-1"><Label>Rechnungs-E-Mail *</Label><Input type="email" value={f.billing_email} onChange={(e) => setF({ ...f, billing_email: e.target.value })} /></div>
                    <div className="space-y-1"><Label>Monatsgebühr (Cent)</Label><Input type="number" value={f.monthly_fee_cents} onChange={(e) => setF({ ...f, monthly_fee_cents: e.target.value })} placeholder="z. B. 49900" /></div>
                  </div>
                  <div className="pt-3 border-t border-border/40">
                    <div className="text-xs font-medium uppercase text-muted-foreground mb-2">Primärer Kontakt (optional – wird als „Leitung" angelegt)</div>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="space-y-1"><Label>Name</Label><Input value={f.primary_contact_name} onChange={(e) => setF({ ...f, primary_contact_name: e.target.value })} /></div>
                      <div className="space-y-1"><Label>E-Mail</Label><Input type="email" value={f.primary_contact_email} onChange={(e) => setF({ ...f, primary_contact_email: e.target.value })} /></div>
                      <div className="space-y-1 md:col-span-2"><Label>Initiales Passwort</Label><Input type="text" value={f.primary_contact_temp_password} onChange={(e) => setF({ ...f, primary_contact_temp_password: e.target.value })} placeholder="Mind. 8 Zeichen – wird der Person mitgeteilt" /></div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Abbrechen</Button>
                  <Button onClick={submit} disabled={busy}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Anlegen"}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Link to="/admin/b2b/leads"><Button variant="outline"><Inbox className="w-4 h-4 mr-2" />Leads {leads ? `(${leads})` : ""}</Button></Link>
            <Link to="/admin/b2b/tickets"><Button variant="outline"><Ticket className="w-4 h-4 mr-2" />Support</Button></Link>
            <Link to="/admin"><Button variant="ghost">Admin Home</Button></Link>
          </div>
        </div>

        <Card><CardHeader><CardTitle>Geschäftskonten</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {(accounts ?? []).map((a: any) => (
                <Link key={a.id} to={`/admin/b2b/${a.id}`} className="flex items-center gap-3 p-4 hover:bg-accent/30">
                  <Building2 className="w-5 h-5 text-primary" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{a.name}</div>
                    <div className="text-xs text-muted-foreground">{a.industry ?? "—"} · {a.billing_email}</div>
                  </div>
                  <Badge variant={a.status === "active" ? "default" : "outline"}>{a.status}</Badge>
                </Link>
              ))}
              {(accounts ?? []).length === 0 && <div className="p-6 text-sm text-muted-foreground">Noch keine Geschäftskonten.</div>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}