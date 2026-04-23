import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Copy, Diamond, History, Loader2, Send, Sparkles, User } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import type { CaseRow } from "@/hooks/useCases";
import {
  type CaseVersionRow,
  type QuickSuggestion,
  useCaseVersions,
  useQuickSuggestions,
  useRefineVersion,
  useRestoreVersion,
} from "@/hooks/useCaseVersions";

interface NegStrategy {
  key: string;
  label: string;
}

function useStrategyLabels() {
  return useQuery({
    queryKey: ["negotiation-strategies"],
    staleTime: 30 * 60 * 1000,
    queryFn: async (): Promise<NegStrategy[]> => {
      const { data, error } = await supabase
        .from("negotiation_strategies")
        .select("key, label")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}

interface Props {
  caseRow: CaseRow & {
    medium?: string;
    language_label?: string;
    current_version_id?: string | null;
    quick_suggestions?: QuickSuggestion[] | null;
    quick_suggestions_version_id?: string | null;
  };
}

export function CaseChatView({ caseRow }: Props) {
  const { data: versions = [], isLoading: versionsLoading } = useCaseVersions(caseRow.id);
  const refineMut = useRefineVersion();
  const restoreMut = useRestoreVersion();
  const { data: strategyLookup = [] } = useStrategyLabels();
  const labelMap = useMemo(
    () => Object.fromEntries(strategyLookup.map((s) => [s.key, s.label])),
    [strategyLookup],
  );

  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const currentVersionId = caseRow.current_version_id ?? versions[versions.length - 1]?.id ?? null;
  const { suggestions, isLoading: suggestionsLoading } = useQuickSuggestions(
    caseRow.id,
    currentVersionId,
    {
      suggestions: caseRow.quick_suggestions ?? null,
      versionId: caseRow.quick_suggestions_version_id,
    },
  );

  // Auto-scroll on new version
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [versions.length, refineMut.isPending]);

  const send = async () => {
    const instruction = input.trim();
    if (instruction.length < 2) return;
    try {
      await refineMut.mutateAsync({ case_id: caseRow.id, instruction });
      setInput("");
    } catch (e) {
      const ctx = (e as { context?: Response }).context;
      if (ctx?.status === 429) toast.error("Zu viele Anfragen. Bitte kurz warten.");
      else if (ctx?.status === 402) toast.error("AI-Guthaben aufgebraucht.");
      else toast.error(`Refinement fehlgeschlagen: ${(e as Error).message}`);
    }
  };

  const restore = async (version_id: string) => {
    try {
      await restoreMut.mutateAsync({ case_id: caseRow.id, version_id });
      toast.success("Version wiederhergestellt");
    } catch (e) {
      toast.error(`Wiederherstellen fehlgeschlagen: ${(e as Error).message}`);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] min-h-[600px]">
      {/* Scrollable timeline */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-6 pb-6">
        {/* V0 Initial situation */}
        <InitialBlock caseRow={caseRow} />

        {versionsLoading && versions.length === 0 ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          versions.map((v) => (
            <VersionBlock
              key={v.id}
              version={v}
              labelMap={labelMap}
              isCurrent={v.id === currentVersionId}
              onRestore={() => restore(v.id)}
              restoring={restoreMut.isPending}
            />
          ))
        )}

        {refineMut.isPending && <PendingBlock />}
        <div ref={bottomRef} />
      </div>

      {/* Sticky input */}
      <div className="border-t border-border/30 bg-background pt-4">
        <SuggestionChips
          suggestions={suggestions}
          loading={suggestionsLoading}
          onPick={(p) => setInput(p)}
        />
        <div className="relative bg-card border border-border/30 rounded-sm p-3 mt-3">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-tertiary" />
            <span className="font-mono-label text-tertiary">Refinement Chat</span>
          </div>
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              disabled={refineMut.isPending}
              placeholder="Anweisung zur Anpassung eingeben… (Enter = senden, Shift+Enter = Zeilenumbruch)"
              className="flex-1 bg-transparent focus:outline-none py-2 px-1 font-serif italic text-sm placeholder:text-muted-foreground/60 disabled:opacity-50 resize-none min-h-[44px] max-h-[160px]"
              rows={1}
            />
            <Button
              variant="gold"
              size="sm"
              onClick={send}
              disabled={refineMut.isPending || input.trim().length < 2}
            >
              {refineMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span className="ml-1">Senden</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InitialBlock({ caseRow }: { caseRow: Props["caseRow"] }) {
  return (
    <div className="bg-card border-l-2 border-secondary rounded-sm p-5">
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <p className="font-mono-label text-secondary flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-secondary" /> V0 · INITIAL
        </p>
        <div className="flex gap-3 font-mono-label text-muted-foreground/70 text-[10px]">
          <span>Sprache: {caseRow.language_label ?? "—"}</span>
          <span>·</span>
          <span>Format: {caseRow.medium ?? "—"}</span>
        </div>
      </div>
      <p className="font-serif italic text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
        {caseRow.situation_text || "—"}
      </p>
    </div>
  );
}

function VersionBlock({
  version,
  labelMap,
  isCurrent,
  onRestore,
  restoring,
}: {
  version: CaseVersionRow;
  labelMap: Record<string, string>;
  isCurrent: boolean;
  onRestore: () => void;
  restoring: boolean;
}) {
  const showUserBubble = version.kind !== "initial" && version.user_prompt;
  return (
    <div className="space-y-4">
      {showUserBubble && (
        <div className="flex justify-end">
          <div className="max-w-[80%] bg-tertiary/10 border border-tertiary/30 rounded-sm px-4 py-3">
            <div className="flex items-center gap-2 mb-1.5">
              <User className="w-3 h-3 text-tertiary" />
              <span className="font-mono-label text-tertiary text-[10px]">
                {version.kind === "restore" ? "RESTORE" : "STRATEGIST"}
              </span>
            </div>
            <p className="font-serif italic text-sm text-foreground/90">{version.user_prompt}</p>
          </div>
        </div>
      )}

      <div className="bg-card border border-border/30 rounded-sm p-5">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <p className="font-mono-label text-primary flex items-center gap-2">
            <Bot className="w-3.5 h-3.5" /> V{version.version_number} · {version.kind.toUpperCase()}
            {isCurrent && <span className="text-[10px] text-tertiary ml-2">● AKTIV</span>}
          </p>
          <div className="flex items-center gap-2">
            {version.draft && (
              <Button
                variant="gold-outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(version.draft ?? "");
                  toast.success("Entwurf kopiert");
                }}
              >
                <Copy className="w-3 h-3" />
              </Button>
            )}
            {!isCurrent && (
              <Button variant="ghost" size="sm" onClick={onRestore} disabled={restoring}>
                <History className="w-3 h-3" /> Wiederherstellen
              </Button>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Analysis */}
          <div className="bg-background/50 border-l border-secondary/60 rounded-sm p-3">
            <p className="font-mono-label text-secondary text-[10px] mb-2">ANALYSE</p>
            {Array.isArray(version.analysis) && version.analysis.length > 0 ? (
              <ul className="space-y-2 text-xs text-foreground/85 leading-relaxed">
                {(version.analysis as string[]).map((it, i) => (
                  <li key={i} className="flex gap-2">
                    <Diamond className="w-2 h-2 text-secondary mt-1 shrink-0" fill="currentColor" />
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="font-mono-label text-muted-foreground/60 text-[10px]">—</p>
            )}
          </div>
          {/* Strategy */}
          <div className="bg-background/50 border-l border-primary/60 rounded-sm p-3">
            <p className="font-mono-label text-primary text-[10px] mb-2">STRATEGIE</p>
            <p className="text-xs text-foreground/85 leading-relaxed whitespace-pre-line">
              {version.strategy ?? "—"}
            </p>
          </div>
          {/* Draft */}
          <div className="bg-background/50 border-l border-tertiary/60 rounded-sm p-3">
            <p className="font-mono-label text-tertiary text-[10px] mb-2">ENTWURF</p>
            <p className="font-serif italic text-xs text-foreground/90 leading-relaxed whitespace-pre-line">
              {version.draft ?? "—"}
            </p>
          </div>
        </div>

        {version.strategy_labels && version.strategy_labels.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {version.strategy_labels.map((k) => (
              <span
                key={k}
                className="px-2 py-1 bg-primary/10 border border-primary/30 rounded-sm font-mono-label text-primary text-[10px]"
              >
                {labelMap[k] ?? k}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PendingBlock() {
  return (
    <div className="bg-card border border-dashed border-border/40 rounded-sm p-5">
      <div className="flex items-center gap-2 mb-3">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
        <span className="font-mono-label text-primary text-[10px]">REFINEMENT LÄUFT…</span>
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    </div>
  );
}

function SuggestionChips({
  suggestions,
  loading,
  onPick,
}: {
  suggestions: QuickSuggestion[] | null;
  loading: boolean;
  onPick: (prompt: string) => void;
}) {
  if (loading || !suggestions) {
    return (
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-32" />
        ))}
      </div>
    );
  }
  if (suggestions.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {suggestions.map((s, i) => (
        <button
          key={i}
          onClick={() => onPick(s.prompt)}
          title={s.prompt}
          className="px-3 py-1.5 border border-border/40 rounded-sm font-mono-label text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors text-[11px]"
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}