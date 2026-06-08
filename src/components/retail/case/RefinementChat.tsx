import { useEffect, useRef, useState } from "react";
import { Loader2, Paperclip, Send, Sparkles, User, X, Copy, CheckCircle2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBusinessCaseVersions, useRefineBusinessCase, type BusinessCaseVersion, type BusinessCase } from "@/hooks/useBusinessCases";
import { useToast } from "@/hooks/use-toast";
import { CloseCaseModal } from "./CloseCaseModal";
import { RequestApprovalModal } from "./RequestApprovalModal";
import { formatEuro } from "@/lib/euro";

type Style = "timeline" | "chatgpt";

export function RefinementChat({ caseRow, style = "chatgpt" }: { caseRow: BusinessCase; style?: Style }) {
  const { data: versions = [] } = useBusinessCaseVersions(caseRow.id);
  const refine = useRefineBusinessCase();
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [closeOpen, setCloseOpen] = useState(false);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const isChat = style === "chatgpt";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [versions.length, refine.isPending]);

  async function send(prompt?: string) {
    const instruction = (prompt ?? input).trim();
    if (instruction.length < 2) return;
    try {
      await refine.mutateAsync({ case_id: caseRow.id, instruction });
      setInput("");
    } catch (e: any) {
      toast({ title: "Verfeinerung fehlgeschlagen", description: e.message, variant: "destructive" });
    }
  }

  const renderableVersions: BusinessCaseVersion[] = versions.length > 0
    ? versions
    : caseRow.ai_analysis
      ? [{
          id: "legacy", case_id: caseRow.id, business_account_id: caseRow.business_account_id,
          version_number: 1, kind: "initial", user_prompt: null,
          ai_analysis: caseRow.ai_analysis, ai_options: caseRow.ai_options,
          recommended_index: 0, required_role: caseRow.required_approval_role, created_by_user_id: null,
          created_at: caseRow.created_at,
        } as BusinessCaseVersion]
      : [];

  return (
    <div className="flex flex-col">
      <div className={isChat ? "space-y-6" : "space-y-4"}>
        <ChatTurn role="user" style={style}>
          <div className="whitespace-pre-wrap text-sm">{caseRow.situation_text || "—"}</div>
          <div className="mt-2 text-xs opacity-80">
            {caseRow.product_name} · {formatEuro(caseRow.purchase_price_total)} Kaufpreis · {formatEuro(caseRow.claimed_amount)} Forderung
          </div>
        </ChatTurn>

        {renderableVersions.length === 0 && (
          <ChatTurn role="ai" style={style}>
            <div className="text-sm text-muted-foreground italic">Noch keine Analyse vorhanden.</div>
          </ChatTurn>
        )}

        {renderableVersions.map((v) => (
          <VersionTurn
            key={v.id}
            version={v}
            style={style}
            caseRow={caseRow}
            onClose={() => setCloseOpen(true)}
            onRequestApproval={() => setApprovalOpen(true)}
          />
        ))}

        {refine.isPending && (
          <ChatTurn role="ai" style={style}>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />KI denkt nach…
            </div>
          </ChatTurn>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex flex-wrap gap-2 mt-6 mb-2">
        {[
          "Strenger argumentieren",
          "Etwas kulanter formulieren",
          "Wortlaut höflicher",
          "Kürzer & klarer",
          "Anderen Lösungsweg vorschlagen",
        ].map((p) => (
          <button key={p} type="button" onClick={() => send(p)} disabled={refine.isPending}
            className="text-xs px-3 py-1.5 rounded-full border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition disabled:opacity-50">
            {p}
          </button>
        ))}
      </div>

      <div className={isChat ? "sticky bottom-0 bg-background pt-3 pb-2" : "border-t border-border/30 pt-3 mt-2"}>
        <div className="relative bg-card border border-border/40 rounded-2xl p-3 focus-within:border-primary/60 transition">
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {attachments.map((f, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs bg-muted px-2 py-1 rounded-full">
                  <Paperclip className="w-3 h-3" />
                  <span className="max-w-[160px] truncate">{f.name}</span>
                  <button type="button" onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))} className="hover:text-destructive" aria-label="Anhang entfernen">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            disabled={refine.isPending}
            placeholder="Anweisung zur Anpassung… (Enter sendet, Shift+Enter = neue Zeile)"
            rows={2}
            className="w-full bg-transparent focus:outline-none resize-none text-[15px] leading-6 pr-24 disabled:opacity-50"
          />
          <input ref={fileInputRef} type="file" multiple className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (files.length) setAttachments((prev) => [...prev, ...files]);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
          />
          <Button size="icon" variant="ghost" type="button" onClick={() => fileInputRef.current?.click()} disabled={refine.isPending} className="absolute bottom-2 right-12 h-9 w-9 rounded-full" aria-label="Anhang hinzufügen">
            <Paperclip className="w-4 h-4" />
          </Button>
          <Button size="icon" onClick={() => send()} disabled={refine.isPending || input.trim().length < 2} className="absolute bottom-2 right-2 h-9 w-9 rounded-full" aria-label="Senden">
            {refine.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <CloseCaseModal open={closeOpen} onOpenChange={setCloseOpen} caseRow={caseRow} />
      <RequestApprovalModal open={approvalOpen} onOpenChange={setApprovalOpen} caseRow={caseRow} />
    </div>
  );
}

function ChatTurn({ role, style, children }: { role: "user" | "ai"; style: Style; children: React.ReactNode }) {
  if (style === "chatgpt") {
    const isUser = role === "user";
    return (
      <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
        {!isUser && <div className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0"><Sparkles className="w-3.5 h-3.5" /></div>}
        <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${isUser ? "bg-primary text-primary-foreground" : "bg-muted/50"}`}>{children}</div>
        {isUser && <div className="w-7 h-7 rounded-full bg-muted text-foreground flex items-center justify-center shrink-0"><User className="w-3.5 h-3.5" /></div>}
      </div>
    );
  }
  const isUser = role === "user";
  return (
    <div className={`border-l-2 ${isUser ? "border-muted-foreground/30" : "border-primary"} pl-4`}>
      <div className="text-[10px] uppercase tracking-wide font-mono text-muted-foreground mb-1 flex items-center gap-1">
        {isUser ? <><User className="w-3 h-3" />Du</> : <><Sparkles className="w-3 h-3 text-primary" />KI</>}
      </div>
      {children}
    </div>
  );
}

function VersionTurn({
  version, style, caseRow, onClose, onRequestApproval,
}: {
  version: BusinessCaseVersion;
  style: Style;
  caseRow: BusinessCase;
  onClose: () => void;
  onRequestApproval: () => void;
}) {
  const analysis = version.ai_analysis as any;
  const options = (version.ai_options ?? []) as any[];
  const rec = options[version.recommended_index ?? 0] ?? options[0] ?? null;
  const closed = caseRow.status === "closed" || caseRow.status === "rejected";
  const { toast } = useToast();

  async function copy(text: string, what: string) {
    try { await navigator.clipboard.writeText(text); toast({ title: `${what} kopiert` }); }
    catch { toast({ title: "Kopieren fehlgeschlagen", variant: "destructive" }); }
  }

  return (
    <>
      {version.kind === "refinement" && version.user_prompt && (
        <ChatTurn role="user" style={style}>
          <div className="text-sm whitespace-pre-wrap">{version.user_prompt}</div>
        </ChatTurn>
      )}
      <ChatTurn role="ai" style={style}>
        <div className="space-y-3">
          <div className="text-[10px] uppercase tracking-wide font-mono opacity-70">
            V{version.version_number} · {version.kind}{analysis?.change_summary ? ` · ${analysis.change_summary}` : ""}
          </div>
          {analysis?.analysis && <div className="text-sm leading-relaxed">{analysis.analysis}</div>}
          {analysis?.risk_assessment && (
            <div className="text-xs p-2 rounded bg-destructive/5 border border-destructive/20">
              <span className="font-medium uppercase tracking-wide">Risiken: </span>{analysis.risk_assessment}
            </div>
          )}

          {rec && (
            <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 space-y-3">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-primary font-medium">Empfehlung</div>
                  <div className="text-2xl font-bold mt-1">
                    {formatEuro(rec.amount_eur)}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      ({Number(rec.percent_of_purchase || 0).toFixed(1)} % vom Kaufpreis)
                    </span>
                  </div>
                </div>
                {rec.confidence && (
                  <Badge variant="outline" className="text-xs">Konfidenz: {rec.confidence}</Badge>
                )}
              </div>
              {rec.rationale && (
                <div className="text-sm"><span className="font-medium">Begründung:</span> {rec.rationale}</div>
              )}
              {rec.customer_wording && (
                <div className="text-sm p-3 bg-background/60 rounded border-l-2 border-primary/40">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-xs uppercase text-muted-foreground">Wortlaut für den Kunden</span>
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => copy(rec.customer_wording, "Wortlaut")}>
                      <Copy className="w-3.5 h-3.5 mr-1" />Kopieren
                    </Button>
                  </div>
                  <div className="whitespace-pre-wrap">{rec.customer_wording}</div>
                </div>
              )}
              {rec.email_draft && (
                <div className="text-sm p-3 bg-background/60 rounded border-l-2 border-primary/40">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-xs uppercase text-muted-foreground">E-Mail-Entwurf</span>
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => copy(rec.email_draft, "E-Mail-Entwurf")}>
                      <Copy className="w-3.5 h-3.5 mr-1" />Kopieren
                    </Button>
                  </div>
                  <div className="whitespace-pre-wrap text-[13px] font-mono">{rec.email_draft}</div>
                </div>
              )}

              {!closed && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" onClick={onClose}>
                    <CheckCircle2 className="w-4 h-4 mr-1" />Als abgeschlossen markieren
                  </Button>
                  <Button size="sm" variant="outline" onClick={onRequestApproval}>
                    <ShieldAlert className="w-4 h-4 mr-1" />Genehmigung einholen
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </ChatTurn>
    </>
  );
}