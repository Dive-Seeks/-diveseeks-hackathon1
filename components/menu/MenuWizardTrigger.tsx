"use client";

import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MenuWizardTrigger() {
  const router = useRouter();

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => router.push("/menu/wizard")}
      className="flex-1 md:flex-none border-border bg-muted/40 hover:bg-muted text-foreground"
    >
      <Sparkles className="h-4 w-4 mr-2" />
      AI Menu Wizard
    </Button>
  );
}
