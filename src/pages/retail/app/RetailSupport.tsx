import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBusinessMembership } from "@/hooks/useBusinessAccount";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function RetailSupport() {
  const { user } = useAuth();
  const { data: m } = useBusinessMembership();
  const qc = useQueryClient();
  const { toast } = useToast();
  const accountId = m?.business_account_id;
  const [selected, setSelected] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const [t, setT] = useState({ subject: "", body: "" });
  const [reply, setReply] = useState("");

  const { data: tickets } = useQuery({
    queryKey: ["business-tickets", accountId], enabled: !!accountId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("business_support_tickets").select("*").eq("business_account_id", accountId!).order("last_reply_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: messages } = useQuery({
    queryKey: ["business-ticket-messages", selected], enabled: !!selected,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("business_support_messages").select("*").eq("ticket_id", selected!).order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  async function createTicket() {
    if (!accountId || !user || !t.subject || !t.body) return;
    const { data: tk, error } = await (supabase as any).from("business_support_tickets").insert({
      business_account_id: accountId, created_by_user_id: user.id, subject: t.subject,
    }).select("id").single();
    if (error) return toast({ title: "Fehler", description: error.message, variant: "destructive" });
    await (supabase as any).from("business_support_messages").insert({
      ticket_id: tk.id, business_account_id: accountId, author_user_id: user.id, author_type: "business", body: t.body,
    });
    toast({ title: "Ticket erstellt" });
    setT({ subject: "", body: "" }); setShow(false);
    qc.invalidateQueries({ queryKey: ["business-tickets"] });
  }

  async function sendReply() {
    if (!selected || !accountId || !user || !reply) return;
    await (supabase as any).from("business_support_messages").insert({
      ticket_id: selected, business_account_id: accountId, author_user_id: user.id, author_type: "business", body: reply,
    });
    await (supabase as any).from("business_support_tickets").update({ last_reply_by: "business", last_reply_at: new Date().toISOString() }).eq("id", selected);
    setReply("");
    qc.invalidateQueries({ queryKey: ["business-ticket-messages", selected] });
    qc.invalidateQueries({ queryKey: ["business-tickets"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Support</h1>
        <Button onClick={() => setShow(!show)}>Neues Ticket</Button>
      </div>
      {show && (
        <Card><CardHeader><CardTitle>Neues Ticket</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Betreff</Label><Input value={t.subject} onChange={(e) => setT({ ...t, subject: e.target.value })} /></div>
            <div><Label>Nachricht</Label><Textarea rows={5} value={t.body} onChange={(e) => setT({ ...t, body: e.target.value })} /></div>
            <Button onClick={createTicket}>Absenden</Button>
          </CardContent>
        </Card>
      )}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="space-y-2 md:col-span-1">
          {(tickets ?? []).map((tk: any) => (
            <button key={tk.id} onClick={() => setSelected(tk.id)} className={`w-full text-left p-3 rounded border ${selected === tk.id ? "border-primary bg-primary/5" : "bg-card"}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-sm truncate">{tk.subject}</div>
                <Badge variant="outline" className="text-xs">{tk.status}</Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-1">{new Date(tk.last_reply_at).toLocaleString("de-DE")}</div>
            </button>
          ))}
          {(tickets ?? []).length === 0 && <p className="text-sm text-muted-foreground">Keine Tickets.</p>}
        </div>
        <div className="md:col-span-2 space-y-3">
          {selected ? (
            <>
              <Card><CardContent className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
                {(messages ?? []).map((msg: any) => (
                  <div key={msg.id} className={`p-3 rounded ${msg.author_type === "owner" ? "bg-primary/10 ml-8" : "bg-muted/40 mr-8"}`}>
                    <div className="text-xs font-medium mb-1">{msg.author_type === "owner" ? "Support" : "Sie"}</div>
                    <div className="text-sm whitespace-pre-wrap">{msg.body}</div>
                    <div className="text-xs text-muted-foreground mt-1">{new Date(msg.created_at).toLocaleString("de-DE")}</div>
                  </div>
                ))}
              </CardContent></Card>
              <Card><CardContent className="p-4 space-y-2">
                <Textarea rows={3} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Antwort schreiben..." />
                <Button onClick={sendReply}>Senden</Button>
              </CardContent></Card>
            </>
          ) : <p className="text-sm text-muted-foreground">Ticket auswählen.</p>}
        </div>
      </div>
    </div>
  );
}