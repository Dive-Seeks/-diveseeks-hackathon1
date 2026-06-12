"use client";

import * as React from "react";
import { usePaymentIntegrationStore } from "@/lib/payment-integration-store";
import AlertMultipleActionDemo from "@/components/shadcn-studio/alert/alert-08";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth-store";
import { usePathname } from "next/navigation";

export function PaymentIntegrationAlert() {
  const pathname = usePathname();
  const isExcludedPage = pathname === "/setup-business" || pathname.startsWith("/store/");

  const {
    isSubmitted,
    isPaymentIntegrated,
    setSubmitted,
    setPaymentIntegrated,
  } = usePaymentIntegrationStore();
  const { isAuthenticated, isHydrated } = useAuthStore();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    // If authenticated and mounted, we check if the user has any submitted stores
    // This handles the case where they submitted in another tab or just logged in
    async function checkSubmittedStores() {
      if (mounted && isHydrated && isAuthenticated) {
        try {
          const response = await apiClient.get<any>(
            "/businesses/store/submitted",
            { limit: 1 },
          );

          if (response && Array.isArray(response.data)) {
            if (response.data.length > 0) {
              // There is a submitted store
              setSubmitted(true);
              setPaymentIntegrated(false); // Make sure it's not marked as integrated
            } else if (isSubmitted) {
              // We previously thought it was submitted, but now the backend says no submitted stores.
              // This implies the status changed (e.g., to ACTIVE/ONBOARD)
              setPaymentIntegrated(true);
            }
          }
        } catch (error: any) {
          console.error(
            "Failed to check submitted stores:",
            error.message || error,
          );
          if (error.statusCode === 500 || error.response?.status === 500) {
            console.error(
              "Server Error (500): The API encountered an internal error. This is often caused by data serialization issues or database constraints.",
              error.details || error.response?.data || error.message,
            );
          }
        }
      }
    }

    checkSubmittedStores();
  }, [
    mounted,
    isHydrated,
    isAuthenticated,
    isSubmitted,
    isPaymentIntegrated,
    setSubmitted,
  ]);

  if (!mounted) return null;

  // We only show the alert if:
  // 1. Store is submitted
  // 2. Payment is NOT integrated
  // 3. User is NOT on the setup-business page
  if (isExcludedPage || !isSubmitted || isPaymentIntegrated) {
    return null;
  }

  // Simulate payment integration start
  const handleInstallNow = () => {
    // In a real app, this would open a Stripe connect flow or similar setup wizard
    // e.g. router.push('/settings/payments');

    // We shouldn't remove the alert until the payment is actually integrated
    // and the backend status changes from SUBMITTED to ONBOARD.
    console.log("Redirecting to payment integration flow...");
    alert(
      "Payment integration flow will be implemented here. This alert will remain until you successfully integrate the payment system and your backend status changes from SUBMITTED to ONBOARD.",
    );
  };

  return (
    <div className="mx-auto w-full max-w-4xl p-4">
      <AlertMultipleActionDemo
        className="bg-destructive/10 text-destructive border-destructive/20 transition-all duration-300"
        title="Payment Integration Required"
        description="Your store has been submitted successfully! Please complete your payment integration to start accepting payments."
        primaryActionLabel="Integrate Now"
        secondaryActionLabel=""
        onPrimaryAction={handleInstallNow}
        hideDismiss={true}
      />
    </div>
  );
}
