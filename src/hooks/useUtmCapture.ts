import { useEffect } from "react";
import { captureUtmFromUrl } from "@/lib/utm";

/** Captures utm_* / gclid / fbclid from the current URL on mount. */
export function useUtmCapture() {
  useEffect(() => {
    captureUtmFromUrl();
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