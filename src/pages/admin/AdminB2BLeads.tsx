import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function AdminB2BLeads() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: leads } = useQuery({
    queryKey: ["admin-b2b-leads"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("b2b_leads").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  async function setStatus(id: string, status: string) {
    const { error } = await (supabase as any).from("b2b_leads").update({ status }).eq("id", id);
    if (error) toast({ title: "Fehler", description: error.message, variant: "destructive" });
    else qc.invalidateQueries({ queryKey: ["admin-b2b-leads"] });
  }
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">B2B Leads</h1>
          <Link to="/admin/b2b"><Button variant="ghost">Zurück</Button></Link>
        </div>
        <div className="space-y-3">
          {(leads ?? []).map((l: any) => (
            <Card key={l.id}><CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-semibold">{l.company_name}</div>
                  <div className="text-xs text-muted-foreground">{l.industry} · {l.contact_name} · <a href={`mailto:${l.email}`} className="text-primary hover:underline">{l.email}</a> {l.phone && `· ${l.phone}`}</div>
                </div>
                <Badge>{l.status}</Badge>
              </div>
              {l.message && <div className="text-sm bg-muted/30 p-3 rounded whitespace-pre-wrap">{l.message}</div>}
              <div className="flex gap-2 text-xs">
                {["new","contacted","qualified","won","lost"].map((s) => (
                  <Button key={s} size="sm" variant={l.status === s ? "default" : "outline"} onClick={() => setStatus(l.id, s)}>{s}</Button>
                ))}
              </div>
              <div className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString("de-DE")}</div>
            </CardContent></Card>
          ))}
          {(leads ?? []).length === 0 && <p className="text-sm text-muted-foreground">Noch keine Leads.</p>}
        </div>
      </div>
    </div>
  );
}