import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, InfoIcon, XCircle } from "lucide-react";
import AlertMultipleActionDemo from "./shadcn-studio/alert/alert-08";

const GRADIENT_CLASSES =
  "bg-[#DC2626] bg-gradient-to-b from-[#DC2626] to-[#EF4444] hover:from-[#B91C1C] hover:to-[#DC2626] active:from-[#991B1B] active:to-[#B91C1C] text-white border-red-800 shadow-md transition-all duration-300 [&_div]:drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)] *:[svg]:drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]";

export function RedGradientAlertShowcase() {
  return (
    <div className="p-8 space-y-8 bg-background">
      <h2 className="text-2xl font-bold">Red Gradient Alert Showcase</h2>
      <p className="text-muted-foreground">
        Testing the red gradient effect (#DC2626 to #EF4444) across different
        alert types while maintaining the red color theme and contrast (min
        4.5:1 via text-shadow).
      </p>

      {/* Error Type */}
      <div className="space-y-2">
        <h3 className="font-semibold text-lg">Error Alert</h3>
        <Alert className={GRADIENT_CLASSES}>
          <XCircle className="size-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            This is an error alert using the red gradient theme. The gradient
            transitions from deep red at the top to lighter red at the bottom.
          </AlertDescription>
        </Alert>
      </div>

      {/* Warning Type */}
      <div className="space-y-2">
        <h3 className="font-semibold text-lg">Warning Alert</h3>
        <Alert className={GRADIENT_CLASSES}>
          <AlertCircle className="size-4" />
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription>
            This is a warning alert using the same red gradient theme to
            maintain visual consistency.
          </AlertDescription>
        </Alert>
      </div>

      {/* Success Type */}
      <div className="space-y-2">
        <h3 className="font-semibold text-lg">Success Alert</h3>
        <Alert className={GRADIENT_CLASSES}>
          <CheckCircle className="size-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>
            Even success states can use this red theme if required by the design
            system, keeping the overlay effect consistent.
          </AlertDescription>
        </Alert>
      </div>

      {/* Info Type */}
      <div className="space-y-2">
        <h3 className="font-semibold text-lg">Info Alert</h3>
        <Alert className={GRADIENT_CLASSES}>
          <InfoIcon className="size-4" />
          <AlertTitle>Information</AlertTitle>
          <AlertDescription>
            Informational alert demonstrating the responsive and hover states of
            the gradient overlay.
          </AlertDescription>
        </Alert>
      </div>

      {/* Multiple Action Demo (as used in Payment Integration) */}
      <div className="space-y-2">
        <h3 className="font-semibold text-lg">Multiple Action Demo</h3>
        <AlertMultipleActionDemo
          className={GRADIENT_CLASSES}
          title="Payment Integration Required"
          description="Your store has been submitted successfully! Please complete your payment integration to start accepting payments."
          primaryActionLabel="Integrate Now"
          secondaryActionLabel="Learn More"
        />
      </div>
    </div>
  );
}
