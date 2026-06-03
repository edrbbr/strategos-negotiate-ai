import { useEffect, useRef, useState } from "react";
import { Loader2, Send, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBusinessCaseVersions, useRefineBusinessCase, type BusinessCaseVersion } from "@/hooks/useBusinessCases";
import { OptionCard, eur } from "./RetailCaseShared";
import type { BusinessCase } from "@/hooks/useBusinessCases";
import { useToast } from "@/hooks/use-toast";

type Style = "timeline" | "chatgpt";

export function RefinementChat({
  caseRow, style = "timeline", onApplyOption,
}: {
  caseRow: BusinessCase;
  style?: Style;
  onApplyOption: (opt: any) => void;
}) {
  const { data: versions = [] } = useBusinessCaseVersions(caseRow.id);
  const refine = useRefineBusinessCase();
  const [input, setInput] = useState("");
  const { toast } = useToast();
  const bottomRef = useRef<HTMLDivElement | null>(null);

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

  const isChat = style === "chatgpt";

  return (
    <div className="flex flex-col">
      <div className={isChat ? "space-y-6" : "space-y-4"}>
        {/* V0: initial situation as user message */}
        <ChatTurn role="user" style={style}>
          <div className="whitespace-pre-wrap text-sm">{caseRow.situation_text || "—"}</div>
          <div className="mt-2 text-xs text-muted-foreground">
            {caseRow.product_name} · {eur(caseRow.purchase_price_total)} Kaufpreis · {eur(caseRow.claimed_amount)} Forderung
          </div>
        </ChatTurn>

        {versions.length === 0 && !caseRow.ai_analysis && (
          <ChatTurn role="ai" style={style}>
            <div className="text-sm text-muted-foreground italic">Noch keine Analyse vorhanden.</div>
          </ChatTurn>
        )}

        {versions.map((v) => (
          <VersionTurn key={v.id} version={v} style={style} caseStatus={caseRow.status} onApply={onApplyOption} onRefineThis={(opt) => setInput(`Verfeinere Option „${opt.label}" weiter: `)} />
        ))}

        {/* Fallback: no versions yet but ai_analysis exists (older cases) */}
        {versions.length === 0 && caseRow.ai_analysis && (
          <VersionTurn
            version={{
              id: "legacy", case_id: caseRow.id, business_account_id: caseRow.business_account_id,
              version_number: 1, kind: "initial", user_prompt: null,
              ai_analysis: caseRow.ai_analysis, ai_options: caseRow.ai_options,
              recommended_index: 0, required_role: caseRow.required_approval_role, created_by_user_id: null,
              created_at: caseRow.created_at,
            } as BusinessCaseVersion}
            style={style} caseStatus={caseRow.status} onApply={onApplyOption}
            onRefineThis={(opt) => setInput(`Verfeinere Option „${opt.label}" weiter: `)}
          />
        )}

        {refine.isPending && (
          <ChatTurn role="ai" style={style}>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />KI verfeinert die Optionen…
            </div>
          </ChatTurn>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      <div className="flex flex-wrap gap-2 mt-6 mb-2">
        {[
          "Freundlicher formulieren",
          "Kürzer & klarer",
          "Höheren Rabatt vorschlagen",
          "Strenger / weniger Kulanz",
          "Auf Englisch",
        ].map((p) => (
          <button key={p} type="button" onClick={() => send(p)} disabled={refine.isPending}
            className="text-xs px-3 py-1.5 rounded-full border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition disabled:opacity-50">
            {p}
          </button>
        ))}
      </div>

      {/* Composer */}
      <div className={isChat
        ? "sticky bottom-0 bg-background pt-3 pb-2"
        : "border-t border-border/30 pt-3 mt-2"
      }>
        <div className="relative bg-card border border-border/40 rounded-2xl p-3 focus-within:border-primary/60 transition">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            disabled={refine.isPending}
            placeholder="Anweisung zur Anpassung… (Enter sendet, Shift+Enter = neue Zeile)"
            rows={2}
            className="w-full bg-transparent focus:outline-none resize-none text-[15px] leading-6 pr-12 disabled:opacity-50"
          />
          <Button
            size="icon"
            onClick={() => send()}
            disabled={refine.isPending || input.trim().length < 2}
            className="absolute bottom-2 right-2 h-9 w-9 rounded-full"
            aria-label="Senden"
          >
            {refine.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ChatTurn({ role, style, children }: { role: "user" | "ai"; style: Style; children: React.ReactNode }) {
  if (style === "chatgpt") {
    const isUser = role === "user";
    return (
      <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
        {!isUser && <div className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0"><Sparkles className="w-3.5 h-3.5" /></div>}
        <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${isUser ? "bg-primary text-primary-foreground" : "bg-muted/50"}`}>
          {children}
        </div>
        {isUser && <div className="w-7 h-7 rounded-full bg-muted text-foreground flex items-center justify-center shrink-0"><User className="w-3.5 h-3.5" /></div>}
      </div>
    );
  }
  // timeline style
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
  version, style, caseStatus, onApply, onRefineThis,
}: {
  version: BusinessCaseVersion;
  style: Style;
  caseStatus: BusinessCase["status"];
  onApply: (opt: any) => void;
  onRefineThis: (opt: any) => void;
}) {
  const analysis = version.ai_analysis as any;
  const options = (version.ai_options ?? []) as any[];
  const rec = version.recommended_index ?? 0;

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
          {analysis?.analysis && (
            <div className="text-sm leading-relaxed">{analysis.analysis}</div>
          )}
          {analysis?.risk_assessment && (
            <div className="text-xs p-2 rounded bg-destructive/5 border border-destructive/20">
              <span className="font-medium uppercase tracking-wide">Risiken: </span>{analysis.risk_assessment}
            </div>
          )}
          {options.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-3">
              {options.map((opt, i) => (
                <OptionCard key={i} opt={opt} index={i} isRecommended={i === rec}
                  caseStatus={caseStatus} onApply={onApply} onRefineThis={onRefineThis} compact />
              ))}
            </div>
          )}
        </div>
      </ChatTurn>
    </>
  );
}