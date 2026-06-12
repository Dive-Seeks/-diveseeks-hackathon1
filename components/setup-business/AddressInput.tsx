"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { getAddressSchema } from "@/lib/region-service";
import { Address } from "@/lib/setup-business-store";

interface AddressInputProps {
  region: string;
  value: Address;
  onChange: (value: Address) => void;
  errors?: Record<string, string | undefined>;
  label?: string;
}

export function AddressInput({
  region,
  value,
  onChange,
  errors,
  label = "Registered Business Address",
}: AddressInputProps) {
  const schema = React.useMemo(() => getAddressSchema(region), [region]);

  const safeValue = React.useMemo(
    () => ({
      street: value?.street || "",
      locality: value?.locality || "",
      region: value?.region || "",
      postalCode: value?.postalCode || "",
    }),
    [value],
  );

  const handleChange = (field: keyof Address, val: string) => {
    onChange({ ...safeValue, [field]: val });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
      <FieldGroup className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field data-invalid={!!errors?.street} className="md:col-span-2">
          <FieldLabel htmlFor="street">{schema.streetLabel}</FieldLabel>
          <Input
            id="street"
            value={safeValue.street}
            onChange={(e) => handleChange("street", e.target.value)}
            placeholder={`Enter ${schema.streetLabel.toLowerCase()}`}
            aria-invalid={!!errors?.street}
          />
          {errors?.street && (
            <p className="text-sm text-destructive mt-1">{errors.street}</p>
          )}
        </Field>

        <Field data-invalid={!!errors?.locality}>
          <FieldLabel htmlFor="locality">{schema.localityLabel}</FieldLabel>
          <Input
            id="locality"
            value={safeValue.locality}
            onChange={(e) => handleChange("locality", e.target.value)}
            placeholder={`Enter ${schema.localityLabel.toLowerCase()}`}
            aria-invalid={!!errors?.locality}
          />
          {errors?.locality && (
            <p className="text-sm text-destructive mt-1">{errors.locality}</p>
          )}
        </Field>

        <Field data-invalid={!!errors?.region}>
          <FieldLabel htmlFor="region-field">{schema.regionLabel}</FieldLabel>
          <Input
            id="region-field"
            value={safeValue.region}
            onChange={(e) => handleChange("region", e.target.value)}
            placeholder={`Enter ${schema.regionLabel.toLowerCase()}`}
            aria-invalid={!!errors?.region}
          />
          {errors?.region && (
            <p className="text-sm text-destructive mt-1">{errors.region}</p>
          )}
        </Field>

        <Field data-invalid={!!errors?.postalCode}>
          <FieldLabel htmlFor="postalCode">{schema.postalCodeLabel}</FieldLabel>
          <Input
            id="postalCode"
            value={safeValue.postalCode}
            onChange={(e) => handleChange("postalCode", e.target.value)}
            placeholder={`Enter ${schema.postalCodeLabel.toLowerCase()}`}
            aria-invalid={!!errors?.postalCode}
          />
          {errors?.postalCode && (
            <p className="text-sm text-destructive mt-1">{errors.postalCode}</p>
          )}
        </Field>
      </FieldGroup>
    </div>
  );
}
