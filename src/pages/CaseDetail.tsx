import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Bot, Check, ChevronDown, ChevronsUpDown, Copy, Diamond, Loader2, Send, Sparkles, Star, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { LANGUAGES, MEDIUMS } from "@/lib/languages";
import { supabase } from "@/integrations/supabase/client";
import { UpgradeModal } from "@/components/UpgradeModal";
import { useAuth } from "@/contexts/AuthContext";
import { useCase, useCaseRealtime, useCreateCase, useUpdateCase } from "@/hooks/useCases";
import {
  useCaseAttachments,
  useDeleteAttachment,
  useUploadAttachment,
  type CaseAttachment,
} from "@/hooks/useCaseAttachments";

type StageState = "pending" | "running" | "complete" | "failed";
type Tier = "free" | "pro" | "elite";

function tierFromPlanId(id: string | undefined): Tier {
  if (id === "elite") return "elite";
  if (id === "pro") return "pro";
  return "free";
}

const PLAN_BADGE: Record<Tier, { label: string; tone: string; icon?: typeof Star }> = {
  free: { label: "Single-Model · Gemini Flash-Lite", tone: "text-muted-foreground" },
  pro: { label: "Single-Model · Claude Sonnet 4.5", tone: "text-primary" },
  elite: { label: "Multi-Stage Pipeline · 3 Models", tone: "text-primary", icon: Star },
};

const STAGE_LABELS = {
  analysis: { idle: "Analyse-Modul", running: "Analyse läuft…", done: "Analyse-Modul Active", hint: "Extrahiere Machtdynamik…" },
  strategy: { idle: "Strategie-Entwurf", running: "Strategie wird berechnet…", done: "Strategie-Entwurf", hint: "Wähle taktisches Framework…" },
  draft:    { idle: "Finaler Entwurf",  running: "Formuliere Draft…", done: "Finaler Entwurf", hint: "Verfasse Kommunikation…" },
} as const;

