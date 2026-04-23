import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  Banknote,
  Briefcase,
  Car,
  ChevronRight,
  FileText,
  Handshake,
  Home,
  Loader2,
  MoreVertical,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useArchiveCase, useDeleteCase, type CaseRow } from "@/hooks/useCases";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ICON_MAP = {
  car: Car,
  home: Home,
  cash: Banknote,
  briefcase: Briefcase,
  handshake: Handshake,
  document: FileText,
} as const;

/** Heuristic agent label derived from case state (no agent_type column). */
function deriveAgent(c: CaseRow): { label: string; classes: string } {
  if (c.draft) return { label: "Agent: Execution", classes: "text-tertiary border-tertiary/40" };
  if (c.strategy || c.analysis) return { label: "Agent: Strategie", classes: "text-primary border-primary/40" };
  return { label: "Agent: Analyse", classes: "text-secondary border-secondary/40" };
}

function initialsOf(name: string | null | undefined) {
  const src = (name ?? "").trim() || "U";
  return src
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface Props {
  caseRow: CaseRow;
  ownerName: string | null | undefined;
  isArchived?: boolean;
}

export const CaseCard = ({ caseRow, ownerName, isArchived }: Props) => {
  const navigate = useNavigate();
  const archiveMut = useArchiveCase();
  const deleteMut = useDeleteCase();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const Icon = ICON_MAP[caseRow.icon_hint] ?? Briefcase;
  const agent = deriveAgent(caseRow);
  const idShort = caseRow.id.slice(0, 6).toUpperCase();
  const preview = caseRow.situation_text?.trim() || "Noch keine Situationsbeschreibung erfasst.";
  const busy = archiveMut.isPending || deleteMut.isPending;

  const handleArchiveToggle = (e: Event) => {
    e.preventDefault();
    archiveMut.mutate(
      { id: caseRow.id, archived: !isArchived },
      {
        onSuccess: () => toast.success(isArchived ? "Fall reaktiviert" : "Fall archiviert"),
        onError: (err) => toast.error(`Fehler: ${(err as Error).message}`),
      },
    );
  };

  const handleDelete = () => {
    deleteMut.mutate(caseRow.id, {
      onSuccess: () => {
        toast.success("Fall gelöscht");
        setConfirmOpen(false);
      },
      onError: (err) => toast.error(`Löschen fehlgeschlagen: ${(err as Error).message}`),
    });
  };

  return (
    <>
      <div className="group relative bg-card border border-border/30 hover:border-primary/40 p-7 rounded-sm transition-colors flex flex-col">
        <div className="flex items-start justify-between mb-6">
          <span className={cn("font-mono-label border px-3 py-1", agent.classes)}>
            {agent.label}
          </span>
          <div className="flex items-center gap-2 text-muted-foreground/40">
            <span className="font-mono-label">ID: {idShort}</span>
            <Icon className="w-5 h-5" strokeWidth={1.5} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-1 rounded-sm text-muted-foreground/60 hover:text-primary hover:bg-primary/5 transition-colors"
                  aria-label="Aktionen"
                  disabled={busy}
                  onClick={(e) => e.stopPropagation()}
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoreVertical className="w-4 h-4" />}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border border-border/40">
                <DropdownMenuItem onSelect={handleArchiveToggle}>
                  {isArchived ? "Aus Archiv holen" : "Archivieren"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    setConfirmOpen(true);
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  Fall löschen
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Link to={`/app/case/${caseRow.id}`} className="flex-1 flex flex-col">
          <h3 className="font-serif text-2xl mb-3 leading-snug line-clamp-2">{caseRow.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-8 flex-1 line-clamp-2">
            {preview}
          </p>
          <div className="flex items-center justify-between pt-6 border-t border-border/20">
            <span
              className="w-7 h-7 rounded-full bg-primary/15 border border-primary/40 flex items-center justify-center text-[10px] font-sans tracking-widest text-primary"
              title={ownerName ?? ""}
            >
              {initialsOf(ownerName)}
            </span>
            <span className="font-mono-label text-primary group-hover:translate-x-1 transition-transform flex items-center gap-2">
              Öffnen <ChevronRight className="w-4 h-4" />
            </span>
          </div>
        </Link>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fall unwiderruflich löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Dieser Schritt ist endgültig. Alle Analyse-Ergebnisse, Strategie- und Draft-Inhalte
              werden vollständig gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMut.isPending}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleteMut.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteMut.isPending ? "Lösche…" : "Endgültig löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};