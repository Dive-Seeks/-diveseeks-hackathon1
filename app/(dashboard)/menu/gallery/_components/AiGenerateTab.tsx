"use client";

import { ImageGeneratePanel } from "@/components/menu-images/image-generate-panel";
import type { GeneratedImage } from "@/hooks/use-menu-images";
import { toast } from "sonner";

interface AiGenerateTabProps {
  siteId: string;
  businessType?: string;
}

export function AiGenerateTab({ siteId, businessType }: AiGenerateTabProps) {
  const handleImageApproved = (image: GeneratedImage) => {
    toast.success(`"${image.itemName}" added to your gallery!`);
  };

  return (
    <div className="max-w-lg mx-auto">
      <ImageGeneratePanel
        storeId={siteId}
        businessType={businessType}
        onImageApproved={handleImageApproved}
      />
    </div>
  );
}
