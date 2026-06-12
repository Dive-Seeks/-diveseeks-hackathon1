"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Type,
  Camera,
  Layers,
  Sparkles,
  Wand2,
  ChevronDown,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useGenerateMenuImage,
  useSearchMenuImages,
  useMenuImageStatus,
  useApproveMenuImage,
  useRejectMenuImage,
  type GeneratedImage,
} from "@/hooks/use-menu-images";
import { ImageSourceUpload } from "./image-source-upload";
import { ImageLibraryGrid } from "./image-library-grid";
import { ImageCompareView } from "./image-compare-view";

type InputMode = "text" | "single_photo" | "two_photos";

const modeConfig: Record<
  InputMode,
  { label: string; icon: typeof Type; description: string }
> = {
  text: {
    label: "Text",
    icon: Type,
    description: "Describe your dish and we'll generate it",
  },
  single_photo: {
    label: "Photo",
    icon: Camera,
    description: "Upload a photo of your actual dish",
  },
  two_photos: {
    label: "Photo + Style",
    icon: Layers,
    description: "Upload your dish + a style reference",
  },
};

const cuisineOptions = [
  "Italian",
  "Indian",
  "Chinese",
  "Japanese",
  "Mexican",
  "Thai",
  "French",
  "American",
  "Mediterranean",
  "Middle Eastern",
  "Korean",
  "Vietnamese",
  "British",
  "Turkish",
  "Other",
];

interface ImageGeneratePanelProps {
  storeId?: string;
  businessType?: string;
  onImageApproved?: (image: GeneratedImage) => void;
}

