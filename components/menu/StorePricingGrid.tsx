'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, MapPin, RotateCcw, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCurrencySymbol, formatCurrency } from '@/lib/currency-utils';

interface Store {
  id: string;
  name: string;
  location?: string;
  currency?: string;
}

interface ModifierOption {
  id: string;
  name: string;
  priceModifier: number; // Default price in cents
  isDefault?: boolean;
}

interface StorePricing {
  storeId: string;
  priceModifier: number; // Store-specific price in cents
}

interface StorePrice {
  modifierOptionId: string;
  storePrices: StorePricing[];
}

interface StorePricingGridProps {
  options: ModifierOption[];
  stores: Store[];
  storePricing?: StorePrice[]; // Existing store-specific pricing
  onChange: (storePricing: StorePrice[]) => void;
  className?: string;
}

export function StorePricingGrid({
  options,
  stores,
  storePricing = [],
  onChange,
  className,
}: StorePricingGridProps) {
  const [editingCell, setEditingCell] = useState<{
    optionId: string;
    storeId: string;
  } | null>(null);

  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2);
  };

  // Get store-specific price or fall back to default
  const getStorePrice = (optionId: string, storeId: string): number => {
    const optionPricing = storePricing.find(
      (sp) => sp.modifierOptionId === optionId
    );
    if (!optionPricing) {
      const option = options.find((o) => o.id === optionId);
      return option?.priceModifier ?? 0;
    }

    const storePrice = optionPricing.storePrices.find(
      (sp) => sp.storeId === storeId
    );
    if (!storePrice) {
      const option = options.find((o) => o.id === optionId);
      return option?.priceModifier ?? 0;
    }

    return storePrice.priceModifier;
  };

  // Check if store price differs from default
  const isDifferentFromDefault = (optionId: string, storeId: string): boolean => {
    const option = options.find((o) => o.id === optionId);
    if (!option) return false;

    const storePrice = getStorePrice(optionId, storeId);
    return storePrice !== option.priceModifier;
  };

  // Update store-specific price
  const handlePriceChange = (
    optionId: string,
    storeId: string,
    pounds: number
  ) => {
    const cents = Math.round(pounds * 100);

    // Find or create option pricing
    const existingOptionPricing = storePricing.find(
      (sp) => sp.modifierOptionId === optionId
    );

    let updatedStorePricing: StorePrice[];

    if (existingOptionPricing) {
      // Update existing
      updatedStorePricing = storePricing.map((sp) => {
        if (sp.modifierOptionId !== optionId) return sp;

        const existingStorePrice = sp.storePrices.find(
          (p) => p.storeId === storeId
        );

        if (existingStorePrice) {
          // Update existing store price
          return {
            ...sp,
            storePrices: sp.storePrices.map((p) =>
              p.storeId === storeId ? { ...p, priceModifier: cents } : p
            ),
          };
        } else {
          // Add new store price
          return {
            ...sp,
            storePrices: [...sp.storePrices, { storeId, priceModifier: cents }],
          };
        }
      });
    } else {
      // Create new option pricing
      updatedStorePricing = [
        ...storePricing,
        {
          modifierOptionId: optionId,
          storePrices: [{ storeId, priceModifier: cents }],
        },
      ];
    }

    onChange(updatedStorePricing);
    setEditingCell(null);
  };

  // Apply default price to all stores
  const handleApplyAllStores = (optionId: string) => {
    const option = options.find((o) => o.id === optionId);
    if (!option) return;

    // Remove store-specific pricing for this option
    const updatedStorePricing = storePricing.filter(
      (sp) => sp.modifierOptionId !== optionId
    );

    onChange(updatedStorePricing);
  };

  // Apply all defaults
  const handleResetAll = () => {
    onChange([]);
  };

  const formatPriceValue = (cents: number) => {
    return (cents / 100).toFixed(2);
  };

  const hasAnyCustomPricing = storePricing.length > 0;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">Store-Specific Pricing</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Set different prices for each store location
          </p>
        </div>
        {hasAnyCustomPricing && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetAll}
          >
            <RotateCcw className="size-4" />
            Reset All
          </Button>
        )}
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="size-4" />
        <AlertDescription className="text-xs">
          By default, all stores use the same price. Click any cell to set a
          custom price for that store. The 📍 icon indicates custom pricing.
        </AlertDescription>
      </Alert>

      {/* Pricing Grid */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 text-sm font-medium border-r">
                  Option
                </th>
                <th className="text-center p-3 text-sm font-medium border-r">
                  Default
                </th>
                {stores.map((store) => (
                  <th
                    key={store.id}
                    className="text-center p-3 text-sm font-medium border-r last:border-r-0"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <MapPin className="size-3 text-muted-foreground" />
                      <span>{store.name}</span>
                      {store.location && (
                        <span className="text-xs text-muted-foreground font-normal">
                          {store.location}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {options.map((option) => (
                <tr key={option.id} className="border-t hover:bg-muted/30">
                  {/* Option Name */}
                  <td className="p-3 border-r">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium">{option.name}</span>
                      {option.isDefault && (
                        <Badge variant="outline" className="text-xs w-fit">
                          Default
                        </Badge>
                      )}
                    </div>
                  </td>

                  {/* Default Price */}
                  <td className="p-3 text-center border-r bg-muted/10">
                    <span className="text-sm font-medium">
                      {getCurrencySymbol('GBP')}{formatPrice(option.priceModifier)}
                    </span>
                  </td>

                  {/* Store Prices */}
                  {stores.map((store) => {
                    const storePrice = getStorePrice(option.id, store.id);
                    const isDifferent = isDifferentFromDefault(
                      option.id,
                      store.id
                    );
                    const isEditing =
                      editingCell?.optionId === option.id &&
                      editingCell?.storeId === store.id;

                    return (
                      <td
                        key={store.id}
                        className={cn(
                          'p-3 text-center border-r last:border-r-0 cursor-pointer transition-colors',
                          isDifferent && 'bg-primary/5',
                          isEditing && 'bg-primary/10'
                        )}
                        onClick={() =>
                          setEditingCell({ optionId: option.id, storeId: store.id })
                        }
                      >
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-sm">{getCurrencySymbol(store.currency)}</span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              defaultValue={formatPrice(storePrice)}
                              autoFocus
                              onBlur={(e) =>
                                handlePriceChange(
                                  option.id,
                                  store.id,
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handlePriceChange(
                                    option.id,
                                    store.id,
                                    parseFloat(e.currentTarget.value) || 0
                                  );
                                } else if (e.key === 'Escape') {
                                  setEditingCell(null);
                                }
                              }}
                              className="w-20 text-center h-8"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            {isDifferent && (
                              <span className="text-xs">📍</span>
                            )}
                            <span className="text-sm">
                              {formatCurrency(storePrice, store.currency || 'GBP')}
                            </span>
                          </div>
                        )}
                      </td>
                    );
                  })}

                  {/* Actions */}
                  <td className="p-3 text-center">
                    {storePricing.some(
                      (sp) => sp.modifierOptionId === option.id
                    ) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleApplyAllStores(option.id)}
                        title="Apply default to all stores"
                      >
                        <Copy className="size-3" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="size-3 bg-muted/10 border rounded" />
          <span>Default price</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-3 bg-primary/5 border border-primary/20 rounded" />
          <span>Custom price</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>📍</span>
          <span>Different from default</span>
        </div>
      </div>
    </div>
  );
}
