// UTM + click-id capture helper.
// Stores attribution from URL params in localStorage for 30 days, so leads,
// registrations and checkouts created later in the session can still be
// attributed to the original traffic source.

const STORAGE_KEY = "pallanx_utm";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;

const CLICK_ID_KEYS = ["gclid", "fbclid"] as const;

export type UtmPayload = Partial<
  Record<(typeof UTM_KEYS)[number] | (typeof CLICK_ID_KEYS)[number] | "referrer", string>
>;

interface StoredUtm {
  data: UtmPayload;
  storedAt: number;
}

function safeLocalStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Reads utm_* / gclid / fbclid from the current URL and persists them.
 *  Existing values are kept unless the new URL provides at least one
 *  attribution param (first-touch semantics within the TTL window). */
export function captureUtmFromUrl(): UtmPayload {
  const storage = safeLocalStorage();
  if (!storage || typeof window === "undefined") return {};

  const params = new URLSearchParams(window.location.search);
  const fresh: UtmPayload = {};
  for (const k of UTM_KEYS) {
    const v = params.get(k);
    if (v) fresh[k] = v.slice(0, 200);
  }
  for (const k of CLICK_ID_KEYS) {
    const v = params.get(k);
    if (v) fresh[k] = v.slice(0, 200);
  }

  const hasFresh = Object.keys(fresh).length > 0;
  const existing = getStoredUtm();

  // Only overwrite when fresh attribution arrives; otherwise extend nothing.
  if (!hasFresh) return existing;

  const referrer =
    typeof document !== "undefined" && document.referrer
      ? document.referrer.slice(0, 500)
      : undefined;

  const merged: UtmPayload = { ...fresh, ...(referrer ? { referrer } : {}) };
  const payload: StoredUtm = { data: merged, storedAt: Date.now() };
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota errors */
  }
  return merged;
}

/** Returns the stored UTM payload or {} if absent / expired. */
export function getStoredUtm(): UtmPayload {
  const storage = safeLocalStorage();
  if (!storage) return {};
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoredUtm;
    if (!parsed?.storedAt || Date.now() - parsed.storedAt > TTL_MS) {
      storage.removeItem(STORAGE_KEY);
      return {};
    }
    return parsed.data ?? {};
  } catch {
    return {};
  }
}

/** Convenience: returns stored UTM ready to send to an edge function. */
export function utmForSubmit(): { utm: UtmPayload; referrer?: string } {
  const utm = getStoredUtm();
  const referrer =
    typeof document !== "undefined" && document.referrer
      ? document.referrer.slice(0, 500)
      : undefined;
  return { utm, referrer };
}