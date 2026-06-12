"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Upload,
  X,
  Image as ImageIcon,
  CheckCircle2,
  Loader2,
  Plus,
  AlertCircle,
  Tag,
  FolderOpen,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: string | null;
}

const PRESET_TAGS = ["Product", "Ambience", "Team", "Menu", "Event"];

type UploadStatus = "pending" | "uploading" | "success" | "error";

export function UploadModal({ isOpen, onClose, storeId }: UploadModalProps) {
  const queryClient = useQueryClient();
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [tags, setTags] = React.useState<string[]>([]);
  const [tagInput, setTagInput] = React.useState("");
  const [isUploading, setIsUploading] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const [uploadStatus, setUploadStatus] = React.useState<Record<string, UploadStatus>>({});
  const [progressValues, setProgressValues] = React.useState<Record<string, number>>({});
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const addFiles = (files: File[]) => {
    const unique = files.filter((f) => !selectedFiles.some((sf) => sf.name === f.name));
    if (unique.length < files.length) toast.info("Some duplicate files were skipped");
    setSelectedFiles((prev) => [...prev, ...unique]);
    setUploadStatus((prev) => {
      const next = { ...prev };
      unique.forEach((f) => (next[f.name] = "pending"));
      return next;
    });
    setProgressValues((prev) => {
      const next = { ...prev };
      unique.forEach((f) => (next[f.name] = 0));
      return next;
    });
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    if (files.length) addFiles(files);
  };

  const removeFile = (index: number) => {
    const name = selectedFiles[index].name;
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setUploadStatus((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
    setProgressValues((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const addTag = (tag: string) => {
    const t = tag.trim();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput("");
  };

  const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag));

  const handleUpload = async () => {
    if (!selectedFiles.length || !storeId) return;
    setIsUploading(true);
    let successCount = 0;

    for (const file of selectedFiles) {
      if (uploadStatus[file.name] === "success") continue;
      setUploadStatus((prev) => ({ ...prev, [file.name]: "uploading" }));
      const form = new FormData();
      form.append("file", file);
      tags.forEach((t) => form.append("tags", t));
      try {
        await api.post(`/stores/${storeId}/images/upload`, form, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            const progress = progressEvent.total
              ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
              : 0;
            setProgressValues((prev) => ({ ...prev, [file.name]: progress }));
          },
        });

        setUploadStatus((prev) => ({ ...prev, [file.name]: "success" }));
        setProgressValues((prev) => ({ ...prev, [file.name]: 100 }));
        successCount++;
      } catch {
        setUploadStatus((prev) => ({ ...prev, [file.name]: "error" }));
      }
    }

    setIsUploading(false);
    if (successCount > 0) {
      toast.success(`${successCount} of ${selectedFiles.length} image${successCount !== 1 ? "s" : ""} uploaded`);
      queryClient.invalidateQueries({ queryKey: ["gallery-images", storeId] });
      queryClient.invalidateQueries({ queryKey: ["store-images", storeId] });
      setTimeout(() => {
        onClose();
        setSelectedFiles([]);
        setTags([]);
        setUploadStatus({});
        setProgressValues({});
      }, 600);
    } else {
      toast.error("Upload failed. Please try again.");
    }
  };

  const reset = () => {
    if (isUploading) return;
    setSelectedFiles([]);
    setTags([]);
    setProgressValues({});
    onClose();
  };

  const pendingCount = selectedFiles.filter((f) => uploadStatus[f.name] === "pending").length;
  const successCount = selectedFiles.filter((f) => uploadStatus[f.name] === "success").length;
  const errorCount = selectedFiles.filter((f) => uploadStatus[f.name] === "error").length;
  const hasFiles = selectedFiles.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={reset}>
      <DialogContent showCloseButton={false} className="max-w-lg w-full p-0 gap-0 rounded-2xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
          <div>
            <DialogTitle className="text-base font-bold text-foreground">Upload Images</DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Images will be added to your media library
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-xl text-muted-foreground"
            onClick={reset}
            disabled={isUploading}
          >
            <X />
          </Button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* ── Step 1: Drop zone ── */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Step 1 — Select files
            </p>
            <div
              className={cn(
                "relative border-2 border-dashed rounded-xl transition-all cursor-pointer",
                isDragging
                  ? "border-primary bg-primary/5 scale-[1.01]"
                  : hasFiles
                  ? "border-primary/40 bg-primary/5 hover:border-primary/60"
                  : "border-border hover:border-primary/40 hover:bg-muted/30",
              )}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleFileInput}
              />
              <div className="flex flex-col items-center justify-center gap-3 py-8 px-6 text-center">
                <div className={cn(
                  "size-14 rounded-2xl flex items-center justify-center transition-transform duration-200",
                  isDragging ? "bg-primary text-primary-foreground scale-110" : "bg-muted text-muted-foreground",
                )}>
                  <Upload className="size-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Drag & drop images here
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    or{" "}
                    <span className="text-primary font-semibold underline underline-offset-2">
                      browse files
                    </span>
                    {" "}— JPG, PNG, WebP up to 10 MB
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Step 2: File queue (only shown when files are selected) ── */}
          {hasFiles && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Step 2 — Review files ({selectedFiles.length})
                </p>
                {!isUploading && (
                  <button
                    className="text-xs font-semibold text-destructive hover:underline"
                    onClick={() => { setSelectedFiles([]); setProgressValues({}); }}
                  >
                    Remove all
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {selectedFiles.map((file, i) => {
                  const status = uploadStatus[file.name] ?? "pending";
                  const progress = progressValues[file.name] ?? 0;
                  return (
                    <div
                      key={file.name}
                      className="flex flex-col gap-2 p-3 rounded-xl bg-muted/40 border border-border/50 group/row"
                    >
                      <div className="flex items-center gap-3">
                        {/* Thumbnail preview */}
                        <FileThumb file={file} />

                        {/* Name + size */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{file.name}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>

                        {/* Status / remove */}
                        <div className="shrink-0 flex items-center gap-1.5">
                          {status === "uploading" && (
                            <Loader2 className="size-4 animate-spin text-primary" />
                          )}
                          {status === "success" && (
                            <CheckCircle2 className="size-4 text-foreground" />
                          )}
                          {status === "error" && (
                            <AlertCircle className="size-4 text-destructive" />
                          )}
                          {status === "pending" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => removeFile(i)}
                            >
                              <X className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {status === "uploading" && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[9px] font-bold text-primary/60 uppercase tracking-tighter">
                            <span>Uploading…</span>
                            <span>{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-1 bg-primary/10" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Add more files */}
                {!isUploading && (
                  <button
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Plus className="size-3.5" />
                    Add more images
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Step 3: Tags — shown always, clearly labeled as optional ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Step 3 — Tag images
                <span className="ml-1.5 normal-case tracking-normal font-normal text-muted-foreground/60">
                  (optional)
                </span>
              </p>
            </div>

            {/* Context note — inline, near the tags themselves */}
            <div className="flex items-start gap-2 mb-3 p-3 rounded-xl bg-muted/50 border border-border/50">
              <Tag className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tags you add here will apply to <strong className="text-foreground font-semibold">all images</strong> in this batch. You can change them individually after upload.
              </p>
            </div>

            {/* Active tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    className="bg-primary text-primary-foreground border-none pl-2.5 pr-1 py-1 rounded-lg text-xs font-semibold flex items-center gap-1"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="size-4 rounded bg-white/20 hover:bg-white/40 flex items-center justify-center transition-colors"
                    >
                      <X className="size-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Tag input */}
            <div className="flex gap-2">
              <Input
                placeholder="Type a tag and press Enter…"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addTag(tagInput); }
                }}
                className="rounded-xl h-9 text-sm flex-1"
              />
              <Button
                size="icon"
                variant="outline"
                className="size-9 rounded-xl shrink-0"
                onClick={() => addTag(tagInput)}
                disabled={!tagInput.trim()}
              >
                <Plus />
              </Button>
            </div>

            {/* Preset chips */}
            {PRESET_TAGS.some((t) => !tags.includes(t)) && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {PRESET_TAGS.filter((t) => !tags.includes(t)).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => addTag(tag)}
                    className="text-xs font-medium px-2.5 py-1 rounded-lg bg-background border border-border hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-colors"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 border-t border-border bg-muted/20 px-6 py-4">
          {/* Upload progress summary */}
          {isUploading && (
            <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin text-primary" />
              <span>
                Uploading {selectedFiles.length} image{selectedFiles.length !== 1 ? "s" : ""}…
                {successCount > 0 && (
                  <span className="text-foreground font-semibold ml-1">{successCount} done</span>
                )}
                {errorCount > 0 && (
                  <span className="text-destructive font-semibold ml-1">{errorCount} failed</span>
                )}
              </span>
            </div>
          )}

          <div className="flex items-center gap-3">
            {/* Cancel — ghost, smaller visual weight */}
            <Button
              variant="ghost"
              onClick={reset}
              disabled={isUploading}
              className="rounded-xl px-5 h-11 text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>

            {/* Upload — full width, dominant */}
            <Button
              onClick={handleUpload}
              disabled={!hasFiles || isUploading}
              className="flex-1 h-11 rounded-xl font-bold text-sm"
            >
              {isUploading ? (
                <>
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                  Uploading {selectedFiles.length} image{selectedFiles.length !== 1 ? "s" : ""}…
                </>
              ) : (
                <>
                  <Upload data-icon="inline-start" />
                  Upload {hasFiles ? `${selectedFiles.length} image${selectedFiles.length !== 1 ? "s" : ""}` : "Images"}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* Tiny component that renders a live image preview from a File object */
function FileThumb({ file }: { file: File }) {
  const [src, setSrc] = React.useState<string | null>(null);

  React.useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!src) {
    return (
      <div className="size-10 shrink-0 rounded-lg bg-muted flex items-center justify-center">
        <ImageIcon className="size-4 text-muted-foreground" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={file.name}
      className="size-10 shrink-0 rounded-lg object-cover border border-border/50"
    />
  );
}
