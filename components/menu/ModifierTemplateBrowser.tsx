"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Sparkles,
  Pizza,
  Coffee,
  Sandwich,
  Globe,
  Check,
  Plus,
  X,
  Clock,
  Zap,
  RotateCcw,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getCurrencySymbol } from "@/lib/currency-utils";
import type { ModifierTemplate, RecommendedBundle } from "@/lib/api/modifiers";
import { motion, AnimatePresence } from "framer-motion";

interface ModifierTemplateBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  itemName?: string;
  categorySlug?: string;
  businessType: "RESTAURANT" | "CAFE" | "BAR" | "RETAIL" | "HYBRID";
  onApplyTemplate: (template: ModifierTemplate) => void;
  onApplyBundle: (templates: ModifierTemplate[]) => void;
  recommendedBundle?: RecommendedBundle;
  allTemplates?: ModifierTemplate[];
  isLoading?: boolean;
  currency?: string;
}

const CATEGORIES = [
  { id: "all", label: "All", icon: Globe },
  { id: "pizza", label: "Pizza", icon: Pizza },
  { id: "coffee", label: "Coffee", icon: Coffee },
  { id: "sandwich", label: "Sandwich", icon: Sandwich },
  { id: "universal", label: "Universal", icon: Zap },
];

export function ModifierTemplateBrowser({
  isOpen,
  onClose,
  itemName = "your item",
  categorySlug,
  businessType,
  onApplyTemplate,
  onApplyBundle,
  recommendedBundle,
  allTemplates = [],
  isLoading = false,
  currency = 'GBP',
}: ModifierTemplateBrowserProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");
  const [appliedTemplates, setAppliedTemplates] = React.useState<Set<string>>(
    new Set()
  );

  // Sync category selection when opening or categorySlug changes
  React.useEffect(() => {
    if (isOpen && categorySlug) {
      const slug = categorySlug.toLowerCase();
      const hasCategory = CATEGORIES.some(cat => cat.id === slug);
      if (hasCategory) {
        setSelectedCategory(slug);
      } else {
        setSelectedCategory("all");
      }
    }
  }, [isOpen, categorySlug]);

  // Filter templates based on search and category
  const filteredTemplates = React.useMemo(() => {
    return allTemplates.filter((template) => {
      const matchesSearch =
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === "all" ||
        (selectedCategory === "universal" && template.isUniversal) ||
        template.categorySlug?.toLowerCase() === selectedCategory.toLowerCase();

      return matchesSearch && matchesCategory;
    });
  }, [allTemplates, searchQuery, selectedCategory]);

  const handleApplyTemplate = (template: ModifierTemplate) => {
    setAppliedTemplates((prev) => {
      const next = new Set(prev);
      next.add(template.templateId);
      return next;
    });
    onApplyTemplate(template);
  };

  const handleApplyBundle = () => {
    if (recommendedBundle) {
      const bundleIds = recommendedBundle.modifiers.map((m) => m.templateId);
      setAppliedTemplates((prev) => {
        const next = new Set(prev);
        bundleIds.forEach((id) => next.add(id));
        return next;
      });
      onApplyBundle(recommendedBundle.modifiers);
    }
  };

  const formatPrice = (cents: number) => {
    if (cents === 0) return "Free";
    const amount = Math.abs(cents) / 100;
    const sign = cents >= 0 ? "+" : "-";
    return `${sign}${getCurrencySymbol(currency)}${amount.toFixed(2)}`;
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl p-0 flex flex-col gap-0 border-l border-border/50 shadow-2xl overflow-hidden"
      >
        {/* ── HEADER ── */}
        <SheetHeader className="px-6 py-5 border-b bg-muted/20 relative overflow-hidden shrink-0 text-left">
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Sparkles className="size-5 fill-primary/20" />
              </div>
              <SheetTitle className="text-xl font-bold tracking-tight">
                Modifier Library
              </SheetTitle>
              {isLoading && (
                <div className="flex items-center gap-1.5 ml-auto pr-4">
                   <div className="size-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                   <div className="size-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                   <div className="size-1.5 rounded-full bg-primary animate-bounce" />
                </div>
              )}
            </div>
            <SheetDescription className="text-sm font-medium">
              Smart configuration for <span className="text-foreground font-bold">{itemName}</span>
            </SheetDescription>
          </div>
        </SheetHeader>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* ── RECOMMENDED BUNDLE ── */}
          <AnimatePresence>
            {!isLoading && recommendedBundle && recommendedBundle.modifiers.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-gradient-to-r from-primary/[0.08] to-primary/[0.02] border-b p-5 relative group overflow-hidden shrink-0"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 text-left">
                      <Badge variant="default" className="bg-primary hover:bg-primary px-2 py-0 h-5 text-[10px] uppercase font-bold tracking-wider">
                        AI RECOMMENDED
                      </Badge>
                    </div>
                    <h3 className="font-bold text-base flex items-center gap-1.5 mb-1 text-foreground text-left">
                      Complete Customization Bundle
                    </h3>
                    <p className="text-xs text-muted-foreground mb-3 leading-relaxed text-left font-medium">
                      Used by <span className="font-semibold text-foreground">{recommendedBundle.comparableRestaurants}+</span> similar venues.
                      Includes {recommendedBundle.modifiers.length} modifiers.
                    </p>

                    <div className="flex flex-wrap gap-1.5 mb-4 justify-start">
                      {recommendedBundle.modifiers.slice(0, 3).map((mod) => (
                        <Badge key={mod.templateId} variant="outline" className="bg-background/50 backdrop-blur-sm border-primary/20 text-[11px] py-0 h-6">
                          {mod.icon} {mod.name}
                        </Badge>
                      ))}
                      {recommendedBundle.modifiers.length > 3 && (
                        <Badge variant="outline" className="bg-background/50 backdrop-blur-sm text-[11px] py-0 h-6">
                          +{recommendedBundle.modifiers.length - 3} more
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-medium uppercase tracking-tight justify-start">
                      <div className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {recommendedBundle.estimatedCompletionTime} SETUP
                      </div>
                      <div className="flex items-center gap-1">
                        <Zap className="size-3 text-foreground fill-foreground/20" />
                        INSTANT APPLY
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleApplyBundle}
                    size="sm"
                    className="rounded-full shadow-lg shadow-primary/20 px-4 transition-all hover:scale-105 active:scale-95 shrink-0"
                  >
                    <Sparkles className="size-3.5 mr-1.5 fill-current" />
                    Apply All
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── SEARCH & FILTER ── */}
          <div className="px-6 py-4 border-b space-y-4 bg-background shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search templates (e.g. Size, Toppings)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 border-muted-foreground/20 focus-visible:ring-primary/30"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar shrink-0">
              {CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat.id;
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap border",
                      isActive
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="size-3" />
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── TEMPLATE LIST ── */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-6 space-y-4">
              <AnimatePresence mode="popLayout">
                {isLoading ? (
                  // Loading Skeleton List
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="border rounded-xl p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Skeleton className="size-6 rounded-full" />
                          <Skeleton className="h-5 w-32" />
                        </div>
                        <Skeleton className="h-8 w-16 rounded-full" />
                      </div>
                      <Skeleton className="h-4 w-full" />
                      <div className="flex gap-1.5">
                        <Skeleton className="h-5 w-16" />
                        <Skeleton className="h-5 w-16" />
                        <Skeleton className="h-5 w-16" />
                      </div>
                    </div>
                  ))
                ) : filteredTemplates.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-16 px-6"
                  >
                    <div className="mx-auto w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4 relative">
                       <Search className="size-8 text-muted-foreground/30" />
                       <div className="absolute inset-0 rounded-full border border-dashed border-muted-foreground/20 animate-spin-slow" />
                    </div>
                    <h4 className="font-bold text-foreground mb-1">No templates found</h4>
                    <p className="text-sm text-muted-foreground max-w-[280px] mx-auto mb-8 leading-relaxed">
                      We couldn&apos;t find any templates matching your search in the <span className="font-bold text-primary">{selectedCategory}</span> category.
                    </p>
                    <div className="flex flex-col gap-2 max-w-[200px] mx-auto">
                      <Button
                        variant="default"
                        size="sm"
                        className="rounded-full"
                        onClick={() => setSelectedCategory("all")}
                      >
                        <Globe className="size-3.5 mr-1.5" />
                        Browse All Categories
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
                        onClick={() => {
                          setSearchQuery("");
                          setSelectedCategory("all");
                        }}
                      >
                         <RotateCcw className="size-3.5 mr-1.5" />
                         Reset Filters
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  filteredTemplates.map((template, idx) => {
                    const isApplied = appliedTemplates.has(template.templateId);
                    const isRecommended = recommendedBundle?.modifiers.some(
                      (m) => m.templateId === template.templateId
                    );

                    return (
                      <motion.div
                        key={template.templateId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className={cn(
                          "group relative border rounded-xl p-4 transition-all duration-300",
                          isRecommended
                            ? "border-primary/30 shadow-sm shadow-primary/5 bg-primary/[0.02]"
                            : "border-border/60 hover:border-primary/40 hover:shadow-md hover:shadow-primary/5",
                          isApplied && "opacity-60 bg-muted/10 border-transparent shadow-none scale-[0.98]"
                        )}
                      >
                        {isRecommended && !isApplied && (
                          <div className="absolute top-0 right-0 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Sparkles className="size-3 text-primary animate-pulse" />
                          </div>
                        )}

                        <div className="flex items-start gap-4">
                          <div className="flex-1 space-y-2.5">
                            {/* Card Header */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xl shrink-0">
                                {template.icon || "🔘"}
                              </span>
                              <h4 className="font-bold text-sm text-foreground">
                                {template.name}
                              </h4>
                              {template.isRequired && (
                                <Badge variant="destructive" className="text-[9px] h-4 px-1.5 font-bold uppercase tracking-tight">
                                  Required
                                </Badge>
                              )}
                              {isRecommended && template.relevanceScore && (
                                <Badge variant="secondary" className="bg-primary/10 text-primary border-transparent text-[9px] h-4 px-1.5 font-bold">
                                  {Math.round(template.relevanceScore * 100)}% RECOMMENDATION
                                </Badge>
                              )}
                            </div>

                            {/* Description & Reasoning */}
                            {(template.description || template.reasoning) && (
                              <div className="space-y-1.5">
                                {template.description && (
                                  <p className="text-xs text-muted-foreground leading-relaxed text-left">
                                    {template.description}
                                  </p>
                                )}
                                {template.reasoning && (
                                  <div className="flex items-start gap-1.5 p-2 rounded-lg bg-primary/5 border border-primary/10">
                                    <Sparkles className="size-3 text-primary mt-0.5 shrink-0" />
                                    <p className="text-[11px] text-primary/80 italic font-medium leading-tight text-left">
                                      {template.reasoning}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Options Visualization */}
                            <div className="flex flex-wrap gap-1.5 pt-1 justify-start">
                              {template.options.slice(0, 5).map((option, oIdx) => (
                                <div
                                  key={oIdx}
                                  className="px-2 py-0.5 rounded-md border bg-background/50 text-[10px] font-semibold text-muted-foreground flex items-center gap-1 transition-colors group-hover:border-primary/20"
                                >
                                  {option.name}
                                  {option.priceModifier !== 0 && (
                                    <span className="text-primary/70 font-bold">
                                      {formatPrice(option.priceModifier)}
                                    </span>
                                  )}
                                </div>
                              ))}
                              {template.options.length > 5 && (
                                <div className="text-[10px] font-bold text-muted-foreground/60 px-1 pt-0.5">
                                  +{template.options.length - 5} MORE
                                </div>
                              )}
                            </div>

                            {/* Type Footer */}
                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground/50 font-bold uppercase tracking-widest pt-1 justify-start">
                              <span className="flex items-center gap-1">
                                <ChevronRight className="size-2.5 text-primary" />
                                {template.type.replace("_", " ")}
                              </span>
                              <span>•</span>
                              <span>{template.options.length} OPTIONS TOTAL</span>
                            </div>
                          </div>

                          {/* Action Button */}
                          <div className="shrink-0 self-start pt-1">
                            <Button
                              size="sm"
                              variant={isApplied ? "ghost" : "outline"}
                              onClick={() => handleApplyTemplate(template)}
                              disabled={isApplied}
                              className={cn(
                                "h-8 min-w-[70px] rounded-full px-4 transition-all active:scale-95",
                                !isApplied && "hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm font-bold text-xs"
                              )}
                            >
                              {isApplied ? (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="flex items-center gap-1.5 text-foreground font-bold"
                                >
                                  <Check className="size-4" />
                                  ADDED
                                </motion.div>
                              ) : (
                                "ADD"
                              )}
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </div>

        {/* ── FOOTER ── */}
        <div className="p-5 border-t bg-muted/20 backdrop-blur-sm flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
             <div className="relative">
                <div className="size-2 rounded-full bg-primary" />
                <div className="absolute inset-0 size-2 rounded-full bg-primary animate-ping" />
             </div>
             <div className="text-left">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider leading-none mb-1">SESSION STATUS</p>
                <p className="text-xs font-bold text-foreground">
                  {appliedTemplates.size} Modifiers Applied
                </p>
             </div>
          </div>
          <Button
            onClick={onClose}
            className="rounded-full px-8 font-bold shadow-lg shadow-primary/10 transition-all hover:shadow-primary/20 active:scale-95"
          >
            Review Changes
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
