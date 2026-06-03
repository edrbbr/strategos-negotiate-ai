import { Link } from "react-router-dom";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export default function AdminB2BTickets() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [reply, setReply] = useState("");

  const { data: tickets } = useQuery({
    queryKey: ["admin-tickets"],
    queryFn: async () => (await (supabase as any).from("business_support_tickets")
      .select("*, account:business_accounts(name)").order("last_reply_at", { ascending: false })).data ?? [],
  });
  const { data: messages } = useQuery({
    queryKey: ["admin-ticket-messages", selected], enabled: !!selected,
    queryFn: async () => (await (supabase as any).from("business_support_messages").select("*").eq("ticket_id", selected!).order("created_at")).data ?? [],
  });

  async function sendReply() {
    if (!selected || !user || !reply) return;
    const t = (tickets ?? []).find((x: any) => x.id === selected);
    if (!t) return;
    await (supabase as any).from("business_support_messages").insert({
      ticket_id: selected, business_account_id: t.business_account_id,
      author_user_id: user.id, author_type: "owner", body: reply,
    });
    await (supabase as any).from("business_support_tickets").update({ last_reply_by: "owner", last_reply_at: new Date().toISOString() }).eq("id", selected);
    setReply("");
    qc.invalidateQueries({ queryKey: ["admin-ticket-messages", selected] });
    qc.invalidateQueries({ queryKey: ["admin-tickets"] });
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between"><h1 className="text-2xl font-semibold">B2B Support</h1><Link to="/admin/b2b"><Button variant="ghost">Zurück</Button></Link></div>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2 md:col-span-1">
            {(tickets ?? []).map((tk: any) => (
              <button key={tk.id} onClick={() => setSelected(tk.id)} className={`w-full text-left p-3 rounded border ${selected === tk.id ? "border-primary bg-primary/5" : "bg-card"}`}>
                <div className="font-medium text-sm truncate">{tk.subject}</div>
                <div className="text-xs text-muted-foreground truncate">{tk.account?.name}</div>
                <Badge variant="outline" className="text-xs mt-1">{tk.status} · {tk.last_reply_by}</Badge>
              </button>
            ))}
          </div>
          <div className="md:col-span-2 space-y-3">
            {selected ? (<>
              <Card><CardContent className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
                {(messages ?? []).map((msg: any) => (
                  <div key={msg.id} className={`p-3 rounded ${msg.author_type === "owner" ? "bg-primary/10 ml-8" : "bg-muted/40 mr-8"}`}>
                    <div className="text-xs font-medium mb-1">{msg.author_type === "owner" ? "Sie (Owner)" : "Kunde"}</div>
                    <div className="text-sm whitespace-pre-wrap">{msg.body}</div>
                  </div>
                ))}
              </CardContent></Card>
              <Card><CardContent className="p-4 space-y-2">
                <Textarea rows={3} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Antwort..." />
                <Button onClick={sendReply}>Antworten</Button>
              </CardContent></Card>
            </>) : <p className="text-sm text-muted-foreground">Ticket auswählen.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}