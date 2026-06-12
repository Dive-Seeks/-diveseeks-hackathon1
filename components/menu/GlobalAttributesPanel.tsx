"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AttributeBadge } from "@/components/menu/AttributeBadge";
import { useMenuWizardStore } from "@/hooks/use-menu-wizard";
import menuGlobalAttributes from "@/docs/Menus/menu_global_attributes.json";

type AttrOption = { id: string; label: string; icon?: string };
type AttrGroup = { label: string; options: AttrOption[] };

const ATTRIBUTE_GROUPS: Record<string, AttrGroup> = {
  dietary_type: {
    label: "Dietary Type",
    options: menuGlobalAttributes.menu_global_attributes.dietary_type.options,
  },
  allergens: {
    label: "Allergens",
    options: menuGlobalAttributes.menu_global_attributes.allergens.options.map(
      (o) => ({ ...o, icon: "⚠️" })
    ),
  },
  spice_level: {
    label: "Spice Level",
    options: menuGlobalAttributes.menu_global_attributes.spice_level.options,
  },
  meal_type: {
    label: "Meal Type",
    options: menuGlobalAttributes.menu_global_attributes.meal_type.options.map(
      (o) => ({ ...o, icon: "🍽️" })
    ),
  },
  preparation_method: {
    label: "Prep Method",
    options:
      menuGlobalAttributes.menu_global_attributes.preparation_method.options.map(
        (o) => ({ ...o, icon: "🔧" })
      ),
  },
};

export function GlobalAttributesPanel() {
  const { globalAttributes, setGlobalAttribute, clearGlobalAttribute } =
    useMenuWizardStore();
  const [isExpanded, setIsExpanded] = React.useState(true);
  const [activeGroup, setActiveGroup] = React.useState<string | null>(null);

  const hasAttributes = Object.keys(globalAttributes).length > 0;

  const getOption = (key: string, value: string): AttrOption | undefined =>
    ATTRIBUTE_GROUPS[key]?.options.find((o) => o.id === value);

  return (
    <div className="rounded-xl border border-border bg-muted/20 mb-4 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted transition-colors"
      >
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Global Menu Attributes</span>
          {hasAttributes && (
            <Badge
              variant="outline"
              className="text-[10px] bg-muted border-border text-foreground"
            >
              {Object.keys(globalAttributes).length} set
            </Badge>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 animate-in fade-in duration-200">
          <p className="text-xs text-muted-foreground">
            These attributes apply to <strong>all items</strong> in your menu.
            Items can override them individually.
          </p>

          {hasAttributes && (
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(globalAttributes).map(([key, value]) => {
                const opt = getOption(key, value);
                return (
                  <AttributeBadge
                    key={key}
                    icon={opt?.icon ?? "🏷️"}
                    label={opt?.label ?? value}
                    selected
                    removable
                    onRemove={() => clearGlobalAttribute(key)}
                  />
                );
              })}
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {Object.entries(ATTRIBUTE_GROUPS).map(([key, group]) => (
              <Button
                key={key}
                variant="outline"
                size="sm"
                className={cn(
                  "h-7 text-[11px] rounded-full border-dashed",
                  activeGroup === key
                    ? "border-foreground/50 bg-muted text-foreground"
                    : "text-muted-foreground"
                )}
                onClick={() =>
                  setActiveGroup(activeGroup === key ? null : key)
                }
              >
                + {group.label}
              </Button>
            ))}
          </div>

          {activeGroup && ATTRIBUTE_GROUPS[activeGroup] && (
            <div className="flex flex-wrap gap-1.5 p-3 rounded-lg bg-muted/30 border border-border/40 animate-in fade-in duration-150">
              {ATTRIBUTE_GROUPS[activeGroup].options.map((opt) => (
                <AttributeBadge
                  key={opt.id}
                  icon={opt.icon ?? "🏷️"}
                  label={opt.label}
                  selected={globalAttributes[activeGroup] === opt.id}
                  onClick={() => {
                    if (globalAttributes[activeGroup] === opt.id) {
                      clearGlobalAttribute(activeGroup);
                    } else {
                      setGlobalAttribute(activeGroup, opt.id);
                    }
                    setActiveGroup(null);
                  }}
                />
              ))}
            </div>
          )}

          {!hasAttributes && !activeGroup && (
            <p className="text-xs text-muted-foreground/60 italic">
              No global attributes set. Click + to add, or tell Abigail: &quot;my
              full menu is halal&quot;
            </p>
          )}
        </div>
      )}
    </div>
  );
}
