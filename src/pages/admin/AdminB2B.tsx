import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Inbox, Ticket } from "lucide-react";

export default function AdminB2B() {
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
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-semibold">B2B Verwaltung</h1>
            <p className="text-sm text-muted-foreground">Pallanx Retail Shield</p>
          </div>
          <div className="flex gap-2">
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