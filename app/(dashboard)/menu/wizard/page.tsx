"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { formatCurrency, getCurrencySymbol } from "@/lib/currency-utils";
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
  Pencil,
  Plus,
  Trash2,
  Store,
  Loader2,
  X,
  Rocket,
  MessageSquare,
  LayoutGrid,
  ListTree,
  Settings2,
  UtensilsCrossed,
  Package,
  Upload,
  Image as ImageIcon,
  FileImage,
  Lightbulb,
  Layers,
  Mic,
  AudioLines,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import api from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useAuthStore } from "@/lib/auth-store";
import { ModifierTemplateBrowser } from "@/components/menu/ModifierTemplateBrowser";
import { ModifierManualEditor } from "@/components/menu/ModifierManualEditor";
import { useModifierSuggestions } from "@/hooks/use-modifier-suggestions";
import { AttributeBadge } from "@/components/menu/AttributeBadge";
import { Avatar, AvatarFallback, AvatarImage, AvatarGroup } from "@/components/ui/avatar";
import type { AttributeSuggestion } from "@/hooks/use-menu-wizard";
import { useMenuWizardStore } from "@/hooks/use-menu-wizard";
import { useBusinessContextStore } from "@/lib/business-context-store";
import type { ModifierTemplate } from "@/lib/api/modifiers";
import { useWizardActivity } from "@/hooks/use-wizard-activity";
import { AbigailActivityPanel } from "@/components/menu/AbigailActivityPanel";
import { MessageQueue } from "@/components/menu/MessageQueue";
import { AbigailSuggestions } from "@/components/menu/AbigailSuggestions";

// ============ TYPES ============
type WizardStep = "discovery" | "categories" | "items" | "modifiers";

interface Category {
  id: string;
  name: string;
  displayName?: string;
  icon: string;
  description: string;
  seoTags?: string;
}

interface ModifierOption {
  name: string;
  priceModifier: number;
  isDefault: boolean;
}

interface Modifier {
  name: string;
  type: 'single_select' | 'multi_select';
  required: boolean;
  options: ModifierOption[];
  icon: string;
}

interface Item {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  seoTags?: string;
  basePrice: number;
  storePrices?: Record<string, number>;
  isRetail: boolean;
  sku?: string;
  stock?: number;
  taxRate?: string;
  modifiers?: Modifier[]; // Changed from string[] to Modifier[]
}

const STEPS: { key: WizardStep; label: string; icon: React.ElementType }[] = [
  { key: "discovery", label: "Discovery", icon: MessageSquare },
  { key: "categories", label: "Categories", icon: LayoutGrid },
  { key: "items", label: "Items", icon: ListTree },
  { key: "modifiers", label: "Setup & Modifiers", icon: Settings2 },
];

function WizardChatInput({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder = "Ask anything"
}: {
  value: string,
  onChange: (val: string) => void,
  onSubmit: () => void,
  disabled?: boolean,
  placeholder?: string
}) {
  return (
    <div className="relative flex items-center bg-background rounded-full border border-border px-5 py-3 shadow-sm hover:border-foreground/30 transition-all group">
      <Plus className="w-5 h-5 text-muted-foreground shrink-0 mr-3" />
      <Input
        placeholder={placeholder}
        className="flex-1 bg-transparent border-none outline-none ring-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-transparent focus-visible:shadow-none focus-visible:outline-none shadow-none px-0 text-base text-foreground placeholder:text-muted-foreground h-auto py-1"
        style={{ boxShadow: 'none' }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (value.trim() && !disabled) onSubmit();
          }
        }}
      />
      <div className="flex items-center gap-2.5 shrink-0 ml-3">
        <button type="button" className="text-muted-foreground hover:text-foreground transition-colors p-1" title="Voice input">
          <Mic className="w-5 h-5" />
        </button>
        <button
          type="button"
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center transition-all",
            value.trim()
              ? "bg-foreground text-background hover:opacity-80"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
          onClick={() => value.trim() && !disabled && onSubmit()}
          disabled={disabled}
          title={value.trim() ? "Submit" : "Listen"}
        >
          {value.trim() ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <AudioLines className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}

