"use client";

import * as React from "react";
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Check,
  Plus,
  Trash2,
  Store,
  Loader2,
  Wand2,
  Send,
  Rocket,
  MessageSquare,
  LayoutGrid,
  ListTree,
  Eye,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { AttributeBadge } from "@/components/menu/AttributeBadge";
import { GlobalAttributesPanel } from "@/components/menu/GlobalAttributesPanel";
import type { AttributeSuggestion } from "@/hooks/use-menu-wizard";
import { Site } from "@/lib/api/contracts";
import { useMenuWizardStore, WizardStep } from "@/hooks/use-menu-wizard";
import { useQuery } from "@tanstack/react-query";
import { useBusinessContextStore } from "@/lib/business-context-store";

// ============ STEP DEFINITIONS ============

const STEPS: { key: WizardStep; label: string; icon: React.ElementType }[] = [
  { key: "discovery", label: "Discovery", icon: MessageSquare },
  { key: "categories", label: "Categories", icon: LayoutGrid },
  { key: "menu-builder", label: "Menu Builder", icon: ListTree },
  { key: "review", label: "Review", icon: Eye },
  { key: "apply", label: "Apply", icon: Rocket },
];

// ============ MAIN WIZARD COMPONENT ============

export function MenuWizard() {
  const { isOpen, closeWizard, currentStep } =
    useMenuWizardStore();

  const handleClose = () => {
    closeWizard();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-5xl h-[85vh] min-h-[500px] flex flex-col p-0 gap-0 overflow-hidden border-border">
        {/* Header with Stepper */}
        <div className="px-6 py-4 border-b bg-card shrink-0">
          <DialogHeader className="space-y-0">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-orange-500" />

              Abigail AI Menu Builder
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Build your menu with AI assistance
            </DialogDescription>
          </DialogHeader>

          {/* Progress Stepper */}
          <div className="flex items-center justify-between mt-4">
            {STEPS.map((step, idx) => {
              const stepIdx = STEPS.findIndex((s) => s.key === currentStep);
              const isActive = step.key === currentStep;
              const isCompleted = idx < stepIdx;
              const Icon = step.icon;

              return (
                <React.Fragment key={step.key}>
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300",
                        isActive &&
                          "bg-foreground text-background scale-110",
                        isCompleted &&
                          "bg-muted text-foreground",
                        !isActive &&
                          !isCompleted &&
                          "bg-muted text-muted-foreground"
                      )}
                    >
                      {isCompleted ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Icon className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-xs font-medium hidden sm:inline transition-colors",
                        isActive && "text-foreground font-semibold",
                        isCompleted && "text-muted-foreground",
                        !isActive &&
                          !isCompleted &&
                          "text-muted-foreground"
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div
                      className={cn(
                        "flex-1 h-0.5 mx-2 rounded transition-colors",
                        idx < stepIdx
                          ? "bg-foreground"
                          : "bg-muted"
                      )}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-6">
            {currentStep === "discovery" && <DiscoveryStep />}
            {currentStep === "categories" && <CategoriesStep />}
            {currentStep === "menu-builder" && <MenuBuilderStep />}
            {currentStep === "review" && <ReviewStep />}
            {currentStep === "apply" && <ApplyStep />}
          </div>
        </ScrollArea>

        {/* Footer Navigation */}
        <div className="shrink-0 w-full border-t bg-background">
          <WizardFooter />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============ ATTRIBUTE SUGGESTION BUBBLE ============

export function AttributeSuggestionBubble({
  suggestions,
  onApply,
  onSkip,
}: {
  suggestions: AttributeSuggestion[];
  onApply: (selected: AttributeSuggestion[]) => void;
  onSkip: () => void;
}) {
  const [selected, setSelected] = React.useState<Set<string>>(
    new Set(
      suggestions
        .filter((s) => s.confidence === "high")
        .map((s) => `${s.attributeKey}:${s.attributeValue}`)
    )
  );

  const toggle = (s: AttributeSuggestion) => {
    const key = `${s.attributeKey}:${s.attributeValue}`;
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  return (
    <div className="mt-3 pt-3 border-t border-border/30 space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((s) => (
          <AttributeBadge
            key={`${s.attributeKey}:${s.attributeValue}`}
            icon={s.icon}
            label={s.label}
            selected={selected.has(`${s.attributeKey}:${s.attributeValue}`)}
            onClick={() => toggle(s)}
            size="sm"
          />
        ))}
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() =>
            onApply(
              suggestions.filter((s) =>
                selected.has(`${s.attributeKey}:${s.attributeValue}`)
              )
            )
          }
          disabled={selected.size === 0}
          className="text-[11px] px-3 py-1 rounded-full bg-foreground text-background font-medium disabled:opacity-40 hover:bg-foreground/90 transition-colors"
        >
          Apply Selected →
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="text-[11px] px-3 py-1 rounded-full border border-border/50 text-muted-foreground hover:bg-muted transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  );
}

// ============ STEP 1: DISCOVERY ============

function DiscoveryStep() {
  const {
    setBusinessDescription,
    setDiscoveryResult,
    isDiscovering,
    setIsDiscovering,
    setPendingAttributes,
    pendingAttributeSuggestions,
    pendingAttributeMessage,
    clearPendingAttributes,
    setGlobalAttribute,
  } = useMenuWizardStore();
  const [inputValue, setInputValue] = React.useState("");
  const [chatHistory, setChatHistory] = React.useState<
    { role: "ai" | "user"; text: string; type?: "text" | "attribute-suggestion" }[]
  >([
    {
      role: "ai",
      text: "👋 Hi! I'm **Abigail**, your AI menu assistant. Tell me about your business — what type of food do you serve?\n\nFor example: *\"We're a takeaway selling pizza, burgers, and fried chicken\"*",
      type: "text",
    },
  ]);

  const handleSubmit = async () => {
    if (!inputValue.trim() || isDiscovering) return;

    const userMsg = inputValue.trim();
    setInputValue("");
    setBusinessDescription(userMsg);
    setChatHistory((prev) => [...prev, { role: "user", text: userMsg }]);
    
    // Dispatch event for Hermes behavior agent
    document.dispatchEvent(new CustomEvent('hermes:message_sent', { 
      detail: { message: userMsg, sessionId: 'menu-wizard' } 
    }));

    setIsDiscovering(true);

    try {
      const res = await api.post("/ai-integration/wizard/discover", {
        description: userMsg,
      });
      const data = res.data.data;
      setDiscoveryResult(data);
      setChatHistory((prev) => [
        ...prev,
        { role: "ai", text: data.aiMessage, type: "text" },
      ]);
      // If AI detected global attributes, store them as pending suggestions
      if (data.detectedAttributes && data.detectedAttributes.length > 0) {
        setPendingAttributes(data.detectedAttributes, data.attributeAiMessage || '');
        if (data.attributeAiMessage) {
          setChatHistory((prev) => [
            ...prev,
            { role: "ai", text: data.attributeAiMessage, type: "attribute-suggestion" },
          ]);
        }
      }
    } catch (err: unknown) {
      console.error("Wizard discover error:", err instanceof Error ? err.message : String(err));
      setChatHistory((prev) => [
        ...prev,
        {
          role: "ai",
          text: "Sorry, I had trouble analyzing that. Could you try describing your menu again?",
        },
      ]);
    } finally {
      setIsDiscovering(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-[400px]">
      {/* Chat Messages */}
      <div className="flex-1 space-y-4 mb-6">
        {chatHistory.map((msg, idx) => (
          <div
            key={idx}
            className={cn(
              "flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
              msg.role === "user" && "justify-end"
            )}
          >
            {msg.role === "ai" && (
              <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center text-foreground text-xs font-bold shrink-0">
                A
              </div>
            )}
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                msg.role === "ai" &&
                  "bg-muted border border-border",
                msg.role === "user" &&
                  "bg-foreground text-background"
              )}
            >
              <span
                dangerouslySetInnerHTML={{
                  __html: msg.text
                    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                    .replace(/\*(.*?)\*/g, "<em>$1</em>"),
                }}
              />
              {msg.role === "ai" &&
                msg.type === "attribute-suggestion" &&
                pendingAttributeSuggestions.length > 0 && (
                  <AttributeSuggestionBubble
                    suggestions={pendingAttributeSuggestions}
                    onApply={(selected) => {
                      selected.forEach((s) =>
                        setGlobalAttribute(s.attributeKey, s.attributeValue)
                      );
                      clearPendingAttributes();
                    }}
                    onSkip={clearPendingAttributes}
                  />
                )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isDiscovering && (
          <div className="flex gap-3 animate-in fade-in duration-300">
            <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center text-foreground text-xs font-bold shrink-0">
              A
            </div>
            <div className="bg-muted border border-border rounded-2xl px-4 py-3 flex items-center gap-1">
              <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Describe your business menu..."
          className="flex-1"
          style={{ boxShadow: 'none' }}
          disabled={isDiscovering}
        />
        <Button
          onClick={handleSubmit}
          disabled={!inputValue.trim() || isDiscovering}
          className="bg-foreground text-background hover:bg-foreground/90"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ============ STEP 2: CATEGORIES ============

function CategoriesStep() {
  const { categories, toggleCategory, selectedCategoryCount } =
    useMenuWizardStore();

  const selected = selectedCategoryCount();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">Select Menu Categories</h3>
          <p className="text-sm text-muted-foreground">
            Choose categories to include in your menu. AI-recommended ones are
            pre-selected.
          </p>
        </div>
        <Badge
          variant="outline"
          className="text-muted-foreground border-border px-3 py-1"
        >
          {selected} of {categories.length} selected
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {categories.map((cat) => (
          <div
            key={cat.id}
            onClick={() => toggleCategory(cat.id)}
            className={cn(
              "relative cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 hover:shadow-md group",
              cat.selected
                ? "border-foreground bg-muted"
                : "border-border/50 hover:border-border bg-card"
            )}
          >
            {/* Selection indicator */}
            <div
              className={cn(
                "absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200",
                cat.selected
                  ? "bg-foreground text-background scale-100"
                  : "bg-muted scale-90 group-hover:scale-100"
              )}
            >
              {cat.selected && <Check className="h-3 w-3" />}
            </div>

            <div className="text-2xl mb-2">{cat.icon || "📂"}</div>
            <h4 className="font-semibold text-sm">{cat.categoryName}</h4>
            <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
              {cat.description || `~${cat.items.length || 6} items`}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ STEP 3: MENU BUILDER ============

function MenuBuilderStep() {
  const {
    categories,
    setCategoryItems,
    setCategoryGenerating,
    setCategoryModifiers,
    updateItem,
    removeItem,
    addItem,
    toggleModifier,
    detectedBusinessType,
    detectedKeywords,
    globalAttributes,
  } = useMenuWizardStore();
  const [expandedCategory, setExpandedCategory] = React.useState<string | null>(
    null
  );
  const [expandedItem, setExpandedItem] = React.useState<string | null>(null);

  const selectedCategories = categories.filter((c) => c.selected);

  const handleGenerateItems = async (cat: typeof selectedCategories[0]) => {
    setCategoryGenerating(cat.categorySlug, true);
    try {
      const res = await api.post("/ai-integration/wizard/generate-items", {
        categorySlug: cat.categorySlug,
        categoryName: cat.categoryName,
        businessType: detectedBusinessType || "RESTAURANT",
        keywords: detectedKeywords,
      });
      setCategoryItems(cat.categorySlug, res.data.data);

      // Also fetch modifiers
      const modRes = await api.post("/ai-integration/wizard/modifiers", {
        categorySlug: cat.categorySlug,
        businessType: detectedBusinessType || "RESTAURANT",
      });
      setCategoryModifiers(cat.categorySlug, modRes.data.data);
    } catch (err) {
      console.error("Failed to generate items:", err);
      setCategoryGenerating(cat.categorySlug, false);
    }
  };

  const handleAddManualItem = (categorySlug: string) => {
    addItem(categorySlug, {
      id: `manual-${crypto.randomUUID()}`,
      name: "New Item",
      description: "Enter description",
      basePrice: 999,
      dietaryStatus: "non_halal",
      categorySlug,
      requiredModifiers: [],
      optionalModifiers: [],
      tags: [],
      source: "template",
    });
  };

  // Count totals
  const totalItems = selectedCategories.reduce(
    (sum, c) => sum + c.items.length,
    0
  );

  return (
    <div className="space-y-4">
      <GlobalAttributesPanel />
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">Build Your Menu</h3>
          <p className="text-sm text-muted-foreground">
            Expand categories to generate and edit items
          </p>
        </div>
        <Badge
          variant="outline"
          className="text-muted-foreground border-border px-3 py-1"
        >
          {totalItems} items across {selectedCategories.length} categories
        </Badge>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-center">Items</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {selectedCategories.map((cat) => (
              <React.Fragment key={cat.id}>
                {/* Category Row */}
                <TableRow
                  className="cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() =>
                    setExpandedCategory(
                      expandedCategory === cat.categorySlug
                        ? null
                        : cat.categorySlug
                    )
                  }
                >
                  <TableCell>
                    {expandedCategory === cat.categorySlug ? (
                      <ChevronUp className="h-4 w-4 text-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{cat.icon || "📂"}</span>
                      <span className="font-semibold">{cat.categoryName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="font-mono">
                      {cat.items.length}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {cat.isGenerating ? (
                      <Badge className="bg-muted text-muted-foreground border-border">
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Generating
                      </Badge>
                    ) : cat.itemsGenerated ? (
                      <Badge className="bg-muted text-foreground border-border">
                        <Check className="h-3 w-3 mr-1" />
                        Generated
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Pending
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {!cat.itemsGenerated && !cat.isGenerating && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGenerateItems(cat);
                        }}
                        className="bg-foreground text-background hover:bg-foreground/90"
                      >
                        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                        Generate Items
                      </Button>
                    )}
                  </TableCell>
                </TableRow>

                {/* Expanded Category: Items Table */}
                {expandedCategory === cat.categorySlug && (
                  <TableRow>
                    <TableCell colSpan={5} className="p-0 bg-muted/5">
                      <div className="p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                        {!cat.itemsGenerated && !cat.isGenerating ? (
                          <div className="text-center py-8">
                            <Wand2 className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                            <p className="text-sm text-muted-foreground mb-4">
                              Click &quot;Generate Items&quot; to create products
                              for this category
                            </p>
                            <Button
                              onClick={() => handleGenerateItems(cat)}
                              className="bg-foreground text-background hover:bg-foreground/90"
                            >
                              <Sparkles className="h-4 w-4 mr-2" />
                              Generate with AI
                            </Button>
                          </div>
                        ) : cat.isGenerating ? (
                          <div className="text-center py-8">
                            <Loader2 className="h-10 w-10 mx-auto text-muted-foreground animate-spin mb-3" />
                            <p className="text-sm text-muted-foreground">
                              Abigail is generating items for{" "}
                              <strong>{cat.categoryName}</strong>...
                            </p>
                          </div>
                        ) : (
                          <>
                            {/* Items Sub-Table */}
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/30">
                                  <TableHead className="w-8"></TableHead>
                                  <TableHead>Item Name</TableHead>
                                  <TableHead>Price</TableHead>
                                  <TableHead className="hidden md:table-cell">
                                    Description
                                  </TableHead>
                                  <TableHead>Dietary</TableHead>
                                  <TableHead className="w-10"></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {cat.items.map((item) => (
                                  <React.Fragment key={item.id}>
                                    <TableRow
                                      className="cursor-pointer hover:bg-muted/20"
                                      onClick={() =>
                                        setExpandedItem(
                                          expandedItem === item.id
                                            ? null
                                            : item.id
                                        )
                                      }
                                    >
                                      <TableCell>
                                        {expandedItem === item.id ? (
                                          <ChevronUp className="h-3.5 w-3.5 text-foreground" />
                                        ) : (
                                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        <Input
                                          value={item.name}
                                          onClick={(e) => e.stopPropagation()}
                                          onChange={(e) =>
                                            updateItem(
                                              cat.categorySlug,
                                              item.id,
                                              { name: e.target.value }
                                            )
                                          }
                                          className="h-8 text-sm border-transparent hover:border-border focus:border-border bg-transparent"
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-1">
                                          <span className="text-xs text-muted-foreground">
                                            £
                                          </span>
                                          <Input
                                            value={(
                                              item.basePrice / 100
                                            ).toFixed(2)}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) => {
                                              const val = parseFloat(
                                                e.target.value
                                              );
                                              if (!isNaN(val)) {
                                                updateItem(
                                                  cat.categorySlug,
                                                  item.id,
                                                  {
                                                    basePrice: Math.round(
                                                      val * 100
                                                    ),
                                                  }
                                                );
                                              }
                                            }}
                                            className="h-8 w-20 text-sm border-transparent hover:border-border focus:border-border bg-transparent"
                                          />
                                        </div>
                                      </TableCell>
                                      <TableCell className="hidden md:table-cell">
                                        <Input
                                          value={item.description}
                                          onClick={(e) => e.stopPropagation()}
                                          onChange={(e) =>
                                            updateItem(
                                              cat.categorySlug,
                                              item.id,
                                              { description: e.target.value }
                                            )
                                          }
                                          className="h-8 text-xs border-transparent hover:border-border focus:border-border bg-transparent text-muted-foreground"
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                          <Badge
                                            variant="outline"
                                            className={cn(
                                              "text-[10px] capitalize",
                                              item.dietaryStatus === "halal" &&
                                                "bg-muted text-foreground border-border",
                                              item.dietaryStatus === "vegan" &&
                                                "bg-muted text-foreground border-border",
                                              item.dietaryStatus ===
                                                "vegetarian" &&
                                                "bg-muted text-foreground border-border",
                                              item.dietaryStatus ===
                                                "non_halal" &&
                                                "bg-muted text-muted-foreground"
                                            )}
                                          >
                                            {item.dietaryStatus}
                                          </Badge>
                                          {Object.entries(globalAttributes).map(([key, value]) => {
                                            if (key === 'dietary_type' && value === item.dietaryStatus) return null;
                                            return (
                                              <AttributeBadge
                                                key={key}
                                                icon="🌐"
                                                label={value}
                                                inherited
                                                size="sm"
                                              />
                                            );
                                          })}
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 text-destructive/60 hover:text-destructive"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            removeItem(
                                              cat.categorySlug,
                                              item.id
                                            );
                                          }}
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </TableCell>
                                    </TableRow>

                                    {/* Expanded Item: Modifiers */}
                                    {expandedItem === item.id && (
                                      <TableRow>
                                        <TableCell
                                          colSpan={6}
                                          className="bg-muted/10 p-4"
                                        >
                                          <div className="space-y-3 animate-in fade-in duration-200">
                                            <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                              Modifier Options
                                            </h5>
                                            {cat.modifiers.length === 0 ? (
                                              <p className="text-xs text-muted-foreground">
                                                No modifiers available for this
                                                category.
                                              </p>
                                            ) : (
                                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {cat.modifiers.map((mod) => (
                                                  <div
                                                    key={mod.modifierSlug}
                                                    className={cn(
                                                      "rounded-lg border p-3 transition-all",
                                                      mod.selected
                                                        ? "border-foreground bg-muted"
                                                        : "border-border/50"
                                                    )}
                                                  >
                                                    <div className="flex items-center justify-between mb-2">
                                                      <div className="flex items-center gap-2">
                                                        <Checkbox
                                                          checked={mod.selected}
                                                          onCheckedChange={() =>
                                                            toggleModifier(
                                                              cat.categorySlug,
                                                              mod.modifierSlug
                                                            )
                                                          }
                                                        />
                                                        <span className="text-sm font-medium">
                                                          {mod.icon}{" "}
                                                          {mod.modifierName}
                                                        </span>
                                                      </div>
                                                      {mod.isRequired && (
                                                        <Badge
                                                          variant="outline"
                                                          className="text-[9px] bg-muted text-muted-foreground border-border"
                                                        >
                                                          Required
                                                        </Badge>
                                                      )}
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                      {mod.options
                                                        .slice(0, 6)
                                                        .map((opt, oi) => (
                                                          <span
                                                            key={oi}
                                                            className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                                                          >
                                                            {opt.name}
                                                            {opt.priceModifier >
                                                              0 &&
                                                              ` +£${(
                                                                opt.priceModifier /
                                                                100
                                                              ).toFixed(2)}`}
                                                          </span>
                                                        ))}
                                                      {mod.options.length >
                                                        6 && (
                                                        <span className="text-[10px] px-2 py-0.5 text-muted-foreground">
                                                          +
                                                          {mod.options.length -
                                                            6}{" "}
                                                          more
                                                        </span>
                                                      )}
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </React.Fragment>
                                ))}
                              </TableBody>
                            </Table>

                            {/* Add Item Button */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full border-dashed border-border hover:bg-muted text-muted-foreground"
                              onClick={() =>
                                handleAddManualItem(cat.categorySlug)
                              }
                            >
                              <Plus className="h-3.5 w-3.5 mr-1.5" />
                              Add Item Manually
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ============ STEP 4: REVIEW ============

function ReviewStep() {
  const { categories, totalItemCount, totalModifierCount, globalAttributes } =
    useMenuWizardStore();

  const selectedCategories = categories.filter((c) => c.selected);
  const items = totalItemCount();
  const modifiers = totalModifierCount();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold">Review Your Menu</h3>
        <p className="text-sm text-muted-foreground">
          Final check before applying to your stores
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-border">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-foreground">
              {selectedCategories.length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Categories</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-foreground">{items}</p>
            <p className="text-xs text-muted-foreground mt-1">Items</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-foreground">{modifiers}</p>
            <p className="text-xs text-muted-foreground mt-1">Modifiers</p>
          </CardContent>
        </Card>
      </div>

      {/* Global Attributes Summary */}
      {Object.keys(globalAttributes).length > 0 && (
        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Global Attributes</span>
            <span className="text-xs text-muted-foreground">— applies to all items</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(globalAttributes).map(([key, value]) => (
              <AttributeBadge
                key={key}
                icon="🏷️"
                label={`${key}: ${value}`}
                selected
                size="sm"
              />
            ))}
          </div>
        </div>
      )}

      {/* Category Breakdown */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead className="text-center">Items</TableHead>
              <TableHead className="text-center">Modifiers</TableHead>
              <TableHead className="text-center">Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {selectedCategories.map((cat) => (
              <TableRow key={cat.id}>
                <TableCell className="font-medium">
                  <span className="mr-2">{cat.icon}</span>
                  {cat.categoryName}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary">{cat.items.length}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary">
                    {cat.modifiers.filter((m) => m.selected).length}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  {cat.items.some((i) => i.source === "ai") ? (
                    <Badge className="bg-muted text-foreground border-border text-[10px]">
                      <Sparkles className="h-3 w-3 mr-1" />
                      AI + Templates
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-[10px] text-muted-foreground"
                    >
                      Templates
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ============ STEP 5: APPLY ============

function ApplyStep() {
  const {
    selectedStoreIds,
    toggleStore,
    setSelectedStores,
    categories,
    totalItemCount,
    totalModifierCount,
    globalAttributes,
    itemAttributeOverrides,
  } = useMenuWizardStore();
  const { activeBusinessId } = useBusinessContextStore();
  const [isApplying, setIsApplying] = React.useState(false);
  const [applied, setApplied] = React.useState(false);

  const { data: sitesData } = useQuery<Site[]>({
    queryKey: ["sites", activeBusinessId],
    queryFn: async () => {
      const url = activeBusinessId
        ? `/sites?businessId=${activeBusinessId}`
        : "/sites";
      const res = await api.get(url);
      const payload = res.data.data;
      return Array.isArray(payload) ? payload : payload?.data || [];
    },
  });

  const sites = sitesData || [];
  const selectedCategories = categories.filter((c) => c.selected);

  const handleSelectAll = () => {
    if (selectedStoreIds.length === sites.length) {
      setSelectedStores([]);
    } else {
      setSelectedStores(sites.map((s) => s.id));
    }
  };

  const handleApply = async () => {
    setIsApplying(true);
    try {
      // Build menu payload from wizard state
      const menuPayload = {
        storeIds: selectedStoreIds,
        globalAttributes,
        categories: selectedCategories.map((cat) => ({
          name: cat.categoryName,
          slug: cat.categorySlug,
          icon: cat.icon,
          items: cat.items.map((item) => ({
            name: item.name,
            description: item.description,
            basePrice: item.basePrice,
            dietaryStatus: item.dietaryStatus,
            itemAttributes: itemAttributeOverrides[item.id] ?? null,
          })),
          modifiers: cat.modifiers
            .filter((m) => m.selected)
            .map((m) => ({
              name: m.modifierName,
              slug: m.modifierSlug,
              type: m.modifierType,
              isRequired: m.isRequired,
              options: m.options,
            })),
        })),
      };

      await api.post("/menus/bulk-create-wizard", menuPayload);
      setApplied(true);
    } catch (err) {
      console.error("Failed to apply menu:", err);
    } finally {
      setIsApplying(false);
    }
  };

  if (applied) {
    return (
      <div className="text-center py-16 space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
          <Check className="h-8 w-8 text-foreground" />
        </div>
        <h3 className="text-xl font-bold">Menu Applied Successfully! 🎉</h3>
        <p className="text-sm text-muted-foreground">
          Your menu has been applied to {selectedStoreIds.length} store(s).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold">Apply Menu to Stores</h3>
        <p className="text-sm text-muted-foreground">
          Select which stores should receive this menu
        </p>
      </div>

      {/* Select All */}
      <div className="flex items-center gap-2">
        <Checkbox
          checked={selectedStoreIds.length === sites.length && sites.length > 0}
          onCheckedChange={handleSelectAll}
        />
        <span className="text-sm font-medium">Select All Stores</span>
        <Badge variant="outline" className="ml-auto">
          {selectedStoreIds.length} of {sites.length} selected
        </Badge>
      </div>

      {/* Store Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sites.map((site) => (
          <div
            key={site.id}
            onClick={() => toggleStore(site.id)}
            className={cn(
              "cursor-pointer rounded-xl border-2 p-4 transition-all duration-200",
              selectedStoreIds.includes(site.id)
                ? "border-foreground bg-muted"
                : "border-border/50 hover:border-border"
            )}
          >
            <div className="flex items-center gap-3">
              <Checkbox checked={selectedStoreIds.includes(site.id)} />
              <div className="flex-1">
                <p className="font-semibold text-sm">{site.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-[10px]">
                    {site.type || "POS"}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    Local
                  </span>
                </div>
              </div>
              <Store className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        ))}
      </div>

      {/* Summary + Apply */}
      <Separator />

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground space-y-1">
          <p>
            <strong>{selectedCategories.length}</strong> categories,{" "}
            <strong>{totalItemCount()}</strong> items,{" "}
            <strong>{totalModifierCount()}</strong> modifiers
          </p>
          <p>
            → <strong>{selectedStoreIds.length}</strong> store(s) selected
          </p>
        </div>

        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button
                size="lg"
                disabled={selectedStoreIds.length === 0 || isApplying}
                className="bg-foreground text-background hover:bg-foreground/90 px-8"
              >
                {isApplying ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Rocket className="h-4 w-4 mr-2" />
                )}
                Apply Menu
              </Button>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Apply Menu to Stores?</AlertDialogTitle>
              <AlertDialogDescription>
                This will create {totalItemCount()} items across{" "}
                {selectedStoreIds.length} store(s). Existing menu items will not
                be affected — new items will be added.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleApply}
                className="bg-foreground text-background hover:bg-foreground/90"
              >
                Yes, Apply Menu
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

// ============ FOOTER NAVIGATION ============

function WizardFooter() {
  const { currentStep, nextStep, prevStep, aiMessage, categories, selectedStoreIds } =
    useMenuWizardStore();

  const stepIdx = STEPS.findIndex((s) => s.key === currentStep);
  const isFirst = stepIdx === 0;
  const isLast = stepIdx === STEPS.length - 1;

  // Determine if next is allowed
  const canProceed = (() => {
    switch (currentStep) {
      case "discovery":
        return !!aiMessage; // Must have completed discovery
      case "categories":
        return categories.some((c) => c.selected);
      case "menu-builder":
        return categories
          .filter((c) => c.selected)
          .some((c) => c.items.length > 0);
      case "review":
        return true;
      case "apply":
        return selectedStoreIds.length > 0;
      default:
        return true;
    }
  })();

  if (isLast) return null; // Apply step has its own button

  return (
    <div className="px-6 py-4 border-t bg-muted/5 flex items-center justify-between">
      <Button
        variant="outline"
        onClick={prevStep}
        disabled={isFirst}
        className="border-border"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back
      </Button>

      <Button
        onClick={nextStep}
        disabled={!canProceed}
        className="bg-foreground text-background hover:bg-foreground/90"
      >
        Continue
        <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
}