const CaseDetail = () => {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const tier = tierFromPlanId(profile?.plan_id);
  const isMultiStage = tier === "elite";
  const maxAttachments = tier === "free" ? 1 : 10;

  // ---- Case id / loaders ----
  const createMut = useCreateCase();
  const uploadMut = useUploadAttachment();
  const deleteAttMut = useDeleteAttachment();
  const caseId = routeId !== "new" ? routeId : undefined;
  const { data: caseRow } = useCase(caseId);
  const updateMut = useUpdateCase();
  const { data: serverAttachments } = useCaseAttachments(caseId);

  // ---- Local state ----
  const [situation, setSituation] = useState("");
  const [medium, setMedium] = useState<string>("email");
  const [languageCode, setLanguageCode] = useState<string>("de");
  const [languageLabel, setLanguageLabel] = useState<string>("Deutsch");
  const [langOpen, setLangOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [refinement, setRefinement] = useState("");
  const [refining, setRefining] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [stageState, setStageState] = useState<{ analysis: StageState; strategy: StageState; draft: StageState }>({
    analysis: "pending",
    strategy: "pending",
    draft: "pending",
  });
  const [stageMeta, setStageMeta] = useState<{ failed_at?: "analysis"|"strategy"|"draft"; error?: string }>({});

  // Hydrate form once when case loads
  useEffect(() => {
    if (!caseRow) return;
    if (caseRow.situation_text && situation === "") setSituation(caseRow.situation_text);
    const mediumVal = (caseRow as unknown as { medium?: string }).medium;
    const langCode = (caseRow as unknown as { language_code?: string }).language_code;
    const langLabel = (caseRow as unknown as { language_label?: string }).language_label;
    if (mediumVal) setMedium(mediumVal);
    if (langCode) setLanguageCode(langCode);
    if (langLabel) setLanguageLabel(langLabel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseRow?.id]);

  // Realtime: only while pipeline is running
  useCaseRealtime(caseId, loading);

  // Derive stage states from realtime case row while running (multi-stage only)
  useEffect(() => {
    if (!loading || !isMultiStage || !caseRow) return;
    setStageState((prev) => ({
      analysis: caseRow.analysis && caseRow.analysis.length > 0 ? "complete" : prev.analysis,
      strategy: caseRow.strategy ? "complete" : prev.strategy,
      draft: caseRow.draft ? "complete" : prev.draft,
    }));
  }, [caseRow, loading, isMultiStage]);

  // ---- Persist situation_text on blur ----
  const persistSituation = () => {
    if (!caseId || !situation || situation === caseRow?.situation_text) return;
    updateMut.mutate({ id: caseId, patch: { situation_text: situation } });
  };

  const addFiles = (files: FileList | File[]) => {
    const accepted = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
    const MAX_SIZE = 10 * 1024 * 1024;
    const existing = (serverAttachments?.length ?? 0) + pendingFiles.length;
    const capacity = Math.max(0, maxAttachments - existing);
    if (capacity === 0) {
      toast.error(
        tier === "free"
          ? "Free-Plan erlaubt maximal 1 Referenz-Dokument. Upgrade für mehr."
          : `Maximal ${maxAttachments} Anhänge.`,
      );
      return;
    }
    const next: File[] = [];
    for (const f of Array.from(files)) {
      if (next.length >= capacity) break;
      const type = f.type || "";
      const nameLower = f.name.toLowerCase();
      const okType = accepted.includes(type) || /\.(pdf|jpe?g|png)$/i.test(nameLower);
      if (!okType) { toast.error(`"${f.name}" hat ein nicht unterstütztes Format.`); continue; }
      if (f.size > MAX_SIZE) { toast.error(`"${f.name}" ist größer als 10 MB.`); continue; }
      next.push(f);
    }
    if (next.length) setPendingFiles((prev) => [...prev, ...next]);
  };

  const removePendingFile = (i: number) => {
    setPendingFiles((prev) => prev.filter((_, idx) => idx !== i));
  };

  const removeServerAttachment = async (att: CaseAttachment) => {
    try {
      await deleteAttMut.mutateAsync(att);
      toast.success("Anhang entfernt");
    } catch (e) {
      toast.error(`Entfernen fehlgeschlagen: ${(e as Error).message}`);
    }
  };

  // ---- Run pipeline ----
  const runPipeline = async () => {
    if (situation.trim().length < 10) {
      toast.error("Bitte beschreiben Sie die Situation (mind. 10 Zeichen).");
      return;
    }
    if (!user) {
      toast.error("Bitte erneut anmelden.");
      return;
    }

    // Resolve or create case
    let activeCaseId = caseId;
    if (!activeCaseId) {
      try {
        const created = await createMut.mutateAsync({
          situation_text: situation,
          medium,
          language_code: languageCode,
          language_label: languageLabel,
        });
        activeCaseId = created.id;
        navigate(`/app/case/${created.id}`, { replace: true });
      } catch (e) {
        toast.error(`Fall konnte nicht angelegt werden: ${(e as Error).message}`);
        return;
      }
    } else {
      // Persist current form state onto the existing case
      await updateMut
        .mutateAsync({
          id: activeCaseId,
          patch: {
            situation_text: situation,
            medium,
            language_code: languageCode,
            language_label: languageLabel,
          } as Partial<typeof caseRow> as never,
        })
        .catch(() => {});
    }

    // Upload any pending attachments before running the pipeline
    const uploadedIds: string[] = [];
    for (const file of pendingFiles) {
      try {
        const att = await uploadMut.mutateAsync({ caseId: activeCaseId, file });
        uploadedIds.push(att.id);
      } catch (e) {
        toast.error(`Upload "${file.name}" fehlgeschlagen: ${(e as Error).message}`);
      }
    }
    setPendingFiles([]);
    const attachmentIds = [
      ...(serverAttachments?.map((a) => a.id) ?? []),
      ...uploadedIds,
    ];

    setLoading(true);
    setStageMeta({});
    if (isMultiStage) {
      setStageState({ analysis: "running", strategy: "pending", draft: "pending" });
    } else {
      setStageState({ analysis: "running", strategy: "running", draft: "running" });
    }

    try {
      const { data, error } = await supabase.functions.invoke("strategos-ai-router", {
        body: {
          situation_text: situation,
          case_id: activeCaseId,
          medium,
          language_code: languageCode,
          language_label: languageLabel,
          attachment_ids: attachmentIds,
        },
      });

      if (error) {
        const ctx = (error as { context?: Response }).context;
        if (ctx?.status === 401) { toast.error("Sitzung abgelaufen."); navigate("/login"); return; }
        if (ctx?.status === 403) {
          try {
            const body = await ctx.json();
            if (body?.error === "CASE_LIMIT_REACHED") { setShowUpgrade(true); return; }
          } catch { /* ignore */ }
        }
        if (ctx?.status === 502 || ctx?.status === 429) {
          try {
            const body = await ctx.json();
            if (body?.error === "STAGE_FAILED") {
              setStageMeta({ failed_at: body.failed_at, error: body.message });
              setStageState((prev) => ({
                analysis: body.completed_stages?.includes("analysis") ? "complete" : prev.analysis,
                strategy: body.failed_at === "strategy" ? "failed" : body.completed_stages?.includes("strategy") ? "complete" : "pending",
                draft:    body.failed_at === "draft"    ? "failed" : "pending",
              }));
              toast.error(`Pipeline bei Schritt "${body.failed_at}" abgebrochen.`);
              return;
            }
          } catch { /* ignore */ }
        }
        throw error;
      }

      const payload = data as Record<string, unknown> & { error?: string };
      if (payload?.error === "CASE_LIMIT_REACHED") { setShowUpgrade(true); return; }
      if (payload?.error) throw new Error(String(payload.error));

      setStageState({ analysis: "complete", strategy: "complete", draft: "complete" });
      refreshProfile();

      const remaining =
        typeof payload.case_limit === "number" && typeof payload.cases_used === "number"
          ? (payload.case_limit as number) - (payload.cases_used as number)
          : null;
      if (remaining !== null && remaining <= 1 && remaining >= 0) {
        toast.message(`Noch ${remaining} Fall übrig in deinem Plan.`);
      }
      toast.success("Pipeline abgeschlossen");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
      toast.error(`Pipeline-Fehler: ${msg}`);
      setStageState((s) => ({
        analysis: s.analysis === "running" ? "failed" : s.analysis,
        strategy: s.strategy === "running" ? "failed" : s.strategy,
        draft: s.draft === "running" ? "failed" : s.draft,
      }));
    } finally {
      setLoading(false);
    }
  };

  const runRefinement = async () => {
    const text = caseRow?.draft;
    if (!text || !refinement.trim() || !caseId) return;
    setRefining(true);
    try {
      const { data, error } = await supabase.functions.invoke("strategos-refinement", {
        body: { current_draft: text, instruction: refinement.trim() },
      });
      if (error) throw error;
      const next = (data as { refined_draft?: string })?.refined_draft;
      if (next) {
        await updateMut.mutateAsync({ id: caseId, patch: { draft: next } });
        setRefinement("");
        toast.success("Entwurf angepasst");
      }
    } catch (e) {
      toast.error(`Refinement fehlgeschlagen: ${(e as Error).message}`);
    } finally {
      setRefining(false);
    }
  };

  // ---- Render helpers ----
  const planBadge = PLAN_BADGE[tier];
  const PlanIcon = planBadge.icon;

  const segmentClass = (state: StageState, color: "secondary" | "primary" | "tertiary") => {
    const base = "h-1 transition-colors";
    const completeMap = { secondary: "bg-secondary", primary: "bg-primary", tertiary: "bg-tertiary" };
    const runningMap = {
      secondary: "bg-secondary/60 animate-pulse-soft",
      primary: "bg-primary/60 animate-pulse-soft",
      tertiary: "bg-tertiary/60 animate-pulse-soft",
    };
    if (state === "complete") return `${base} ${completeMap[color]}`;
    if (state === "running") return `${base} ${runningMap[color]}`;
    if (state === "failed") return `${base} bg-destructive/70`;
    return `${base} bg-border/30`;
  };

  const analysisItems = useMemo(() => caseRow?.analysis ?? [], [caseRow?.analysis]);

  return (
    <div className="animate-fade-in">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-4">
          <button className="text-muted-foreground hover:text-primary" onClick={() => navigate("/app/dashboard")}>
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div>
            <p className="font-mono-label text-primary text-sm">Case-ID: {caseId?.slice(0, 8) ?? "—"}</p>
            <p className="font-mono-label text-muted-foreground/60 mt-1">
              {caseRow?.title ?? "Initialisierungs-Phase"}
            </p>
          </div>
        </div>

        {/* Plan-Badge */}
        <div className={`flex items-center gap-2 font-mono-label ${planBadge.tone}`}>
          {PlanIcon && <PlanIcon className="w-3.5 h-3.5" fill="currentColor" />}
          <span>{planBadge.label}</span>
        </div>
      </div>

      {/* Progress phases — colored by stage state */}
      <div className="grid grid-cols-3 gap-2 mb-10">
        <div className={segmentClass(stageState.analysis, "secondary")} />
        <div className={segmentClass(stageState.strategy, "primary")} />
        <div className={segmentClass(stageState.draft, "tertiary")} />
      </div>

      <div className="grid lg:grid-cols-2 gap-10">
        {/* Left column */}
        <div className="space-y-8">
          <div>
            <p className="font-mono-label text-primary mb-3">◆ Situationsbeschreibung</p>
            <textarea
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
              onBlur={persistSituation}
              placeholder="Beschreiben Sie hier die aktuelle Verhandlungssituation, die Beteiligten und Ihre bisherigen Schritte…"
              className="w-full min-h-[280px] bg-card border border-border/30 rounded-sm p-5 font-serif italic text-lg text-foreground placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="font-mono-label text-muted-foreground mb-2">Medium</p>
              <button className="w-full flex items-center justify-between bg-transparent border border-border/40 rounded-sm px-4 py-3 font-mono-label text-foreground hover:border-primary/40 transition-colors">
                E-Mail (Formal) <ChevronDown className="w-4 h-4" />
              </button>
            </div>
            <div>
              <p className="font-mono-label text-muted-foreground mb-2">Sprache</p>
              <button className="w-full flex items-center justify-between bg-transparent border border-border/40 rounded-sm px-4 py-3 font-mono-label text-foreground hover:border-primary/40 transition-colors">
                Deutsch (Hoch) <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <p className="font-mono-label text-muted-foreground mb-2">Referenz-Dokumente</p>
            <div className="border border-dashed border-border/40 rounded-sm py-12 flex flex-col items-center justify-center hover:border-primary/40 transition-colors cursor-pointer">
              <Upload className="w-6 h-6 text-muted-foreground mb-3" strokeWidth={1.5} />
              <p className="font-mono-label text-muted-foreground">PDF, JPG oder PNG hochladen</p>
            </div>
          </div>

          {(() => {
            const isCreating = routeId === "new" && !caseId && !createError;
            const tooShort = situation.trim().length < 10;
            const disabled = loading || !caseId || isCreating || tooShort;
            const reason = createError
              ? null
              : isCreating
                ? "Fall wird vorbereitet…"
                : !caseId
                  ? "Fall wird vorbereitet…"
                  : tooShort
                    ? `Bitte mindestens 10 Zeichen eingeben (${situation.trim().length}/10).`
                    : null;
            return (
              <>
                <Button
                  variant="gold"
                  size="xl"
                  className="w-full"
                  onClick={runPipeline}
                  disabled={disabled}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {isMultiStage ? "Multi-Stage Pipeline läuft…" : "Analyzing power dynamics…"}
                    </span>
                  ) : isCreating ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Fall wird angelegt…
                    </span>
                  ) : (
                    <>▸ Pipeline Starten</>
                  )}
                </Button>

                {reason && !loading && (
                  <p className="text-center font-mono-label text-muted-foreground/70 mt-2">
                    {reason}
                  </p>
                )}

                {createError && (
                  <div className="mt-3 border border-destructive/40 bg-destructive/5 rounded-sm p-4 flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="font-mono-label text-destructive mb-1">Fall konnte nicht angelegt werden</p>
                      <p className="text-sm text-muted-foreground mb-3">{createError}</p>
                      <Button variant="gold-outline" size="sm" onClick={triggerCreate}>
                        <RefreshCcw className="w-3.5 h-3.5" /> Erneut versuchen
                      </Button>
                    </div>
                  </div>
                )}

                {loading && !isMultiStage && (
                  <p className="text-center font-mono-label text-muted-foreground/70 mt-2">Analyse wird durchgeführt…</p>
                )}
              </>
            );
          })()}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Analyse */}
          <StageBox
            colorClass="border-secondary"
            dotClass="bg-secondary"
            labelTone="text-secondary"
            label={STAGE_LABELS.analysis}
            state={stageState.analysis}
            modelHint={isMultiStage ? "claude-sonnet-4-5" : caseRow?.model_used ?? ""}
          >
            {stageState.analysis === "complete" && analysisItems.length > 0 ? (
              <ul className="space-y-3 text-sm text-foreground/90 leading-relaxed">
                {analysisItems.map((item, i) => (
                  <li key={i} className="flex gap-3">
                    <Diamond className="w-3 h-3 text-secondary mt-1.5 shrink-0" fill="currentColor" />
                    <p>{item}</p>
                  </li>
                ))}
              </ul>
            ) : stageState.analysis === "running" ? (
              <ShimmerLines lines={3} />
            ) : stageState.analysis === "failed" ? (
              <FailedNote stage="analysis" />
            ) : (
              <PendingNote text="Wartet auf Pipeline-Start." />
            )}
          </StageBox>

          {/* Strategie */}
          <StageBox
            colorClass="border-primary"
            dotClass="bg-primary"
            labelTone="text-primary"
            label={STAGE_LABELS.strategy}
            state={stageState.strategy}
            modelHint={isMultiStage ? "gpt-5" : ""}
          >
            {stageState.strategy === "complete" && caseRow?.strategy ? (
              <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">{caseRow.strategy}</p>
            ) : stageState.strategy === "running" ? (
              <ShimmerLines lines={2} />
            ) : stageState.strategy === "failed" ? (
              <FailedNote stage="strategy" />
            ) : (
              <PendingNote text="Wartet…" />
            )}
          </StageBox>

          {/* Final */}
          <StageBox
            colorClass="border-tertiary"
            dotClass="bg-tertiary"
            labelTone="text-tertiary"
            label={STAGE_LABELS.draft}
            state={stageState.draft}
            modelHint={isMultiStage ? "claude-sonnet-4-5" : ""}
            actionRight={
              caseRow?.draft && stageState.draft === "complete" ? (
                <Button
                  variant="gold-outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(caseRow.draft ?? "");
                    toast.success("Entwurf kopiert");
                  }}
                >
                  <Copy className="w-3 h-3" /> Kopieren
                </Button>
              ) : null
            }
          >
            {stageState.draft === "complete" && caseRow?.draft ? (
              <p className="font-serif italic text-base leading-relaxed text-foreground/90 whitespace-pre-line">
                {caseRow.draft}
              </p>
            ) : stageState.draft === "running" ? (
              <ShimmerLines lines={4} />
            ) : stageState.draft === "failed" ? (
              <FailedNote stage="draft" />
            ) : (
              <PendingNote text="Wartet…" />
            )}
          </StageBox>

          {stageMeta.failed_at && (
            <Button variant="gold-outline" className="w-full" onClick={runPipeline}>
              <Sparkles className="w-3.5 h-3.5" /> Pipeline erneut starten
            </Button>
          )}

          {/* Refinement chat */}
          {caseRow?.draft && stageState.draft === "complete" && (
            <div className="bg-card border border-border/30 rounded-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-8 h-8 rounded-full bg-tertiary/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-tertiary" strokeWidth={1.5} />
                </span>
                <p className="font-mono-label text-tertiary">Refinement Chat</p>
              </div>
              <div className="bg-muted/40 rounded-sm p-4 mb-4">
                <p className="font-serif italic text-sm text-foreground/80 leading-relaxed">
                  Möchten Sie den Tonfall anpassen oder die Argumentation verschärfen?
                </p>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {["Aggressiver", "Kürzer fassen", "Mehr Empathie"].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setRefinement(tag)}
                    className="px-3 py-1.5 border border-border/40 rounded-sm font-mono-label text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <div className="relative">
                <input
                  value={refinement}
                  onChange={(e) => setRefinement(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runRefinement()}
                  disabled={refining}
                  placeholder="Anweisung zur Anpassung eingeben…"
                  className="w-full bg-transparent border-b border-border/40 focus:border-primary/40 focus:outline-none py-3 pr-10 font-serif italic text-sm placeholder:text-muted-foreground/60 disabled:opacity-50"
                />
                <button
                  onClick={runRefinement}
                  disabled={refining || refinement.trim().length < 2}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-tertiary hover:text-primary disabled:opacity-40"
                >
                  {refining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <UpgradeModal open={showUpgrade} onOpenChange={setShowUpgrade} />
    </div>
  );
};

export default CaseDetail;

// ============= Sub-components =============

function StageBox({
  colorClass, dotClass, labelTone, label, state, modelHint, actionRight, children,
}: {
  colorClass: string;
  dotClass: string;
  labelTone: string;
  label: { idle: string; running: string; done: string; hint: string };
  state: StageState;
  modelHint?: string;
  actionRight?: React.ReactNode;
  children: React.ReactNode;
}) {
  const labelText =
    state === "running" ? label.running :
    state === "complete" ? label.done :
    state === "failed" ? "UNTERBROCHEN" :
    label.idle;

  return (
    <div className={`bg-card border-l-2 ${colorClass} rounded-sm p-6`}>
      <div className="flex items-center justify-between mb-4 gap-3">
        <p className={`font-mono-label ${state === "failed" ? "text-destructive" : labelTone} flex items-center gap-2`}>
          <span className={`w-2 h-2 rounded-full ${state === "failed" ? "bg-destructive" : dotClass} ${state === "running" ? "animate-pulse-soft" : ""}`} />
          {labelText}
        </p>
        {actionRight ?? (
          <span className="font-mono-label text-muted-foreground/60 truncate max-w-[55%]">
            {state === "running" ? label.hint : state === "complete" ? modelHint : state === "failed" ? "Stage abgebrochen" : "Wartet"}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function ShimmerLines({ lines }: { lines: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-3 rounded-sm bg-muted/40 animate-pulse" style={{ width: `${70 + (i % 3) * 10}%` }} />
      ))}
    </div>
  );
}

function PendingNote({ text }: { text: string }) {
  return <p className="font-mono-label text-muted-foreground/50">{text}</p>;
}

function FailedNote({ stage }: { stage: string }) {
  return (
    <p className="font-mono-label text-destructive/80">
      Pipeline bei Schritt "{stage}" abgebrochen.
    </p>
  );
}