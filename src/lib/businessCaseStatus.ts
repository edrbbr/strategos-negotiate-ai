export type BusinessCaseStatus = "open" | "in_review" | "waiting_approval" | "closed" | "rejected";

export const statusLabel: Record<BusinessCaseStatus, string> = {
  open: "Offen",
  in_review: "In Bearbeitung",
  waiting_approval: "In Eskalation",
  closed: "Abgeschlossen",
  rejected: "Abgelehnt",
};

export const statusVariant: Record<BusinessCaseStatus, "default" | "secondary" | "destructive" | "outline"> = {
  open: "secondary",
  in_review: "default",
  waiting_approval: "destructive",
  closed: "outline",
  rejected: "outline",
};