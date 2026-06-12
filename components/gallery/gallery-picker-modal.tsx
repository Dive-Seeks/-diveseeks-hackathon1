"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Search, Upload, X, ImageIcon, Loader2, Tag } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import api from "@/lib/api";
import { useStoreImages, type StoreImage } from "@/hooks/use-store-images";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface GalleryPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: string | null;
  /** The entity this image will be assigned to */
  entityType: "product" | "category" | "menu_item";
  entityId: string;
  /** Currently assigned image ID, so we can track the previous one */
  currentImageId?: string | null;
  /** Called after successful assignment with the chosen image */
  onAssigned?: (image: StoreImage) => void;
  /** Optional: open upload modal instead of inline upload */
  onUploadClick?: () => void;
}

interface ApiResponse<T> {
  data: T;
  statusCode: number;
  timestamp: string;
}

export function GalleryPickerModal({
  isOpen,
  onClose,
  storeId,
  entityType,
  entityId,
  currentImageId,
  onAssigned,
  onUploadClick,
}: GalleryPickerModalProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [activeTag, setActiveTag] = React.useState("All");
  const [selectedImage, setSelectedImage] = React.useState<StoreImage | null>(null);
  const [isAssigning, setIsAssigning] = React.useState(false);

  const { data, isLoading } = useStoreImages(storeId ?? "", {
    search: search || undefined,
    limit: 100,
  });

  const images = data?.images ?? [];

  const allTags = React.useMemo(() => {
    const tags = new Set<string>(["All"]);
    images.forEach((img) => img.tags?.forEach((t) => tags.add(t)));
    return Array.from(tags);
  }, [images]);

  const filtered = React.useMemo(() => {
    return images.filter((img) =>
      activeTag === "All" || img.tags?.includes(activeTag),
    );
  }, [images, activeTag]);

  // Reset selection when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setSelectedImage(null);
      setSearch("");
      setActiveTag("All");
    }
  }, [isOpen]);

  const handleAssign = async () => {
    if (!selectedImage || !storeId || !entityId) return;
    setIsAssigning(true);
    try {
      const res = await api.patch<ApiResponse<StoreImage>>(
        `/stores/${storeId}/images/${selectedImage.id}/assign`,
        {
          entityType,
          entityId,
          previousImageId: currentImageId ?? undefined,
        },
      );
      queryClient.invalidateQueries({ queryKey: ["store-images", storeId] });
      toast.success("Image assigned successfully");
      onAssigned?.(res.data.data);
      onClose();
    } catch {
      toast.error("Failed to assign image");
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        showCloseButton={false}
        className="max-w-3xl w-full p-0 gap-0 rounded-2xl overflow-hidden flex flex-col max-h-[88vh]"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
          <div>
            <DialogTitle className="text-base font-bold text-foreground">
              Choose from Gallery
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Click an image to select it, then confirm to assign
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onUploadClick && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl gap-1.5 text-xs h-8"
                onClick={onUploadClick}
              >
                <Upload className="size-3.5" />
                Upload New
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-xl text-muted-foreground"
              onClick={onClose}
            >
              <X />
            </Button>
          </div>
        </div>

        {/* ── Search + Tag filters ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-6 py-3 border-b border-border shrink-0 bg-muted/20">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search images…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-9 rounded-xl text-sm"
            />
          </div>
          {allTags.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 sm:pb-0 flex-1">
              <Tag className="size-3.5 text-muted-foreground shrink-0" />
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setActiveTag(tag)}
                  className={cn(
                    "shrink-0 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap",
                    activeTag === tag
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Image grid ── */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {isLoading ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-xl bg-muted/50 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="size-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <ImageIcon className="size-7 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground">No images found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {images.length === 0
                  ? "Upload images to your gallery first"
                  : "Try a different search or tag filter"}
              </p>
              {images.length === 0 && onUploadClick && (
                <Button
                  size="sm"
                  className="mt-4 rounded-xl"
                  onClick={onUploadClick}
                >
                  <Upload data-icon="inline-start" />
                  Upload Images
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {filtered.map((img, index) => {
                const isSelected = selectedImage?.id === img.id;
                const isCurrent = currentImageId === img.id;
                return (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImage(isSelected ? null : img)}
                    className={cn(
                      "group relative aspect-square rounded-xl overflow-hidden border-2 transition-all duration-200 focus:outline-none",
                      isSelected
                        ? "border-primary scale-[1.02]"
                        : isCurrent
                        ? "border-primary/40"
                        : "border-border/50 hover:border-border",
                    )}
                  >
                    {/* Index number badge */}
                    <span className={cn(
                      "absolute top-1.5 left-1.5 z-10 size-5 rounded-md flex items-center justify-center text-[9px] font-bold transition-colors",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-black/50 text-white",
                    )}>
                      {index + 1}
                    </span>

                    {/* "Currently assigned" indicator */}
                    {isCurrent && !isSelected && (
                      <span className="absolute top-1.5 right-1.5 z-10 rounded-md bg-primary/80 px-1.5 py-0.5 text-[8px] font-bold text-primary-foreground">
                        Current
                      </span>
                    )}

                    {/* Checkmark on selection */}
                    {isSelected && (
                      <span className="absolute top-1.5 right-1.5 z-10 size-5 rounded-md bg-primary flex items-center justify-center">
                        <Check className="size-3 text-primary-foreground" strokeWidth={3} />
                      </span>
                    )}

                    <Image
                      src={img.ftpUrl || img.thumbnailUrl || ""}
                      alt={img.originalName}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 20vw"
                    />

                    {/* Hover overlay with name */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
                      <p className="text-[9px] font-semibold text-white truncate">
                        {img.originalName}
                      </p>
                      {img.tags && img.tags.length > 0 && (
                        <div className="flex gap-1 mt-0.5">
                          {img.tags.slice(0, 2).map((tag) => (
                            <span key={tag} className="text-[8px] bg-white/20 rounded px-1 text-white">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 border-t border-border bg-muted/20 px-6 py-4">
          {/* Selected image preview strip */}
          {selectedImage && (
            <div className="flex items-center gap-3 mb-3 p-3 rounded-xl bg-background border border-primary/20">
              <div className="relative size-10 shrink-0 rounded-lg overflow-hidden border border-border/50">
                <Image
                  src={selectedImage.ftpUrl || selectedImage.thumbnailUrl || ""}
                  alt={selectedImage.originalName}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">
                  {selectedImage.originalName}
                </p>
                {selectedImage.tags && selectedImage.tags.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {selectedImage.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="rounded-md text-[10px] px-1.5 h-4">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <Check className="size-4 text-primary shrink-0" />
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isAssigning}
              className="rounded-xl px-5 h-11 text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={!selectedImage || isAssigning}
              className="flex-1 h-11 rounded-xl font-bold text-sm"
            >
              {isAssigning ? (
                <>
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                  Assigning…
                </>
              ) : selectedImage ? (
                <>
                  <Check data-icon="inline-start" />
                  Use This Image
                </>
              ) : (
                "Select an Image"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
