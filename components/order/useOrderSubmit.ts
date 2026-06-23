'use client';

/**
 * useOrderSubmit
 *
 * Encapsulates the order/subscription submission logic shared by the
 * confirmation page. Extracted from the legacy multi-step OrderFlow so the
 * simplified 2-page flow can reuse it without duplication.
 *
 * Behaviour notes:
 * - One-time orders reset the order store immediately after success.
 * - Subscriptions DEFER the reset to the thank-you page so the deferred
 *   personalization step can still read the chosen size/dietary values from
 *   the store when saving preferences.
 */

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOrderStore, getOrderInput } from '@/store/orderStore';
import { useAuthStore } from '@/store/authStore';
import { transformOrderToApiRequest, transformOrderToSubscriptionRequest } from '@/lib/order';
import { isSubscriptionBox } from '@/lib/catalog';

export function useOrderSubmit() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const submit = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      let currentInput = getOrderInput();
      const isSubscription = isSubscriptionBox(currentInput.boxType);
      let responseData: Record<string, unknown>;

      if (isSubscription) {
        // Subscriptions require a saved address. Persist an inline address first.
        if (!currentInput.selectedAddressId) {
          const addressPayload: Record<string, unknown> = {
            ...currentInput.address,
            deliveryMethod: currentInput.deliveryMethod,
          };
          if (
            (currentInput.deliveryMethod === 'speedy_office' ||
              currentInput.deliveryMethod === 'speedy_automat') &&
            currentInput.speedyOffice
          ) {
            addressPayload.speedyOfficeId = currentInput.speedyOffice.id;
            addressPayload.speedyOfficeName = currentInput.speedyOffice.name;
            addressPayload.speedyOfficeAddress = currentInput.speedyOffice.address;
          }
          const addrRes = await fetch('/api/address', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(addressPayload),
          });
          const addrData = await addrRes.json();
          if (!addrRes.ok || !addrData.address?.id) {
            throw new Error(addrData.error || 'Грешка при запазване на адреса');
          }
          currentInput = { ...currentInput, selectedAddressId: addrData.address.id };
          useOrderStore.getState().setSelectedAddressId(addrData.address.id);
        }

        const subscriptionRequest = transformOrderToSubscriptionRequest(currentInput);
        const response = await fetch('/api/subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscriptionRequest),
        });
        responseData = await response.json();

        if (!responseData.success) {
          throw new Error(
            (responseData.error as string) || 'Създаването на абонамент не беше успешно',
          );
        }

        const sub = responseData.subscription as Record<string, unknown>;
        sessionStorage.setItem(
          'fitflow-last-order',
          JSON.stringify({
            orderNumber: null,
            orderId: null,
            subscriptionId: sub.id,
            email: currentInput.email || user?.email,
            isGuest: false,
            isSubscription: true,
            boxType: currentInput.boxType,
            finalPriceEur: sub.current_price_eur ?? null,
            capiEventId: responseData.capiEventId ?? null,
          }),
        );

        // NOTE: store is intentionally NOT reset here — the thank-you page's
        // deferred personalization step needs the chosen size/dietary values.
      } else {
        const apiRequest = transformOrderToApiRequest(currentInput);
        const response = await fetch('/api/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiRequest),
        });
        responseData = await response.json();

        if (!responseData.success) {
          throw new Error(
            (responseData.error as string) || 'Изпращането на поръчката не беше успешно',
          );
        }

        sessionStorage.setItem(
          'fitflow-last-order',
          JSON.stringify({
            orderNumber: responseData.orderNumber,
            orderId: responseData.orderId,
            email: currentInput.email || user?.email,
            isGuest: currentInput.isGuest,
            isSubscription: false,
            finalPriceEur: responseData.finalPriceEur ?? null,
            boxType: currentInput.boxType,
            capiEventId: responseData.capiEventId ?? null,
          }),
        );

        // One-time orders are fully complete — clear the store now.
        useOrderStore.getState().reset();
      }

      router.push('/order/thank-you');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Възникна неочаквана грешка');
      setIsSubmitting(false);
      inFlight.current = false;
    }
  }, [router, user?.email]);

  return { submit, isSubmitting, submitError };
}
