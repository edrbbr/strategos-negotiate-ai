import { useEffect } from "react";
import { captureUtmFromUrl } from "@/lib/utm";
import { initGtag } from "@/lib/gtag";

/** Captures utm_* / gclid / fbclid from the current URL on mount. */
export function useUtmCapture() {
  useEffect(() => {
    captureUtmFromUrl();
    // Consent-gated; no-op until VITE_ENABLE_GTAG + marketing consent.
    initGtag();
  }, []);
}

/** Keeps document.documentElement.lang in sync. */
export function useHtmlLang(lang: string = "de") {
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
    }
  }, [lang]);
}