"use client";

import { useState, useMemo } from "react";
import { useStoreImages, useDeleteImage, type StoreImage } from "@/hooks/use-store-images";
import { UploadModal } from "@/components/gallery/upload-modal";
import { ImageGeneratePanel } from "@/components/menu-images/image-generate-panel";
import {
  Search,
  Upload,
  ImageIcon,
  Trash2,
  Maximize2,
  MoreVertical,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Grid2X2,
  Grid3X3,
  Calendar,
  Tag,
  HardDrive,
  Proportions,
  ExternalLink,
  Info,
  Loader2,
  Wand2,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";

type GridSize = "2" | "3" | "4";

interface SiteGalleryProps {
  siteId: string;
}

export function SiteGallery({ siteId }: SiteGalleryProps) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [gridSize, setGridSize] = useState<GridSize>("3");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showAiPanel, setShowAiPanel] = useState(false);

  const { data, isLoading, error } = useStoreImages(siteId, {
    search: searchQuery || undefined,
  });

  const deleteImage = useDeleteImage();

  const images: StoreImage[] = data?.images ?? [];

  const allTags = useMemo(() => {
    const tags = new Set<string>(["All"]);
    images.forEach((img) => img.tags?.forEach((t) => tags.add(t)));
    return Array.from(tags);
  }, [images]);

  const filteredImages = useMemo(() => {
    return images.filter((img) => {
      if (activeFilter !== "All" && !img.tags?.includes(activeFilter)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          img.originalName?.toLowerCase().includes(q) ||
          img.fileName?.toLowerCase().includes(q) ||
          img.tags?.some((t) => t.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [images, activeFilter, searchQuery]);

  const detailImage = useMemo(
    () => filteredImages.find((img) => img.id === selectedId) ?? null,
    [filteredImages, selectedId],
  );

  const handleDelete = (imageId: string) => {
    setDeletingId(imageId);
    deleteImage.mutate(
      { storeId: siteId, imageId },
      {
        onSuccess: () => {
          toast.success("Image deleted");
          if (selectedId === imageId) setSelectedId(null);
          setDeletingId(null);
        },
        onError: () => {
          toast.error("Failed to delete image");
          setDeletingId(null);
        },
      },
    );
  };

  const handleLightboxNav = (dir: "prev" | "next") => {
    if (lightboxIndex === null) return;
    const next =
      dir === "prev"
        ? (lightboxIndex - 1 + filteredImages.length) % filteredImages.length
        : (lightboxIndex + 1) % filteredImages.length;
    setLightboxIndex(next);
    setSelectedId(filteredImages[next].id);
  };

  const gridCols: Record<GridSize, string> = {
    "2": "grid-cols-2",
    "3": "grid-cols-2 md:grid-cols-3",
    "4": "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
  };

  return (
    <div className="flex h-full flex-col bg-muted/5 rounded-xl border border-border/50 overflow-hidden">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-6 py-3 bg-background/50 backdrop-blur-sm">
        {/* Search */}
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search images…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 rounded-xl pl-9 bg-background/50"
          />
        </div>

        {/* Tag filters */}
        {allTags.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveFilter(tag)}
                className={cn(
                  "shrink-0 rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all",
                  activeFilter === tag
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background text-muted-foreground hover:text-foreground",
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        <Separator orientation="vertical" className="h-6" />

        {/* Grid size toggle */}
        <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/30 p-1">
          {(["2", "3", "4"] as GridSize[]).map((size, i) => {
            const Icon = [Grid2X2, Grid3X3, LayoutGrid][i];
            return (
              <button
                key={size}
                onClick={() => setGridSize(size)}
                className={cn(
                  "flex size-7 items-center justify-center rounded-lg transition-colors",
                  gridSize === size
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
              </button>
            );
          })}
        </div>

        <Button onClick={() => setShowAiPanel(!showAiPanel)} size="sm" variant={showAiPanel ? "default" : "outline"} className="rounded-xl">
          <Wand2 data-icon="inline-start" className="size-3.5" />
          AI Generate
        </Button>

        <Button onClick={() => setUploadOpen(true)} size="sm" className="rounded-xl bg-foreground text-background hover:bg-foreground/90">
          <Upload data-icon="inline-start" className="size-3.5" />
          Upload
        </Button>
      </div>

      {/* ── AI Generate Panel ── */}
      {showAiPanel && (
        <div className="border-b border-border bg-muted/10 px-6 py-5">
          <ImageGeneratePanel storeId={siteId} />
        </div>
      )}

      {/* ── Body: Grid + Detail Panel ── */}
      <div className="flex flex-1 overflow-hidden min-h-[400px]">
        {/* Grid Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <LoadingSkeleton gridClass={gridCols[gridSize]} />
          ) : error ? (
            <ErrorState onRetry={() => window.location.reload()} error={error} />
          ) : filteredImages.length === 0 ? (
            <EmptyState
              hasImages={images.length > 0}
              onUpload={() => setUploadOpen(true)}
              onClear={() => { setSearchQuery(""); setActiveFilter("All"); }}
            />
          ) : (
            <div className={cn("grid gap-3", gridCols[gridSize])}>
              {filteredImages.map((img, index) => (
                <ImageTile
                  key={img.id}
                  image={img}
                  isSelected={selectedId === img.id}
                  isDeleting={deletingId === img.id}
                  onSelect={() => setSelectedId(img.id === selectedId ? null : img.id)}
                  onPreview={() => { setLightboxIndex(index); setSelectedId(img.id); }}
                  onDelete={() => handleDelete(img.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {detailImage && (
          <DetailPanel
            image={detailImage}
            isDeleting={deletingId === detailImage.id}
            onClose={() => setSelectedId(null)}
            onDelete={() => handleDelete(detailImage.id)}
            onPreview={() => {
              const idx = filteredImages.findIndex((i) => i.id === detailImage.id);
              setLightboxIndex(idx);
            }}
          />
        )}
      </div>

      {/* ── Status Bar ── */}
      <div className="flex items-center justify-between border-t border-border bg-muted/20 px-6 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
        <span>
          Showing {filteredImages.length} of {images.length} images
        </span>
        {selectedId && (
          <button
            onClick={() => setSelectedId(null)}
            className="text-muted-foreground hover:underline"
          >
            Clear selection
          </button>
        )}
      </div>

      {/* ── Upload Modal ── */}
      <UploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        storeId={siteId}
      />

      {/* ── Lightbox ── */}
      {lightboxIndex !== null && filteredImages[lightboxIndex] && (
        <Lightbox
          images={filteredImages}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNav={handleLightboxNav}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   ImageTile
───────────────────────────────────────── */
function ImageTile({
  image,
  isSelected,
  isDeleting,
  onSelect,
  onPreview,
  onDelete,
}: {
  image: StoreImage;
  isSelected: boolean;
  isDeleting: boolean;
  onSelect: () => void;
  onPreview: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        "group relative aspect-square cursor-pointer overflow-hidden rounded-xl border-2 transition-all",
        isSelected
          ? "border-foreground"
          : "border-border/50 hover:border-border",
        isDeleting && "opacity-60 pointer-events-none"
      )}
    >
      {/* Deleting Overlay */}
      {isDeleting && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px] p-4 text-center">
          <Loader2 className="size-8 animate-spin text-white mb-2" />
          <p className="text-[10px] font-bold text-white uppercase tracking-widest mb-2">Deleting...</p>
          <Progress value={null} className="h-1 w-full bg-white/20" />
        </div>
      )}
      <Image
        src={image.ftpUrl || image.thumbnailUrl || ""}
        alt={image.originalName}
        fill
        unoptimized
        className="object-cover transition-transform duration-500 group-hover:scale-105"
        sizes="(max-width: 768px) 50vw, 33vw"
        onError={() => {
          console.error("Gallery Image Load Error:", {
            id: image.id,
            url: image.ftpUrl || image.thumbnailUrl,
            originalName: image.originalName
          });
        }}
      />

      {/* Selection checkbox */}
      <div
        className={cn(
          "absolute right-2 top-2 flex size-6 items-center justify-center rounded-md border-2 transition-all",
          isSelected
            ? "border-foreground bg-foreground text-background"
            : "border-white/80 bg-black/20 opacity-0 group-hover:opacity-100",
        )}
      >
        <Check className="size-3.5" strokeWidth={3} />
      </div>

      {/* Tags */}
      {image.tags && image.tags.length > 0 && (
        <div className="absolute left-2 top-2 flex flex-wrap gap-1 pointer-events-none">
          {image.tags.slice(0, 2).map((tag) => (
            <Badge
              key={tag}
              className="h-4 rounded-md bg-background/80 px-1.5 text-[9px] font-bold text-foreground backdrop-blur-sm"
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Hover action bar */}
      <div className="absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-end gap-1 bg-linear-to-t from-black/60 to-transparent p-2 transition-transform duration-200 group-hover:translate-y-0">
        <Button
          size="icon"
          variant="secondary"
          className="size-7 rounded-lg"
          onClick={(e) => { e.stopPropagation(); onPreview(); }}
        >
          <Maximize2 className="size-3.5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button size="icon" variant="secondary" className="size-7 rounded-lg" />}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <MoreVertical className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPreview(); }}>
              <Maximize2 className="size-3.5" />
              Full Preview
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
            >
              <Trash2 className="size-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   DetailPanel
───────────────────────────────────────── */
function DetailPanel({
  image,
  isDeleting,
  onClose,
  onDelete,
  onPreview,
}: {
  image: StoreImage;
  isDeleting: boolean;
  onClose: () => void;
  onDelete: () => void;
  onPreview: () => void;
}) {
  const sizeKb = image.fileSize ? (image.fileSize / 1024).toFixed(0) : null;

  return (
    <aside className="w-64 shrink-0 overflow-y-auto border-l border-border bg-muted/10">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
          Image Details
        </span>
        <Button variant="ghost" size="icon" className="size-7 rounded-lg" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>

      <div className="p-4 space-y-4">
        {/* Preview thumbnail */}
        <div
          className="relative aspect-video w-full cursor-pointer overflow-hidden rounded-xl border border-border bg-muted/30"
          onClick={onPreview}
        >
          <Image
            src={image.ftpUrl || image.thumbnailUrl || ""}
            alt={image.originalName}
            fill
            unoptimized
            className="object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity hover:opacity-100 bg-black/30">
            <Maximize2 className="size-6 text-white" />
          </div>
        </div>

        {/* File name */}
        <div>
          <p className="text-xs font-bold text-foreground break-all leading-snug">
            {image.originalName}
          </p>
        </div>

        <Separator />

        {/* Metadata */}
        <div className="space-y-2.5 text-[10px]">
          <MetaRow icon={Calendar} label="Uploaded">
            {format(new Date(image.createdAt), "MMM d, yyyy")}
          </MetaRow>
          {sizeKb && (
            <MetaRow icon={HardDrive} label="File size">{sizeKb} KB</MetaRow>
          )}
          {image.width && image.height && (
            <MetaRow icon={Proportions} label="Dimensions">
              {image.width} × {image.height}
            </MetaRow>
          )}
          {image.mimeType && (
            <MetaRow icon={Info} label="Type">
              {image.mimeType.split("/")[1]?.toUpperCase()}
            </MetaRow>
          )}
          {image.usageCount !== undefined && (
            <MetaRow icon={ExternalLink} label="Used in">
              {image.usageCount} place{image.usageCount !== 1 ? "s" : ""}
            </MetaRow>
          )}
        </div>

        {/* Tags */}
        {image.tags && image.tags.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                <Tag className="size-3" />
                Tags
              </p>
              <div className="flex flex-wrap gap-1.5">
                {image.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="rounded-lg text-[9px] font-bold uppercase">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        <Separator />

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Button variant="outline" size="sm" className="w-full rounded-xl" onClick={onPreview}>
            <Maximize2 data-icon="inline-start" className="size-3.5" />
            Full Preview
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
            onClick={onDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 data-icon="inline-start" className="animate-spin size-3.5" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 data-icon="inline-start" className="size-3.5" />
                Delete
              </>
            )}
          </Button>
          {isDeleting && (
            <div className="mt-1">
              <Progress value={null} className="h-1 bg-destructive/10" />
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

function MetaRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="flex items-center gap-1.5 text-muted-foreground/60 shrink-0 uppercase tracking-wider font-bold">
        <Icon className="size-3" />
        {label}
      </span>
      <span className="text-right text-foreground font-bold">{children}</span>
    </div>
  );
}

/* ─────────────────────────────────────────
   Lightbox
───────────────────────────────────────── */
function Lightbox({
  images,
  index,
  onClose,
  onNav,
}: {
  images: StoreImage[];
  index: number;
  onClose: () => void;
  onNav: (dir: "prev" | "next") => void;
}) {
  const image = images[index];

  return (
    <div
      className="fixed inset-0 z-60 flex flex-col bg-black/95 backdrop-blur-xl"
      onClick={onClose}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col">
          <span className="text-sm font-bold text-white">{image.originalName}</span>
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
            {index + 1} / {images.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-9 rounded-xl text-white/60 hover:bg-white/10 hover:text-white"
          onClick={onClose}
        >
          <X />
        </Button>
      </div>

      {/* Image stage */}
      <div
        className="relative flex-1 flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={image.ftpUrl || image.thumbnailUrl || ""}
          alt={image.originalName}
          fill
          unoptimized
          className="object-contain"
          priority
        />

        {/* Nav buttons */}
        {images.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 size-12 rounded-full bg-white/10 text-white hover:bg-white/20"
              onClick={() => onNav("prev")}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 size-12 rounded-full bg-white/10 text-white hover:bg-white/20"
              onClick={() => onNav("next")}
            >
              <ChevronRight />
            </Button>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div
          className="flex items-center justify-center gap-2 overflow-x-auto px-6 py-3"
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => onNav(i < index ? "prev" : "next")}
              className={cn(
                "relative size-12 shrink-0 overflow-hidden rounded-lg border-2 transition-all",
                i === index
                  ? "border-foreground scale-110"
                  : "border-transparent opacity-40 hover:opacity-80",
              )}
            >
              <Image
                src={img.ftpUrl || img.thumbnailUrl || ""}
                alt="thumb"
                fill
                unoptimized
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   Loading / Empty / Error states
───────────────────────────────────────── */
function LoadingSkeleton({ gridClass }: { gridClass: string }) {
  return (
    <div className={cn("grid gap-3", gridClass)}>
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="aspect-square rounded-xl" />
      ))}
    </div>
  );
}

function EmptyState({
  hasImages,
  onUpload,
  onClear,
}: {
  hasImages: boolean;
  onUpload: () => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted">
        <ImageIcon className="size-8 text-muted-foreground" />
      </div>
      {hasImages ? (
        <>
          <p className="text-sm font-bold text-foreground">No images found</p>
          <p className="mt-1 text-xs text-muted-foreground">Try adjusting your filters</p>
          <Button variant="link" className="mt-2 text-muted-foreground text-xs font-bold" onClick={onClear}>
            Clear filters
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm font-bold text-foreground">No images yet</p>
          <p className="mt-1 text-xs text-muted-foreground max-w-[200px]">
            Upload your first image for this site
          </p>
          <Button className="mt-4 rounded-xl bg-foreground text-background hover:bg-foreground/90" size="sm" onClick={onUpload}>
            <Upload data-icon="inline-start" className="size-3.5" />
            Upload
          </Button>
        </>
      )}
    </div>
  );
}

function ErrorState({ onRetry, error }: { onRetry: () => void; error: any }) {
  const status = error?.response?.status;
  const isAuthError = status === 401 || status === 403;

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="size-14 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
        <X className="size-7 text-destructive" />
      </div>
      <p className="text-sm font-bold text-foreground">
        {isAuthError ? "Session expired" : "Failed to load gallery"}
      </p>
      <p className="mt-1 text-xs text-muted-foreground max-w-[200px]">
        {isAuthError
          ? "Please refresh to log in again."
          : "Something went wrong while fetching images."}
      </p>
      <Button variant="outline" size="sm" className="mt-4 rounded-xl" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
