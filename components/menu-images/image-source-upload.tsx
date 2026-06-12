"use client";

import { useCallback, useState } from "react";
import { Upload, X, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ImageSourceUploadProps {
  label: string;
  description: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  accept?: string;
}

export function ImageSourceUpload({
  label,
  description,
  file,
  onFileChange,
  accept = "image/jpeg,image/png,image/webp",
}: ImageSourceUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = useCallback(
    (f: File | null) => {
      onFileChange(f);
      if (f) {
        const url = URL.createObjectURL(f);
        setPreview(url);
      } else {
        setPreview(null);
      }
    },
    [onFileChange],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const f = e.dataTransfer.files?.[0];
      if (f && f.type.startsWith("image/")) handleFile(f);
    },
    [handleFile],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0] || null;
      handleFile(f);
    },
    [handleFile],
  );

  if (file && preview) {
    return (
      <div className="relative group">
        <div className="aspect-square overflow-hidden rounded-xl border-2 border-border bg-muted/30">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-full object-cover"
          />
        </div>
        <Button
          size="icon"
          variant="destructive"
          className="absolute -top-2 -right-2 size-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => handleFile(null)}
        >
          <X className="size-3" />
        </Button>
        <p className="mt-1 text-[9px] font-bold text-muted-foreground truncate text-center">
          {file.name}
        </p>
      </div>
    );
  }

  return (
    <label
      className={cn(
        "flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all",
        isDragging
          ? "border-foreground bg-muted"
          : "border-border hover:border-foreground/50 hover:bg-muted/30",
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleInputChange}
      />
      <div className="size-10 rounded-xl bg-muted flex items-center justify-center">
        {isDragging ? (
          <Upload className="size-5 text-foreground" />
        ) : (
          <ImageIcon className="size-5 text-muted-foreground" />
        )}
      </div>
      <div className="text-center">
        <p className="text-xs font-bold text-foreground">{label}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{description}</p>
      </div>
    </label>
  );
}
