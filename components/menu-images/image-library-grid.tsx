"use client";

import Image from "next/image";
import { CheckCircle2, Copy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { GeneratedImage } from "@/hooks/use-menu-images";

interface ImageLibraryGridProps {
  images: GeneratedImage[];
  isLoading: boolean;
  onSelect: (image: GeneratedImage) => void;
  selectedId?: string | null;
  emptyMessage?: string;
}

export function ImageLibraryGrid({
  images,
  isLoading,
  onSelect,
  selectedId,
  emptyMessage = "No matching images in library",
}: ImageLibraryGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-xl" />
        ))}
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="size-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
          <Sparkles className="size-6 text-muted-foreground" />
        </div>
        <p className="text-xs font-bold text-muted-foreground">{emptyMessage}</p>
        <p className="text-[10px] text-muted-foreground/60 mt-1">
          Generate a new image to get started
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {images.map((img) => (
        <button
          key={img.id}
          onClick={() => onSelect(img)}
          className={cn(
            "group relative aspect-square overflow-hidden rounded-xl border-2 transition-all",
            selectedId === img.id
              ? "border-foreground ring-2 ring-foreground/20"
              : "border-border/50 hover:border-border",
          )}
        >
          <Image
            src={img.thumbnailUrl || img.imageUrl || ""}
            alt={img.itemName}
            fill
            unoptimized
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />

          {/* Selection indicator */}
          {selectedId === img.id && (
            <div className="absolute inset-0 bg-foreground/10 flex items-center justify-center">
              <div className="size-8 rounded-full bg-foreground flex items-center justify-center">
                <CheckCircle2 className="size-5 text-background" />
              </div>
            </div>
          )}

          {/* Global badge */}
          {img.isGlobal && (
            <Badge className="absolute top-1 left-1 h-4 rounded-md bg-foreground/80 text-[8px] text-background px-1.5">
              Shared
            </Badge>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 translate-y-full group-hover:translate-y-0 transition-transform">
            <p className="text-[9px] font-bold text-white truncate">{img.itemName}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <Copy className="size-2.5 text-white/60" />
              <span className="text-[8px] text-white/60">
                Free • Used {img.usageCount}x
              </span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
