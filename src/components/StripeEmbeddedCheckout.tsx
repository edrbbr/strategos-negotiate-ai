import { forwardRef } from "react";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";

interface StripeEmbeddedCheckoutProps {
  priceId: string;
  quantity?: number;
  customerEmail?: string;
  returnUrl: string;
  discountCode?: string;
}

export const StripeEmbeddedCheckoutComponent = forwardRef<
  HTMLDivElement,
  StripeEmbeddedCheckoutProps
>(function StripeEmbeddedCheckoutComponent(
  { priceId, quantity, customerEmail, returnUrl, discountCode },
  ref,
) {
  const fetchClientSecret = async (): Promise<string> => {
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: {
        priceId,
        quantity,
        customerEmail,
        returnUrl,
        environment: getStripeEnvironment(),
        ...(discountCode ? { discountCode } : {}),
      },
    });
    if (error || !data?.clientSecret) {
      throw new Error(
        error?.message || "Konnte Checkout-Session nicht erstellen",
      );
    }
    return data.clientSecret as string;
  };

  const checkoutOptions = { fetchClientSecret };

  return (
    <div id="stripe-checkout" ref={ref}>
      <EmbeddedCheckoutProvider
        stripe={getStripe()}
        options={checkoutOptions}
      >
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
});