export function ImageGeneratePanel({
  storeId,
  businessType,
  onImageApproved,
}: ImageGeneratePanelProps) {
  const [mode, setMode] = useState<InputMode>("text");
  const [itemName, setItemName] = useState("");
  const [cuisineType, setCuisineType] = useState("");
  const [preset, setPreset] = useState(
    businessType === "fast_food" ? "fastFood" : "premium",
  );
  const [sourceImage, setSourceImage] = useState<File | null>(null);
  const [styleRefImage, setStyleRefImage] = useState<File | null>(null);
  const [activeImageId, setActiveImageId] = useState<string | null>(null);
  const [selectedLibraryImage, setSelectedLibraryImage] =
    useState<GeneratedImage | null>(null);

  // Hooks
  const generateMutation = useGenerateMenuImage();
  const approveMutation = useApproveMenuImage();
  const rejectMutation = useRejectMenuImage();
  const { data: statusData } = useMenuImageStatus(activeImageId);
  const { data: libraryResults, isLoading: isSearching } =
    useSearchMenuImages(itemName, itemName.length >= 2);

  // When status is completed, update active image
  useEffect(() => {
    if (statusData?.approvalStatus === "completed" || statusData?.approvalStatus === "approved") {
      // Auto-scroll to results
    }
  }, [statusData?.approvalStatus]);

  const handleGenerate = useCallback(async () => {
    if (!itemName.trim()) {
      toast.error("Please enter a dish name");
      return;
    }

    try {
      const result = await generateMutation.mutateAsync({
        itemName: itemName.trim(),
        cuisineType: cuisineType || undefined,
        businessType: businessType || undefined,
        preset,
        sourceMode: mode,
        storeId,
        sourceImage: sourceImage || undefined,
        styleRefImage: styleRefImage || undefined,
      });

      setActiveImageId(result.imageId);
      toast.success("Image generation started!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to start generation");
    }
  }, [
    itemName,
    cuisineType,
    businessType,
    preset,
    mode,
    storeId,
    sourceImage,
    styleRefImage,
    generateMutation,
  ]);

  const handleApprove = useCallback(
    async (imageId: string) => {
      try {
        const result = await approveMutation.mutateAsync(imageId);
        toast.success("Image approved and saved to gallery!");
        onImageApproved?.(result);
      } catch {
        toast.error("Failed to approve image");
      }
    },
    [approveMutation, onImageApproved],
  );

  const handleReject = useCallback(
    async (imageId: string) => {
      try {
        await rejectMutation.mutateAsync(imageId);
        toast.info("Image rejected");
      } catch {
        toast.error("Failed to reject image");
      }
    },
    [rejectMutation],
  );

  const handleUseLibrary = useCallback(
    (image: GeneratedImage) => {
      setSelectedLibraryImage(image);
      toast.success("Library image selected (Free!)");
      onImageApproved?.(image);
    },
    [onImageApproved],
  );

  const canGenerate =
    itemName.trim().length > 0 &&
    !generateMutation.isPending &&
    (mode === "text" || sourceImage !== null);

  return (
    <div className="space-y-5">
      {/* Mode Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50 border border-border">
        {(Object.entries(modeConfig) as [InputMode, typeof modeConfig.text][]).map(
          ([key, config]) => {
            const Icon = config.icon;
            return (
              <button
                key={key}
                onClick={() => setMode(key)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold transition-all",
                  mode === key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" />
                <span className="hidden sm:inline">{config.label}</span>
              </button>
            );
          },
        )}
      </div>

      {/* Mode description */}
      <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest text-center">
        {modeConfig[mode].description}
      </p>

      {/* Input Fields */}
      <div className="space-y-3">
        <div>
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Dish Name
          </Label>
          <Input
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="e.g. Margherita Pizza"
            className="mt-1 rounded-xl"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Cuisine
            </Label>
            <Select value={cuisineType} onValueChange={(v) => setCuisineType(v || "")}>
              <SelectTrigger className="mt-1 rounded-xl">
                <SelectValue placeholder="Select cuisine" />
              </SelectTrigger>
              <SelectContent>
                {cuisineOptions.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Style Preset
            </Label>
            <Select value={preset} onValueChange={(v) => setPreset(v || "premium")}>
              <SelectTrigger className="mt-1 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="premium">🍽️ Premium</SelectItem>
                <SelectItem value="fastFood">🍔 Fast Food</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Photo upload zones */}
        {mode !== "text" && (
          <div className={cn("grid gap-3", mode === "two_photos" ? "grid-cols-2" : "grid-cols-1")}>
            <ImageSourceUpload
              label="Your Dish"
              description="Drop a photo of your actual dish"
              file={sourceImage}
              onFileChange={setSourceImage}
            />
            {mode === "two_photos" && (
              <ImageSourceUpload
                label="Style Reference"
                description="Drop a style inspiration photo"
                file={styleRefImage}
                onFileChange={setStyleRefImage}
              />
            )}
          </div>
        )}
      </div>

      <Separator />

      {/* Library suggestions */}
      {itemName.length >= 2 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="size-3" />
              From Library
            </h4>
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
              Free to use
            </span>
          </div>
          <ImageLibraryGrid
            images={libraryResults || []}
            isLoading={isSearching}
            onSelect={handleUseLibrary}
            selectedId={selectedLibraryImage?.id}
          />
        </div>
      )}

      {/* Generate button */}
      <Button
        className="w-full rounded-xl bg-foreground text-background hover:bg-foreground/90 font-black h-11"
        onClick={handleGenerate}
        disabled={!canGenerate}
      >
        {generateMutation.isPending ? (
          <>
            <Wand2 className="size-4 mr-2 animate-spin" />
            Starting Generation...
          </>
        ) : (
          <>
            <Wand2 className="size-4 mr-2" />
            Generate New Image
            <span className="ml-2 text-[10px] opacity-70 font-normal">~$0.04</span>
          </>
        )}
      </Button>

      {/* Compare Results */}
      {(statusData || selectedLibraryImage) && (
        <>
          <Separator />
          <ImageCompareView
            libraryMatch={
              selectedLibraryImage ||
              (libraryResults && libraryResults.length > 0 ? libraryResults[0] : null)
            }
            generated={statusData || null}
            onApprove={handleApprove}
            onReject={handleReject}
            onRegenerate={handleGenerate}
            onUseLibrary={handleUseLibrary}
            isApproving={approveMutation.isPending}
          />
        </>
      )}
    </div>
  );
}
