"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  KeyRoundIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  Loader2Icon,
  EyeIcon,
  EyeOffIcon,
  TrashIcon,
  SparklesIcon,
  GlobeIcon,
  BotIcon,
  ZapIcon,
  ShieldCheckIcon,
  CircleIcon,
  ExternalLinkIcon,
  CpuIcon,
  InfoIcon,
  RefreshCwIcon,
  SearchIcon,
  LayersIcon,
  XIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Provider = "openai" | "groq" | "openrouter" | "google" | "deepseek";

const PROVIDERS = [
  {
    id: "google" as Provider,
    name: "Google Gemini",
    keyPlaceholder: "Paste your Gemini API key",
    docsUrl: "https://aistudio.google.com/app/apikey",
    icon: SparklesIcon,
  },
  {
    id: "openrouter" as Provider,
    name: "OpenRouter",
    keyPlaceholder: "Paste your OpenRouter API key",
    docsUrl: "https://openrouter.ai/keys",
    icon: GlobeIcon,
  },
  {
    id: "openai" as Provider,
    name: "OpenAI",
    keyPlaceholder: "Paste your OpenAI API key",
    docsUrl: "https://platform.openai.com/api-keys",
    icon: BotIcon,
  },
  {
    id: "groq" as Provider,
    name: "Groq",
    keyPlaceholder: "Paste your Groq API key",
    docsUrl: "https://console.groq.com/keys",
    icon: ZapIcon,
  },
  {
    id: "deepseek" as Provider,
    name: "DeepSeek",
    keyPlaceholder: "Paste your DeepSeek API key",
    docsUrl: "https://platform.deepseek.com/api_keys",
    icon: CpuIcon,
  },
];

