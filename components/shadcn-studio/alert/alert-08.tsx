"use client";

import { useState } from "react";
import { CircleAlertIcon, XIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export interface AlertMultipleActionProps {
  title?: string;
  description?: string;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  onDismiss?: () => void;
  hideDismiss?: boolean;
  className?: string;
}

const AlertMultipleActionDemo = ({
  title = "A new update is available",
  description = "Includes the at new dashboard View. Pages end exports will now load taster",
  primaryActionLabel = "Install now",
  secondaryActionLabel = "Skip this update",
  onPrimaryAction,
  onSecondaryAction,
  onDismiss,
  hideDismiss = false,
  className,
}: AlertMultipleActionProps) => {
  const [isActive, setIsActive] = useState(true);

  if (!isActive) return null;

  const handleDismiss = () => {
    setIsActive(false);
    if (onDismiss) onDismiss();
  };

  return (
    <Alert
      className={
        className ||
        "bg-primary text-primary-foreground flex justify-between border-none"
      }
    >
      <CircleAlertIcon className="mt-1" />
      <div className="flex flex-1 flex-col gap-4 ml-3">
        <div className="flex-1 flex-col justify-center gap-1">
          <AlertTitle>{title}</AlertTitle>
          <AlertDescription className="text-primary-foreground/80">
            {description}
          </AlertDescription>
        </div>
        <div className="flex items-center gap-4">
          {secondaryActionLabel && (
            <Button
              onClick={onSecondaryAction}
              className="bg-secondary/10 focus-visible:bg-secondary/20 hover:bg-secondary/20 h-7 cursor-pointer rounded-md px-2"
            >
              {secondaryActionLabel}
            </Button>
          )}
          {primaryActionLabel && (
            <Button
              variant="secondary"
              onClick={onPrimaryAction}
              className="h-7 cursor-pointer rounded-md px-2"
            >
              {primaryActionLabel}
            </Button>
          )}
        </div>
      </div>
      {!hideDismiss && (
        <button className="size-5 cursor-pointer ml-4" onClick={handleDismiss}>
          <XIcon className="size-5" />
          <span className="sr-only">Close</span>
        </button>
      )}
    </Alert>
  );
};

export default AlertMultipleActionDemo;
