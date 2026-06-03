import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useBusinessMembership } from "@/hooks/useBusinessAccount";
import { useCreateBusinessCase, useRunPipeline } from "@/hooks/useBusinessCases";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function RetailNewCase() {
  const { user } = useAuth();
  const { data: m } = useBusinessMembership();
  const create = useCreateBusinessCase();
  const pipe = useRunPipeline();
  const nav = useNavigate();
  const { toast } = useToast();
  const [f, setF] = useState({
    product_name: "", product_category: "", sku: "",
    purchase_price_total: "", quantity: "1", claimed_amount: "",
    channel: "in_store", customer_type: "", situation_text: "", notes: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!m || !user) return;
    try {
      const c = await create.mutateAsync({
        business_account_id: m.business_account_id,
        created_by_user_id: user.id,
        product_name: f.product_name, product_category: f.product_category, sku: f.sku,
        purchase_price_total: Number(f.purchase_price_total) || 0,
        quantity: Number(f.quantity) || 1,
        claimed_amount: Number(f.claimed_amount) || 0,
        channel: f.channel, customer_type: f.customer_type,
        situation_text: f.situation_text, notes: f.notes,
      });
      toast({ title: "Fall angelegt", description: "AI-Analyse startet…" });
      try { await pipe.mutateAsync(c.id); } catch (e: any) { toast({ title: "AI-Analyse fehlgeschlagen", description: e.message, variant: "destructive" }); }
      nav(`/retail/app/cases/${c.id}`);
    } catch (e: any) {
      toast({ title: "Fehler", description: e.message, variant: "destructive" });
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Neuen Fall erfassen</h1>
      <form onSubmit={submit} className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Produkt</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <div><Label>Produktname</Label><Input value={f.product_name} onChange={(e) => setF({ ...f, product_name: e.target.value })} /></div>
              <div><Label>Kategorie</Label><Input value={f.product_category} onChange={(e) => setF({ ...f, product_category: e.target.value })} /></div>
              <div><Label>SKU / Artikelnummer</Label><Input value={f.sku} onChange={(e) => setF({ ...f, sku: e.target.value })} /></div>
              <div><Label>Menge</Label><Input type="number" min={1} value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} /></div>
              <div><Label>Kaufpreis gesamt (EUR)</Label><Input type="number" step="0.01" value={f.purchase_price_total} onChange={(e) => setF({ ...f, purchase_price_total: e.target.value })} required /></div>
              <div><Label>Kundenforderung (EUR)</Label><Input type="number" step="0.01" value={f.claimed_amount} onChange={(e) => setF({ ...f, claimed_amount: e.target.value })} required /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Kontext</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <div><Label>Kanal</Label>
                <Select value={f.channel} onValueChange={(v) => setF({ ...f, channel: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_store">Vor Ort</SelectItem>
                    <SelectItem value="phone">Telefon</SelectItem>
                    <SelectItem value="email">E-Mail</SelectItem>
                    <SelectItem value="chat">Chat</SelectItem>
                  </SelectContent>
                </Select></div>
              <div><Label>Kundentyp</Label><Input value={f.customer_type} onChange={(e) => setF({ ...f, customer_type: e.target.value })} placeholder="Stammkunde / Neukunde / B2B" /></div>
            </div>
            <div><Label>Beschreibung der Reklamation</Label><Textarea rows={5} value={f.situation_text} onChange={(e) => setF({ ...f, situation_text: e.target.value })} placeholder="Was ist passiert? Wie hat der Kunde sich geäußert?" required /></div>
            <div><Label>Interne Notizen</Label><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
          </CardContent>
        </Card>
        <Button type="submit" size="lg" className="w-full" disabled={create.isPending || pipe.isPending}>
          {create.isPending || pipe.isPending ? "Wird analysiert…" : "Fall analysieren"}
        </Button>
      </form>
    </div>
  );
}