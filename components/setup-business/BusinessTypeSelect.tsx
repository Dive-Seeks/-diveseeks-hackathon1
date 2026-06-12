"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldLabel } from "@/components/ui/field";
import { getBusinessTypes } from "@/lib/region-service";

interface BusinessTypeSelectProps {
  region: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

const placeholder = { label: "Select a business type", value: "" };

export function BusinessTypeSelect({
  region,
  value,
  onChange,
  error,
  disabled,
}: BusinessTypeSelectProps) {
  const options = React.useMemo(() => {
    if (!region) return [placeholder];
    return [placeholder, ...getBusinessTypes(region)];
  }, [region]);

  return (
    <Field data-invalid={!!error} data-disabled={disabled || !region}>
      <FieldLabel htmlFor="businessType">Business Type</FieldLabel>
      <Select
        id="businessType"
        items={options}
        value={value}
        onValueChange={(nextValue) => onChange(nextValue ?? "")}
        disabled={disabled || !region}
        aria-invalid={!!error}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {error && <p className="text-sm text-destructive mt-1">{error}</p>}
    </Field>
  );
}
