"use client";

import * as React from "react";
import {
  Type,
  Settings2,
  Copy,
  Download,
  RotateCcw,
  Baseline,
  CaseSensitive,
  LayoutGrid,
  Columns2,
  Check,
  Plus,
  Trash2,
  ExternalLink,
  ChevronDown,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Standard local fonts from globals.css
const LOCAL_FONTS = [
  { name: "HK Grotesk (Default)", value: "var(--font-sans)", category: "Sans" },
  { name: "Clash Display", value: "var(--font-display)", category: "Display" },
  { name: "Satoshi", value: "var(--font-body)", category: "Sans" },
  { name: "Clash Grotesk", value: "Clash Grotesk", category: "Sans" },
  { name: "Zodiak", value: "Zodiak", category: "Serif" },
];

const SYSTEM_FONTS = [
  { name: "Inter", value: "Inter, sans-serif", category: "Sans" },
  { name: "Roboto", value: "Roboto, sans-serif", category: "Sans" },
  { name: "System Serif", value: "serif", category: "Serif" },
  { name: "System Mono", value: "monospace", category: "Mono" },
];

const PRESET_TEXTS = [
  { name: "Sentence", text: "The quick brown fox jumps over the lazy dog." },
  { name: "Pangram", text: "Pack my box with five dozen liquor jugs." },
  {
    name: "Alphabet",
    text: "ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 1234567890",
  },
  {
    name: "Paragraph",
    text: "Design is not just what it looks like and feels like. Design is how it works. Innovation distinguishes between a leader and a follower. Your work is going to fill a large part of your life, and the only way to be truly satisfied is to do what you believe is great work.",
  },
];

interface FontConfig {
  id: string;
  label: string;
  family: string;
  size: number;
  weight: number;
  lineHeight: number;
  letterSpacing: number;
  color: string;
  text: string;
}

export default function FontTestingPage() {
  const [globalText, setGlobalText] = React.useState("");
  const [configs, setConfigs] = React.useState<FontConfig[]>([
    {
      id: "1",
      label: "Hero Title",
      family: "var(--font-display)",
      size: 48,
      weight: 700,
      lineHeight: 1.2,
      letterSpacing: -0.02,
      color: "currentColor",
      text: "Dive Seeks-DataHub",
    },
    {
      id: "2",
      label: "Main Body",
      family: "var(--font-sans)",
      size: 16,
      weight: 400,
      lineHeight: 1.6,
      letterSpacing: 0,
      color: "currentColor",
      text: "Monitor your store's performance and orders in real-time. Our advanced POS system provides deep insights and seamless management.",
    },
  ]);

  const applyGlobalText = () => {
    if (!globalText.trim()) return;
    setConfigs((prev) => prev.map((c) => ({ ...c, text: globalText })));
    toast.success("Applied global text to all previews");
  };

  const [viewMode, setViewMode] = React.useState<"grid" | "compare">("grid");
  const [highContrast, setHighContrast] = React.useState(false);

  const updateConfig = (id: string, updates: Partial<FontConfig>) => {
    setConfigs((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    );
  };

  const addConfig = () => {
    const last = configs[configs.length - 1];
    setConfigs([
      ...configs,
      {
        ...last,
        id: Math.random().toString(36).substr(2, 9),
        label: `New Card ${configs.length + 1}`,
      },
    ]);
    toast.success("Added new comparison card");
  };

  const removeConfig = (id: string) => {
    if (configs.length > 1) {
      setConfigs((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const copyCSS = (config: FontConfig) => {
    const css = `font-family: ${config.family};
font-size: ${config.size}px;
font-weight: ${config.weight};
line-height: ${config.lineHeight};
letter-spacing: ${config.letterSpacing}em;
color: ${config.color};`;
    navigator.clipboard.writeText(css);
    toast.success("CSS copied to clipboard");
  };

  return (
    <div
      className={cn(
        "flex-1 space-y-8 p-8 pt-6 min-h-screen transition-colors duration-300",
        highContrast ? "bg-black text-white" : "bg-background",
      )}
    >
      {/* Header */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-4xl font-bold tracking-tight flex items-center gap-3">
              <div className="h-8 w-1 bg-foreground rounded-full" />
              Typography Lab
            </h2>
            <p className="text-muted-foreground text-lg">
              Preview, compare, and fine-tune your project&apos;s typography
              system.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 mr-4">
              <Label htmlFor="high-contrast" className="text-sm font-medium">
                High Contrast
              </Label>
              <Switch
                id="high-contrast"
                checked={highContrast}
                onCheckedChange={setHighContrast}
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                setViewMode(viewMode === "grid" ? "compare" : "grid")
              }
              title={viewMode === "grid" ? "Comparison Mode" : "Grid Mode"}
            >
              {viewMode === "grid" ? (
                <Columns2 className="size-4" />
              ) : (
                <LayoutGrid className="size-4" />
              )}
            </Button>
            <Button
              onClick={addConfig}
              className="bg-foreground text-background hover:bg-foreground/90"
            >
              <Plus className="size-4 mr-2" /> Add Font
            </Button>
          </div>
        </div>

        {/* Global Controls */}
        <Card className="border-border bg-muted/30 overflow-hidden">
          <div className="p-4 flex flex-col md:flex-row items-end gap-4">
            <div className="flex-1 space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Global Test Text
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Type a phrase to test across all fonts..."
                  className="bg-background border-border"
                  value={globalText}
                  onChange={(e) => setGlobalText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applyGlobalText()}
                />
                <Button
                  variant="secondary"
                  className="bg-foreground text-background hover:bg-foreground/90"
                  onClick={applyGlobalText}
                >
                  Apply to All
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-10 text-xs font-medium"
                onClick={() => setGlobalText("")}
              >
                Clear
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <Separator />

      {/* Main Content */}
      <div
        className={cn(
          "grid gap-6",
          viewMode === "grid" ? "md:grid-cols-2" : "grid-cols-1",
        )}
      >
        {configs.map((config, idx) => (
          <Card
            key={config.id}
            className={cn(
              "overflow-hidden border-2 transition-all",
              highContrast
                ? "border-white bg-black"
                : "border-border/50 hover:border-border",
            )}
          >
            <CardHeader className="pb-4 border-b bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 mr-4">
                  <Badge
                    variant="outline"
                    className="font-mono text-[10px] uppercase shrink-0"
                  >
                    Slot {idx + 1}
                  </Badge>
                  <div className="flex-1 relative group/label max-w-[200px]">
                    <Input
                      value={config.label}
                      onChange={(e) =>
                        updateConfig(config.id, { label: e.target.value })
                      }
                      className="h-8 border-transparent hover:border-border bg-transparent focus:bg-background transition-all font-semibold text-lg px-2"
                      placeholder="Card Label..."
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyCSS(config)}
                    title="Copy CSS"
                  >
                    <Copy className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => removeConfig(config.id)}
                    title="Remove Card"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div
                className={cn(
                  "grid",
                  viewMode === "grid"
                    ? "grid-cols-1"
                    : "lg:grid-cols-[350px_1fr]",
                )}
              >
                {/* Controls Sidebar */}
                <div
                  className={cn(
                    "p-6 space-y-6 bg-muted/10",
                    viewMode === "grid" ? "border-b" : "lg:border-r",
                  )}
                >
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
                        Font Family
                      </Label>
                      <Select
                        value={config.family ?? undefined}
                        onValueChange={(v) =>
                          updateConfig(config.id, {
                            family: v ?? "var(--font-sans)",
                          })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select font" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Local Fonts</SelectLabel>
                            {LOCAL_FONTS.map((f) => (
                              <SelectItem key={f.value} value={f.value}>
                                {f.name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                          <SelectGroup>
                            <SelectLabel>System Fonts</SelectLabel>
                            {SYSTEM_FONTS.map((f) => (
                              <SelectItem key={f.value} value={f.value}>
                                {f.name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                            Size: {config.size}px
                          </Label>
                        </div>
                        <Slider
                          value={[config.size]}
                          min={8}
                          max={120}
                          step={1}
                          onValueChange={(value) => {
                            const nextValue = Array.isArray(value)
                              ? value[0]
                              : value;
                            updateConfig(config.id, { size: nextValue });
                          }}
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                            Weight: {config.weight}
                          </Label>
                        </div>
                        <Slider
                          value={[config.weight]}
                          min={100}
                          max={900}
                          step={100}
                          onValueChange={(value) => {
                            const nextValue = Array.isArray(value)
                              ? value[0]
                              : value;
                            updateConfig(config.id, { weight: nextValue });
                          }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                            Line Height: {config.lineHeight}
                          </Label>
                        </div>
                        <Slider
                          value={[config.lineHeight * 10]}
                          min={8}
                          max={25}
                          step={1}
                          onValueChange={(value) => {
                            const nextValue = Array.isArray(value)
                              ? value[0]
                              : value;
                            updateConfig(config.id, {
                              lineHeight: nextValue / 10,
                            });
                          }}
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                            Spacing: {config.letterSpacing}em
                          </Label>
                        </div>
                        <Slider
                          value={[config.letterSpacing * 100]}
                          min={-10}
                          max={20}
                          step={1}
                          onValueChange={(value) => {
                            const nextValue = Array.isArray(value)
                              ? value[0]
                              : value;
                            updateConfig(config.id, {
                              letterSpacing: nextValue / 100,
                            });
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2 pt-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
                        Presets
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        {PRESET_TEXTS.map((p) => (
                          <Button
                            key={p.name}
                            variant="outline"
                            size="sm"
                            className="text-[10px] h-7"
                            onClick={() =>
                              updateConfig(config.id, { text: p.text })
                            }
                          >
                            {p.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preview Area */}
                <div className="p-12 flex flex-col items-center justify-center min-h-[450px] relative bg-white dark:bg-zinc-950">
                  <textarea
                    className="w-full h-full bg-transparent border-none focus:ring-0 rounded-md p-4 resize-none overflow-auto text-center outline-none transition-all placeholder:text-muted-foreground/30 scrollbar-hide"
                    placeholder="Type here to test your font..."
                    style={{
                      fontFamily: config.family,
                      fontSize: `${config.size}px`,
                      fontWeight: config.weight,
                      lineHeight: config.lineHeight,
                      letterSpacing: `${config.letterSpacing}em`,
                      color: config.color,
                    }}
                    value={config.text}
                    onChange={(e) =>
                      updateConfig(config.id, { text: e.target.value })
                    }
                  />
                  <div className="absolute bottom-4 left-4 flex gap-2">
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest bg-muted/50 px-2 py-0.5 rounded backdrop-blur-sm border">
                      Editable Area
                    </span>
                  </div>
                  <div className="absolute bottom-4 right-4 flex gap-2">
                    <Badge
                      variant="secondary"
                      className="bg-muted text-muted-foreground border-border backdrop-blur-sm"
                    >
                      {config.size}px / {config.weight}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pairing Suggestions */}
      <Card className="mt-8 border-border bg-muted/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="size-5 text-muted-foreground" />
            <CardTitle>Recommended Pairings</CardTitle>
          </div>
          <CardDescription>
            Industry standard font pairings for professional dashboards.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                h: "Clash Display",
                b: "Satoshi",
                desc: "Modern & Tech-focused",
              },
              {
                h: "Clash Display",
                b: "HK Grotesk",
                desc: "Clean & Professional",
              },
              { h: "Zodiak", b: "HK Grotesk", desc: "Elegant & Editorial" },
            ].map((pair) => (
              <div
                key={pair.h + pair.b}
                className="p-4 rounded-lg bg-background border space-y-2 cursor-pointer hover:border-border transition-colors"
                onClick={() => {
                  setConfigs([
                    {
                      ...configs[0],
                      family:
                        LOCAL_FONTS.find((f) => f.name === pair.h)?.value ||
                        "serif",
                      size: 40,
                      weight: 700,
                    },
                    {
                      ...(configs[1] || configs[0]),
                      id: "2",
                      family:
                        LOCAL_FONTS.find((f) => f.name === pair.b)?.value ||
                        "sans-serif",
                      size: 16,
                      weight: 400,
                    },
                  ]);
                  toast.success(`Applied ${pair.h} + ${pair.b} pairing`);
                }}
              >
                <div
                  className="text-lg font-bold"
                  style={{
                    fontFamily: LOCAL_FONTS.find((f) => f.name === pair.h)
                      ?.value,
                  }}
                >
                  Heading Example
                </div>
                <div
                  className="text-sm text-muted-foreground"
                  style={{
                    fontFamily: LOCAL_FONTS.find((f) => f.name === pair.b)
                      ?.value,
                  }}
                >
                  Body text example for this font pairing.
                </div>
                <Badge variant="outline" className="mt-2">
                  {pair.desc}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
