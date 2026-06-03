import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusinessMembership, roleRank } from "@/hooks/useBusinessAccount";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Trash2 } from "lucide-react";

export default function RetailPolicies() {
  const { data: m } = useBusinessMembership();
  const qc = useQueryClient();
  const { toast } = useToast();
  const canEdit = m && roleRank[m.role] >= 2;
  const accountId = m?.business_account_id;

  const { data: pols } = useQuery({
    queryKey: ["business-policies", accountId], enabled: !!accountId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("business_policies").select("*").eq("business_account_id", accountId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const [f, setF] = useState({ title: "", content: "" });
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!accountId || !f.title || !f.content) return;
    setBusy(true);
    try {
      const { data, error } = await (supabase as any).from("business_policies").insert({
        business_account_id: accountId, title: f.title, content: f.content, source_type: "text",
      }).select("id").single();
      if (error) throw error;
      const { data: r, error: e2 } = await supabase.functions.invoke("b2b-ingest-policy", { body: { policy_id: data.id } });
      if (e2 || (r as any)?.error) throw new Error(e2?.message || (r as any)?.error);
      toast({ title: "Richtlinie indiziert", description: `${(r as any).chunks} Abschnitte` });
      setF({ title: "", content: "" });
      qc.invalidateQueries({ queryKey: ["business-policies"] });
    } catch (e: any) { toast({ title: "Fehler", description: e.message, variant: "destructive" }); }
    finally { setBusy(false); }
  }

  async function del(id: string) {
    if (!confirm("Richtlinie löschen?")) return;
    const { error } = await (supabase as any).from("business_policies").delete().eq("id", id);
    if (error) toast({ title: "Fehler", description: error.message, variant: "destructive" });
    else qc.invalidateQueries({ queryKey: ["business-policies"] });
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">Richtlinien</h1>
        <p className="text-sm text-muted-foreground">Wissen, das die AI bei jeder Analyse zusätzlich berücksichtigt.</p>
      </div>
      {canEdit && (
        <Card><CardHeader><CardTitle>Neue Richtlinie</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Titel</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="z. B. Rückgaberichtlinie Möbel" /></div>
            <div><Label>Inhalt</Label><Textarea rows={10} value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} placeholder="Vollständiger Text der Richtlinie..." /></div>
            <Button onClick={create} disabled={busy || !f.title || !f.content}>{busy ? "Indiziere..." : "Speichern & indizieren"}</Button>
          </CardContent>
        </Card>
      )}
      <div className="space-y-2">
        {(pols ?? []).map((p: any) => (
          <Card key={p.id}><CardContent className="p-4 flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-primary" />
            <div className="flex-1 min-w-0">
              <div className="font-medium">{p.title}</div>
              <div className="text-xs text-muted-foreground">{p.chunk_count} Abschnitte · {new Date(p.created_at).toLocaleDateString("de-DE")}</div>
            </div>
            <Badge variant={p.status === "ready" ? "default" : "secondary"}>{p.status}</Badge>
            {canEdit && <Button size="icon" variant="ghost" onClick={() => del(p.id)}><Trash2 className="w-4 h-4" /></Button>}
          </CardContent></Card>
        ))}
        {(pols ?? []).length === 0 && <p className="text-sm text-muted-foreground">Noch keine Richtlinien hinterlegt.</p>}
      </div>
    </div>
  );
}