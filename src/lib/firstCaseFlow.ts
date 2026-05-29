/**
 * Phase 2 — Perfect First Case Flow.
 *
 * The landing page can stash two hints in sessionStorage:
 *   - `pallanx_prefill`    : free-text situation typed into the hero input
 *   - `pallanx_case_type`  : key of one of the use-case cards
 *
 * After signup/login we want to skip the dashboard and drop the user
 * directly into a pre-filled new case so they hit the "aha" moment fast.
 */

export const PREFILL_KEY = "pallanx_prefill";
export const CASE_TYPE_KEY = "pallanx_case_type";

export const CASE_TYPE_LABELS: Record<string, string> = {
  honorar: "Honorarerhöhung beim Bestandskunden",
  projektpreis: "Projektpreis verteidigen",
  vertrag: "Vertrag prüfen",
  rabatt: "Kunde will Rabatt",
  gehalt: "Gehalts- oder Konditionsgespräch",
  konflikt: "Konflikt mit Auftraggeber",
};

export function hasFirstCasePrefill(): boolean {
  try {
    return (
      !!sessionStorage.getItem(PREFILL_KEY) ||
      !!sessionStorage.getItem(CASE_TYPE_KEY)
    );
  } catch {
    return false;
  }
}

/** Returns the URL to navigate to after a successful auth handshake. */
export function postAuthRedirect(defaultUrl = "/app/dashboard"): string {
  return hasFirstCasePrefill() ? "/app/case/new" : defaultUrl;
}

export type FirstCasePrefill = {
  situation: string;
  caseTypeKey: string | null;
  caseTypeLabel: string | null;
};

/** Reads the prefill hints AND clears them so a refresh won't replay. */
export function consumeFirstCasePrefill(): FirstCasePrefill | null {
  try {
    const situation = sessionStorage.getItem(PREFILL_KEY) ?? "";
    const caseTypeKey = sessionStorage.getItem(CASE_TYPE_KEY);
    if (!situation && !caseTypeKey) return null;
    sessionStorage.removeItem(PREFILL_KEY);
    sessionStorage.removeItem(CASE_TYPE_KEY);
    const caseTypeLabel = caseTypeKey ? CASE_TYPE_LABELS[caseTypeKey] ?? null : null;
    return { situation, caseTypeKey, caseTypeLabel };
  } catch {
    return null;
  }
}