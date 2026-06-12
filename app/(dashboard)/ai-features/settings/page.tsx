"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/lib/auth-store";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  BotIcon,
  CheckCircle2Icon,
  KeyRoundIcon,
  SparklesIcon,
  AlertTriangleIcon,
  Loader2Icon,
  ZapIcon,
  GlobeIcon,
  ExternalLinkIcon,
  MegaphoneIcon,
  TrendingUpIcon,
  ShieldCheckIcon,
  CpuIcon,
  CircleIcon,
  EyeIcon,
  EyeOffIcon,
  TrashIcon,
  SaveIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";

type Provider = "openai" | "groq" | "openrouter" | "google";

const PROVIDERS = [
  {
    id: "google" as Provider,
    name: "Google Gemini",
    description: "",
    keyPrefix: "AIza",
    keyPlaceholder: "AIza...",
    docsUrl: "https://aistudio.google.com/app/apikey",
    docsLabel: "aistudio.google.com",
    models: [
      { value: "gemini-flash-latest", label: "Gemini Flash (Stable)", tag: "Recommended" },
      { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro", tag: "Best" },
    ],
    icon: SparklesIcon,
    color: "text-foreground",
    bg: "bg-muted",
    dot: "bg-foreground",
  },
  {
    id: "openrouter" as Provider,
    name: "OpenRouter",
    description: "200+ models from one API key",
    keyPrefix: "sk-or-",
    keyPlaceholder: "sk-or-...",
    docsUrl: "https://openrouter.ai/keys",
    docsLabel: "openrouter.ai",
    models: [
      { value: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet", tag: null },
      { value: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B", tag: null },
      { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", tag: null },
      { value: "deepseek/deepseek-chat", label: "DeepSeek Chat", tag: null },
      { value: "openai/gpt-4o", label: "GPT-4o via OpenRouter", tag: null },
    ],
    icon: GlobeIcon,
    color: "text-foreground",
    bg: "bg-muted",
    dot: "bg-foreground",
  },
  {
    id: "openai" as Provider,
    name: "OpenAI",
    description: "",
    keyPrefix: "sk-",
    keyPlaceholder: "sk-proj-...",
    docsUrl: "https://platform.openai.com/api-keys",
    docsLabel: "platform.openai.com",
    models: [
      { value: "gpt-4o", label: "GPT-4o", tag: "Recommended" },
      { value: "gpt-4o-mini", label: "GPT-4o Mini", tag: "Faster" },
      { value: "gpt-4-turbo", label: "GPT-4 Turbo", tag: null },
      { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo", tag: "Budget" },
    ],
    icon: BotIcon,
    color: "text-foreground",
    bg: "bg-muted",
    dot: "bg-foreground",
  },
  {
    id: "groq" as Provider,
    name: "Groq",
    description: "",
    keyPrefix: "gsk_",
    keyPlaceholder: "gsk_...",
    docsUrl: "https://console.groq.com/keys",
    docsLabel: "console.groq.com",
    models: [
      { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B", tag: "Best" },
      { value: "llama-3.1-8b-instant", label: "Llama 3.1 8B", tag: "Instant" },
      { value: "mixtral-8x7b-32768", label: "Mixtral 8x7B", tag: null },
      { value: "gemma2-9b-it", label: "Gemma 2 9B", tag: null },
    ],
    icon: ZapIcon,
    color: "text-foreground",
    bg: "bg-muted",
    dot: "bg-foreground",
  },
];

const FEATURES = [
  {
    icon: BotIcon,
    title: "General Assistant",
    desc: "Ask anything about your business operations and get intelligent answers.",
  },
  {
    icon: MegaphoneIcon,
    title: "Marketing Builder",
    desc: "Generate ads, landing pages, and copy tailored to your brand.",
  },
  {
    icon: TrendingUpIcon,
    title: "Store Analytics",
    desc: "AI-powered insights from your sales data and performance metrics.",
  },
];

export default function AiSettingsPage() {
  const { accessToken } = useAuthStore();

  const [activeTab, setActiveTab] = useState<Provider>("google");
  const [selectedProvider, setSelectedProvider] = useState<Provider>("google");
  const [keys, setKeys] = useState<Record<Provider, string>>({
    openai: "",
    groq: "",
    openrouter: "",
    google: "",
  });
  const [savedKeys, setSavedKeys] = useState<Record<Provider, boolean>>({
    openai: false,
    groq: false,
    openrouter: false,
    google: false,
  });

  // Track unsaved changes per provider
  const [unsavedChanges, setUnsavedChanges] = useState<Record<Provider, boolean>>({
    openai: false,
    groq: false,
    openrouter: false,
    google: false,
  });

  // Individual provider save states
  const [savingProvider, setSavingProvider] = useState<Provider | null>(null);
  const [savingActiveProvider, setSavingActiveProvider] = useState(false);

  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showKeys, setShowKeys] = useState<Record<Provider, boolean>>({
    openai: false,
    groq: false,
    openrouter: false,
    google: false,
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [providerToDelete, setProviderToDelete] = useState<Provider | null>(null);
  const [saveKeyDialogOpen, setSaveKeyDialogOpen] = useState(false);
  const [providerToSave, setProviderToSave] = useState<Provider | null>(null);
  const [saveActiveDialogOpen, setSaveActiveDialogOpen] = useState(false);

  const currentProvider = PROVIDERS.find((p) => p.id === activeTab)!;

  // Load existing AI config for the current user
  useEffect(() => {
    if (!accessToken) return;

    api.get("/ai-integration/config")
      .then((res) => {
        const data = res.data.data;
        if (data && data.configured) {
          setSelectedProvider(data.provider ?? "google");
          setActiveTab(data.provider ?? "google");
          setSavedKeys({
            openai: !!data.hasOpenai,
            groq: !!data.hasGroq,
            openrouter: !!data.hasOpenRouter,
            google: !!data.hasGoogle,
          });
          setKeys({
            openai: data.openaiApiKey || "",
            groq: data.groqApiKey || "",
            openrouter: data.openRouterApiKey || "",
            google: data.googleApiKey || "",
          });
        }
      })
      .catch((err) => {
        console.error("Failed to load AI config:", err);
        setError(err.response?.data?.message || err.message || "Failed to load configuration");
      });
  }, [accessToken]);

  const handleKeyChange = (provider: Provider, value: string) => {
    setKeys((prev) => ({ ...prev, [provider]: value }));
    // Mark as unsaved if different from saved state
    setUnsavedChanges((prev) => ({ ...prev, [provider]: true }));
  };

  const handleDeleteKey = (provider: Provider) => {
    setProviderToDelete(provider);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteKey = () => {
    if (providerToDelete) {
      setKeys((prev) => ({ ...prev, [providerToDelete]: "" }));
      setUnsavedChanges((prev) => ({ ...prev, [providerToDelete]: true }));
      setDeleteDialogOpen(false);
      setProviderToDelete(null);
    }
  };

  const handleSaveKeyClick = (provider: Provider) => {
    const currentKey = keys[provider];
    const providerConfig = PROVIDERS.find((p) => p.id === provider)!;

    if (currentKey && !currentKey.startsWith(providerConfig.keyPrefix)) {
      setError(
        `Invalid key for ${providerConfig.name}. It should start with "${providerConfig.keyPrefix}".`
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setError(null);
    setProviderToSave(provider);
    setSaveKeyDialogOpen(true);
  };

  const saveProviderKey = async () => {
    if (!providerToSave) return;

    setSaveKeyDialogOpen(false);
    setSavingProvider(providerToSave);

    try {
      // Get current config to preserve other settings
      const currentConfigRes = await api.get("/ai-integration/config");
      const currentConfig = currentConfigRes.data.data || {};

      const providerConfig = PROVIDERS.find((p) => p.id === providerToSave)!;
      const defaultModel = providerConfig.models[0].value;

      // Build the body with current provider/model and updated key
      const body: Record<string, string> = {
        provider: currentConfig.configured ? (currentConfig.provider || selectedProvider) : selectedProvider,
        model: currentConfig.configured ? (currentConfig.model || defaultModel) : defaultModel,
      };

      // Set all keys:
      // 1. If we're saving this provider, use the key from local state
      // 2. Otherwise, if we have it in currentConfig (backend), use that
      // 3. Otherwise, use an empty string
      body.openaiApiKey = providerToSave === "openai" ? keys.openai : (currentConfig.openaiApiKey ?? "");
      body.groqApiKey = providerToSave === "groq" ? keys.groq : (currentConfig.groqApiKey ?? "");
      body.openRouterApiKey = providerToSave === "openrouter" ? keys.openrouter : (currentConfig.openRouterApiKey ?? "");
      body.googleApiKey = providerToSave === "google" ? keys.google : (currentConfig.googleApiKey ?? "");

      const res = await api.post("/ai-integration/config", body);

      setSavedKeys((prev) => ({
        ...prev,
        [providerToSave]: !!keys[providerToSave],
      }));
      setUnsavedChanges((prev) => ({ ...prev, [providerToSave]: false }));
      setSaveSuccess(`${providerConfig.name} API key saved successfully`);
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to save. Please try again.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSavingProvider(null);
      setProviderToSave(null);
    }
  };

  const handleSaveActiveProviderClick = () => {
    // Check if the selected provider has a saved key
    if (!savedKeys[selectedProvider]) {
      setError(
        `Please save an API key for ${PROVIDERS.find((p) => p.id === selectedProvider)?.name} before setting it as active.`
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setError(null);
    setSaveActiveDialogOpen(true);
  };

  const saveActiveProvider = async () => {
    setSaveActiveDialogOpen(false);
    setSavingActiveProvider(true);

    try {
      // Get current config to preserve keys
      const currentConfigRes = await api.get("/ai-integration/config");
      const currentConfig = currentConfigRes.data.data || {};

      const providerConfig = PROVIDERS.find((p) => p.id === selectedProvider)!;
      const defaultModel = providerConfig.models[0].value;

      // Only update provider and model, preserve all keys from currentConfig
      const body: Record<string, string> = {
        provider: selectedProvider,
        model: defaultModel,
        openaiApiKey: currentConfig.openaiApiKey ?? "",
        groqApiKey: currentConfig.groqApiKey ?? "",
        openRouterApiKey: currentConfig.openRouterApiKey ?? "",
        googleApiKey: currentConfig.googleApiKey ?? "",
      };

      const res = await api.post("/ai-integration/config", body);

      setSaveSuccess(`Active provider set to ${providerConfig.name}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to save. Please try again.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSavingActiveProvider(false);
    }
  };

  const configuredCount = Object.values(savedKeys).filter(Boolean).length;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-background font-sans">
      {/* Top bar */}
      <div className="border-b-2 border-border bg-card">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-7 items-center justify-center rounded-md bg-foreground">
              <CpuIcon className="size-4 text-background" />
            </div>
            <span className="text-sm font-semibold text-foreground">Settings</span>
            <span className="text-muted-foreground text-sm">/</span>
            <span className="text-sm text-muted-foreground">AI Integration</span>
          </div>
          <div className="flex items-center gap-2">
            {configuredCount > 0 && (
              <Badge
                variant="secondary"
                className="gap-1.5 text-xs font-medium bg-muted text-foreground border-border"
              >
                <CircleIcon className="size-1.5 fill-current text-current" />
                {configuredCount} provider{configuredCount !== 1 ? "s" : ""} configured
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Page header */}
        <div className="mb-10">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">
            AI Integration
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground text-pretty max-w-xl">
            Connect AI providers to power marketing generation, store analytics, and your
            business assistant. Keys are encrypted and stored securely for your account.
          </p>
        </div>

        {/* Toast notifications */}
        <div className="space-y-3 mb-8">
          {saveSuccess && (
            <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm text-foreground">
              <CheckCircle2Icon className="size-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Success</p>
                <p className="opacity-80 mt-0.5">{saveSuccess}</p>
              </div>
            </div>
          )}
          {error && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertTriangleIcon className="size-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Error</p>
                <p className="opacity-80 mt-0.5">{error}</p>
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
          {/* Left column */}
          <div className="space-y-6">
            {/* API Keys card */}
            <div className="rounded-xl border-2 border-border bg-card overflow-hidden">
              <div className="px-6 py-5 border-b-2 border-border flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-md border border-border bg-muted">
                  <KeyRoundIcon className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <h2 className="text-[15px] font-semibold text-foreground leading-none mb-1">
                    API Configuration
                  </h2>
                  <p className="text-[13px] text-muted-foreground">
                    Save API keys individually for each provider
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-[220px_1fr]">
                {/* Provider sidebar */}
                <div className="border-r-2 border-border bg-muted/20 p-3 flex flex-col gap-1">
                  {PROVIDERS.map((p) => {
                    const PIcon = p.icon;
                    const isActive = activeTab === p.id;
                    const isConfigured = savedKeys[p.id];
                    const hasUnsaved = unsavedChanges[p.id];

                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          setActiveTab(p.id);
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left group",
                          isActive
                            ? "bg-background border border-border text-foreground"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        )}
                      >
                        <div
                          className={cn(
                            "flex size-6 items-center justify-center rounded-md shrink-0 transition-colors",
                            isActive ? p.bg : "bg-muted group-hover:bg-background"
                          )}
                        >
                          <PIcon className={cn("size-3.5", isActive ? p.color : "")} />
                        </div>
                        <span className="flex-1 truncate">{p.name}</span>
                        {hasUnsaved && !isConfigured && (
                          <div className="size-1.5 rounded-full shrink-0 bg-foreground/40" title="Unsaved changes" />
                        )}
                        {isConfigured && (
                          <div className={cn("size-1.5 rounded-full shrink-0", p.dot)} title="Configured" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Configuration form */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex size-10 items-center justify-center rounded-xl shrink-0",
                          currentProvider.bg
                        )}
                      >
                        <currentProvider.icon className={cn("size-5", currentProvider.color)} />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-foreground">
                          {currentProvider.name}
                        </h3>
                        {currentProvider.description && (
                          <p className="text-[13px] text-muted-foreground mt-0.5">
                            {currentProvider.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {savedKeys[currentProvider.id] && (
                      <Badge
                        variant="secondary"
                        className={cn(
                          "gap-1 font-medium border-transparent",
                          currentProvider.bg,
                          currentProvider.color
                        )}
                      >
                        <CheckCircle2Icon className="size-3" />
                        Saved
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-5">
                    {/* API Key Input */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground flex items-center justify-between">
                        API Key
                        <a
                          href={currentProvider.docsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                        >
                          Get key <ExternalLinkIcon className="size-3" />
                        </a>
                      </label>
                      <div className="flex gap-2 relative">
                        <div className="relative flex-1">
                          <Input
                            type={showKeys[currentProvider.id] ? "text" : "password"}
                            placeholder={currentProvider.keyPlaceholder}
                            value={keys[currentProvider.id]}
                            onChange={(e) => handleKeyChange(currentProvider.id, e.target.value)}
                            className="pr-10 bg-background font-mono text-sm h-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowKeys(prev => ({ ...prev, [currentProvider.id]: !prev[currentProvider.id] }))}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showKeys[currentProvider.id] ? (
                              <EyeOffIcon className="size-4" />
                            ) : (
                              <EyeIcon className="size-4" />
                            )}
                          </button>
                        </div>
                        {keys[currentProvider.id] && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDeleteKey(currentProvider.id)}
                            className="shrink-0 h-10 w-10 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                            title="Clear API Key"
                          >
                            <TrashIcon className="size-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Save Key Button */}
                    <div className="flex items-center gap-3 pt-2">
                      <Button
                        onClick={() => handleSaveKeyClick(currentProvider.id)}
                        disabled={!keys[currentProvider.id] || savingProvider === currentProvider.id}
                        className="flex-1"
                        variant={unsavedChanges[currentProvider.id] ? "default" : "outline"}
                      >
                        {savingProvider === currentProvider.id ? (
                          <>
                            <Loader2Icon className="size-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <SaveIcon className="size-4 mr-2" />
                            {savedKeys[currentProvider.id] && !unsavedChanges[currentProvider.id] ? "Update Key" : "Save Key"}
                          </>
                        )}
                      </Button>
                      {unsavedChanges[currentProvider.id] && (
                        <span className="text-xs text-muted-foreground font-medium">
                          Unsaved changes
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Default Provider Card */}
            <div className="rounded-xl border-2 border-border bg-card overflow-hidden">
              <div className="px-6 py-5 border-b-2 border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-md border border-border bg-muted">
                    <ShieldCheckIcon className="size-4 text-muted-foreground" />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-semibold text-foreground leading-none mb-1">
                      Active Provider
                    </h2>
                    <p className="text-[13px] text-muted-foreground">
                      Set which provider to use for AI features
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-end gap-4">
                  <div className="flex-1 space-y-2">
                    <Select
                      value={selectedProvider}
                      onValueChange={(v) => v && setSelectedProvider(v as Provider)}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROVIDERS.map((p) => {
                          const PIcon = p.icon;
                          const isConfigured = savedKeys[p.id];
                          return (
                            <SelectItem key={p.id} value={p.id} disabled={!isConfigured}>
                              <span className="flex items-center gap-2">
                                <PIcon className="size-4 text-muted-foreground" />
                                <span>{p.name}</span>
                                {isConfigured ? (
                                  <span className="ml-2 flex size-1.5 rounded-full bg-foreground" />
                                ) : (
                                  <span className="ml-2 text-xs text-muted-foreground">(not configured)</span>
                                )}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handleSaveActiveProviderClick}
                    disabled={savingActiveProvider || !savedKeys[selectedProvider]}
                    className="h-10 px-6 shrink-0"
                  >
                    {savingActiveProvider ? (
                      <>
                        <Loader2Icon className="size-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Set Active"
                    )}
                  </Button>
                </div>
                {!savedKeys[selectedProvider] && (
                  <p className="text-xs text-muted-foreground mt-3 italic">
                    Please save an API key for this provider before setting it as active.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Features list */}
            <div className="rounded-xl border-2 border-border bg-card p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                What this powers
              </h3>
              <div className="space-y-4">
                {FEATURES.map((f, i) => {
                  const FIcon = f.icon;
                  return (
                    <div key={i} className="flex gap-3">
                      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/50 border border-border">
                        <FIcon className="size-4 text-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground leading-none mb-1">
                          {f.title}
                        </p>
                        <p className="text-[13px] text-muted-foreground leading-relaxed">
                          {f.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Setup Guide */}
            <div className="rounded-xl border-2 border-border bg-muted/30 p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Quick Start
              </h3>
              <ol className="relative border-l border-border ml-2 space-y-4">
                <li className="pl-4">
                  <div className="absolute w-2 h-2 bg-border rounded-full -left-1 top-1.5" />
                  <p className="text-[13px] text-foreground font-medium mb-0.5">
                    1. Get an API Key
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Click the provider tab and follow the Get key link to obtain your API key.
                  </p>
                </li>
                <li className="pl-4">
                  <div className="absolute w-2 h-2 bg-border rounded-full -left-1 top-1.5" />
                  <p className="text-[13px] text-foreground font-medium mb-0.5">
                    2. Save the Key
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Paste your API key and click Save Key to store it securely.
                  </p>
                </li>
                <li className="pl-4">
                  <div className="absolute w-2 h-2 bg-border rounded-full -left-1 top-1.5" />
                  <p className="text-[13px] text-foreground font-medium mb-0.5">
                    3. Set Active Provider
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Choose which provider to use by default in the Active Provider section.
                  </p>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Delete API Key Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <AlertTriangleIcon className="text-destructive" />
            </AlertDialogMedia>
            <AlertDialogTitle>Clear API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              {providerToDelete && (
                <>
                  Are you sure you want to clear your{" "}
                  <strong>{PROVIDERS.find((p) => p.id === providerToDelete)?.name}</strong> API key?
                  You will need to save it again to use this provider.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteKey}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Save Key Confirmation Dialog */}
      <AlertDialog open={saveKeyDialogOpen} onOpenChange={setSaveKeyDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <SaveIcon className="text-primary" />
            </AlertDialogMedia>
            <AlertDialogTitle>Save API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              {providerToSave && (
                <>
                  This will securely save your{" "}
                  <strong>{PROVIDERS.find((p) => p.id === providerToSave)?.name}</strong> API key.
                  The key will be encrypted and stored for your account.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={saveProviderKey}>Save Key</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Set Active Provider Confirmation Dialog */}
      <AlertDialog open={saveActiveDialogOpen} onOpenChange={setSaveActiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <ShieldCheckIcon className="text-primary" />
            </AlertDialogMedia>
            <AlertDialogTitle>Set Active Provider?</AlertDialogTitle>
            <AlertDialogDescription>
              This will set <strong>{PROVIDERS.find((p) => p.id === selectedProvider)?.name}</strong> as
              the default AI provider for all features including General Assistant, Marketing Builder, and Store Analytics.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={saveActiveProvider}>Set Active</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
