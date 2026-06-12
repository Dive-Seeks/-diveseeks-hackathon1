"use client";

import { useState, useMemo } from "react";
import { ImageCard } from "./image-card";
import {
  ChevronLeft,
  ChevronRight,
  X,
  LayoutGrid,
  Grid2X2,
  Grid3X3,
  Columns,
  Image as ImageIcon,
  Plus,
  Search,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Separator } from "@/components/ui/separator";

interface GalleryGridProps {
  images: any[];
  isLoading: boolean;
  error: any;
  onDelete: (id: string) => void;
  onUploadClick: () => void;
}

export function GalleryGrid({ images, isLoading, error, onDelete, onUploadClick }: GalleryGridProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [columns, setColumns] = useState<string[]>(["4"]);
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const activeColumns = columns[0] ?? "4";

  const allTags = useMemo(() => {
    const tags = new Set<string>(["All"]);
    images.forEach((img) => {
      img.tags?.forEach((tag: string) => tags.add(tag));
    });
    return Array.from(tags);
  }, [images]);

  const filteredImages = useMemo(() => {
    return images.filter((img) => {
      const matchesFilter = activeFilter === "All" || img.tags?.includes(activeFilter);
      const matchesSearch =
        !searchQuery ||
        img.originalName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        img.fileName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        img.tags?.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesFilter && matchesSearch;
    });
  }, [images, activeFilter, searchQuery]);

  const handleNext = () => {
    if (selectedImageIndex === null) return;
    setSelectedImageIndex((selectedImageIndex + 1) % filteredImages.length);
  };

  const handlePrev = () => {
    if (selectedImageIndex === null) return;
    setSelectedImageIndex((selectedImageIndex - 1 + filteredImages.length) % filteredImages.length);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-pulse">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="aspect-square rounded-2xl bg-muted/50 border border-border/50" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center rounded-3xl border border-destructive/10 bg-destructive/5">
        <div className="size-14 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <X className="size-7 text-destructive" />
        </div>
        <h3 className="font-bold text-lg text-foreground">Failed to Load Gallery</h3>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto mt-1">
          We encountered a technical issue while retrieving your assets.
        </p>
        <Button variant="outline" className="mt-6 rounded-xl" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-40 text-center bg-muted/20 rounded-3xl border-2 border-dashed border-border/50">
        <div className="relative mb-8">
          <div className="size-24 rounded-3xl bg-primary/10 flex items-center justify-center rotate-3 shadow-sm">
            <ImageIcon className="size-10 text-primary" />
          </div>
          <div className="absolute -bottom-2 -right-2 size-10 rounded-2xl bg-background flex items-center justify-center border border-border">
            <Plus className="size-5 text-primary" />
          </div>
        </div>
        <h3 className="text-2xl font-bold text-foreground mb-3">Your Gallery is Empty</h3>
        <p className="text-muted-foreground text-sm max-w-[340px] mb-8 leading-relaxed">
          Upload high-resolution images to create a stunning visual experience for your customers.
        </p>
        <Button onClick={onUploadClick} className="rounded-xl px-10 h-12 font-bold">
          Start First Upload
          <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 flex-1">
          <div className="relative group max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <Input
              placeholder="Search assets or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 rounded-xl"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <Separator orientation="vertical" className="h-8 mx-2 hidden sm:block" />
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveFilter(tag)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border whitespace-nowrap",
                  activeFilter === tag
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-muted/30 text-muted-foreground border-transparent hover:text-foreground",
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* View toggle — Base UI: value is always an array */}
        <div className="flex items-center gap-3 bg-muted/30 p-1 rounded-xl border border-border/50 self-end">
          <ToggleGroup
            value={columns}
            onValueChange={(val) => val && val.length > 0 && setColumns(val)}
            className="gap-1"
          >
            <ToggleGroupItem value="2" className="size-9 rounded-lg data-[state=on]:bg-background data-[state=on]:text-primary data-[state=on]:shadow-sm">
              <Columns className="size-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="3" className="size-9 rounded-lg data-[state=on]:bg-background data-[state=on]:text-primary data-[state=on]:shadow-sm">
              <Grid3X3 className="size-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="4" className="size-9 rounded-lg data-[state=on]:bg-background data-[state=on]:text-primary data-[state=on]:shadow-sm">
              <Grid2X2 className="size-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="5" className="size-9 rounded-lg data-[state=on]:bg-background data-[state=on]:text-primary data-[state=on]:shadow-sm">
              <LayoutGrid className="size-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Grid */}
      {filteredImages.length === 0 ? (
        <div className="py-32 text-center rounded-3xl border border-dashed border-border/50 bg-muted/5">
          <div className="size-16 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-4">
            <Search className="size-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-bold text-muted-foreground">No matching assets found.</p>
          <Button
            variant="link"
            className="text-primary"
            onClick={() => { setSearchQuery(""); setActiveFilter("All"); }}
          >
            Clear all filters
          </Button>
        </div>
      ) : (
        <div
          className={cn(
            "transition-all duration-300",
            activeColumns === "2" && "columns-1 sm:columns-2 gap-6",
            activeColumns === "3" && "columns-1 sm:columns-2 lg:columns-3 gap-6",
            activeColumns === "4" && "columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-6",
            activeColumns === "5" && "columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-6",
          )}
        >
          {filteredImages.map((image, index) => (
            <div key={image.id} className="break-inside-avoid mb-6">
              <ImageCard
                image={image}
                onDelete={onDelete}
                onPreview={() => setSelectedImageIndex(index)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {selectedImageIndex !== null && filteredImages[selectedImageIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/98 backdrop-blur-2xl"
          onClick={() => setSelectedImageIndex(null)}
        >
          {/* Header */}
          <div className="absolute top-0 inset-x-0 h-20 px-8 flex items-center justify-between z-10 bg-gradient-to-b from-black/50 to-transparent">
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-xl bg-primary flex items-center justify-center shadow-lg">
                <ImageIcon className="size-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-tight max-w-[200px] sm:max-w-md truncate">
                  {filteredImages[selectedImageIndex].originalName || filteredImages[selectedImageIndex].fileName}
                </p>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">
                  Asset {selectedImageIndex + 1} of {filteredImages.length}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-10 rounded-full bg-white/5 hover:bg-white/10 text-white"
              onClick={() => setSelectedImageIndex(null)}
            >
              <X />
            </Button>
          </div>

          {/* Stage */}
          <div className="relative w-full h-full flex items-center justify-center p-4 sm:p-20">
            <div className="absolute inset-x-4 sm:inset-x-10 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none z-10">
              <Button
                variant="ghost"
                size="icon"
                className="size-14 rounded-full bg-white/5 hover:bg-white/10 text-white border border-white/10 pointer-events-auto"
                onClick={(e) => { e.stopPropagation(); handlePrev(); }}
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-14 rounded-full bg-white/5 hover:bg-white/10 text-white border border-white/10 pointer-events-auto"
                onClick={(e) => { e.stopPropagation(); handleNext(); }}
              >
                <ChevronRight />
              </Button>
            </div>

            <div
              className="relative w-full h-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={filteredImages[selectedImageIndex].ftpUrl || filteredImages[selectedImageIndex].thumbnailUrl || ""}
                alt={filteredImages[selectedImageIndex].originalName || filteredImages[selectedImageIndex].fileName}
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>

          {/* Thumbnail strip */}
          <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-black/50 to-transparent flex items-center justify-center gap-2 overflow-x-auto px-10">
            {filteredImages.map((img, i) => (
              <button
                key={img.id}
                onClick={(e) => { e.stopPropagation(); setSelectedImageIndex(i); }}
                className={cn(
                  "relative h-14 w-20 rounded-xl overflow-hidden shrink-0 border-2 transition-all",
                  i === selectedImageIndex
                    ? "border-primary scale-110 z-10"
                    : "border-transparent opacity-30 hover:opacity-100",
                )}
              >
                <Image src={img.ftpUrl || img.thumbnailUrl || ""} alt="thumb" fill className="object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
