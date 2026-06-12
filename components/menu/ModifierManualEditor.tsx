"use client";

import * as React from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getCurrencySymbol } from "@/lib/currency-utils";

// ============ TYPES ============
interface ModifierOption {
  name: string;
  priceModifier: number;
  isDefault: boolean;
}

interface Modifier {
  name: string;
  type: "single_select" | "multi_select";
  required: boolean;
  options: ModifierOption[];
  icon: string;
}

interface ModifierManualEditorProps {
  isOpen: boolean;
  onClose: () => void;
  /** null = Add New modifier, non-null = Edit existing */
  modifier: Modifier | null;
  onSave: (modifier: Modifier) => void;
  currency?: string;
}

const EMPTY_OPTION: ModifierOption = { name: "", priceModifier: 0, isDefault: false };

export function ModifierManualEditor({
  isOpen,
  onClose,
  modifier,
  onSave,
  currency = 'GBP',
}: ModifierManualEditorProps) {
  const isEditing = modifier !== null;

  // Internal form state
  const [name, setName] = React.useState("");
  const [icon, setIcon] = React.useState("🔘");
  const [required, setRequired] = React.useState(false);
  const [type, setType] = React.useState<"single_select" | "multi_select">("single_select");
  const [options, setOptions] = React.useState<ModifierOption[]>([
    { name: "", priceModifier: 0, isDefault: true },
  ]);

  // Reset form when dialog opens / modifier changes
  React.useEffect(() => {
    if (isOpen) {
      if (modifier) {
        setName(modifier.name);
        setIcon(modifier.icon || "🔘");
        setRequired(modifier.required);
        setType(modifier.type);
        setOptions(
          modifier.options.length > 0
            ? modifier.options.map((o) => ({ ...o }))
            : [{ name: "", priceModifier: 0, isDefault: true }]
        );
      } else {
        setName("");
        setIcon("🔘");
        setRequired(false);
        setType("single_select");
        setOptions([{ name: "", priceModifier: 0, isDefault: true }]);
      }
    }
  }, [isOpen, modifier]);

  // Validation
  const canSave =
    name.trim().length > 0 &&
    options.length > 0 &&
    options.some((o) => o.name.trim().length > 0);

  const handleAddOption = () => {
    setOptions((prev) => [...prev, { ...EMPTY_OPTION }]);
  };

  const handleRemoveOption = (idx: number) => {
    setOptions((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      // If the removed option was the only default, assign default to first remaining
      if (next.length > 0 && !next.some((o) => o.isDefault)) {
        next[0].isDefault = true;
      }
      return next;
    });
  };

  const handleOptionChange = (
    idx: number,
    field: keyof ModifierOption,
    value: string | number | boolean
  ) => {
    setOptions((prev) =>
      prev.map((opt, i) => {
        if (i !== idx) {
          // For single_select, clear other defaults when setting a new one
          if (field === "isDefault" && value === true && type === "single_select") {
            return { ...opt, isDefault: false };
          }
          return opt;
        }
        return { ...opt, [field]: value };
      })
    );
  };

  const handleSetDefault = (idx: number) => {
    if (type === "single_select") {
      // Only one default allowed
      setOptions((prev) =>
        prev.map((opt, i) => ({ ...opt, isDefault: i === idx }))
      );
    } else {
      // Toggle for multi_select
      setOptions((prev) =>
        prev.map((opt, i) =>
          i === idx ? { ...opt, isDefault: !opt.isDefault } : opt
        )
      );
    }
  };

  const handleSave = () => {
    if (!canSave) return;

    const validOptions = options.filter((o) => o.name.trim().length > 0);

    // Ensure at least one default exists
    if (!validOptions.some((o) => o.isDefault) && validOptions.length > 0) {
      validOptions[0].isDefault = true;
    }

    onSave({
      name: name.trim(),
      icon: icon || "🔘",
      required,
      type,
      options: validOptions,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Modifier" : "Add Modifier"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update this modifier's name, options, and pricing."
              : "Create a new modifier with custom options and pricing."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-1">
          <div className="space-y-5 py-2">
            {/* ── Basic Info ── */}
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mod-name" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Name
                </Label>
                <Input
                  id="mod-name"
                  placeholder="e.g. Size, Toppings, Sauce"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mod-icon" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Icon
                </Label>
                <Input
                  id="mod-icon"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  maxLength={2}
                  className="w-16 text-center text-lg"
                />
              </div>
            </div>

            {/* ── Required Toggle ── */}
            <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2.5 border">
              <div>
                <Label className="text-sm font-medium">Required</Label>
                <p className="text-xs text-muted-foreground">
                  Customer must select an option
                </p>
              </div>
              <Switch checked={required} onCheckedChange={setRequired} />
            </div>

            {/* ── Type Selector ── */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Selection Type
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType("single_select")}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border-2 px-3 py-3 text-sm font-medium transition-all",
                    type === "single_select"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-muted bg-muted/20 text-muted-foreground hover:bg-muted/40"
                  )}
                >
                  <span className="text-lg">◉</span>
                  <span>Choose One</span>
                  <span className="text-[10px] opacity-70">Single select</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType("multi_select")}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border-2 px-3 py-3 text-sm font-medium transition-all",
                    type === "multi_select"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-muted bg-muted/20 text-muted-foreground hover:bg-muted/40"
                  )}
                >
                  <span className="text-lg">☑</span>
                  <span>Choose Multiple</span>
                  <span className="text-[10px] opacity-70">Multi select</span>
                </button>
              </div>
            </div>

            {/* ── Options List ── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Options ({options.length})
                </Label>
                <Badge variant="outline" className="text-[10px]">
                  {type === "single_select" ? "● = default" : "☑ = defaults"}
                </Badge>
              </div>

              <div className="space-y-2">
                {options.map((opt, idx) => (
                  <div
                    key={idx}
                    className="group flex items-center gap-2 rounded-lg bg-muted/30 border px-2.5 py-2 transition-colors hover:bg-muted/50"
                  >
                    {/* Default toggle */}
                    <button
                      type="button"
                      onClick={() => handleSetDefault(idx)}
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                        type === "single_select" ? "rounded-full" : "rounded-[4px]",
                        opt.isDefault
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30 hover:border-primary/50"
                      )}
                      title={opt.isDefault ? "Default option" : "Set as default"}
                    >
                      {opt.isDefault && (
                        <span className="text-[10px] font-bold">✓</span>
                      )}
                    </button>

                    {/* Option name */}
                    <Input
                      placeholder={`Option ${idx + 1}`}
                      value={opt.name}
                      onChange={(e) =>
                        handleOptionChange(idx, "name", e.target.value)
                      }
                      className="h-8 flex-1 text-sm"
                    />

                    {/* Price modifier */}
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">+</span>
                      <Input
                        type="number"
                        placeholder="0"
                        value={opt.priceModifier || ""}
                        onChange={(e) =>
                          handleOptionChange(
                            idx,
                            "priceModifier",
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="h-8 w-20 text-sm"
                      />
                      <span className="text-[10px] text-muted-foreground w-12 text-right">
                        {getCurrencySymbol(currency)}{(opt.priceModifier / 100).toFixed(2)}
                      </span>
                    </div>

                    {/* Delete */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemoveOption(idx)}
                      disabled={options.length <= 1}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleAddOption}
                className="w-full mt-1"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Option
              </Button>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {isEditing ? "Save Changes" : "Add Modifier"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
