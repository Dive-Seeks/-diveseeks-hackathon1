"use client";

import Image from "next/image";
import { ArrowLeftRight, Check, RefreshCw, Sparkles, Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GenerationStatusBadge } from "./generation-status-badge";
import type { GeneratedImage } from "@/hooks/use-menu-images";

interface ImageCompareViewProps {
  libraryMatch: GeneratedImage | null;
  generated: GeneratedImage | null;
  onApprove: (imageId: string) => void;
  onReject: (imageId: string) => void;
  onRegenerate: () => void;
  onUseLibrary: (image: GeneratedImage) => void;
  isApproving: boolean;
}

export function ImageCompareView({
  libraryMatch,
  generated,
  onApprove,
  onReject,
  onRegenerate,
  onUseLibrary,
  isApproving,
}: ImageCompareViewProps) {
  const hasLibrary = !!libraryMatch?.imageUrl;
  const hasGenerated = !!generated?.imageUrl;
  const isGenerating =
    generated?.approvalStatus === "pending" ||
    generated?.approvalStatus === "analyzing" ||
    generated?.approvalStatus === "generating";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-black uppercase tracking-widest text-foreground">
          Compare Results
        </h4>
        {generated && (
          <GenerationStatusBadge status={generated.approvalStatus} />
        )}
      </div>

      {/* Comparison Grid */}
      <div className={cn("grid gap-3", hasLibrary && hasGenerated ? "grid-cols-2" : "grid-cols-1")}>
        {/* Library Match */}
        {hasLibrary && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 mb-2">
              <Library className="size-3 text-muted-foreground" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                From Library
              </span>
              <span className="text-[9px] text-muted-foreground">(Free)</span>
            </div>
            <div className="relative aspect-square overflow-hidden rounded-xl border-2 border-border bg-muted/30">
              <Image
                src={libraryMatch!.thumbnailUrl || libraryMatch!.imageUrl || ""}
                alt={libraryMatch!.itemName}
                fill
                unoptimized
                className="object-cover"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-xl"
              onClick={() => onUseLibrary(libraryMatch!)}
            >
              <Check className="size-3.5 mr-1" />
              Use This (Free)
            </Button>
          </div>
        )}

        {/* Generated / Generating */}
        {generated && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="size-3 text-muted-foreground" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                AI Generated
              </span>
              <span className="text-[9px] text-muted-foreground">(~$0.04)</span>
            </div>
            <div className="relative aspect-square overflow-hidden rounded-xl border-2 border-border bg-muted/30">
              {isGenerating ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted/50">
                  <div className="relative">
                    <div className="size-16 rounded-full border-4 border-border animate-pulse" />
                    <Sparkles className="absolute inset-0 m-auto size-6 text-muted-foreground animate-bounce" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-foreground">
                      {generated.approvalStatus === "analyzing"
                        ? "Analyzing your input..."
                        : generated.approvalStatus === "generating"
                        ? "Creating your image..."
                        : "Queued..."}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      This usually takes 15–30 seconds
                    </p>
                  </div>
                </div>
              ) : generated.approvalStatus === "failed" ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-destructive/5 p-4">
                  <p className="text-xs font-bold text-destructive">Generation Failed</p>
                  <p className="text-[10px] text-muted-foreground text-center">
                    {generated.errorMessage || "Try rephrasing or use a different image"}
                  </p>
                </div>
              ) : (
                <Image
                  src={generated.imageUrl || generated.thumbnailUrl || ""}
                  alt={generated.itemName}
                  fill
                  unoptimized
                  className="object-cover"
                />
              )}
            </div>

            {/* Actions */}
            {generated.approvalStatus === "completed" && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 rounded-xl bg-foreground text-background hover:bg-foreground/90"
                  onClick={() => onApprove(generated.id)}
                  disabled={isApproving}
                >
                  <Check className="size-3.5 mr-1" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={onRegenerate}
                >
                  <RefreshCw className="size-3.5" />
                </Button>
              </div>
            )}

            {(generated.approvalStatus === "failed" || generated.approvalStatus === "rejected") && (
              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-xl"
                onClick={onRegenerate}
              >
                <RefreshCw className="size-3.5 mr-1" />
                Try Again
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Divider with arrow when both panels exist */}
      {hasLibrary && hasGenerated && (
        <div className="flex items-center justify-center -mt-2">
          <ArrowLeftRight className="size-4 text-muted-foreground/40" />
        </div>
      )}
    </div>
  );
}
