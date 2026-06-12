'use client';

import { useState, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Info, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCurrencySymbol } from '@/lib/currency-utils';

interface ModifierOption {
  id?: string;
  name: string;
  priceModifier: number; // In cents
  displayOrder: number;
  isDefault?: boolean;
}

interface ModifierPricingFormProps {
  options: ModifierOption[];
  onChange: (options: ModifierOption[]) => void;
  currency?: string;
  className?: string;
}

type PricingMode = 'simple' | 'advanced';

export function ModifierPricingForm({
  options,
  onChange,
  currency = 'GBP',
  className,
}: ModifierPricingFormProps) {
  const [pricingMode, setPricingMode] = useState<PricingMode>('simple');
  const [manualBasePrice, setManualBasePrice] = useState<number | null>(null);

  // Derived values
  const { basePrice, absolutePrices } = useMemo(() => {
    if (options.length === 0) {
      return { basePrice: 0, absolutePrices: {} as Record<string, number> };
    }

    // If we have a manual base price (from advanced mode), use it
    // Otherwise calculate from options (lowest price or default)
    let calculatedBasePrice = 0;
    
    if (manualBasePrice !== null && pricingMode === 'advanced') {
      calculatedBasePrice = manualBasePrice;
    } else {
      const defaultOption = options.find((o) => o.isDefault);
      const lowestModifier = Math.min(...options.map((o) => o.priceModifier));
      calculatedBasePrice = defaultOption?.priceModifier ?? lowestModifier;
    }

    const prices: Record<string, number> = {};
    options.forEach((option) => {
      // In our model, absolute price = basePrice + modifier
      // But wait, if basePrice is derived from the lowest modifier, 
      // then absolute price is just the modifier itself? 
      // No, the model seems to treat priceModifier as the absolute price in some places 
      // and relative in others.
      
      // Based on handleAbsolutePriceChange: 
      // priceModifier = newAbsolutePrices[option.name] - newBasePrice
      // This means priceModifier is RELATIVE to basePrice.
      
      prices[option.name] = calculatedBasePrice + option.priceModifier;
    });

    return { basePrice: calculatedBasePrice, absolutePrices: prices };
  }, [options, manualBasePrice, pricingMode]);

  // Handle absolute price change (Simple mode)
  const handleAbsolutePriceChange = (optionName: string, pounds: number) => {
    const cents = Math.round(pounds * 100);
    const newAbsolutePrices = { ...absolutePrices, [optionName]: cents };

    // Recalculate base price and modifiers
    const allPrices = Object.values(newAbsolutePrices);
    const newBasePrice = Math.min(...allPrices);
    
    // In simple mode, we don't keep manual base price
    setManualBasePrice(null);

    // Update options with new modifiers
    const updatedOptions = options.map((option) => ({
      ...option,
      priceModifier: (newAbsolutePrices[option.name] ?? 0) - newBasePrice,
    }));

    onChange(updatedOptions);
  };

  // Handle modifier price change (Advanced mode)
  const handleModifierChange = (optionName: string, modifierPounds: number) => {
    const modifierCents = Math.round(modifierPounds * 100);

    const updatedOptions = options.map((option) =>
      option.name === optionName
        ? { ...option, priceModifier: modifierCents }
        : option
    );

    onChange(updatedOptions);
  };

  // Handle base price change (Advanced mode)
  const handleBasePriceChange = (pounds: number) => {
    const cents = Math.round(pounds * 100);
    setManualBasePrice(cents);
  };

  // Toggle pricing mode
  const toggleMode = () => {
    setPricingMode((prev) => (prev === 'simple' ? 'advanced' : 'simple'));
  };

  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2);
  };

  const symbol = getCurrencySymbol(currency);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Mode Toggle */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div className="flex-1">
          <Label htmlFor="pricing-mode" className="text-sm font-medium">
            Pricing Mode
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            {pricingMode === 'simple'
              ? 'Enter the final price customers pay'
              : 'Set a base price and add modifiers'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'text-sm',
              pricingMode === 'simple' ? 'font-medium' : 'text-muted-foreground'
            )}
          >
            Simple
          </span>
          <Switch
            id="pricing-mode"
            checked={pricingMode === 'advanced'}
            onCheckedChange={toggleMode}
          />
          <span
            className={cn(
              'text-sm',
              pricingMode === 'advanced'
                ? 'font-medium'
                : 'text-muted-foreground'
            )}
          >
            Advanced
          </span>
        </div>
      </div>

      {/* AI Helper Text */}
      <Alert>
        <Lightbulb className="size-4" />
        <AlertTitle>
          {pricingMode === 'simple' ? 'Simple Mode' : 'Advanced Mode'}
        </AlertTitle>
        <AlertDescription>
          {pricingMode === 'simple' ? (
            <>
              <strong>Perfect for most users.</strong> Enter the actual price
              customers will pay for each option (e.g., Small Pizza: {symbol}5.00,
              Medium Pizza: {symbol}7.00). We&apos;ll automatically calculate the base price
              and modifiers.
            </>
          ) : (
            <>
              <strong>For technical users.</strong> Set a base price and define
              price changes as modifiers (e.g., Base: {symbol}5.00, Medium: +{symbol}2.00).
              This gives you precise control over pricing logic.
            </>
          )}
        </AlertDescription>
      </Alert>

      {/* Simple Mode: Absolute Prices */}
      {pricingMode === 'simple' && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">Final Prices</Label>
          {options.map((option) => (
            <div
              key={option.name}
              className="flex items-center gap-3 p-3 border rounded-lg"
            >
              <div className="flex-1">
                <p className="text-sm font-medium">{option.name}</p>
                {option.isDefault && (
                  <p className="text-xs text-muted-foreground">Default option</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{symbol}</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formatPrice(absolutePrices[option.name] || 0)}
                  onChange={(e) =>
                    handleAbsolutePriceChange(option.name, parseFloat(e.target.value) || 0)
                  }
                  className="w-24 text-right"
                />
                {option.priceModifier !== 0 && (
                  <span className="text-xs text-muted-foreground w-16">
                    ({option.priceModifier >= 0 ? '+' : ''}
                    {symbol}{formatPrice(option.priceModifier)})
                  </span>
                )}
              </div>
            </div>
          ))}

          {/* Calculated Base Price Info */}
          <div className="flex items-center gap-2 p-3 bg-muted/30 rounded text-sm">
            <Info className="size-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              Calculated base price:{' '}
              <strong className="text-foreground">
                {symbol}{formatPrice(basePrice)}
              </strong>
            </span>
          </div>
        </div>
      )}

      {/* Advanced Mode: Base + Modifiers */}
      {pricingMode === 'advanced' && (
        <div className="space-y-3">
          {/* Base Price */}
          <div className="p-4 border-2 border-primary/20 rounded-lg bg-primary/5">
            <Label htmlFor="base-price" className="text-sm font-medium">
              Base Price
            </Label>
            <p className="text-xs text-muted-foreground mb-2">
              Starting price before any modifiers
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{symbol}</span>
              <Input
                id="base-price"
                type="number"
                step="0.01"
                min="0"
                value={formatPrice(basePrice)}
                onChange={(e) =>
                  handleBasePriceChange(parseFloat(e.target.value) || 0)
                }
                className="w-32 text-right font-medium"
              />
            </div>
          </div>

          {/* Modifier Options */}
          <Label className="text-sm font-medium">Price Modifiers</Label>
          {options.map((option) => (
            <div
              key={option.name}
              className="flex items-center gap-3 p-3 border rounded-lg"
            >
              <div className="flex-1">
                <p className="text-sm font-medium">{option.name}</p>
                {option.isDefault && (
                  <p className="text-xs text-muted-foreground">Default option</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {option.priceModifier >= 0 ? '+' : '-'}{symbol}
                </span>
                <Input
                  type="number"
                  step="0.01"
                  value={formatPrice(Math.abs(option.priceModifier))}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    const signedValue = option.priceModifier < 0 ? -value : value;
                    handleModifierChange(option.name, signedValue);
                  }}
                  className="w-24 text-right"
                />
                <span className="text-xs text-muted-foreground w-24">
                  = {symbol}{formatPrice(absolutePrices[option.name] || basePrice)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
