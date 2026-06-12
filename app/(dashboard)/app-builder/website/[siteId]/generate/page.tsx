"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { StylePicker } from "./_components/StylePicker";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { websiteBuilderApi } from "@/lib/api/website-builder";
import type { TemplateFamily } from "@/types/website-builder";
import { Loader2, Sparkles, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type Step = 1 | 2;

export default function GenerateWebsitePage() {
  const { siteId } = useParams<{ siteId: string }>();
  const router = useRouter();
  const [step, setStep] = React.useState<Step>(1);
  const [selectedFamily, setSelectedFamily] = React.useState<TemplateFamily | null>(null);
  const [hint, setHint] = React.useState("");

  const { mutate: generate, isPending } = useMutation({
    mutationFn: () => websiteBuilderApi.generateSite(siteId, selectedFamily!, hint || undefined),
    onSuccess: () => {
      router.push(`/app-builder/website/${siteId}/editor`);
    },
  });

  return (
    <div className="flex-1 p-4 md:p-8 pt-6 min-h-screen bg-background">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/app-builder/website")} className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Generate Website with AI</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Two steps · Less than a minute</p>
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-3">
          {([1, 2] as const).map((s) => (
            <React.Fragment key={s}>
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors",
                step === s ? "bg-foreground border-foreground text-background" : step > s ? "bg-muted border-border text-foreground" : "bg-muted border-muted-foreground/20 text-muted-foreground",
              )}>
                {s}
              </div>
              {s < 2 && <div className={cn("flex-1 h-0.5 rounded", step > s ? "bg-foreground/40" : "bg-muted")} />}
            </React.Fragment>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h2 className="text-xl font-bold">Choose your style</h2>
              <p className="text-muted-foreground text-sm mt-1">Pick the personality that best matches your brand.</p>
            </div>
            <StylePicker selected={selectedFamily} onSelect={setSelectedFamily} />
            <div className="flex justify-end">
              <Button
                disabled={!selectedFamily}
                onClick={() => setStep(2)}
                className="bg-foreground hover:bg-foreground/90 text-background"
              >
                Next: Describe your vibe
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h2 className="text-xl font-bold">Describe your vibe <span className="text-muted-foreground font-normal">(optional)</span></h2>
              <p className="text-muted-foreground text-sm mt-1">
                Tell AI what makes your place special. Skip to use defaults.
              </p>
            </div>
            <Textarea
              placeholder="E.g. A cozy Italian family restaurant, romantic atmosphere, warm lighting, great pasta…"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              maxLength={500}
              rows={5}
              className="resize-none"
            />
            <p className="text-[11px] text-muted-foreground text-right">{hint.length}/500</p>
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep(1)} className="gap-1">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                onClick={() => generate()}
                disabled={isPending}
                className="bg-foreground hover:bg-foreground/90 text-background gap-2 min-w-[160px]"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Website
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
