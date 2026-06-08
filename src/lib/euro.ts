/** Parse a German-style euro input ("1.234,56" or "129,5" or "129.50") to a number. */
export function parseEuroInput(s: string): number | null {
  if (s == null) return null;
  const trimmed = String(s).trim();
  if (!trimmed) return null;
  // Remove currency symbols and whitespace
  let v = trimmed.replace(/[€\s]/g, "");
  const hasComma = v.includes(",");
  const hasDot = v.includes(".");
  if (hasComma && hasDot) {
    // assume "." thousand separator, "," decimal
    v = v.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    v = v.replace(",", ".");
  }
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function formatEuro(n: number | null | undefined): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(Number(n) || 0);
}

export function formatEuroPlain(n: number | null | undefined): string {
  return new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);
}