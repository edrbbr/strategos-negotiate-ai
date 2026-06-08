// Google Ads / GA4 wrapper — INACTIVE by default.
// Enable by setting VITE_ENABLE_GTAG=true and VITE_GTAG_ID="AW-XXXXXXX" or "G-XXXXXXX".
// Until then every function is a no-op, so we can safely call trackGtagConversion()
// from app code without side effects.

const ENABLED =
  import.meta.env.VITE_ENABLE_GTAG === "true" &&
  typeof import.meta.env.VITE_GTAG_ID === "string" &&
  import.meta.env.VITE_GTAG_ID.length > 0;

const GTAG_ID = import.meta.env.VITE_GTAG_ID as string | undefined;
const CONSENT_KEY = "pallanx-cookie-consent";

/** Returns true only when the user has actively granted marketing consent. */
export function hasMarketingConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { marketing?: boolean };
    return parsed?.marketing === true;
  } catch {
    return false;
  }
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let initialised = false;

export function initGtag() {
  if (!ENABLED || initialised || typeof window === "undefined" || !GTAG_ID) return;
  // Hard block: never load Google scripts before marketing consent.
  if (!hasMarketingConsent()) return;
  initialised = true;

  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GTAG_ID}`;
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer!.push(args);
  };
  window.gtag("js", new Date());
  window.gtag("config", GTAG_ID);
}

export function trackGtagConversion(label: string, value?: number, currency = "EUR") {
  if (!ENABLED || typeof window === "undefined" || !window.gtag || !GTAG_ID) return;
  if (!hasMarketingConsent()) return;
  window.gtag("event", "conversion", {
    send_to: `${GTAG_ID}/${label}`,
    ...(value !== undefined ? { value, currency } : {}),
  });
}

export const isGtagEnabled = () => ENABLED;