'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  ShoppingBagIcon,
  GlobeIcon,
  SmartphoneIcon,
  StoreIcon,
  LockIcon,
} from 'lucide-react';

export type SalesChannelValue = 'pos' | 'web' | 'mobile' | 'marketplace';

interface ChannelOption {
  id: SalesChannelValue;
  label: string;
  description: string;
  subDescription?: string;
  icon: React.ComponentType<{ className?: string }>;
  required: boolean;
  disabled: boolean;
}

interface SalesChannelSelectorProps {
  value: SalesChannelValue[];
  onChange: (channels: SalesChannelValue[]) => void;
  businessType: string;
}

export function SalesChannelSelector({
  value,
  onChange,
  businessType
}: SalesChannelSelectorProps) {

  const availableChannels = React.useMemo((): ChannelOption[] => {
    const isEcommerce = businessType === 'E-commerce';

    if (isEcommerce) {
      return [
        {
          id: 'web',
          label: 'Online Website',
          description: 'Your main e-commerce store where customers shop online.',
          subDescription: 'This is your primary sales channel.',
          icon: GlobeIcon,
          required: true,
          disabled: true,
        },
        {
          id: 'mobile',
          label: 'Mobile Shopping App',
          description: 'A dedicated app for customers to browse and purchase.',
          subDescription: 'Better experience than mobile web for frequent shoppers.',
          icon: SmartphoneIcon,
          required: false,
          disabled: false,
        },
        {
          id: 'marketplace',
          label: 'Marketplace Stores',
          description: 'Sell on third-party platforms like Amazon, eBay, and Etsy.',
          subDescription: 'Reach millions of customers already shopping on these sites.',
          icon: StoreIcon,
          required: false,
          disabled: false,
        }
      ];
    }

    // Retail, Hospitality, Restaurant
    return [
      {
        id: 'pos',
        label: 'In-Store Sales',
        description: 'Sell directly to walk-in customers at your physical location.',
        subDescription: 'Uses point-of-sale (POS) terminals and card readers.',
        icon: ShoppingBagIcon,
        required: true,
        disabled: true,
      },
      {
        id: 'web',
        label: 'Online Website',
        description: 'Accept orders through your website for delivery or pickup.',
        subDescription: 'Perfect for expanding beyond walk-in customers.',
        icon: GlobeIcon,
        required: false,
        disabled: false,
      },
      {
        id: 'mobile',
        label: 'Mobile App',
        description: 'Let customers order through your mobile app.',
        subDescription: 'Great for loyalty programs and push notifications.',
        icon: SmartphoneIcon,
        required: false,
        disabled: false,
      }
    ];
  }, [businessType]);

  // Ensure required channels are always selected
  React.useEffect(() => {
    const requiredChannels = availableChannels
      .filter(ch => ch.required)
      .map(ch => ch.id);

    const missingRequired = requiredChannels.filter(
      ch => !value.includes(ch)
    );

    if (missingRequired.length > 0) {
      onChange([...value, ...missingRequired]);
    }
  }, [availableChannels, value, onChange]);

  const handleToggle = (channelId: SalesChannelValue, isRequired: boolean) => {
    if (isRequired) {
      // Cannot uncheck required channels
      return;
    }

    const isSelected = value.includes(channelId);

    if (isSelected) {
      onChange(value.filter(id => id !== channelId));
    } else {
      onChange([...value, channelId]);
    }
  };

  return (
    <div className="space-y-4">
      {availableChannels.map((channel) => {
        const isSelected = value.includes(channel.id);
        const Icon = channel.icon;

        return (
          <Card
            key={channel.id}
            className={cn(
              "p-5 cursor-pointer transition-all relative",
              isSelected && "border-primary bg-primary/5 shadow-sm",
              channel.required && "border-primary border-2 bg-primary/10",
              !channel.required && !isSelected && "hover:border-primary/50 hover:shadow-sm"
            )}
            onClick={() => handleToggle(channel.id, channel.required)}
          >
            <div className="flex items-start gap-4">
              {/* Checkbox */}
              <Checkbox
                checked={isSelected}
                disabled={channel.disabled}
                className="mt-1"
              />

              {/* Icon */}
              <div className={cn(
                "p-3 rounded-lg shrink-0",
                isSelected ? "bg-primary/10" : "bg-muted"
              )}>
                <Icon className={cn(
                  "size-6",
                  isSelected ? "text-primary" : "text-muted-foreground"
                )} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-base">
                    {channel.label}
                  </h3>
                  {channel.required && (
                    <Badge variant="secondary" className="text-xs">
                      <LockIcon className="size-3 mr-1" />
                      Required
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {channel.description}
                </p>
                {channel.subDescription && (
                  <p className="text-xs text-muted-foreground/80 mt-1 italic">
                    {channel.subDescription}
                  </p>
                )}
              </div>
            </div>

            {/* Required indicator overlay */}
            {channel.required && (
              <div className="absolute top-3 right-3">
                <div className="px-2 py-1 bg-primary/10 rounded-md">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-wide">
                    Cannot be disabled
                  </p>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
