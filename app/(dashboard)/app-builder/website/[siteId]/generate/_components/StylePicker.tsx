"use client";

import { cn } from "@/lib/utils";
import type { TemplateFamily } from "@/types/website-builder";

interface StylePickerProps {
  selected: TemplateFamily | null;
  onSelect: (family: TemplateFamily) => void;
}

const styles: { family: TemplateFamily; label: string; tagline: string; preview: string; accent: string }[] = [
  {
    family: "classic",
    label: "Classic",
    tagline: "Warm, trusted, traditional",
    preview: "bg-amber-50 border-amber-200",
    accent: "text-amber-700",
  },
  {
    family: "modern",
    label: "Modern",
    tagline: "Bold, premium, cinematic",
    preview: "bg-zinc-900 border-zinc-700",
    accent: "text-rose-400",
  },
];

export function StylePicker({ selected, onSelect }: StylePickerProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {styles.map(({ family, label, tagline, preview, accent }) => (
        <button
          key={family}
          type="button"
          onClick={() => onSelect(family)}
          className={cn(
            "relative rounded-2xl border-2 p-8 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground",
            preview,
            selected === family
              ? "ring-2 ring-foreground border-foreground scale-[1.02]"
              : "hover:scale-[1.01] hover:border-foreground/50",
          )}
        >
          {selected === family && (
            <span className="absolute top-4 right-4 h-5 w-5 rounded-full bg-foreground flex items-center justify-center">
              <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </span>
          )}
          <div className="space-y-3">
            <div className="space-y-1">
              <p className={cn("text-xs font-bold tracking-widest uppercase", accent)}>{family}</p>
              <h3 className={cn("text-2xl font-black", family === "modern" ? "text-white" : "text-zinc-900")}>{label}</h3>
              <p className={cn("text-sm", family === "modern" ? "text-zinc-400" : "text-zinc-500")}>{tagline}</p>
            </div>
            <div className={cn("rounded-xl p-4 mt-4", family === "modern" ? "bg-zinc-800" : "bg-white/60")}>
              <div className={cn("h-2 rounded w-3/4 mb-2", family === "modern" ? "bg-rose-500/60" : "bg-amber-500/60")} />
              <div className={cn("h-2 rounded w-1/2 mb-2", family === "modern" ? "bg-zinc-600" : "bg-zinc-200")} />
              <div className={cn("h-2 rounded w-2/3", family === "modern" ? "bg-zinc-600" : "bg-zinc-200")} />
            </div>
            <p className={cn("text-xs mt-2", family === "modern" ? "text-zinc-500" : "text-zinc-400")}>
              {family === "classic" ? "Bootstrap 5 · Warm palette · Serif accents" : "GSAP-inspired · Dark tones · Large type"}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