function AttributeSuggestionBubble({
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

const SPECIALIST_META: Record<string, { emoji: string; role: string }> = {
  zara:  { emoji: '🏗️', role: 'Categories Architect' },
  marco: { emoji: '🧑‍🍳', role: 'Cuisine & Items Expert' },
  kai:   { emoji: '💰', role: 'Pricing & Modifiers' },
  rex:   { emoji: '🛡️', role: 'Dietary & Compliance' },
  sage:  { emoji: '🔍', role: 'SEO & Discoverability' },
};

const SPECIALIST_IMAGES: Record<string, string> = {
  zara: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=faces&q=80",
  marco: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=100&h=100&fit=crop&crop=faces&q=80",
  kai: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces&q=80",
  rex: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces&q=80",
  sage: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces&q=80",
};

const ABIGAIL_IMAGE = "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=faces&q=80";

function SpecialistCard({ specialist, note }: { specialist: string; note?: string }) {
  const meta = SPECIALIST_META[specialist];
  if (!meta) return null;
  return (
    <div className="mt-2 rounded-xl border border-border/50 bg-muted/40 px-3 py-2 flex items-start gap-2.5">
      <span className="text-lg leading-none mt-0.5">{meta.emoji}</span>
      <div>
        <p className="text-xs font-semibold text-foreground leading-tight">
          {specialist.charAt(0).toUpperCase() + specialist.slice(1)}
          <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">{meta.role}</span>
        </p>
        {note && <p className="text-[11px] text-muted-foreground mt-0.5 italic">&quot;{note}&quot;</p>}
      </div>
    </div>
  );
}

function CategorySuggestionBadges({
  categories,
  onSelect,
  onConfirm,
}: {
  categories: Array<{ categoryName?: string; name?: string; icon?: string; description?: string; id?: string; categorySlug?: string }>;
  onSelect: (cats: Category[]) => void;
  onConfirm: () => void;
}) {
  const [selected, setSelected] = React.useState<Set<string>>(new Set(categories.map((_, i) => String(i))));

  const toggle = (idx: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const handleConfirm = () => {
    const selectedCats: Category[] = categories
      .filter((_, i) => selected.has(String(i)))
      .map((c, i) => ({
        id: c.id ?? c.categorySlug ?? `zara-${i}-${(c.categoryName ?? c.name ?? '').toLowerCase().replace(/\s+/g, '-')}`,
        name: c.categoryName ?? c.name ?? '',
        displayName: c.categoryName ?? c.name ?? '',
        icon: c.icon ?? '🍽️',
        description: c.description ?? '',
      }));
    onSelect(selectedCats);
    onConfirm();
  };

  return (
    <div className="mt-3 pt-3 border-t border-border/30 space-y-2.5">
      <p className="text-[11px] font-medium text-muted-foreground">Tap to select/deselect categories:</p>
      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat, i) => {
          const name = cat.categoryName ?? cat.name ?? 'Category';
          const icon = cat.icon ?? '🍽️';
          const isSelected = selected.has(String(i));
          return (
            <button
              key={i}
              type="button"
              onClick={() => toggle(String(i))}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                isSelected
                  ? "bg-muted border-foreground/40 text-foreground ring-1 ring-foreground/20"
                  : "bg-muted/40 border-border/50 text-muted-foreground hover:bg-muted/60"
              )}
            >
              <span>{icon}</span>
              <span>{name}</span>
              {isSelected && <Check className="w-3 h-3" />}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={selected.size === 0}
          className="text-[11px] px-3 py-1 rounded-full bg-foreground text-background font-medium disabled:opacity-40 hover:bg-foreground/90 transition-colors"
        >
          Use {selected.size} Categories →
        </button>
        <button
          type="button"
          onClick={() => setSelected(new Set())}
          className="text-[11px] px-3 py-1 rounded-full border border-border/50 text-muted-foreground hover:bg-muted transition-colors"
        >
          Deselect All
        </button>
      </div>
    </div>
  );
}

function SageAuditPanel({ auditResult }: { auditResult: any }) {
  if (!auditResult) return null;
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3 mt-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-foreground">Menu Health Report</span>
        <span className={cn(
          "text-xs font-bold px-2 py-0.5 rounded-full",
          auditResult.overallScore >= 70 ? "bg-muted text-foreground" :
          auditResult.overallScore >= 40 ? "bg-muted text-muted-foreground" :
          "bg-destructive/10 text-destructive"
        )}>
          SEO: {auditResult.overallScore ?? auditResult.seoScore ?? 0}/100
        </span>
      </div>
      <ul className="space-y-1">
        {(auditResult.topIssues || []).map((issue: string, i: number) => (
          <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
            <span className="text-muted-foreground mt-0.5">●</span>
            {issue}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Extract plain text from a UIMessage (AI SDK v6 uses parts, not .content)
const getMessageText = (message: any): string => {
  if (message.content && typeof message.content === 'string') return message.content;
  const textPart = message.parts?.find((p: any) => p.type === 'text');
  return textPart?.text ?? '';
};

// Parse suggestCategories tool result from message parts for rendering
const getSuggestCategoriesResult = (message: any) => {
  const inv = message.toolInvocations?.find((t: any) => t.toolName === 'suggestCategories' && 'result' in t);
  if (inv) return inv.result;
  const part = message.parts?.find(
    (p: any) => p.type === 'tool-result' && p.toolName === 'suggestCategories'
  );
  return part ? (part as any).result : null;
};

const getDetectedAttributesResult = (message: any) => {
  const inv = message.toolInvocations?.find((t: any) => t.toolName === 'detectGlobalAttributes' && 'result' in t);
  if (inv) return inv.result;
  const part = message.parts?.find(
    (p: any) => p.type === 'tool-result' && p.toolName === 'detectGlobalAttributes'
  );
  return part ? (part as any).result : null;
};

function MenuWizardPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSiteId = searchParams.get("siteId");

  const { accessToken } = useAuthStore();
  const { activeSiteId } = useBusinessContextStore();
  const { setGlobalAttribute } = useMenuWizardStore();

  // ── Abigail Coordinator (Single Chat Source of Truth) ──────────────────
  const coordinatorSessionId = React.useRef<string>(
    typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).slice(2)
  );
  const coordinatorChatEndRef = React.useRef<HTMLDivElement>(null);

  const {
    messages: coordinatorMessages,
    sendMessage: sendCoordinatorMessage,
    status: coordinatorStatus,
  } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/wizard-coordinator',
      headers: {
        Authorization: `Bearer ${accessToken ?? ''}`,
        'X-Session-Id': coordinatorSessionId.current,
        ...(activeSiteId ? { 'X-Site-Id': activeSiteId } : {})
      },
    }),
    onError: (err) => {
      console.error('Coordinator chat error:', err);
      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        toast.error('Your session has expired. Please refresh the page to continue.');
      }
    },
    messages: [{
      id: 'abigail-coordinator-init',
      role: 'assistant',
      parts: [{ type: 'text', text: "👋 Hi! I'm **Abigail**, your AI menu coordinator. I work with a team of specialists — Zara, Marco, Kai, Rex, and Sage — to build your perfect menu. Tell me about your business!" }],
    }] as any[],
    onFinish: (message: any) => {
      const parts = message.parts ?? [];

      // 1. Handle step advancement via recordApproval
      const approvalPart = parts.find((p: any) => p.toolName === 'recordApproval' && p.type === 'tool-result') as any;
      if (approvalPart?.result?.nextStep) {
        const next = approvalPart.result.nextStep;
        if (next === 'items') setCurrentStep('items');
        if (next === 'modifiers') setCurrentStep('modifiers');
        if (next === 'seo') setCurrentStep('modifiers'); // Note: if there is an 'seo' step, adjust accordingly
      }

      // 2. Handle Zara (Categories Architect)
      const zaraPart = parts.find((p: any) => p.toolName === 'callZara' && p.type === 'tool-result') as any;
      if (zaraPart?.result?.result?.categories?.length) {
        const cats = zaraPart.result.result.categories.map((c: any) => ({
          id: c.id ?? c.categorySlug ?? `zara-${Math.random().toString(36).slice(2)}`,
          name: c.categoryName ?? c.name,
          displayName: c.categoryName ?? c.name,
          icon: c.icon ?? '🍽️',
          description: c.description ?? '',
        }));
        setAvailableCategories(cats);
        // Auto-select if in Journey A
        setSelectedCategoryIds(prev => [...new Set([...prev, ...cats.map((c: any) => c.id)])]);
      }

      // 3. Handle Marco (Cuisine & Items Expert)
      const marcoPart = parts.find((p: any) => p.toolName === 'callMarco' && p.type === 'tool-result') as any;
      if (marcoPart?.result?.result?.itemsByCategory?.length) {
        const allNewItems: Item[] = [];
        marcoPart.result.result.itemsByCategory.forEach((group: any) => {
          if (group.items) {
            group.items.forEach((item: any) => {
              allNewItems.push({
                ...item,
                categoryId: group.categoryId,
                id: item.id || `marco-${Math.random().toString(36).slice(2)}`,
                basePrice: item.basePrice || 1000,
                isRetail: businessType === 'retail'
              });
            });
          }
        });
        setAvailableItems(prev => {
          const filtered = allNewItems.filter(ni => !prev.find(ei => ei.id === ni.id));
          return [...prev, ...filtered];
        });
        setSelectedItemIds(prev => [...new Set([...prev, ...allNewItems.map(i => i.id)])]);
      }

      // 4. Handle Kai (Pricing & Modifiers Expert)
      const kaiPart = parts.find((p: any) => p.toolName === 'callKai' && p.type === 'tool-result') as any;
      if (kaiPart?.result?.result?.modifierGroups?.length) {
        const groups = kaiPart.result.result.modifierGroups;
        // In Journey A, Abigail might suggest modifiers for multiple items
        // This logic would need to map them. For now, we update available items
        setAvailableItems(prev => prev.map(item => {
          // If Kai's result specifies items, apply to them
          const suggestedForThisItem = groups.filter((g: any) => 
            g.targetItemIds?.includes(item.id) || g.targetItemNames?.some((n: string) => item.name.toLowerCase().includes(n.toLowerCase()))
          );
          if (suggestedForThisItem.length > 0) {
            return { ...item, modifiers: [...(item.modifiers || []), ...suggestedForThisItem] };
          }
          return item;
        }));
      }

      // 5. Handle Rex (Dietary & Compliance)
      const rexPart = parts.find((p: any) => p.toolName === 'callRex' && p.type === 'tool-result') as any;
      if (rexPart?.result?.result?.globalAttributes) {
        rexPart.result.result.globalAttributes.forEach((attr: any) => {
          setGlobalAttribute(attr.attributeKey, attr.attributeValue);
        });
      }

      // 6. Wizard complete
      const completePart = parts.find((p: any) => p.toolName === 'completeWizard' && p.type === 'tool-result') as any;
      if (completePart?.result?.complete) {
        setCurrentStep('modifiers');
        toast.success("Menu built successfully! You can now finish and save.");
      }
    },
  });

  const isCoordinating = coordinatorStatus === 'submitted' || coordinatorStatus === 'streaming';

  const { abigailState, activeSpecialists } = useWizardActivity(coordinatorMessages, coordinatorStatus);

  const [queuedMessage, setQueuedMessage] = React.useState<string | null>(null);
  const [queueFlash, setQueueFlash] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [completedSteps, setCompletedSteps] = React.useState<string[]>([]);

  React.useEffect(() => {
    coordinatorChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [coordinatorMessages]);

  React.useEffect(() => {
    if (coordinatorStatus === 'ready' && queuedMessage) {
      const msg = queuedMessage;
      setQueuedMessage(null);
      setSuggestions([]);
      sendCoordinatorMessage({ text: msg });
    }
  }, [coordinatorStatus, queuedMessage, sendCoordinatorMessage]);

  React.useEffect(() => {
    if (coordinatorStatus !== 'ready') return;
    const lastMsg = coordinatorMessages[coordinatorMessages.length - 1];
    if (!lastMsg || lastMsg.role !== 'assistant') return;
    const parts: any[] = (lastMsg as any).parts ?? [];
    const specialistResult = parts.find(
      (p: any) => ['callZara', 'callMarco', 'callKai', 'callRex', 'callSage'].includes(p.toolName) && p.type === 'tool-result'
    );
    if (!specialistResult) return;

    const specialist = specialistResult.result?.specialist ?? '';
    const summary = `returned result for ${specialist}`;
    const newCompleted = [...new Set([...completedSteps, specialist])];
    setCompletedSteps(newCompleted);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/agents/abigail-suggest', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken ?? ''}`,
          },
          body: JSON.stringify({
            sessionState: { cuisines: [], dietaryType: '', currentStep: currentStep, businessType: businessType.toUpperCase() },
            lastSpecialist: specialist,
            lastResultSummary: summary,
            completedSteps: newCompleted,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions ?? []);
        }
      } catch {
        // suggestions are best-effort
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [coordinatorStatus, coordinatorMessages]); // currentStep/businessType captured correctly at setTimeout creation time
  // ──────────────────────────────────────────────────────────────────


  const [currentStep, setCurrentStep] = React.useState<WizardStep>("discovery");



  // Step 1 State (Stores & Discovery)
  const [selectedStoreIds, setSelectedStoreIds] = React.useState<string[]>(initialSiteId ? [initialSiteId] : []);
  const [businessDescription, setBusinessDescription] = React.useState("");
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [businessType, setBusinessType] = React.useState<"food" | "retail">("food");

  // Image Upload State
  const [uploadedImage, setUploadedImage] = React.useState<File | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [isExtractingImage, setIsExtractingImage] = React.useState(false);
  const [extractionMethod, setExtractionMethod] = React.useState<"text" | "image">("text");
  const [isImportDialogOpen, setIsImportDialogOpen] = React.useState(false);
  const [targetStoreForImport, setTargetStoreForImport] = React.useState<any>(null);
  const [isImporting, setIsImporting] = React.useState(false);
  const [extractionError, setExtractionError] = React.useState<string | null>(null);
  const [pendingImageAttributes, setPendingImageAttributes] = React.useState<AttributeSuggestion[]>([]);
  const [pendingImageAttrMessage, setPendingImageAttrMessage] = React.useState('');
  const [globalAttributesLocal, setGlobalAttributesLocal] = React.useState<Record<string, string>>({});

  // Fetch Businesses and Stores
  const { data: businessesData } = useQuery<any>({
    queryKey: ["businesses-list"],
    queryFn: async () => {
      const res = await api.get("/setup-business");
      return res.data;
    }
  });
  const businesses = Array.isArray(businessesData?.data) ? businessesData.data : businessesData?.data?.data || [];
  const activeBusinessId = businesses[0]?.id; // Default to first business

  const { data: sitesData, isLoading: isLoadingStores, refetch: refetchStores } = useQuery<any[]>({
    queryKey: ["sites", activeBusinessId],
    queryFn: async () => {
      if (!activeBusinessId) return [];
      const res = await api.get(`/sites?businessId=${activeBusinessId}`);
      const payload = res.data.data;
      return Array.isArray(payload) ? payload : payload?.data || [];
    },
    enabled: !!activeBusinessId,
  });
  const availableStores = sitesData || [];

  // Step 2 State
  const [availableCategories, setAvailableCategories] = React.useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = React.useState<string[]>([]);

  // Step 3 State
  const [availableItems, setAvailableItems] = React.useState<Item[]>([]);
  const [selectedItemIds, setSelectedItemIds] = React.useState<string[]>([]);

  // Step 4 State
  const [itemSettings, setItemSettings] = React.useState<Record<string, Partial<Item>>>({});
  const [expandedItemId, setExpandedItemId] = React.useState<string | null>(null);
  const [modifierPrompt, setModifierPrompt] = React.useState<Record<string, string>>({});
  const [generatedModifiers, setGeneratedModifiers] = React.useState<Record<string, Modifier[]>>({});
  const [isGeneratingModifiers, setIsGeneratingModifiers] = React.useState<Record<string, boolean>>({});
  const [reusableSuggestions, setReusableSuggestions] = React.useState<Record<string, any[]>>({});
  const [isTemplateBrowserOpen, setIsTemplateBrowserOpen] = React.useState(false);
  const [currentItemForTemplates, setCurrentItemForTemplates] = React.useState<{ id: string; name: string; category: string } | null>(null);

  // Manual Modifier Editor State
  const [isManualEditorOpen, setIsManualEditorOpen] = React.useState(false);
  const [manualEditorModifier, setManualEditorModifier] = React.useState<Modifier | null>(null);
  const [manualEditorItemId, setManualEditorItemId] = React.useState<string | null>(null);
  const [manualEditorModifierIndex, setManualEditorModifierIndex] = React.useState(-1);

  // AI Modifier Suggestions for current item
  const { data: aiSuggestions } = useModifierSuggestions({
    itemName: currentItemForTemplates?.name || '',
    categorySlug: currentItemForTemplates?.category,
    businessType: businessType?.toUpperCase() as any || 'RESTAURANT',
    enabled: !!currentItemForTemplates && isTemplateBrowserOpen,
  });

  const currentCurrency = React.useMemo(() => {
    const primaryStoreId = selectedStoreIds[0] || initialSiteId;
    const store = availableStores.find((s: any) => s.id === primaryStoreId);
    return store?.currency || 'GBP';
  }, [selectedStoreIds, availableStores, initialSiteId]);

  // Catalog Info State
  const [catalogInfo, setCatalogInfo] = React.useState({ description: '', seoTags: '' });

  // Modal States
  const [catModal, setCatModal] = React.useState({ name: '', desc: '', seo: '', icon: '✨' });
  const [itemModal, setItemModal] = React.useState({ name: '', desc: '', seo: '', price: 1000, catId: '' });
  const [editCatModal, setEditCatModal] = React.useState<{ open: boolean, category: Category | null }>({ open: false, category: null });
  const [editItemModal, setEditItemModal] = React.useState<{ open: boolean, item: Item | null }>({ open: false, item: null });
  const [showAddCatDialog, setShowAddCatDialog] = React.useState(false);
  const [showAddItemDialog, setShowAddItemDialog] = React.useState(false);

  // AI loading states — keyed so each sparkles button spins independently
  const [aiLoading, setAiLoading] = React.useState<Record<string, boolean>>({});
  const [aiError, setAiError] = React.useState<string | null>(null);

  const setLoading = (key: string, val: boolean) =>
    setAiLoading(prev => ({ ...prev, [key]: val }));

  // Helper: resolve restaurant name from selected store
  const getRestaurantName = () => {
    const storeId = selectedStoreIds[0] || initialSiteId;
    return availableStores.find((s: any) => s.id === storeId)?.name
      || (businesses as any[]).flatMap((b: any) => b.stores || []).find((s: any) => s.id === storeId)?.name
      || "";
  };

  // Calls /menus/generate-content and updates the add-category or add-item modal
  const generateAIContent = async (type: string, name: string, categoryName?: string) => {
    if (!name.trim()) {
      setAiError("Please enter a name first before generating AI content.");
      return;
    }
    const key = `modal-${type}`;
    setLoading(key, true);
    setAiError(null);

    try {
      const res = await api.post('/menus/generate-content', {
        type,
        name,
        restaurantName: getRestaurantName(),
        categoryName,
        businessType,
      });
      const data = res.data?.data ?? res.data;
      const description: string = data?.description ?? '';
      const seoTags: string = data?.seoTags ?? '';

      if (type.includes('category')) {
        setCatModal(prev => ({ ...prev, desc: description || prev.desc, seo: seoTags || prev.seo }));
      } else {
        setItemModal(prev => ({ ...prev, desc: description || prev.desc, seo: seoTags || prev.seo }));
      }
    } catch (err: any) {
      console.error("AI Generation failed:", err);
      setAiError("AI generation failed. Please check your API key in Settings.");
    } finally {
      setLoading(key, false);
    }
  };

  // Updates an existing category/item card in-place with AI-generated content
  const generateDirectAIContent = async (
    id: string,
    type: 'category' | 'item',
    name: string,
    categoryName?: string,
  ) => {
    if (!name.trim()) return;
    setLoading(id, true);

    try {
      const res = await api.post('/menus/generate-content', {
        type,
        name,
        restaurantName: getRestaurantName(),
        categoryName,
        businessType,
      });
      const data = res.data?.data ?? res.data;
      const description: string = data?.description ?? '';
      const seoTags: string = data?.seoTags ?? '';

      if (type === 'category') {
        setAvailableCategories(prev => prev.map(c => c.id === id ? { ...c, description, seoTags } : c));
      } else {
        setAvailableItems(prev => prev.map(i => i.id === id ? { ...i, description, seoTags } : i));
      }
    } catch (err: any) {
      console.error("Direct AI Generation failed:", err);
    } finally {
      setLoading(id, false);
    }
  };

  // Generate modifiers for an item using AI based on user prompt
  const generateModifiersForItem = async (itemId: string, itemName: string, categoryName: string) => {
    const prompt = modifierPrompt[itemId]?.trim();
    if (!prompt) {
      setAiError("Please describe the modifiers you need first.");
      return;
    }

    setIsGeneratingModifiers(prev => ({ ...prev, [itemId]: true }));
    setAiError(null);

    try {
      const res = await api.post('/menus/generate-modifiers', {
        itemName,
        categoryName,
        restaurantName: getRestaurantName(),
        businessType,
        userPrompt: prompt,
      });

      const data = res.data?.data || res.data;
      const modifiers: Modifier[] = data?.modifiers || [];

      setGeneratedModifiers(prev => ({ ...prev, [itemId]: modifiers }));
    } catch (err: any) {
      console.error("Modifier generation failed:", err);
      setAiError("Failed to generate modifiers. Please try again.");
    } finally {
      setIsGeneratingModifiers(prev => ({ ...prev, [itemId]: false }));
    }
  };

  // Fetch reusable modifier suggestions for an item
  const fetchReusableSuggestions = async (itemId: string, itemName: string, categoryName: string) => {
    try {
      const res = await api.post('/menus/suggest-reusable-modifiers', {
        categoryName,
        itemName,
        businessType,
      });

      const data = res.data?.data || res.data;
      const suggestions = data?.suggestions || [];

      setReusableSuggestions(prev => ({ ...prev, [itemId]: suggestions }));
    } catch (err: any) {
      console.error("Failed to fetch reusable suggestions:", err);
    }
  };

  // Approve generated modifiers and add them to the item
  const approveModifiers = (itemId: string) => {
    const modifiers = generatedModifiers[itemId];
    if (!modifiers) return;

    setAvailableItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, modifiers } : item
    ));

    // Clear the generated modifiers and prompt
    setGeneratedModifiers(prev => {
      const { [itemId]: _, ...rest } = prev;
      return rest;
    });
    setModifierPrompt(prev => {
      const { [itemId]: _, ...rest } = prev;
      return rest;
    });
  };

  // Handle opening template browser for specific item
  const handleOpenTemplateBrowser = (itemId: string, itemName: string, categoryName: string) => {
    setCurrentItemForTemplates({ id: itemId, name: itemName, category: categoryName });
    setIsTemplateBrowserOpen(true);
  };

  // Handle applying a single template
  const handleApplyTemplate = (template: ModifierTemplate) => {
    if (!currentItemForTemplates) return;

    const newModifier: Modifier = {
      name: template.name,
      type: template.type as 'single_select' | 'multi_select',
      required: template.isRequired || false,
      options: template.options.map((opt) => ({
        name: opt.name,
        priceModifier: opt.priceModifier,
        isDefault: opt.isDefault || false,
        // displayOrder is ignored as the local Modifier type doesn't have it
      })),
      icon: template.icon || '🔘',
    };

    setAvailableItems(prev => prev.map(item => {
      if (item.id === currentItemForTemplates.id) {
        return {
          ...item,
          modifiers: [...(item.modifiers || []), newModifier],
        };
      }
      return item;
    }));
  };

  // Handle applying bundle of templates
  const handleApplyBundle = (templates: ModifierTemplate[]) => {
    if (!currentItemForTemplates) return;

    const newModifiers: Modifier[] = templates.map(template => ({
      name: template.name,
      type: template.type as 'single_select' | 'multi_select',
      required: template.isRequired || false,
      options: template.options.map(opt => ({
        name: opt.name,
        priceModifier: opt.priceModifier,
        isDefault: opt.isDefault || false,
      })),
      icon: template.icon || '🔘',
    }));

    setAvailableItems(prev => prev.map(item => {
      if (item.id === currentItemForTemplates.id) {
        return {
          ...item,
          modifiers: [...(item.modifiers || []), ...newModifiers],
        };
      }
      return item;
    }));

    setIsTemplateBrowserOpen(false);
  };

  // Add a reusable suggestion to an item
  const addReusableSuggestion = (itemId: string, suggestion: any) => {
    const modifier: Modifier = {
      name: suggestion.name,
      type: suggestion.type,
      required: suggestion.required,
      options: suggestion.options,
      icon: suggestion.icon || '',
    };

    setAvailableItems(prev => prev.map(item =>
      item.id === itemId
        ? { ...item, modifiers: [...(item.modifiers || []), modifier] }
        : item
    ));
  };

  // Save a manually created/edited modifier to the target item
  const handleSaveModifier = (savedModifier: Modifier) => {
    if (!manualEditorItemId) return;

    setAvailableItems(prev => prev.map(item => {
      if (item.id !== manualEditorItemId) return item;

      const currentModifiers = [...(item.modifiers || [])];

      if (manualEditorModifierIndex >= 0 && manualEditorModifierIndex < currentModifiers.length) {
        // Editing existing modifier
        currentModifiers[manualEditorModifierIndex] = savedModifier;
      } else {
        // Adding new modifier
        currentModifiers.push(savedModifier);
      }

      return { ...item, modifiers: currentModifiers };
    }));
  };

  const handleExit = () => {
    router.push("/menu");
  };

  const nextStep = () => {
    const idx = STEPS.findIndex((s) => s.key === currentStep);
    if (idx < STEPS.length - 1) setCurrentStep(STEPS[idx + 1].key);
  };

  const prevStep = () => {
    const idx = STEPS.findIndex((s) => s.key === currentStep);
    if (idx > 0) setCurrentStep(STEPS[idx - 1].key);
  };

  // ============ IMAGE UPLOAD & EXTRACTION ============
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExtractionError(null);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setExtractionError('Please upload an image file (PNG, JPG, JPEG)');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setExtractionError('Image size must be less than 10MB');
      return;
    }

    setUploadedImage(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleExtractMenuFromImage = async () => {
    if (!uploadedImage) return;

    setIsExtractingImage(true);
    setExtractionError(null);

    try {
      const formData = new FormData();
      formData.append('image', uploadedImage);

      const res = await fetch('/api/menu-image-extract', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();

      if (!result.success) {
        throw new Error(result.error || 'Extraction failed');
      }

      const extracted = result.data;

      // Show which AI provider was used
      if (result.provider) {
        console.log(`[Wizard] Extraction completed using: ${result.provider}`);
      }

      // Save extraction to database for history/audit
      try {
        await api.post('/ai-integration/wizard/save-extraction', {
          imageName: uploadedImage.name,
          extractedData: extracted,
          model: result.model || 'gemini-1.5-flash',
          provider: result.provider || 'Google Gemini',
          usage: result.usage
        });
        console.log('[Wizard] Extraction result persisted to database');
      } catch (saveError) {
        // Log but don't block the user if persistence fails
        console.warn('[Wizard] Failed to persist extraction history:', saveError);
      }

      // Validate extraction results
      if (!extracted.categories || extracted.categories.length === 0) {
        throw new Error('No menu items found in the image. Please ensure the image is clear and contains menu information.');
      }

      const totalItems = extracted.categories.reduce((sum: number, cat: any) => sum + (cat.items?.length || 0), 0);
      if (totalItems === 0) {
        throw new Error('No menu items found. Please try a clearer image or use text description instead.');
      }

      // Set business type from extraction
      setBusinessType(extracted.businessType === 'retail' || extracted.businessType === 'grocery' ? 'retail' : 'food');

      // Get restaurant name from extraction or use selected store name
      const detectedRestaurantName = extracted.restaurantName || availableStores.find(s => s.id === selectedStoreIds[0])?.name || 'your restaurant';

      // Transform extracted categories to wizard format
      const transformedCategories = extracted.categories.map((cat: any, idx: number) => ({
        id: `extracted-${idx}-${cat.name.toLowerCase().replace(/\s+/g, '-')}`,
        name: cat.name,
        displayName: cat.name,
        icon: '📄',
        description: cat.description || `Delicious ${cat.name.toLowerCase()} from ${detectedRestaurantName}`,
        seoTags: cat.seoTags || '',
      }));

      setAvailableCategories(transformedCategories);

      // Transform extracted items
      const transformedItems = extracted.categories.flatMap((cat: any, catIdx: number) =>
        cat.items.map((item: any, itemIdx: number) => ({
          id: `extracted-item-${catIdx}-${itemIdx}`,
          categoryId: `extracted-${catIdx}-${cat.name.toLowerCase().replace(/\s+/g, '-')}`,
          name: item.name,
          description: item.description || item.name,
          seoTags: item.seoTags || '',
          basePrice: item.basePrice,
          isRetail: extracted.businessType === 'retail' || extracted.businessType === 'grocery',
          modifiers: item.modifiers || [],
        }))
      );

      setAvailableItems(transformedItems);

      // Auto-select all categories
      setSelectedCategoryIds(transformedCategories.map((c: any) => c.id));

      // Auto-select all items
      setSelectedItemIds(transformedItems.map((i: any) => i.id));

      // Generate catalog info with SEO optimization
      const allCategorySeoTags = extracted.categories
        .map((c: any) => c.seoTags)
        .filter(Boolean)
        .join(', ');

      const categoryNames = extracted.categories.map((c: any) => c.name.toLowerCase()).join(', ');

      setCatalogInfo({
        description: `Complete menu for ${detectedRestaurantName}, featuring ${extracted.categories.length} categories with ${extracted.categories.reduce((sum: number, cat: any) => sum + (cat.items?.length || 0), 0)} delicious items. Extracted and optimized from menu image.`,
        seoTags: allCategorySeoTags || categoryNames,
      });

      setIsExtractingImage(false);

      // Store detected attributes from image extraction
      if (extracted.detectedAttributes && extracted.detectedAttributes.length > 0) {
        setPendingImageAttributes(extracted.detectedAttributes);
        setPendingImageAttrMessage(extracted.attributeAiMessage || '');
      }

      // Move to categories step
      nextStep();

    } catch (error: any) {
      console.error('Image extraction failed:', error);
      setExtractionError(error.message || 'Failed to extract menu from image. Please try again or use text description.');
      setIsExtractingImage(false);
    }
  };

  const clearUploadedImage = () => {
    setUploadedImage(null);
    setImagePreview(null);
    setExtractionMethod("text");
    setExtractionError(null);
  };

  const handleFetchItems = async () => {
    setIsGenerating(true);
    try {
      // 3. Call Backend Items API
      const itemsRes = await api.post('/menus/items', {
        categoryIds: selectedCategoryIds,
        businessType
      });
      const items = Array.isArray(itemsRes.data) ? itemsRes.data : itemsRes.data?.data || [];

      setAvailableItems(items);
      setIsGenerating(false);
      nextStep();
    } catch (e) {
      console.error(e);
      setIsGenerating(false);
    }
  };

  const handleFinish = async () => {
    const selectedItems = availableItems.filter(i => selectedItemIds.includes(i.id));
    const categoriesToSave = selectedCategoryIds.map(catId => {
      const cat = availableCategories.find(c => c.id === catId);
      const itemsInCat = selectedItems.filter(i => i.categoryId === catId).map(i => ({
        name: i.name,
        description: i.description || i.name,
        seoTags: i.seoTags || '',
        basePrice: i.basePrice,
        storePrices: i.storePrices,
        sku: itemSettings[i.id]?.sku,
        stock: itemSettings[i.id]?.stock,
        taxRate: itemSettings[i.id]?.taxRate,
        modifiers: i.modifiers || []
      }));

      return {
        id: catId,
        name: cat?.name || 'Category',
        description: cat?.description || '',
        seoTags: cat?.seoTags || '',
        items: itemsInCat
      };
    });

    await performBulkSave(categoriesToSave, selectedStoreIds);
  };

  const performBulkSave = async (categoriesToSave: any[], targetStoreIds: string[]) => {
    setIsGenerating(true);
    try {
      const payload = {
        categories: categoriesToSave,
        storeIds: targetStoreIds,
        businessId: activeBusinessId,
        description: businessDescription || "Imported/Generated via Menu Wizard",
        seoTags: catalogInfo.seoTags || ""
      };

      console.log("performBulkSave payload:", payload);

      const saveRes = await api.post('/menus/bulk-create-wizard', payload);
      const respBody = saveRes.data;
      const savePayload = respBody?.data || respBody;
      console.log("performBulkSave saveRes:", savePayload);

      // Update: ensure we check for success from backend
      if (savePayload && savePayload.success) {
        toast.success("Menu saved and deployed successfully!");
        refetchStores(); // Refresh badges
        setCurrentStep("discovery"); // Return to start to see badges
        resetState();
      } else {
        throw new Error(savePayload?.message || "Success was false");
      }
    } catch (e: any) {
      console.error("Save failed:", e);
      toast.error("Failed to save menu structure: " + (e?.message || "Unknown error"));
    } finally {
      setIsGenerating(false);
    }
  };

  const resetState = () => {
    setBusinessDescription("");
    setAvailableCategories([]);
    setAvailableItems([]);
    setSelectedCategoryIds([]);
    setSelectedItemIds([]);
    setItemSettings({});
    setSelectedStoreIds(initialSiteId ? [initialSiteId] : []);
  };

  const handleImportMenu = async (sourceSiteId: string) => {
    if (!targetStoreForImport) {
      console.warn("No targetStoreForImport selected");
      return;
    }

    setIsImporting(true);
    try {
      console.log("Importing from source:", sourceSiteId);
      const res = await api.get(`/menus/active/${sourceSiteId}`);

      // Handle NestJS TransformInterceptor wrapper natively
      const respBody = res.data;
      const apiResponse = respBody?.data || respBody;
      console.log("Source menu response:", apiResponse);

      if (apiResponse && apiResponse.success && apiResponse.data) {
        const menu = apiResponse.data;

        // Transform backend menu to wizard state
        const importedCategories = (menu.categories || []).map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          displayName: cat.name,
          description: cat.description || "",
          icon: cat.icon || "UtensilsCrossed",
          itemsCount: cat.items?.length || 0
        }));

        const importedItems = (menu.items || []).map((item: any) => ({
          id: item.productId, // Use productId as the ID for consistency
          name: item.displayName || item.product?.name || "Unnamed Item",
          description: item.description || item.product?.description || "",
          basePrice: item.product?.price ? parseFloat(item.product.price) * 100 : 0, // Convert to cents
          categoryId: item.categoryId,
          categoryName: menu.categories?.find((c: any) => c.id === item.categoryId)?.name || "Unknown",
          modifiers: (item.modifiers || []).map((mim: any) => ({
            name: mim.modifier?.name || "Unnamed Modifier",
            type: mim.modifier?.modifierType || 'single_select',
            required: mim.modifier?.isRequired || false,
            options: (mim.modifier?.options || []).map((opt: any) => ({
              name: opt.name,
              priceModifier: opt.priceModifier ? parseFloat(opt.priceModifier) * 100 : 0, // Convert to cents
              isDefault: opt.isDefault || false
            })),
            icon: mim.modifier?.icon || "🔘"
          })),
          seoTags: item.seoTags || "",
          sku: item.product?.sku || "",
          stock: item.product?.stock || 999
        }));

        // Prepare categories for deep save
        const categoriesWithItems = importedCategories.map((cat: any) => {
          const itemsInCat = importedItems.filter((i: any) => i.categoryId === cat.id);
          return {
            name: cat.name,
            description: cat.description,
            seoTags: cat.seoTags || '',
            items: itemsInCat.map((i: any) => ({
              name: i.name,
              description: i.description,
              seoTags: i.seoTags,
              basePrice: i.basePrice,
              sku: i.sku,
              stock: i.stock,
              modifiers: i.modifiers
            }))
          };
        });

        console.log("Calculated payload categories:", categoriesWithItems);

        // Perform instant save to target store
        await performBulkSave(categoriesWithItems, [targetStoreForImport.id]);

        setIsImportDialogOpen(false);
      } else {
        console.warn("Valid menu data not received from source", res.data);
        toast.error("Valid menu data not found for source store.");
      }
    } catch (e: any) {
      console.error("Import failed:", e);
      toast.error("Failed to import menu data: " + (e?.message || "Unknown error"));
    } finally {
      setIsImporting(false);
    }
  };

  // ============ RENDER ============
  if (!activeSiteId) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[600px] border rounded-2xl bg-card overflow-hidden p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <Sparkles className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Select a Store Site</h2>
        <p className="text-muted-foreground max-w-md">
          Please select a store site from the top navigation bar before interacting with the Abigail AI Menu Builder.
          Your menu and AI memory will be scoped to the selected site.
        </p>
        <Button variant="outline" onClick={() => router.push("/menu")} className="mt-4">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Menu
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[600px] border rounded-2xl bg-card overflow-hidden">
      {/* Header with Stepper */}
      <div className="px-4 sm:px-6 py-6 border-b shrink-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="space-y-1">
            <h1 className="flex items-center gap-2 text-xl sm:text-2xl font-bold tracking-tight">
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              Menu & Retail Wizard
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              A predictable pipeline for generating menus and catalogs
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleExit} className="self-end sm:self-auto">
            <X className="h-4 w-4 mr-2" />
            Exit Wizard
          </Button>
        </div>

        {/* Stepper UI */}
        <div className="flex items-center justify-between max-w-3xl mx-auto overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
          {STEPS.map((step, idx) => {
            const stepIdx = STEPS.findIndex((s) => s.key === currentStep);
            const isActive = step.key === currentStep;
            const isCompleted = idx < stepIdx;
            const Icon = step.icon;

            return (
              <React.Fragment key={step.key}>
                <div className="flex flex-col items-center gap-2 relative z-10">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                      isActive && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                      isCompleted && "bg-foreground text-background",
                      !isActive && !isCompleted && "bg-muted text-muted-foreground border border-border"
                    )}
                  >
                    {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <span className={cn("text-xs font-medium", isActive && "text-primary", isCompleted && "text-foreground")}>
                    {step.label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={cn("flex-1 h-0.5 -mt-6 mx-2 transition-all", idx < stepIdx ? "bg-foreground" : "bg-muted")} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-auto bg-muted/20 px-4 sm:px-6 md:px-12 py-6 sm:py-8">
        <div className="max-w-4xl mx-auto">

          {/* AI Error Banner */}
          {aiError && (
            <div className="mb-4 flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <X className="h-4 w-4 shrink-0" />
              <span className="flex-1">{aiError}</span>
              <button onClick={() => setAiError(null)} className="shrink-0 opacity-60 hover:opacity-100">
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* STEP 1: DISCOVERY */}
          {currentStep === "discovery" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
              <div className="text-center pb-10 pt-6">
                <div className="mx-auto mb-5 w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                  <Sparkles className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-foreground mb-3">Initialize Your Menu</h2>
                <p className="text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
                  Select your target locations and choose how you want to build your menu. Our AI coordinator, Abigail, will orchestrate the setup process.
                </p>
              </div>

              <div className="space-y-10 max-w-3xl mx-auto">
                {/* Store Selection */}
                <section className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 pb-3 border-b border-border/60">
                    <div>
                      <h3 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                        <Store className="w-5 h-5 text-primary" /> Target Locations
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">Where will this menu be deployed?</p>
                    </div>
                    {availableStores.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full px-5 h-8 text-xs font-medium border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors"
                        onClick={() => {
                          if (selectedStoreIds.length === availableStores.length) {
                            setSelectedStoreIds([]);
                          } else {
                            setSelectedStoreIds(availableStores.map((s: any) => s.id));
                          }
                        }}
                      >
                        {selectedStoreIds.length === availableStores.length ? "Deselect All" : "Select All"}
                      </Button>
                    )}
                  </div>

                  {isLoadingStores ? (
                    <div className="flex items-center justify-center py-12 text-sm text-muted-foreground border border-dashed rounded-2xl bg-muted/10">
                      <Loader2 className="w-5 h-5 animate-spin mr-3 text-primary" /> Loading available locations...
                    </div>
                  ) : availableStores.length === 0 ? (
                    <div className="text-sm text-muted-foreground bg-muted/10 p-4 rounded-xl border border-border flex items-start gap-3">
                      <Store className="w-5 h-5 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold mb-1">No locations found</p>
                        <p className="opacity-90">Please create a store in your Settings before building a menu.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                      {availableStores.map((store: any) => {
                        const isSelected = selectedStoreIds.includes(store.id);
                        return (
                          <div
                            key={store.id}
                            onClick={() => {
                              setSelectedStoreIds(prev =>
                                isSelected ? prev.filter(id => id !== store.id) : [...prev, store.id]
                              );
                            }}
                            className={cn(
                              "group relative flex items-start gap-4 p-5 rounded-2xl border cursor-pointer transition-all duration-200 ease-out overflow-hidden",
                              isSelected 
                                ? "border-primary bg-primary/[0.03] ring-1 ring-primary/20" 
                                : "bg-card hover:bg-muted/40 hover:border-border/80"
                            )}
                          >
                            <div className={cn(
                              "w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                              isSelected ? "bg-primary border-primary text-primary-foreground" : "border-input bg-background group-hover:border-primary/40"
                            )}>
                              {isSelected && <Check className="w-3.5 h-3.5" />}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <h4 className="font-semibold text-base truncate">{store.name}</h4>
                                {store.itemCount > 0 && (
                                  <Badge variant="secondary" className="bg-muted text-foreground border-border text-[10px] px-2 py-0.5 rounded-full font-medium">
                                    <ListTree className="w-3 h-3 mr-1" />
                                    {store.itemCount} Items
                                  </Badge>
                                )}
                              </div>
                              
                              {store.address && <p className="text-sm text-muted-foreground truncate">{store.address}</p>}
                              
                              {store.itemCount === 0 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTargetStoreForImport(store);
                                    setIsImportDialogOpen(true);
                                  }}
                                  className="mt-3 text-xs text-primary font-medium hover:underline flex items-center gap-1.5 bg-primary/5 w-fit px-2.5 py-1.5 rounded-md transition-colors hover:bg-primary/10"
                                >
                                  <Upload className="w-3.5 h-3.5" /> Import from another site
                                </button>
                              )}
                            </div>
                            
                            {/* Decorative accent for selected state */}
                            {isSelected && <div className="absolute top-0 left-0 w-1 h-full bg-primary" />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                <Separator className="my-4" />

                {/* Method Selection */}
                <section className="space-y-4">
                  <div className="pb-3 border-b border-border/60">
                    <h3 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                      <Layers className="w-5 h-5 text-primary" /> Creation Method
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">How would you like to build your menu?</p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div
                      role="button"
                      tabIndex={0}
                      className={cn(
                        "relative flex flex-col items-center p-6 rounded-2xl border cursor-pointer transition-all duration-300 overflow-hidden text-center",
                        extractionMethod === "text" 
                          ? "border-primary bg-primary/[0.02] ring-1 ring-primary/20" 
                          : "bg-card hover:bg-muted/30 hover:border-border/80"
                      )}
                      onClick={() => {
                        setExtractionMethod("text");
                        clearUploadedImage();
                      }}
                      onKeyDown={(e) => { if(e.key === 'Enter') { setExtractionMethod("text"); clearUploadedImage(); } }}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-colors",
                        extractionMethod === "text" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}>
                        <MessageSquare className="w-6 h-6" />
                      </div>
                      <h4 className="font-semibold text-lg mb-1">Chat with Abigail</h4>
                      <p className="text-sm text-muted-foreground">Build interactively using our AI coordinator</p>
                      
                      {extractionMethod === "text" && (
                        <div className="absolute top-4 right-4">
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                            <Check className="w-4 h-4" />
                          </div>
                        </div>
                      )}
                    </div>

                    <div
                      role="button"
                      tabIndex={0}
                      className={cn(
                        "relative flex flex-col items-center p-6 rounded-2xl border cursor-pointer transition-all duration-300 overflow-hidden text-center",
                        extractionMethod === "image" 
                          ? "border-primary bg-primary/[0.02] ring-1 ring-primary/20" 
                          : "bg-card hover:bg-muted/30 hover:border-border/80"
                      )}
                      onClick={() => setExtractionMethod("image")}
                      onKeyDown={(e) => { if(e.key === 'Enter') setExtractionMethod("image"); }}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-colors",
                        extractionMethod === "image" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}>
                        <FileImage className="w-6 h-6" />
                      </div>
                      <h4 className="font-semibold text-lg mb-1">Upload Menu Image</h4>
                      <p className="text-sm text-muted-foreground">Extract data instantly from a photo or PDF</p>
                      
                      {extractionMethod === "image" && (
                        <div className="absolute top-4 right-4">
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                            <Check className="w-4 h-4" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                {/* Image Upload Method */}
                {extractionMethod === "image" && (
                  <section className="animate-in fade-in slide-in-from-top-4 duration-500 ease-out space-y-4">
                    <div className="pb-3 border-b border-border/60">
                      <h3 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-primary" /> Image Extraction
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">Upload a clear photo or PDF of your menu.</p>
                    </div>

                    {extractionError && (
                      <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center shrink-0 mt-0.5">
                            <X className="w-4 h-4 text-destructive" />
                          </div>
                          <div className="space-y-1 flex-1">
                            <p className="text-sm font-semibold text-destructive">Extraction Failed</p>
                            <p className="text-sm text-destructive/80 leading-relaxed">{extractionError}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setExtractionError(null)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {!imagePreview ? (
                      <div className="border-2 border-dashed border-border/60 rounded-3xl p-10 text-center bg-card hover:bg-muted/30 transition-colors group cursor-pointer">
                        <input
                          type="file"
                          id="menu-image-upload"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        <label htmlFor="menu-image-upload" className="cursor-pointer flex flex-col items-center">
                          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4 group-hover:bg-primary/10 group-hover:scale-110 transition-all duration-300">
                            <Upload className="w-7 h-7 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                          <h4 className="text-lg font-semibold mb-1 group-hover:text-primary transition-colors">Click to upload menu image</h4>
                          <p className="text-sm text-muted-foreground">High-quality PNG, JPG, or PDF (max 10MB)</p>
                        </label>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="relative border rounded-2xl overflow-hidden bg-muted/20 shadow-inner group">
                          <img
                            src={imagePreview}
                            alt="Menu preview"
                            className="w-full h-auto max-h-[450px] object-contain"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                            <Button
                              variant="destructive"
                              className="rounded-full"
                              onClick={clearUploadedImage}
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Remove Image
                            </Button>
                          </div>
                        </div>

                        <div className="bg-primary/5 border border-primary/10 rounded-2xl p-5">
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <Sparkles className="w-5 h-5 text-primary" />
                            </div>
                            <div className="space-y-1.5">
                              <h4 className="text-base font-semibold text-foreground">Ready for Extraction</h4>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                Our vision AI will analyze this image to instantly categorize items, extract prices, and structure your menu modifiers automatically.
                              </p>
                            </div>
                          </div>
                        </div>

                        <Button
                          size="lg"
                          className="w-full h-14 text-lg rounded-2xl transition-all"
                          onClick={handleExtractMenuFromImage}
                          disabled={isExtractingImage || selectedStoreIds.length === 0}
                        >
                          {isExtractingImage ? (
                            <>
                              <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                              Analyzing Menu Details...
                            </>
                          ) : (
                            <>
                              <Sparkles className="mr-3 h-5 w-5" />
                              Extract Menu Data
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </section>
                )}

                {selectedStoreIds.length === 0 && ((extractionMethod === "text" && businessDescription.trim()) || (extractionMethod === "image" && imagePreview)) && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <p className="text-sm text-center text-muted-foreground mt-6 font-medium bg-muted/10 py-3 rounded-xl border border-border">
                      <Store className="w-4 h-4 inline mr-2 -mt-0.5" /> Please select at least one target location above to continue.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: CATEGORIES */}
          {currentStep === "categories" && (
            <div className="space-y-6">
              {pendingImageAttributes.length > 0 && (
                <div className="mb-4 p-4 rounded-xl border border-border bg-muted/30">
                  <p className="text-sm text-muted-foreground mb-3">
                    {pendingImageAttrMessage || "We detected these attributes from your menu image:"}
                  </p>
                  <AttributeSuggestionBubble
                    suggestions={pendingImageAttributes}
                    onApply={(selected) => {
                      const attrs: Record<string, string> = {};
                      selected.forEach((s) => { attrs[s.attributeKey] = s.attributeValue; });
                      setGlobalAttributesLocal(attrs);
                      setPendingImageAttributes([]);
                    }}
                    onSkip={() => setPendingImageAttributes([])}
                  />
                </div>
              )}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold">Select Categories</h2>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    {extractionMethod === "image" ? "Categories extracted from your menu image." : "We found these matches based on your intent."}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {extractionMethod === "image" && (
                    <Badge variant="secondary" className="px-3 py-1 text-sm h-9">
                      <ImageIcon className="w-4 h-4 mr-2" />
                      Extracted from Image
                    </Badge>
                  )}

                  <Badge variant="secondary" className="px-3 py-1 text-sm h-9 uppercase">
                    {businessType === "retail" ? <Package className="w-4 h-4 mr-2" /> : <UtensilsCrossed className="w-4 h-4 mr-2" />}
                    {businessType} MODE
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-[14px]">
                {availableCategories.map((cat) => {
                  const isSelected = selectedCategoryIds.includes(cat.id);
                  return (
                    <Card
                      key={cat.id}
                      className={cn("cursor-pointer transition-all hover:border-primary", isSelected && "border-primary ring-1 ring-primary")}
                      onClick={() => {
                        setSelectedCategoryIds(prev =>
                          isSelected ? prev.filter(id => id !== cat.id) : [...prev, cat.id]
                        );
                      }}
                    >
                      <CardContent className="px-8 py-6 flex items-center gap-4">
                        <div className="text-4xl">{cat.icon}</div>
                        <div className="flex-1 space-y-2">
                          <div className="flex justify-between items-start">
                            <h3
                              className="font-semibold text-lg hover:text-primary cursor-pointer leading-relaxed"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditCatModal({ open: true, category: cat });
                              }}
                            >
                              {cat.displayName || cat.name}
                            </h3>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-primary hover:bg-primary/10"
                              disabled={aiLoading[cat.id]}
                              onClick={(e) => {
                                e.stopPropagation();
                                void generateDirectAIContent(cat.id, 'category', cat.name);
                              }}
                              title="Generate Description & SEO with AI"
                            >
                              {aiLoading[cat.id]
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <Sparkles className="h-4 w-4" />}
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{cat.description}</p>
                          {cat.seoTags && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {cat.seoTags.split(',').map((tag, idx) => (
                                <Badge key={idx} variant="outline" className="text-[10px] py-0 px-1.5 bg-primary/5 border-primary/20 text-primary/80">
                                  {tag.trim()}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <Checkbox checked={isSelected} className="h-6 w-6" />
                      </CardContent>
                    </Card>
                  );
                })}

                {/* Add Category Card */}
                <Card
                  className="border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 cursor-pointer transition-all hover:bg-primary/5"
                  onClick={() => setShowAddCatDialog(true)}
                >
                  <CardContent className="p-6 flex flex-col items-center justify-center gap-3 min-h-[180px]">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <Plus className="w-7 h-7 text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-base">Add Custom Category</p>
                      <p className="text-sm text-muted-foreground mt-1">Create your own category</p>
                    </div>
                  </CardContent>
                </Card>
              </div>


              <div className="flex flex-col-reverse sm:flex-row justify-between gap-4 pt-4 border-t">
                <Button variant="outline" className="w-full sm:w-auto" onClick={prevStep}>Back</Button>
                <Button
                  onClick={extractionMethod === "image" ? nextStep : handleFetchItems}
                  disabled={isGenerating}
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  {isGenerating ? "Loading items..." : "Continue to Items"}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>

              {/* Edit Category Dialog */}
              <Dialog open={editCatModal.open} onOpenChange={(open) => setEditCatModal({ open, category: null })}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Category</DialogTitle>
                    <DialogDescription>Update category details and SEO information.</DialogDescription>
                  </DialogHeader>
                  {editCatModal.category && (
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Category Name</Label>
                        <Input
                          value={editCatModal.category.name}
                          onChange={(e) => setEditCatModal(prev => ({
                            ...prev,
                            category: prev.category ? { ...prev.category, name: e.target.value, displayName: e.target.value } : null
                          }))}
                          placeholder="e.g. Daily Specials"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <div className="flex gap-2">
                          <Textarea
                            value={editCatModal.category.description}
                            onChange={(e) => setEditCatModal(prev => ({
                              ...prev,
                              category: prev.category ? { ...prev.category, description: e.target.value } : null
                            }))}
                            placeholder="A short description..."
                            className="min-h-[80px] flex-1"
                          />
                          <Button
                            variant="secondary"
                            size="icon"
                            title="Generate with AI"
                            disabled={aiLoading['edit-cat']}
                            onClick={async () => {
                              if (!editCatModal.category?.name.trim()) return;
                              setLoading('edit-cat', true);
                              try {
                                const res = await api.post('/menus/generate-content', {
                                  type: 'category',
                                  name: editCatModal.category.name,
                                  restaurantName: getRestaurantName(),
                                  businessType,
                                });
                                const data = res.data?.data ?? res.data;
                                setEditCatModal(prev => ({
                                  ...prev,
                                  category: prev.category
                                    ? { ...prev.category, description: data?.description ?? '', seoTags: data?.seoTags ?? '' }
                                    : null,
                                }));
                              } catch (err) {
                                console.error("AI Generation failed:", err);
                              } finally {
                                setLoading('edit-cat', false);
                              }
                            }}
                          >
                            {aiLoading['edit-cat']
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <Sparkles className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>SEO Tags</Label>
                        <Input
                          value={editCatModal.category.seoTags || ''}
                          onChange={(e) => setEditCatModal(prev => ({
                            ...prev,
                            category: prev.category ? { ...prev.category, seoTags: e.target.value } : null
                          }))}
                          placeholder="fresh, local, gourmet..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Icon Emoji</Label>
                        <Input
                          value={editCatModal.category.icon}
                          onChange={(e) => setEditCatModal(prev => ({
                            ...prev,
                            category: prev.category ? { ...prev.category, icon: e.target.value } : null
                          }))}
                          placeholder="✨"
                          maxLength={2}
                          className="w-20"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          className="flex-1"
                          onClick={() => {
                            if (!editCatModal.category) return;
                            setAvailableCategories(prev => prev.map(c =>
                              c.id === editCatModal.category!.id ? editCatModal.category! : c
                            ));
                            setEditCatModal({ open: false, category: null });
                          }}
                        >
                          Save Changes
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => {
                            if (!editCatModal.category) return;
                            setAvailableCategories(prev => prev.filter(c => c.id !== editCatModal.category!.id));
                            setSelectedCategoryIds(prev => prev.filter(id => id !== editCatModal.category!.id));
                            setEditCatModal({ open: false, category: null });
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>

              {/* Add Category Dialog */}
              <Dialog open={showAddCatDialog} onOpenChange={setShowAddCatDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Custom Category</DialogTitle>
                    <DialogDescription>Create a manual category for your catalog.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Category Name</Label>
                      <Input
                        value={catModal.name}
                        onChange={(e) => setCatModal(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g. Daily Specials"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <div className="flex gap-2">
                        <Textarea
                          value={catModal.desc}
                          onChange={(e) => setCatModal(prev => ({ ...prev, desc: e.target.value }))}
                          placeholder="A short description..."
                          className="min-h-[80px] flex-1"
                        />
                        <Button
                          variant="secondary"
                          size="icon"
                          title="Generate with AI"
                          disabled={aiLoading['modal-category']}
                          onClick={() => void generateAIContent('category', catModal.name)}
                        >
                          {aiLoading['modal-category']
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Sparkles className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>SEO Tags</Label>
                      <Input
                        value={catModal.seo}
                        onChange={(e) => setCatModal(prev => ({ ...prev, seo: e.target.value }))}
                        placeholder="fresh, local, gourmet..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Icon Emoji</Label>
                      <Input
                        value={catModal.icon}
                        onChange={(e) => setCatModal(prev => ({ ...prev, icon: e.target.value }))}
                        placeholder="✨"
                        maxLength={2}
                        className="w-20"
                      />
                    </div>
                    <Button className="w-full" onClick={() => {
                      if (!catModal.name) return;
                      const newCat: Category = {
                        id: `custom-${Date.now()}`,
                        name: catModal.name,
                        displayName: catModal.name,
                        description: catModal.desc,
                        seoTags: catModal.seo,
                        icon: catModal.icon || '📂'
                      };
                      setAvailableCategories(prev => [...prev, newCat]);
                      setSelectedCategoryIds(prev => [...prev, newCat.id]);
                      setCatModal({ name: '', desc: '', seo: '', icon: '✨' });
                      setShowAddCatDialog(false);
                    }}>Add Category</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* STEP 3: ITEMS */}
          {currentStep === "items" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold">Select Items</h2>
                <p className="text-sm sm:text-base text-muted-foreground">Choose which items to include in your catalog. Click the + card to add custom items to each category.</p>
              </div>

              <div className="space-y-8">
                {availableCategories.filter(c => selectedCategoryIds.includes(c.id)).map(category => {
                  const catItems = availableItems.filter(i => i.categoryId === category.id);

                  return (
                    <div key={category.id} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between border-b-2 border-primary/10 pb-4 gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl sm:text-3xl shadow-inner">
                            {category.icon}
                          </div>
                          <div>
                            <h3 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                              {category.displayName || category.name}
                              <Badge className="bg-primary/10 text-primary border-primary/20 font-bold px-2 py-0.5 sm:px-3 sm:py-1 text-xs sm:text-sm">
                                {catItems.length} items
                              </Badge>
                            </h3>
                            <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
                              Configuring items for this category
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[14px]">
                        {catItems.map(item => {
                          const isSelected = selectedItemIds.includes(item.id);
                          return (
                            <Card
                              key={item.id}
                              className={cn(
                                "group relative overflow-hidden transition-all duration-300 border-2 cursor-pointer",
                                isSelected
                                  ? "border-primary bg-primary/5 -translate-y-1"
                                  : "hover:border-primary/50 hover:-translate-y-1 bg-card/50"
                              )}
                              onClick={() => {
                                setSelectedItemIds(prev =>
                                  isSelected ? prev.filter(id => id !== item.id) : [...prev, item.id]
                                );
                              }}
                            >
                              {/* Selection Indicator Bar */}
                              <div className={cn(
                                "absolute left-0 top-0 bottom-0 w-1.5 transition-all duration-300",
                                isSelected ? "bg-primary" : "bg-transparent group-hover:bg-primary/30"
                              )} />

                              <CardContent className="px-8 py-6 flex flex-col h-full">
                                <div className="flex items-start gap-4">
                                  {/* Custom Checkbox Design */}
                                  <div className={cn(
                                    "shrink-0 mt-1 h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-all duration-300",
                                    isSelected
                                      ? "bg-primary border-primary text-primary-foreground"
                                      : "border-muted-foreground/30 bg-background group-hover:border-primary/50"
                                  )}>
                                    {isSelected && <Check className="h-4 w-4 stroke-[4px]" />}
                                  </div>

                                  <div className="flex-1 flex flex-col gap-3 min-w-0">
                                    {/* Header Section */}
                                    <div className="flex justify-between items-start gap-3">
                                      <div className="space-y-1 min-w-0">
                                        <h4 className="font-extrabold text-lg leading-relaxed group-hover:text-primary transition-colors" title={item.name}>
                                          {item.name}
                                        </h4>
                                        <div className="flex items-baseline gap-2">
                                          <span className="text-xl font-black text-foreground">
                                            {formatCurrency(item.basePrice, currentCurrency)}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Action Toolbar - Hidden by default, visible on hover */}
                                      <div
                                        className="flex items-center gap-1 p-1 bg-background/80 dark:bg-card/80 rounded-xl border backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0"
                                        onClick={e => e.stopPropagation()}
                                      >
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                                          disabled={aiLoading[item.id]}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            void generateDirectAIContent(item.id, 'item', item.name, category.name);
                                          }}
                                          title="AI Content Fix"
                                        >
                                          {aiLoading[item.id]
                                            ? <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                            : <Sparkles className="h-4 w-4" />}
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 rounded-lg hover:bg-muted transition-colors"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditItemModal({ open: true, item: item });
                                          }}
                                          title="Edit Item"
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
                                              setAvailableItems(prev => prev.filter(i => i.id !== item.id));
                                              setSelectedItemIds(prev => prev.filter(id => id !== item.id));
                                            }
                                          }}
                                          title="Delete Item"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>

                                    {/* Content Section */}
                                    <div className="space-y-3">
                                      {item.description && (
                                        <p className="text-sm text-muted-foreground line-clamp-4 italic leading-relaxed font-medium">
                                          {item.description}
                                        </p>
                                      )}

                                      {item.seoTags && (
                                        <div className="flex flex-wrap gap-1.5">
                                          {item.seoTags.split(',').map((tag, idx) => (
                                            <span
                                              key={idx}
                                              className="text-[10px] uppercase tracking-wider font-bold text-primary/70 bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10"
                                            >
                                              {tag.trim()}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>

                                    {/* Modifiers Badge */}
                                    {item.modifiers && item.modifiers.length > 0 && (
                                      <div className="mt-auto pt-4 flex items-center gap-2">
                                        <div className="flex -space-x-1.5">
                                          {[...Array(Math.min(3, item.modifiers.length))].map((_, i) => (
                                            <div key={i} className="w-5 h-5 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-[8px] font-bold shadow-sm" />
                                          ))}
                                        </div>
                                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">
                                          {item.modifiers.length} Customizations
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Selection Feedback Overlay */}
                                {isSelected && (
                                  <div className="absolute top-0 right-0 p-2">
                                    <div className="bg-primary text-primary-foreground rounded-full p-1 animate-in zoom-in duration-300">
                                      <Check className="h-4 w-4 stroke-[3px]" />
                                    </div>
                                  </div>
                                )}
                              </CardContent>

                              {/* NEW STORE PRICES SECTION - REFINED */}
                              {isSelected && selectedStoreIds.length > 0 && (
                                <div className="p-4 bg-muted/30 border-t space-y-3" onClick={e => e.stopPropagation()}>
                                  <div className="flex items-center justify-between">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Store Availability</Label>
                                    <Badge variant="outline" className="text-[9px] font-bold bg-background/50">Multi-Channel Price</Badge>
                                  </div>
                                  <div className="grid grid-cols-1 gap-2">
                                    {selectedStoreIds.map(storeId => {
                                      const store = availableStores.find((s: any) => s.id === storeId);
                                      const price = item.storePrices?.[storeId] !== undefined ? item.storePrices[storeId] : item.basePrice;
                                      return (
                                        <div key={storeId} className="flex items-center gap-3 bg-background/60 p-2 rounded-xl border border-primary/10 group/store transition-all hover:border-primary/30">
                                          <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center group-hover/store:bg-primary/10 transition-colors">
                                            <Store className="w-4 h-4 text-primary" />
                                          </div>
                                          <div className="flex-1">
                                            <span className="text-[11px] font-bold block" title={store?.name || "Store"}>
                                              {store?.name || "Store"}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2 w-32 shrink-0">
                                            <div className="relative flex-1">
                                              <Input
                                                type="number"
                                                className="h-8 text-xs font-bold pl-2 pr-1 rounded-lg border-primary/20 focus-visible:ring-primary shadow-inner"
                                                value={price}
                                                onChange={(e) => {
                                                  const val = parseInt(e.target.value) || 0;
                                                  setAvailableItems(prev => prev.map(i =>
                                                    i.id === item.id
                                                      ? { ...i, storePrices: { ...(i.storePrices || {}), [storeId]: val } }
                                                      : i
                                                  ));
                                                }}
                                              />
                                            </div>
                                            <span className="text-[11px] font-black text-foreground w-10 text-right">
                                              {getCurrencySymbol(currentCurrency)}{(price / 100).toFixed(2)}
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </Card>
                          );
                        })}

                        {/* Add Item Card - Redesigned for Premium Look */}
                        <Card
                          className="group relative border-2 border-dashed border-primary/20 hover:border-primary/50 cursor-pointer transition-all duration-500 hover:bg-primary/5 bg-muted/5 flex flex-col min-h-[200px] rounded-3xl overflow-hidden"
                          onClick={() => {
                            setItemModal(prev => ({ ...prev, catId: category.id }));
                            setShowAddItemDialog(true);
                          }}
                        >
                          <CardContent className="p-8 flex flex-col items-center justify-center gap-5 flex-1 text-center">
                            <div className="relative group-hover:scale-110 transition-transform duration-500">
                              <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full group-hover:bg-primary/30 transition-all duration-500 scale-150" />
                              <div className="relative w-16 h-16 rounded-2xl bg-linear-to-br from-primary/20 to-primary/5 text-primary flex items-center justify-center border border-primary/30 group-hover:rotate-12 transition-all duration-500">
                                <Plus className="w-8 h-8 stroke-[3px]" />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <p className="font-black text-xl tracking-tight group-hover:text-primary transition-colors">Add Custom Item</p>
                              <p className="text-sm text-muted-foreground font-medium max-w-[180px] leading-relaxed">
                                Expand the <span className="text-primary font-bold">{category.name}</span> collection manually
                              </p>
                            </div>
                          </CardContent>

                          {/* Decorative Elements */}
                          <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
                        </Card>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Item Dialog */}
              <Dialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add Custom Item</DialogTitle>
                    <DialogDescription>Add a product manually to your selected categories.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <select
                        className="w-full h-9 p-2 border rounded bg-background text-sm"
                        value={itemModal.catId || (selectedCategoryIds[0] || '')}
                        onChange={(e) => setItemModal(prev => ({ ...prev, catId: e.target.value }))}
                      >
                        {availableCategories.filter(c => selectedCategoryIds.includes(c.id)).map(c => (
                          <option key={c.id} value={c.id}>{c.displayName || c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Item Name</Label>
                      <Input
                        value={itemModal.name}
                        onChange={(e) => setItemModal(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g. Luxury Cheesecake"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Price (Cents)</Label>
                      <Input
                        type="number"
                        value={itemModal.price}
                        onChange={(e) => setItemModal(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
                        placeholder="1299"
                      />
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(itemModal.price, currentCurrency)}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <div className="flex gap-2">
                        <Textarea
                          value={itemModal.desc}
                          onChange={(e) => setItemModal(prev => ({ ...prev, desc: e.target.value }))}
                          placeholder="Product details..."
                          className="flex-1"
                        />
                        <Button
                          variant="secondary"
                          size="icon"
                          disabled={aiLoading['modal-item']}
                          onClick={() => {
                            const catId = itemModal.catId || selectedCategoryIds[0];
                            const category = availableCategories.find(c => c.id === catId);
                            void generateAIContent('item', itemModal.name, category?.name);
                          }}
                        >
                          {aiLoading['modal-item']
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Sparkles className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>SEO Tags</Label>
                      <Input
                        value={itemModal.seo}
                        onChange={(e) => setItemModal(prev => ({ ...prev, seo: e.target.value }))}
                        placeholder="tasty, sweet, dessert..."
                      />
                    </div>
                    <Button className="w-full" onClick={() => {
                      if (!itemModal.name) return;
                      const newItem: Item = {
                        id: `custom-${Date.now()}`,
                        name: itemModal.name,
                        description: itemModal.desc,
                        seoTags: itemModal.seo,
                        basePrice: itemModal.price,
                        categoryId: itemModal.catId || selectedCategoryIds[0],
                        isRetail: businessType === 'retail',
                        modifiers: []
                      };
                      setAvailableItems(prev => [...prev, newItem]);
                      setSelectedItemIds(prev => [...prev, newItem.id]);
                      setItemModal({ name: '', desc: '', seo: '', price: 1000, catId: '' });
                      setShowAddItemDialog(false);
                    }}>Add Item</Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Edit Item Dialog */}
              <Dialog open={editItemModal.open} onOpenChange={(open) => setEditItemModal({ open, item: null })}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Edit Item</DialogTitle>
                    <DialogDescription>Update details for this item.</DialogDescription>
                  </DialogHeader>
                  {editItemModal.item && (
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <select
                          className="w-full h-9 p-2 border rounded bg-background text-sm"
                          value={editItemModal.item.categoryId}
                          onChange={(e) => setEditItemModal(prev => ({
                            ...prev,
                            item: prev.item ? { ...prev.item, categoryId: e.target.value } : null
                          }))}
                        >
                          {availableCategories.filter(c => selectedCategoryIds.includes(c.id)).map(c => (
                            <option key={c.id} value={c.id}>{c.displayName || c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Item Name</Label>
                        <Input
                          value={editItemModal.item.name}
                          onChange={(e) => setEditItemModal(prev => ({
                            ...prev,
                            item: prev.item ? { ...prev.item, name: e.target.value } : null
                          }))}
                          placeholder="e.g. Luxury Cheesecake"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Price (Cents)</Label>
                        <Input
                          type="number"
                          value={editItemModal.item.basePrice}
                          onChange={(e) => setEditItemModal(prev => ({
                            ...prev,
                            item: prev.item ? { ...prev.item, basePrice: parseInt(e.target.value) || 0 } : null
                          }))}
                          placeholder="1299"
                        />
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(editItemModal.item.basePrice, currentCurrency)}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <div className="flex gap-2">
                          <Textarea
                            value={editItemModal.item.description || ''}
                            onChange={(e) => setEditItemModal(prev => ({
                              ...prev,
                              item: prev.item ? { ...prev.item, description: e.target.value } : null
                            }))}
                            placeholder="Product details..."
                            className="min-h-[80px] flex-1"
                          />
                          <Button
                            variant="secondary"
                            size="icon"
                            title="Generate with AI"
                            disabled={aiLoading['edit-item']}
                            onClick={async () => {
                              if (!editItemModal.item?.name.trim()) return;
                              setLoading('edit-item', true);
                              try {
                                const cat = availableCategories.find(c => c.id === editItemModal.item?.categoryId);
                                const res = await api.post('/menus/generate-content', {
                                  type: 'item',
                                  name: editItemModal.item.name,
                                  categoryName: cat?.name,
                                  restaurantName: getRestaurantName(),
                                  businessType,
                                });
                                const data = res.data?.data ?? res.data;
                                setEditItemModal(prev => ({
                                  ...prev,
                                  item: prev.item
                                    ? { ...prev.item, description: data?.description ?? '', seoTags: data?.seoTags ?? '' }
                                    : null,
                                }));
                              } catch (err) {
                                console.error("AI Generation failed:", err);
                              } finally {
                                setLoading('edit-item', false);
                              }
                            }}
                          >
                            {aiLoading['edit-item']
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <Sparkles className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>SEO Tags</Label>
                        <Input
                          value={editItemModal.item.seoTags || ''}
                          onChange={(e) => setEditItemModal(prev => ({
                            ...prev,
                            item: prev.item ? { ...prev.item, seoTags: e.target.value } : null
                          }))}
                          placeholder="tasty, sweet, dessert..."
                        />
                      </div>
                      <Button className="w-full" onClick={() => {
                        if (!editItemModal.item) return;
                        setAvailableItems(prev => prev.map(i =>
                          i.id === editItemModal.item!.id ? editItemModal.item! : i
                        ));
                        setEditItemModal({ open: false, item: null });
                      }}>Save Changes</Button>
                    </div>
                  )}
                </DialogContent>
              </Dialog>


              <div className="flex flex-col-reverse sm:flex-row justify-between gap-4 pt-4 border-t mt-6">
                <Button variant="outline" className="w-full sm:w-auto" onClick={prevStep}>Back</Button>
                <Button onClick={nextStep} size="lg" className="w-full sm:w-auto">
                  Configure Settings <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: MODIFIERS & RETAIL SETTINGS */}
          {currentStep === "modifiers" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold">Setup & Modifiers</h2>
                <p className="text-muted-foreground">Configure retail SKUs, stock, taxes, or food modifiers.</p>
              </div>

              {/* Catalog Global Settings */}
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Discovery Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Catalog Description</Label>
                    <Textarea
                      value={catalogInfo.description}
                      onChange={(e) => setCatalogInfo(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="AI generated description..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Global SEO Tags</Label>
                    <Input
                      value={catalogInfo.seoTags}
                      onChange={(e) => setCatalogInfo(prev => ({ ...prev, seoTags: e.target.value }))}
                      placeholder="AI generated tags..."
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-8">
                {availableCategories.filter(c => selectedCategoryIds.includes(c.id)).map(category => {
                  const catItems = availableItems.filter(i => i.categoryId === category.id && selectedItemIds.includes(i.id));
                  if (catItems.length === 0) return null;

                  return (
                    <div key={category.id} className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
                        <span className="text-2xl">{category.icon}</span> {category.displayName || category.name}
                        <Badge variant="secondary" className="ml-2 text-xs">{catItems.length} items</Badge>
                      </h3>

                      <div className="space-y-4">
                        {catItems.map(item => {
                          const isExpanded = expandedItemId === item.id;
                          const categoryName = category.name;

                          return (
                            <Card
                              key={item.id}
                              className={cn(
                                "cursor-pointer transition-all",
                                isExpanded && "ring-2 ring-primary"
                              )}
                            >
                              <CardHeader
                                className="pb-3"
                                onClick={() => {
                                  if (!isExpanded && businessType !== 'retail') {
                                    setExpandedItemId(item.id);
                                    // Fetch reusable suggestions when expanding
                                    void fetchReusableSuggestions(item.id, item.name, categoryName);
                                  }
                                }}
                              >
                                <CardTitle className="text-base sm:text-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                                  <span className="flex flex-wrap items-center gap-2">
                                    <span className="wrap-break-word">{item.name}</span>
                                    {!isExpanded && item.modifiers && item.modifiers.length > 0 && (
                                      <Badge variant="secondary" className="text-xs whitespace-nowrap">
                                        {item.modifiers.length} modifier{item.modifiers.length !== 1 ? 's' : ''}
                                      </Badge>
                                    )}
                                  </span>
                                  <div className="flex items-center gap-2 self-start sm:self-auto">
                                    <Badge variant="outline">{formatCurrency(item.basePrice, currentCurrency)}</Badge>
                                    {businessType !== 'retail' && (
                                      <ChevronRight
                                        className={cn(
                                          "w-4 h-4 transition-transform shrink-0",
                                          isExpanded && "rotate-90"
                                        )}
                                      />
                                    )}
                                  </div>
                                </CardTitle>
                              </CardHeader>

                              <CardContent>
                                {businessType === "retail" ? (
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                      <Label>SKU / Barcode</Label>
                                      <Input
                                        placeholder="e.g. 890123456"
                                        value={itemSettings[item.id]?.sku || ""}
                                        onChange={(e) => setItemSettings(prev => ({ ...prev, [item.id]: { ...prev[item.id], sku: e.target.value } }))}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Initial Stock</Label>
                                      <Input
                                        type="number"
                                        placeholder="e.g. 100"
                                        value={itemSettings[item.id]?.stock || ""}
                                        onChange={(e) => setItemSettings(prev => ({ ...prev, [item.id]: { ...prev[item.id], stock: parseInt(e.target.value) } }))}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Tax Rate</Label>
                                      <select
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                                        value={itemSettings[item.id]?.taxRate || "standard"}
                                        onChange={(e) => setItemSettings(prev => ({ ...prev, [item.id]: { ...prev[item.id], taxRate: e.target.value } }))}
                                      >
                                        <option value="standard">Standard (20%)</option>
                                        <option value="reduced">Reduced (5%)</option>
                                        <option value="zero">Zero Rated (0%)</option>
                                      </select>
                                    </div>
                                  </div>
                                ) : isExpanded ? (
                                  // EXPANDED: AI MODIFIER CHAT INTERFACE
                                  <div className="space-y-4 border-t pt-4" onClick={(e) => e.stopPropagation()}>
                                    {/* Existing Modifiers */}
                                    {item.modifiers && item.modifiers.length > 0 && (
                                      <div className="space-y-2">
                                        <Label className="text-sm font-semibold">Current Modifiers</Label>
                                        <div className="space-y-2">
                                          {item.modifiers.map((modifier, idx) => {
                                            const isString = typeof modifier === 'string';
                                            const modName = isString ? modifier : modifier.name;
                                            const modIcon = isString ? '🔘' : (modifier.icon || '🔘');
                                            const modType = isString ? 'single_select' : modifier.type;
                                            const modOptions = isString ? [] : (modifier.options || []);

                                            return (
                                              <div key={idx} className="p-3 bg-secondary/30 rounded-lg">
                                                <div className="flex items-center gap-2 mb-2">
                                                  <span className="text-lg">{modIcon}</span>
                                                  <span className="font-semibold">{modName}</span>
                                                  <Badge variant="outline" className="text-xs">
                                                    {modType === 'single_select' ? 'Single' : 'Multi'} Select
                                                  </Badge>
                                                  {!isString && modifier.required && (
                                                    <Badge variant="destructive" className="text-xs">Required</Badge>
                                                  )}
                                                  <span className="flex-1" />
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-primary"
                                                    onClick={() => {
                                                      setManualEditorItemId(item.id);
                                                      setManualEditorModifierIndex(idx);
                                                      setManualEditorModifier(isString ? null : modifier);
                                                      setIsManualEditorOpen(true);
                                                    }}
                                                    title="Edit modifier"
                                                  >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                  </Button>
                                                </div>
                                                <div className="flex gap-2 flex-wrap">
                                                  {modOptions.map((opt, optIdx) => (
                                                    <Badge key={optIdx} variant="secondary" className="text-xs">
                                                      {opt.name} {opt.priceModifier !== 0 && `(${opt.priceModifier > 0 ? '+' : ''}${formatCurrency(opt.priceModifier, currentCurrency)})`}
                                                    </Badge>
                                                  ))}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}

                                    {/* AI Modifier Generator */}
                                    <div className="space-y-3">
                                      <Label className="flex items-center gap-2 text-sm font-semibold">
                                        <Sparkles className="w-4 h-4 text-primary" />
                                        AI Modifier Generator
                                      </Label>

                                      <div className="space-y-2">
                                        <Textarea
                                          placeholder="Example: I need size options (Small, Medium, Large) and topping choices like extra cheese, mushrooms, peppers..."
                                          value={modifierPrompt[item.id] || ''}
                                          onChange={(e) => setModifierPrompt(prev => ({ ...prev, [item.id]: e.target.value }))}
                                          rows={3}
                                          className="resize-none"
                                        />
                                        <Button
                                          onClick={() => void generateModifiersForItem(item.id, item.name, categoryName)}
                                          disabled={isGeneratingModifiers[item.id]}
                                          size="sm"
                                          className="w-full"
                                        >
                                          {isGeneratingModifiers[item.id] ? (
                                            <>
                                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                              Generating Modifiers...
                                            </>
                                          ) : (
                                            <>
                                              <Sparkles className="w-4 h-4 mr-2" />
                                              Generate Modifiers
                                            </>
                                          )}
                                        </Button>
                                      </div>

                                      {/* Generated Modifiers Preview */}
                                      {generatedModifiers[item.id] && generatedModifiers[item.id].length > 0 && (
                                        <div className="space-y-3 p-4 bg-muted/10 rounded-lg border border-border">
                                          <div className="flex items-center justify-between">
                                            <Label className="text-sm font-semibold text-foreground">
                                              AI Generated Modifiers
                                            </Label>
                                            <Check className="w-5 h-5 text-foreground" />
                                          </div>

                                          <div className="space-y-2">
                                            {generatedModifiers[item.id].map((modifier, idx) => (
                                              <div key={idx} className="p-3 bg-background rounded-md border">
                                                <div className="flex items-center gap-2 mb-2">
                                                  <span className="text-lg">{modifier.icon}</span>
                                                  <span className="font-semibold">{modifier.name}</span>
                                                  <Badge variant="outline" className="text-xs">
                                                    {modifier.type === 'single_select' ? 'Single' : 'Multi'} Select
                                                  </Badge>
                                                  {modifier.required && (
                                                    <Badge variant="destructive" className="text-xs">Required</Badge>
                                                  )}
                                                </div>
                                                <div className="flex gap-2 flex-wrap">
                                                  {modifier.options.map((opt, optIdx) => (
                                                    <Badge key={optIdx} variant="secondary" className="text-xs">
                                                      {opt.name}
                                                      {opt.priceModifier !== 0 && ` (${opt.priceModifier > 0 ? '+' : ''}${formatCurrency(opt.priceModifier, currentCurrency)})`}
                                                      {opt.isDefault && ' 🌟'}
                                                    </Badge>
                                                  ))}
                                                </div>
                                              </div>
                                            ))}
                                          </div>

                                          <Button
                                            onClick={() => approveModifiers(item.id)}
                                            size="sm"
                                            className="w-full bg-foreground text-background hover:bg-foreground/90"
                                          >
                                            <Check className="w-4 h-4 mr-2" />
                                            Approve & Add Modifiers
                                          </Button>
                                        </div>
                                      )}
                                    </div>

                                    {/* Manual Add & Template Browser */}
                                    <div className="pt-2 space-y-2">
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            setManualEditorItemId(item.id);
                                            setManualEditorModifierIndex(-1);
                                            setManualEditorModifier(null);
                                            setIsManualEditorOpen(true);
                                          }}
                                        >
                                          <Plus className="w-4 h-4 mr-2" />
                                          Add Manual Modifier
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleOpenTemplateBrowser(item.id, item.name, categoryName)}
                                        >
                                          <Layers className="w-4 h-4 mr-2" />
                                          Browse Templates
                                        </Button>
                                      </div>
                                    </div>

                                    {/* Reusable Suggestions */}
                                    {reusableSuggestions[item.id] && reusableSuggestions[item.id].length > 0 && (
                                      <div className="space-y-3">
                                        <Label className="flex items-center gap-2 text-sm font-semibold">
                                          <Lightbulb className="w-4 h-4 text-foreground" />
                                          Smart Suggestions for {categoryName}
                                        </Label>
                                        <div className="space-y-2">
                                          {reusableSuggestions[item.id].slice(0, 3).map((suggestion, idx) => (
                                            <div
                                              key={idx}
                                              className="p-3 bg-muted/10 rounded-md border border-border flex items-start justify-between gap-2"
                                            >
                                              <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                  <span>{suggestion.icon}</span>
                                                  <span className="font-medium text-sm">{suggestion.name}</span>
                                                  <Badge variant="outline" className="text-xs">
                                                    {suggestion.options?.length || 0} options
                                                  </Badge>
                                                </div>
                                                {suggestion.description && (
                                                  <p className="text-xs text-muted-foreground">{suggestion.description}</p>
                                                )}
                                              </div>
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => addReusableSuggestion(item.id, suggestion)}
                                              >
                                                <Plus className="w-3 h-3 mr-1" />
                                                Add
                                              </Button>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setExpandedItemId(null)}
                                      className="w-full"
                                    >
                                      Done with Modifiers
                                    </Button>
                                  </div>
                                ) : (
                                  // COLLAPSED: Summary View
                                  <div className="space-y-2">
                                    <Label className="text-sm text-muted-foreground">
                                      {item.modifiers && item.modifiers.length > 0
                                        ? `${item.modifiers.length} modifier${item.modifiers.length !== 1 ? 's' : ''} configured`
                                        : "Click to add modifiers"}
                                    </Label>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Modifier Template Browser Modal */}
              <ModifierTemplateBrowser
                isOpen={isTemplateBrowserOpen}
                onClose={() => setIsTemplateBrowserOpen(false)}
                itemName={currentItemForTemplates?.name || ''}
                categorySlug={currentItemForTemplates?.category}
                businessType={businessType?.toUpperCase() as 'RESTAURANT' | 'CAFE' | 'BAR' | 'RETAIL' | 'HYBRID' || 'RESTAURANT'}
                onApplyTemplate={handleApplyTemplate}
                onApplyBundle={handleApplyBundle}
                recommendedBundle={aiSuggestions?.recommendedBundle}
                allTemplates={aiSuggestions?.allTemplates}
                currency={currentCurrency}
              />

              {/* Manual Modifier Editor */}
              <ModifierManualEditor
                isOpen={isManualEditorOpen}
                onClose={() => {
                  setIsManualEditorOpen(false);
                  setManualEditorModifier(null);
                  setManualEditorItemId(null);
                  setManualEditorModifierIndex(-1);
                }}
                modifier={manualEditorModifier}
                onSave={handleSaveModifier}
                currency={currentCurrency}
              />

              {/* Deployment Target Summary */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-foreground" />
                  <h3 className="text-xl font-bold">Ready to Deploy</h3>
                </div>

                <Card className="border-border bg-muted/5">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Selected Sites</p>
                        <p className="text-sm text-muted-foreground">The menu will be immediately active on these channels:</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedStoreIds.length > 0 ? (
                          selectedStoreIds.map(id => {
                            const site = availableStores.find(s => s.id === id);
                            return (
                            <Badge key={id} variant="secondary" className="bg-muted text-foreground border-border py-1.5 px-3">
                                <Store className="w-3 h-3 mr-1.5" />
                                {site?.name || 'Selected Site'}
                              </Badge>
                            );
                          })
                        ) : (
                          <Badge variant="destructive" className="py-1.5 px-3">
                            <X className="w-3 h-3 mr-1.5" />
                            No Sites Selected
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {selectedStoreIds.length === 0 && (
                  <p className="text-xs text-destructive font-bold animate-pulse text-center">
                    ⚠️ You must select at least one site in the Discovery step to proceed.
                  </p>
                )}
              </div>


              <div className="flex flex-col-reverse sm:flex-row justify-between gap-4 pt-4 border-t mt-6">
                <Button variant="outline" className="w-full sm:w-auto" onClick={prevStep} disabled={isGenerating}>Back</Button>
                <Button
                  onClick={handleFinish}
                  size="lg"
                  className="bg-foreground text-background hover:bg-foreground/90 h-12 px-8 w-full sm:w-auto min-w-[200px]"
                  disabled={selectedStoreIds.length === 0 || isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Saving Menu...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-5 w-5" /> Finish & Save
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

        </div>

        {/* Persistent Abigail Coordinator Chat */}
        <div className={cn(
          "flex flex-col rounded-2xl border border-border bg-background overflow-hidden transition-all duration-500 z-50",
          currentStep === 'discovery'
            ? "relative mt-6 h-[380px] w-full"
            : "fixed bottom-24 right-6 w-[380px] h-[500px] ring-1 ring-border"
        )}>
          {/* Store selection gate overlay (only in discovery) */}
          {currentStep === 'discovery' && selectedStoreIds.length === 0 && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-2xl">
              <div className="flex flex-col items-center text-center px-6 py-8 space-y-3 animate-in fade-in zoom-in-95 duration-300">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <Store className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="text-base font-bold tracking-tight">Select a Store First</h3>
                <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                  Please select at least one store from <strong>Target Stores</strong> above before talking to Abigail.
                </p>
              </div>
            </div>
          )}

          {/* Chat header */}
          <AbigailActivityPanel
            abigailState={abigailState}
            activeSpecialists={activeSpecialists}
            selectedStoreCount={selectedStoreIds.length}
          />

          {/* Messages area — coordinator */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {coordinatorMessages.map((msg) => {
              const parts = (msg as any).parts ?? [];

              const specialistPart = parts.find(
                (p: any) => ['callZara', 'callMarco', 'callKai', 'callRex', 'callSage'].includes(p.toolName)
                  && p.type === 'tool-result'
              );
              const specialist = specialistPart?.result?.specialist;
              const specialistNote = specialistPart?.result?.result?.specialistNote;
              const sageAudit = specialist === 'sage' ? specialistPart?.result?.result : null;

              // Extract Zara's category suggestions for badge rendering
              const zaraCats = specialist === 'zara'
                ? (specialistPart?.result?.result?.categories ?? [])
                : [];
                
              const suggestResult = getSuggestCategoriesResult(msg);
              const suggestionCats = suggestResult?.categories || [];
              const allSuggestCats = [...zaraCats, ...suggestionCats];

              const textPart = parts.find((p: any) => p.type === 'text') as { type: 'text'; text: string } | undefined;
              const text = textPart?.text ?? (typeof (msg as any).content === 'string' ? (msg as any).content : '');

              if (msg.role === 'assistant' && !text?.trim() && !specialist && allSuggestCats.length === 0) return null;

              return (
                <div key={msg.id} className={cn(
                    "flex gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300",
                    msg.role === 'user' && 'justify-end'
                  )}>
                    {msg.role === 'assistant' && (
                      specialist ? (
                        <AvatarGroup className="mt-0.5 shadow-sm">
                          <Avatar size="sm" className="ring-1 ring-border">
                            <AvatarImage src={ABIGAIL_IMAGE} alt="Abigail" />
                            <AvatarFallback className="bg-foreground text-background font-bold">A</AvatarFallback>
                          </Avatar>
                          <Avatar size="sm" className="ring-1 ring-border/50">
                            <AvatarImage src={SPECIALIST_IMAGES[specialist]} alt={specialist} />
                            <AvatarFallback className="bg-linear-to-br from-muted-foreground/20 to-muted-foreground/40 text-foreground font-bold">{specialist[0].toUpperCase()}</AvatarFallback>
                          </Avatar>
                        </AvatarGroup>
                      ) : (
                        <Avatar size="sm" className="mt-0.5 ring-1 ring-border">
                          <AvatarImage src={ABIGAIL_IMAGE} alt="Abigail" />
                          <AvatarFallback className="bg-foreground text-background font-bold">A</AvatarFallback>
                        </Avatar>
                      )
                    )}
                    <div className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                    msg.role === 'assistant' && "bg-muted/60 border border-border/40",
                    msg.role === 'user' && "bg-foreground text-background"
                  )}>
                    {text?.trim() && (
                      <span dangerouslySetInnerHTML={{
                        __html: text
                          .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\*(.*?)\*/g, '<em>$1</em>')
                          .replace(/\n/g, '<br/>'),
                      }} />
                    )}
                    {specialist && <SpecialistCard specialist={specialist} note={specialistNote} />}
                    {sageAudit && <SageAuditPanel auditResult={sageAudit} />}
                    {/* Category suggestion badges */}
                    {allSuggestCats.length > 0 && (
                      <CategorySuggestionBadges
                        categories={allSuggestCats}
                        onSelect={(cats) => {
                          setAvailableCategories(cats);
                          setSelectedCategoryIds(cats.map(c => c.id));
                        }}
                        onConfirm={() => {
                          setBusinessType(availableCategories.some(c => c.name.toLowerCase().includes('retail')) ? 'retail' : 'food');
                          nextStep();
                        }}
                      />
                    )}
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
              {isCoordinating && (
                <div className="flex gap-2.5 animate-in fade-in duration-300">
                  <Avatar size="sm" className="ring-1 ring-border">
                    <AvatarImage src={ABIGAIL_IMAGE} alt="Abigail" />
                    <AvatarFallback className="bg-foreground text-background font-bold">A</AvatarFallback>
                  </Avatar>
                  <div className="bg-muted/60 border border-border/40 rounded-2xl px-3.5 py-2.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-foreground rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 bg-foreground rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-foreground rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}
            <div ref={coordinatorChatEndRef} />
          </div>

          {/* Suggested questions */}
          <AbigailSuggestions
            suggestions={suggestions}
            onSelect={(s) => {
              setSuggestions([]);
              if (isCoordinating) {
                setQueuedMessage(s);
              } else {
                sendCoordinatorMessage({ text: s });
              }
            }}
          />

          {/* Input area */}
          <div className="shrink-0 px-3 py-3 border-t border-border/30 bg-background/50 backdrop-blur-sm">
            <MessageQueue
              queuedMessage={queuedMessage}
              onCancel={() => {
                setBusinessDescription(queuedMessage ?? '');
                setQueuedMessage(null);
              }}
              flash={queueFlash}
            />
            <WizardChatInput
              value={businessDescription}
              onChange={setBusinessDescription}
              onSubmit={() => {
                if (selectedStoreIds.length === 0) {
                  toast.error('Please select at least one store from Target Stores above first.');
                  return;
                }
                if (!businessDescription.trim()) return;
                setSuggestions([]);
                if (isCoordinating) {
                  if (queuedMessage) {
                    setQueueFlash(true);
                    setTimeout(() => setQueueFlash(false), 400);
                  }
                  setQueuedMessage(businessDescription);
                  setBusinessDescription('');
                  return;
                }
                sendCoordinatorMessage({ text: businessDescription });
                setBusinessDescription('');
              }}
              disabled={selectedStoreIds.length === 0}
              placeholder={selectedStoreIds.length === 0 ? "Select a store first..." : "Message Abigail..."}
            />
          </div>
        </div>
      </div>

      {/* ============ DEVELOPMENT NAVIGATION OVERRIDE ============ */}
      <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 sm:gap-4 bg-background/95 backdrop-blur-md border px-4 sm:px-6 py-2 sm:py-3 rounded-full z-100 border-primary/50 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[90vw] sm:max-w-none overflow-x-auto hide-scrollbar">
        <div className="hidden sm:flex items-center gap-2 mr-2 sm:mr-4 border-r pr-2 sm:pr-4 border-primary/20 shrink-0">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/30 uppercase tracking-widest text-[9px] font-bold">WIZARD NAV</Badge>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={prevStep}
          disabled={currentStep === STEPS[0].key}
          className="h-8 w-8 hover:bg-primary/10 rounded-full"
          title="Previous Step"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>

        <div className="flex gap-1">
          {STEPS.map((s) => {
            const isActive = s.key === currentStep;
            return (
              <div
                key={s.key}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all duration-300",
                  isActive ? "w-6 bg-primary" : "bg-muted-foreground/30"
                )}
              />
            );
          })}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={nextStep}
          disabled={currentStep === STEPS[STEPS.length - 1].key}
          className="h-8 w-8 hover:bg-primary/10 rounded-full"
          title="Next Step"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
      {/* Import Menu Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              Import Menu to {targetStoreForImport?.name}
            </DialogTitle>
            <DialogDescription>
              Select a source store that already has a menu to copy its structure.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {availableStores
              .filter(s => s.id !== targetStoreForImport?.id && s.itemCount > 0)
              .map(sourceStore => (
                <div
                  key={sourceStore.id}
                  onClick={() => !isImporting && handleImportMenu(sourceStore.id)}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-xl border cursor-pointer hover:bg-muted/50 transition-all group",
                    isImporting && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Store className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">{sourceStore.name}</p>
                      <p className="text-xs text-muted-foreground">{sourceStore.itemCount} items available</p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="group-hover:translate-x-1 transition-transform">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              ))}

            {availableStores.filter(s => s.id !== targetStoreForImport?.id && s.itemCount > 0).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No other stores with menus found.</p>
              </div>
            )}
          </div>

          {isImporting && (
            <div className="flex flex-col items-center justify-center py-4 gap-3 bg-background/80 backdrop-blur-sm absolute inset-0 z-10 rounded-lg">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Cloning menu structure...</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function MenuWizardPage() {
  return (
    <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin size-8 text-muted-foreground" /></div>}>
      <MenuWizardPageInner />
    </React.Suspense>
  );
}

// ============ FOOTER NAVIGATION ============
// removed
