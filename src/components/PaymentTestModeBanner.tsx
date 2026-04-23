const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as
  | string
  | undefined;

export function PaymentTestModeBanner() {
  if (!clientToken?.startsWith("pk_test_")) return null;

  return (
    <div className="w-full bg-primary/10 border-b border-primary/30 px-4 py-2 text-center text-xs font-sans uppercase tracking-[0.2em] text-primary">
      Test-Modus aktiv — alle Zahlungen sind simuliert.{" "}
      <a
        href="https://docs.lovable.dev/features/payments#test-and-live-environments"
        target="_blank"
        rel="noopener noreferrer"
        className="underline"
      >
        Mehr
      </a>
    </div>
  );
}