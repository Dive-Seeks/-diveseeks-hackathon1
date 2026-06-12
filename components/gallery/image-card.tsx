"use client";

import { useState } from "react";
import Image from "next/image";
import { Maximize2, Trash2, Calendar, MoreVertical } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ImageCardProps {
  image: {
    id: string;
    ftpUrl: string;
    thumbnailUrl?: string | null;
    originalName: string;
    fileName?: string;
    tags?: string[];
    createdAt: string;
    width?: number;
    height?: number;
    fileSize?: number;
  };
  onDelete: (id: string) => void;
  onPreview: () => void;
}

export function ImageCard({ image, onDelete, onPreview }: ImageCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-2xl bg-card border border-border/50 transition-all duration-300 hover:border-border"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image */}
      <div className={cn("relative w-full overflow-hidden bg-muted/30", (!image.width || !image.height) && "aspect-square")}>
        <Image
          src={image.ftpUrl || image.thumbnailUrl || ""}
          alt={image.originalName || image.fileName || ""}
          width={image.width || 800}
          height={image.height || 800}
          unoptimized
          className={cn("w-full h-auto object-cover transition-transform duration-500", isHovered ? "scale-105" : "scale-100")}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />

        {/* Hover overlay */}
        <div className={cn("absolute inset-0 bg-black/40 flex items-center justify-center gap-2 transition-opacity duration-200", isHovered ? "opacity-100" : "opacity-0")}>
          <Button
            size="icon"
            className="size-10 rounded-xl bg-background text-foreground hover:bg-muted"
            onClick={onPreview}
          >
            <Maximize2 />
          </Button>
          <Button
            size="icon"
            variant="destructive"
            className="size-10 rounded-xl"
            onClick={(e) => { e.stopPropagation(); onDelete(image.id); }}
          >
            <Trash2 />
          </Button>
        </div>

        {/* Tag badges */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1 pointer-events-none">
          {image.tags?.slice(0, 2).map((tag) => (
            <Badge key={tag} className="h-5 rounded-md bg-background/80 backdrop-blur-sm text-foreground border-border/50 px-1.5 text-[9px] font-bold">
              {tag}
            </Badge>
          ))}
          {image.tags && image.tags.length > 2 && (
            <Badge className="h-5 rounded-md bg-background/80 backdrop-blur-sm text-foreground border-border/50 px-1.5 text-[9px] font-bold">
              +{image.tags.length - 2}
            </Badge>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="flex items-start justify-between gap-2 p-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{image.originalName || image.fileName}</p>
          <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="size-3" />
              {format(new Date(image.createdAt), "MMM d, yyyy")}
            </span>
            {image.fileSize && (
              <span className="font-medium">
                {(image.fileSize / 1024 / 1024).toFixed(1)} MB
              </span>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon" className="size-7 rounded-lg shrink-0" />}
          >
            <MoreVertical className="size-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl">
            <DropdownMenuItem onClick={onPreview}>
              <Maximize2 />
              Full Preview
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(image.id)}
            >
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
