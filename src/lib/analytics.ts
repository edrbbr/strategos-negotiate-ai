import { supabase } from "@/integrations/supabase/client";

/**
 * Phase 4 — Conversion analytics.
 *
 * Fire-and-forget event tracking against `analytics_events`. Anonymous
 * visitors get a stable session id stored in localStorage; logged-in users
 * carry user_id via auth context (we read it from the current session at
 * call time so callers don't have to thread it through).
 */

const SESSION_KEY = "pallanx_anon_session";

function getOrCreateSessionId(): string {
  try {
    const existing = localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const next = (crypto.randomUUID?.() ?? `s_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    localStorage.setItem(SESSION_KEY, next);
    return next;
  } catch {
    return `s_${Date.now()}`;
  }
}

export type AnalyticsEvent =
  | "landing_view"
  | "hero_input_submitted"
  | "use_case_clicked"
  | "register_started"
  | "register_completed"
  | "login_completed"
  | "first_case_started"
  | "case_started"
  | "case_completed"
  | "case_limit_hit"
  | "upgrade_modal_shown"
  | "upgrade_cta_clicked"
  | "checkout_started"
  | "checkout_completed"
  | "linkedin_consent_shown"
  | "linkedin_consent_accepted"
  | "linkedin_consent_declined";

export function track(event: AnalyticsEvent, properties: Record<string, unknown> = {}): void {
  // Fire-and-forget. Failures must never block UX.
  void (async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const user_id = data.session?.user?.id ?? null;
      await supabase.from("analytics_events").insert([
        {
          user_id,
          session_id: getOrCreateSessionId(),
          event_name: event,
          properties: properties as never,
          path: typeof window !== "undefined" ? window.location.pathname : null,
        } as never,
      ]);
    } catch {
      /* swallow */
    }
  })();
}