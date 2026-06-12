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
import { getRegions } from "@/lib/region-service";

interface RegionSelectProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function RegionSelect({ value, onChange, error }: RegionSelectProps) {
  const regions = React.useMemo(() => {
    return [{ label: "Select a region", value: "" }, ...getRegions()];
  }, []);

  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor="region">Region</FieldLabel>
      <Select
        id="region"
        items={regions}
        value={value}
        onValueChange={(val) => onChange(val ?? "")}
        aria-invalid={!!error}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {regions.map((region) => (
              <SelectItem key={region.value} value={region.value}>
                {region.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {error && <p className="text-sm text-destructive mt-1">{error}</p>}
    </Field>
  );
}