const DEFAULT_MODELS: Record<Provider, Array<{ value: string; label: string }>> = {
  google: [
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    { value: "gemini-flash-latest", label: "Gemini Flash (Latest)" },
  ],
  openai: [
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "o1-mini", label: "o1 Mini" },
    { value: "o1-preview", label: "o1 Preview" },
  ],
  groq: [
    { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B Versatile" },
    { value: "mixtral-8x7b-32768", label: "Mixtral 8x7B Instruct" },
    { value: "gemma2-9b-it", label: "Gemma 2 9B" },
  ],
  deepseek: [
    { value: "deepseek-chat", label: "DeepSeek Chat" },
    { value: "deepseek-reasoner", label: "DeepSeek Reasoner" },
  ],
  openrouter: [
    { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { value: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B Instruct" },
    { value: "deepseek/deepseek-chat", label: "DeepSeek Chat" },
    { value: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
  ],
};

interface ModelEntry {
  id: string;
  name: string;
  provider: string;
  contextLength: number;
  promptPrice: string;
  completionPrice: string;
  isFree: boolean;
}

function resolveProviderForModel(
  modelId: string,
  savedKeys: Record<Provider, boolean>,
): { provider: Provider; model: string } | null {
  const slash = modelId.indexOf("/");
  const prefix = slash !== -1 ? modelId.slice(0, slash) : modelId;
  const modelName = slash !== -1 ? modelId.slice(slash + 1) : modelId;

  if (prefix === "openai" && savedKeys.openai) return { provider: "openai", model: modelName };
  if (prefix === "google" && savedKeys.google) return { provider: "google", model: modelName };
  if (prefix === "deepseek" && savedKeys.deepseek) return { provider: "deepseek", model: modelName };
  if ((prefix === "groq" || prefix === "meta-llama") && savedKeys.groq)
    return { provider: "groq", model: modelName };
  if (savedKeys.openrouter) return { provider: "openrouter", model: modelId };
  return null;
}

function formatPrice(price: string): string {
  const n = parseFloat(price);
  if (!n || n === 0) return "Free";
  const per1M = n * 1_000_000;
  return per1M < 1 ? `$${per1M.toFixed(3)}` : `$${per1M.toFixed(2)}`;
}

function formatContext(n: number): string {
  if (!n) return "";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

const EMPTY_PROVIDER_RECORD = <T,>(val: T): Record<Provider, T> => ({
  openai: val,
  groq: val,
  openrouter: val,
  google: val,
  deepseek: val,
});

function SelectedModelBar({
  model,
  savedKeys,
  savingActive,
  onSetActive,
}: {
  model: ModelEntry | null;
  savedKeys: Record<Provider, boolean>;
  savingActive: boolean;
  onSetActive: (model: ModelEntry, resolved: { provider: Provider; model: string }) => void;
}) {
  if (!model) return null;
  const resolved = resolveProviderForModel(model.id, savedKeys);
  return (
    <div className="flex items-stretch gap-3">
      <div className="flex-1 rounded-lg border border-border bg-muted/20 px-4 py-3 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{model.name}</p>
        <p className="text-xs text-muted-foreground font-mono truncate">{model.id}</p>
        <p className="text-xs mt-1">
          {resolved ? (
            <span className="text-muted-foreground">
              Key: <span className="font-medium text-foreground capitalize">{resolved.provider}</span>
            </span>
          ) : (
            <span className="text-destructive">
              No key — save an OpenRouter key to use any model
            </span>
          )}
        </p>
      </div>
      <Button
        disabled={!resolved || savingActive}
        onClick={() => resolved && onSetActive(model, resolved)}
        className="shrink-0 self-center"
      >
        <ShieldCheckIcon className="size-4 mr-2" />
        Set Active
      </Button>
    </div>
  );
}

export default function LlmSettingsPage() {
  const { accessToken } = useAuthStore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const returnTo = searchParams.get("returnTo");

  const [activeTab, setActiveTab] = useState<Provider>("google");

  const [keys, setKeys] = useState<Record<Provider, string>>(EMPTY_PROVIDER_RECORD(""));
  const [savedKeys, setSavedKeys] = useState<Record<Provider, boolean>>(EMPTY_PROVIDER_RECORD(false));
  const [unsaved, setUnsaved] = useState<Record<Provider, boolean>>(EMPTY_PROVIDER_RECORD(false));
  const [showKey, setShowKey] = useState<Record<Provider, boolean>>(EMPTY_PROVIDER_RECORD(false));

  const [savingKey, setSavingKey] = useState<Provider | null>(null);
  const [testingKey, setTestingKey] = useState<Provider | null>(null);
  const [testedProviders, setTestedProviders] = useState<Record<Provider, "pass" | "fail" | null>>(
    EMPTY_PROVIDER_RECORD(null),
  );

  // Live model state
  const [availableModels, setAvailableModels] = useState<Record<Provider, Array<{ value: string; label: string }>>>(
    DEFAULT_MODELS,
  );
  const [selectedModels, setSelectedModels] = useState<Record<Provider, string>>({
    google: "gemini-2.5-flash",
    openai: "gpt-4o-mini",
    groq: "llama-3.3-70b-versatile",
    deepseek: "deepseek-chat",
    openrouter: "google/gemini-2.5-flash",
  });
  const [fetchingModels, setFetchingModels] = useState<Provider | null>(null);
  const [activeProvider, setActiveProvider] = useState<Provider | null>(null);
  const [savingActive, setSavingActive] = useState(false);

  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Global model browser
  const [allModels, setAllModels] = useState<ModelEntry[]>([]);
  const [loadingAllModels, setLoadingAllModels] = useState(false);
  const [modelSearch, setModelSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState("all");
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const [selectedGlobalModel, setSelectedGlobalModel] = useState<ModelEntry | null>(null);
  const [globalSetActiveDialog, setGlobalSetActiveDialog] = useState<{
    open: boolean;
    model: ModelEntry | null;
    resolved: { provider: Provider; model: string } | null;
  }>({ open: false, model: null, resolved: null });

  const [modelTest, setModelTest] = useState<{
    state: "idle" | "testing" | "pass" | "fail";
    message: string;
    latencyMs: number;
    modelName: string;
  }>({ state: "idle", message: "", latencyMs: 0, modelName: "" });

  const runModelTest = useCallback(async (modelLabel: string) => {
    setModelTest({ state: "testing", message: "", latencyMs: 0, modelName: modelLabel });
    try {
      const res = await api.post("/ai-integration/test-model?context=coding");
      const d: { success: boolean; latencyMs: number; message: string } = res.data.data ?? res.data;
      setModelTest({
        state: d.success ? "pass" : "fail",
        message: d.message,
        latencyMs: d.latencyMs,
        modelName: modelLabel,
      });
    } catch (err: any) {
      setModelTest({
        state: "fail",
        message: err.response?.data?.message ?? "Model test failed",
        latencyMs: 0,
        modelName: modelLabel,
      });
    }
  }, []);

  const [hermesEnabled, setHermesEnabled] = useState(false);
  const [hermesStatus, setHermesStatus] = useState<string>("absent");
  const [hermesSaving, setHermesSaving] = useState(false);

  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; provider: Provider | null }>({
    open: false,
    provider: null,
  });

  const current = PROVIDERS.find((p) => p.id === activeTab)!;
  const configuredCount = Object.values(savedKeys).filter(Boolean).length;

  const fetchModels = useCallback(
    async (provider: Provider) => {
      setFetchingModels(provider);
      try {
        const res = await api.get(`/ai-integration/models?provider=${provider}&context=coding`);
        const models: Array<{ value: string; label: string }> = res.data.data?.models ?? [];
        setAvailableModels((p) => ({ ...p, [provider]: models }));
        setSelectedModels((prev) => ({
          ...prev,
          [provider]: prev[provider] || (models[0]?.value ?? ""),
        }));
      } catch {
        // silently fall through — user can retry
      } finally {
        setFetchingModels(null);
      }
    },
    [],
  );

  useEffect(() => {
    if (!accessToken) return;
    api
      .get("/ai-integration/config?context=coding")
      .then((res) => {
        const d = res.data.data;
        if (d?.configured) {
          const provider: Provider = d.provider ?? "openrouter";
          setActiveTab(provider);
          setActiveProvider(provider);
          setSavedKeys({
            openai: !!d.hasOpenai,
            groq: !!d.hasGroq,
            openrouter: !!d.hasOpenRouter,
            google: !!d.hasGoogle,
            deepseek: !!d.hasDeepseek,
          });
          setKeys({
            openai: d.openaiApiKey || "",
            groq: d.groqApiKey || "",
            openrouter: d.openRouterApiKey || "",
            google: d.googleApiKey || "",
            deepseek: d.deepseekApiKey || "",
          });
          if (d.model) {
            setSelectedModels((p) => ({ ...p, [provider]: d.model }));
          }
          // Fetch models for all saved providers
          if (d.hasGoogle) void fetchModels("google");
          if (d.hasOpenai) void fetchModels("openai");
          if (d.hasGroq) void fetchModels("groq");
          if (d.hasOpenRouter) void fetchModels("openrouter");
          if (d.hasDeepseek) void fetchModels("deepseek");
        }
      })
      .catch(() => {});
  }, [accessToken, fetchModels]);

  // Auto-fetch models when switching to a tab with a saved key but no models loaded yet
  useEffect(() => {
    if (savedKeys[activeTab] && availableModels[activeTab].length === 0 && fetchingModels !== activeTab) {
      void fetchModels(activeTab);
    }
  }, [activeTab, savedKeys, availableModels, fetchingModels, fetchModels]);

  // Load global model catalog
  useEffect(() => {
    if (!accessToken) return;
    setLoadingAllModels(true);
    api
      .get("/ai-integration/all-models")
      .then((res) => setAllModels(res.data.data?.models ?? []))
      .catch(() => {})
      .finally(() => setLoadingAllModels(false));
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;
    api
      .get("/hermes-agent/settings")
      .then((res) => {
        const d = res.data.data;
        setHermesEnabled(!!d?.enabled);
        setHermesStatus(d?.status ?? "absent");
      })
      .catch(() => {});
  }, [accessToken]);

  const uniqueProviders = useMemo(
    () => [...new Set(allModels.map((m) => m.provider))].sort(),
    [allModels],
  );

  const filteredModels = useMemo(() => {
    const q = modelSearch.trim().toLowerCase();
    return allModels.filter((m) => {
      if (showFreeOnly && !m.isFree) return false;
      if (providerFilter !== "all" && m.provider !== providerFilter) return false;
      if (q) return m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q);
      return true;
    });
  }, [allModels, modelSearch, providerFilter, showFreeOnly]);

  const groupedModels = useMemo(() => {
    const groups: Record<string, ModelEntry[]> = {};
    for (const m of filteredModels) {
      (groups[m.provider] ??= []).push(m);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredModels]);

  const handleSetActiveGlobal = async () => {
    const { model, resolved } = globalSetActiveDialog;
    if (!model || !resolved) return;
    setGlobalSetActiveDialog({ open: false, model: null, resolved: null });
    setSavingActive(true);
    try {
      const current = await api.get("/ai-integration/config?context=coding");
      const cfg = current.data.data || {};
      await api.post("/ai-integration/config?context=coding", {
        provider: resolved.provider,
        model: resolved.model,
        openaiApiKey: cfg.openaiApiKey ?? "",
        groqApiKey: cfg.groqApiKey ?? "",
        openRouterApiKey: cfg.openRouterApiKey ?? "",
        googleApiKey: cfg.googleApiKey ?? "",
        deepseekApiKey: cfg.deepseekApiKey ?? "",
      });
      setActiveProvider(resolved.provider);
      void runModelTest(model.name);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to set active model");
    } finally {
      setSavingActive(false);
    }
  };

  const handleHermesToggle = async (enabled: boolean) => {
    setHermesSaving(true);
    setHermesEnabled(enabled);
    try {
      const res = await api.patch("/hermes-agent/settings", { enabled });
      const d = res.data.data;
      setHermesEnabled(!!d?.enabled);
      setHermesStatus(d?.status ?? "absent");
      showSuccess(enabled ? "Hermes agent enabled" : "Hermes agent disabled");
    } catch {
      setHermesEnabled(!enabled);
      setError("Could not update Hermes setting");
      setTimeout(() => setError(null), 4000);
    } finally {
      setHermesSaving(false);
    }
  };

  const showSuccess = (msg: string, redirect = false) => {
    setSuccess(msg);
    if (redirect && returnTo) {
      setTimeout(() => router.push(returnTo), 1200);
    } else {
      setTimeout(() => setSuccess(null), 4000);
    }
  };

  const handleKeyChange = (provider: Provider, value: string) => {
    setKeys((p) => ({ ...p, [provider]: value }));
    setUnsaved((p) => ({ ...p, [provider]: true }));
    setTestedProviders((p) => ({ ...p, [provider]: null }));
    setError(null);
  };

  const handleSaveKeyDirect = async (provider: Provider, key: string) => {
    setSavingKey(provider);
    try {
      const current = await api.get("/ai-integration/config?context=coding");
      const cfg = current.data.data || {};
      const providerConfig = PROVIDERS.find((p) => p.id === provider)!;

      await api.post("/ai-integration/config?context=coding", {
        provider,
        model: selectedModels[provider] || "",
        openaiApiKey: provider === "openai" ? key : (cfg.openaiApiKey ?? ""),
        groqApiKey: provider === "groq" ? key : (cfg.groqApiKey ?? ""),
        openRouterApiKey: provider === "openrouter" ? key : (cfg.openRouterApiKey ?? ""),
        googleApiKey: provider === "google" ? key : (cfg.googleApiKey ?? ""),
        deepseekApiKey: provider === "deepseek" ? key : (cfg.deepseekApiKey ?? ""),
      });

      setSavedKeys((p) => ({ ...p, [provider]: true }));
      setUnsaved((p) => ({ ...p, [provider]: false }));
      setActiveProvider(provider);

      // Fetch live models now that the key is stored
      await fetchModels(provider);
      showSuccess(`${providerConfig.name} key and model saved successfully`, !!returnTo);

      // Trigger the model validation test
      const modelLabel = selectedModels[provider] || provider;
      void runModelTest(modelLabel);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save key");
    } finally {
      setSavingKey(null);
    }
  };

  const handleSetActiveDirect = async (provider: Provider) => {
    setSavingActive(true);
    try {
      const currentConfig = await api.get("/ai-integration/config?context=coding");
      const cfg = currentConfig.data.data || {};

      await api.post("/ai-integration/config?context=coding", {
        provider,
        model: selectedModels[provider],
        openaiApiKey: cfg.openaiApiKey ?? "",
        groqApiKey: cfg.groqApiKey ?? "",
        openRouterApiKey: cfg.openRouterApiKey ?? "",
        googleApiKey: cfg.googleApiKey ?? "",
        deepseekApiKey: cfg.deepseekApiKey ?? "",
      });

      setActiveProvider(provider);
      const modelLabel = selectedModels[provider] || provider;
      void runModelTest(modelLabel);
      showSuccess(`Active provider updated to ${provider}`);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update active provider");
    } finally {
      setSavingActive(false);
    }
  };

  const handleConfirmDelete = () => {
    const provider = deleteDialog.provider;
    if (!provider) return;
    setKeys((p) => ({ ...p, [provider]: "" }));
    setUnsaved((p) => ({ ...p, [provider]: true }));
    setAvailableModels((p) => ({ ...p, [provider]: [] }));
    setSelectedModels((p) => ({ ...p, [provider]: "" }));
    setDeleteDialog({ open: false, provider: null });
  };

  const handleSaveKeyClick = async (provider: Provider) => {
    const key = keys[provider];
    if (!key) return;

    setTestingKey(provider);
    setError(null);

    try {
      const res = await api.post("/ai-integration/test-key", { provider, apiKey: key });
      const result = res.data.data as { success: boolean; message: string };
      if (result.success) {
        setTestedProviders((p) => ({ ...p, [provider]: "pass" }));
        await handleSaveKeyDirect(provider, key);
      } else {
        setTestedProviders((p) => ({ ...p, [provider]: "fail" }));
        setError(result.message || "Key test failed");
      }
    } catch (err: any) {
      setTestedProviders((p) => ({ ...p, [provider]: "fail" }));
      setError(err.response?.data?.message || "Failed to test key");
    } finally {
      setTestingKey(null);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-background">
      {/* Header bar */}
      <div className="border-b-2 border-border bg-card">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-7 items-center justify-center rounded-md bg-foreground">
              <CpuIcon className="size-4 text-background" />
            </div>
            <span className="text-sm font-semibold text-foreground">Settings</span>
            <span className="text-muted-foreground text-sm">/</span>
            <span className="text-sm text-muted-foreground">LLM Settings</span>
          </div>
          {configuredCount > 0 && (
            <Badge variant="secondary" className="gap-1.5 text-xs font-medium">
              <CircleIcon className="size-1.5 fill-current" />
              {configuredCount} provider{configuredCount !== 1 ? "s" : ""} configured
            </Badge>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">LLM Settings</h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-xl">
            Connect your own LLM provider key. Abigail uses it for Layer 1 specialist execution —
            code writing, review, and testing. Keys are AES-256-GCM encrypted at rest.
          </p>
        </div>

        {/* Notifications */}
        <div className="space-y-3 mb-8">
          {success && (
            <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm">
              <CheckCircle2Icon className="size-4 mt-0.5 shrink-0 text-foreground" />
              <p className="text-foreground">{success}</p>
            </div>
          )}
          {error && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm">
              <AlertTriangleIcon className="size-4 mt-0.5 shrink-0 text-destructive" />
              <p className="text-destructive">{error}</p>
            </div>
          )}
        </div>

        {/* Model test result banner */}
        {modelTest.state !== "idle" && (
          <div className={cn(
            "mb-6 flex items-start gap-3 rounded-xl border-2 px-5 py-4",
            modelTest.state === "testing" && "border-border bg-muted/30",
            modelTest.state === "pass" && "border-foreground/20 bg-foreground/5",
            modelTest.state === "fail" && "border-destructive/30 bg-destructive/10",
          )}>
            {modelTest.state === "testing" && (
              <Loader2Icon className="size-5 animate-spin text-muted-foreground shrink-0 mt-0.5" />
            )}
            {modelTest.state === "pass" && (
              <CheckCircle2Icon className="size-5 text-foreground shrink-0 mt-0.5" />
            )}
            {modelTest.state === "fail" && (
              <AlertTriangleIcon className="size-5 text-destructive shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              {modelTest.state === "testing" && (
                <>
                  <p className="text-sm font-medium text-foreground">Testing model…</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Sending a test message to <span className="font-mono">{modelTest.modelName}</span>
                  </p>
                </>
              )}
              {modelTest.state === "pass" && (
                <>
                  <p className="text-sm font-medium text-foreground">
                    Model verified — {modelTest.modelName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Responded in {modelTest.latencyMs}ms. You&apos;re all set!
                    {returnTo && " Redirecting…"}
                  </p>
                </>
              )}
              {modelTest.state === "fail" && (
                <>
                  <p className="text-sm font-medium text-destructive">Model test failed</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{modelTest.message}</p>
                </>
              )}
            </div>
            {modelTest.state === "pass" && returnTo && (
              <Button size="sm" onClick={() => router.push(returnTo)}>
                Continue →
              </Button>
            )}
            {modelTest.state !== "testing" && (
              <button
                onClick={() => setModelTest({ state: "idle", message: "", latencyMs: 0, modelName: "" })}
                className="text-muted-foreground hover:text-foreground shrink-0"
              >
                <XIcon className="size-4" />
              </button>
            )}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          {/* Left */}
          <div className="space-y-6">
            {/* API Keys + Model card */}
            <div className="rounded-xl border-2 border-border bg-card overflow-hidden">
              <div className="px-6 py-4 border-b-2 border-border flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-md border border-border bg-muted">
                  <KeyRoundIcon className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <h2 className="text-[15px] font-semibold text-foreground leading-none mb-1">
                    Provider API Keys
                  </h2>
                  <p className="text-[13px] text-muted-foreground">
                    Save a key, pick a model, then set it as active
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-[200px_1fr]">
                {/* Provider tabs */}
                <div className="border-r-2 border-border bg-muted/20 p-3 flex flex-col gap-1">
                  {PROVIDERS.map((p) => {
                    const PIcon = p.icon;
                    const isActive = activeTab === p.id;
                    const isConfigured = savedKeys[p.id];
                    const isCurrentActive = activeProvider === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setActiveTab(p.id)}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left",
                          isActive
                            ? "bg-background border border-border text-foreground"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                        )}
                      >
                        <PIcon className="size-4 shrink-0" />
                        <span className="flex-1 truncate">{p.name}</span>
                        {isCurrentActive && (
                          <CheckCircle2Icon className="size-3.5 text-foreground shrink-0" />
                        )}
                        {!isCurrentActive && isConfigured && (
                          <span className="size-1.5 rounded-full bg-foreground shrink-0" />
                        )}
                        {!isConfigured && unsaved[p.id] && (
                          <span className="size-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Key form */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-xl bg-muted">
                        <current.icon className="size-5 text-foreground" />
                      </div>
                      <h3 className="text-base font-semibold text-foreground">{current.name}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {activeProvider === current.id && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <CheckCircle2Icon className="size-3" />
                          Active
                        </Badge>
                      )}
                      {savedKeys[current.id] && activeProvider !== current.id && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          Saved
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Key input */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground flex items-center justify-between">
                        API Key
                        <a
                          href={current.docsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                        >
                          Get key <ExternalLinkIcon className="size-3" />
                        </a>
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            type={showKey[current.id] ? "text" : "password"}
                            placeholder={current.keyPlaceholder}
                            value={keys[current.id]}
                            onChange={(e) => handleKeyChange(current.id, e.target.value)}
                            className="pr-10 font-mono text-sm h-10"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowKey((p) => ({ ...p, [current.id]: !p[current.id] }))
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showKey[current.id] ? (
                              <EyeOffIcon className="size-4" />
                            ) : (
                              <EyeIcon className="size-4" />
                            )}
                          </button>
                        </div>
                        {keys[current.id] && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setDeleteDialog({ open: true, provider: current.id })}
                            className="h-10 w-10 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          >
                            <TrashIcon className="size-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Model selector — ALWAYS SHOWN */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground flex items-center justify-between">
                        Model
                        {savedKeys[current.id] && (
                          <button
                            onClick={() => void fetchModels(current.id)}
                            disabled={fetchingModels === current.id}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                          >
                            <RefreshCwIcon
                              className={cn(
                                "size-3",
                                fetchingModels === current.id && "animate-spin",
                              )}
                            />
                            {fetchingModels === current.id ? "Loading..." : "Refresh models"}
                          </button>
                        )}
                      </label>

                      {availableModels[current.id]?.length > 0 ? (
                        <Select
                          value={selectedModels[current.id]}
                          onValueChange={(v) =>
                            setSelectedModels((p) => ({ ...p, [current.id]: v }))
                          }
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select a model..." />
                          </SelectTrigger>
                          <SelectContent className="max-h-64">
                            {availableModels[current.id].map((m) => (
                              <SelectItem key={m.value} value={m.value}>
                                {m.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-border bg-muted/30 text-sm text-muted-foreground">
                          {fetchingModels === current.id ? (
                            <>
                              <Loader2Icon className="size-3.5 animate-spin" />
                              Fetching available models...
                            </>
                          ) : (
                            <>
                              <RefreshCwIcon className="size-3.5" />
                              Click refresh to load models
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="space-y-3 pt-2">
                      {(!savedKeys[current.id] || unsaved[current.id]) && (
                        <div className="flex items-center gap-3">
                          <Button
                            onClick={() => void handleSaveKeyClick(current.id)}
                            disabled={
                              !keys[current.id] ||
                              testingKey === current.id ||
                              savingKey === current.id
                            }
                            variant={unsaved[current.id] ? "default" : "outline"}
                            className="flex-1"
                          >
                            {testingKey === current.id ? (
                              <>
                                <Loader2Icon className="size-4 mr-2 animate-spin" />
                                Testing key...
                              </>
                            ) : savingKey === current.id ? (
                              <>
                                <Loader2Icon className="size-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <ZapIcon className="size-4 mr-2" />
                                {savedKeys[current.id]
                                  ? "Test & Update Key"
                                  : "Test & Save Key"}
                              </>
                            )}
                          </Button>
                          {unsaved[current.id] && testingKey !== current.id && (
                            <span className="text-xs text-muted-foreground">Unsaved changes</span>
                          )}
                        </div>
                      )}

                      {savedKeys[current.id] && !unsaved[current.id] && (
                        <Button
                          onClick={() => void handleSetActiveDirect(current.id)}
                          disabled={!selectedModels[current.id] || savingActive}
                          className="w-full"
                          variant={activeProvider === current.id ? "outline" : "default"}
                        >
                          {savingActive ? (
                            <>
                              <Loader2Icon className="size-4 mr-2 animate-spin" />
                              Setting active...
                            </>
                          ) : activeProvider === current.id ? (
                            <>
                              <CheckCircle2Icon className="size-4 mr-2" />
                              Active — update model
                            </>
                          ) : (
                            <>
                              <ShieldCheckIcon className="size-4 mr-2" />
                              Set as Active Provider
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

          {/* All Available Models */}
          <div className="rounded-xl border-2 border-border bg-card overflow-hidden">
            <div className="px-6 py-4 border-b-2 border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-md border border-border bg-muted">
                  <LayersIcon className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <h2 className="text-[15px] font-semibold text-foreground leading-none mb-1">
                    All Available Models
                  </h2>
                  <p className="text-[13px] text-muted-foreground">
                    {loadingAllModels
                      ? "Loading catalog..."
                      : `${allModels.length} models from ${uniqueProviders.length} providers`}
                  </p>
                </div>
              </div>
              {loadingAllModels && <Loader2Icon className="size-4 animate-spin text-muted-foreground" />}
            </div>

            <div className="p-5 space-y-4">
              {/* Search + filters row */}
              <div className="flex gap-2 flex-wrap">
                <div className="relative flex-1 min-w-48">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search by name or ID..."
                    value={modelSearch}
                    onChange={(e) => setModelSearch(e.target.value)}
                    className="pl-8 h-9 text-sm"
                  />
                  {modelSearch && (
                    <button
                      onClick={() => setModelSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <XIcon className="size-3.5" />
                    </button>
                  )}
                </div>
                <Select value={providerFilter} onValueChange={(v) => setProviderFilter(v ?? "all")}>
                  <SelectTrigger className="h-9 w-44 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="all">All providers</SelectItem>
                    {uniqueProviders.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  onClick={() => setShowFreeOnly((v) => !v)}
                  className={cn(
                    "h-9 px-3 rounded-md border text-xs font-medium transition-colors",
                    showFreeOnly
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/50",
                  )}
                >
                  Free only
                </button>
              </div>

              {/* Stats bar */}
              <p className="text-xs text-muted-foreground">
                {filteredModels.length === allModels.length
                  ? `${allModels.length} models`
                  : `${filteredModels.length} of ${allModels.length} models`}
                {providerFilter !== "all" && ` · ${providerFilter}`}
              </p>

              {/* Model list */}
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="max-h-[480px] overflow-y-auto">
                  {loadingAllModels ? (
                    <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                      <Loader2Icon className="size-4 animate-spin" />
                      Fetching models from all providers...
                    </div>
                  ) : groupedModels.length === 0 ? (
                    <div className="py-16 text-center text-sm text-muted-foreground">
                      No models match your search
                    </div>
                  ) : (
                    groupedModels.map(([provider, models]) => (
                      <div key={provider}>
                        {/* Provider group header */}
                        <div className="sticky top-0 z-10 px-4 py-2 bg-muted/80 backdrop-blur-sm border-b border-border flex items-center gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {provider}
                          </span>
                          <span className="text-xs text-muted-foreground/50">
                            {models.length}
                          </span>
                        </div>
                        {/* Model rows */}
                        {models.map((m) => {
                          const isSelected = selectedGlobalModel?.id === m.id;
                          return (
                            <button
                              key={m.id}
                              onClick={() =>
                                setSelectedGlobalModel(isSelected ? null : m)
                              }
                              className={cn(
                                "w-full flex items-center gap-3 px-4 py-2.5 text-left border-b border-border/40 last:border-0 transition-colors",
                                isSelected
                                  ? "bg-foreground/5 ring-1 ring-inset ring-foreground/20"
                                  : "hover:bg-muted/30",
                              )}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium text-foreground truncate">
                                    {m.name}
                                  </span>
                                  {m.isFree && (
                                    <Badge
                                      variant="secondary"
                                      className="text-[10px] px-1.5 py-0 h-4 shrink-0"
                                    >
                                      Free
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-[11px] text-muted-foreground font-mono truncate block">
                                  {m.id}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
                                {m.contextLength > 0 && (
                                  <span className="tabular-nums">
                                    {formatContext(m.contextLength)}
                                  </span>
                                )}
                                {!m.isFree && (
                                  <span className="tabular-nums">
                                    {formatPrice(m.promptPrice)} in
                                  </span>
                                )}
                              </div>
                              {isSelected && (
                                <CheckCircle2Icon className="size-4 shrink-0 text-foreground" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Selected model + set active */}
              <SelectedModelBar
                model={selectedGlobalModel}
                savedKeys={savedKeys}
                savingActive={savingActive}
                onSetActive={(model, resolved) =>
                  setGlobalSetActiveDialog({ open: true, model, resolved })
                }
              />
            </div>
          </div>
          </div>

          {/* Right */}
          <div className="space-y-5">
            <div className="rounded-xl border-2 border-border bg-muted/30 p-5">
              <div className="flex items-center gap-2 mb-3">
                <InfoIcon className="size-3.5 text-muted-foreground shrink-0" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  How this works
                </h3>
              </div>
              <div className="space-y-3 text-[13px] text-muted-foreground leading-relaxed">
                <p>
                  <span className="font-medium text-foreground">Layer 1</span> — your key powers
                  all specialist task execution. Abigail never uses it for its own internal
                  reasoning.
                </p>
                <p>
                  <span className="font-medium text-foreground">Layer 2</span> — DiveSeeks pays
                  for internal brain work (DeepSeek + Gemini). You never see that cost.
                </p>
                <p>
                  <span className="font-medium text-foreground">~40% of requests</span> resolve at
                  zero LLM cost via parametric weights and rules engine before your key is called.
                </p>
              </div>
            </div>

            <div className="rounded-xl border-2 border-border bg-card p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Specialists using your key
              </h3>
              <div className="space-y-2">
                {[
                  { name: "Rex", role: "Backend engineer" },
                  { name: "Nova", role: "Frontend engineer" },
                  { name: "Kai", role: "Code reviewer" },
                  { name: "Sage", role: "Test engineer" },
                  { name: "Luma", role: "Documentation" },
                ].map((s) => (
                  <div key={s.name} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{s.name}</span>
                    <span className="text-xs text-muted-foreground">{s.role}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border-2 border-border bg-card p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Security
              </h3>
              <ul className="space-y-2 text-[13px] text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2Icon className="size-3.5 mt-0.5 shrink-0 text-foreground" />
                  AES-256-GCM encrypted at rest
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2Icon className="size-3.5 mt-0.5 shrink-0 text-foreground" />
                  Only last 8 chars shown in UI
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2Icon className="size-3.5 mt-0.5 shrink-0 text-foreground" />
                  Never sent to third parties
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2Icon className="size-3.5 mt-0.5 shrink-0 text-foreground" />
                  Per-tenant key derivation
                </li>
              </ul>
            </div>

            <div className="rounded-xl border-2 border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Hermes Agent
                </h3>
                <div className="flex items-center gap-2">
                  {hermesSaving && <Loader2Icon className="size-3.5 animate-spin text-muted-foreground" />}
                  <Switch
                    checked={hermesEnabled}
                    onCheckedChange={(checked) => void handleHermesToggle(checked)}
                    disabled={hermesSaving}
                  />
                </div>
              </div>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                Run specialist tasks on a dedicated self-improving Hermes agent in an isolated
                container. It learns skills from your tasks over time and uses your API key above.
                Falls back to the standard executor automatically when unavailable.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <CircleIcon
                  className={cn(
                    "size-2 fill-current",
                    hermesStatus === "running" ? "text-green-500" : "text-muted-foreground/50",
                  )}
                />
                <span className="text-xs text-muted-foreground capitalize">
                  Container: {hermesStatus}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* Delete key dialog */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(o) => setDeleteDialog({ open: o, provider: deleteDialog.provider })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <AlertTriangleIcon className="text-destructive" />
            </AlertDialogMedia>
            <AlertDialogTitle>Clear API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear your{" "}
              <strong>{PROVIDERS.find((p) => p.id === deleteDialog.provider)?.name}</strong> key.
              You will need to save it again to use this provider.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Global model set-active dialog */}
      <AlertDialog
        open={globalSetActiveDialog.open}
        onOpenChange={(o) =>
          setGlobalSetActiveDialog({
            open: o,
            model: globalSetActiveDialog.model,
            resolved: globalSetActiveDialog.resolved,
          })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <LayersIcon className="text-foreground" />
            </AlertDialogMedia>
            <AlertDialogTitle>Set Active Model?</AlertDialogTitle>
            <AlertDialogDescription>
              All Layer 1 specialists will use{" "}
              <strong>{globalSetActiveDialog.model?.name}</strong> via{" "}
              <strong>{globalSetActiveDialog.resolved?.provider}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleSetActiveGlobal()}>
              Set Active
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
