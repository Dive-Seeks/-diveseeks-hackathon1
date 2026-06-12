"use client";

import * as React from "react";
import { BankDetails } from "@/lib/setup-business-store";
import { getBankSchema, BankField } from "@/lib/region-service";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select";

interface BankDetailsFormProps {
  region: string;
  details: BankDetails;
  onUpdate: (details: BankDetails) => void;
  errors?: Record<string, string>;
}

export function BankDetailsForm({
  region,
  details,
  onUpdate,
  errors = {},
}: BankDetailsFormProps) {
  const schema = React.useMemo(() => getBankSchema(region), [region]);

  const handleChange = (name: string, value: string | null) => {
    onUpdate({
      ...details,
      [name]: value || "",
    });
  };

  const formatValue = (value: string, mask?: string) => {
    if (!mask || !value) return value;

    // Simple masking logic (e.g., 99-99-99)
    let formatted = "";
    let valIdx = 0;
    for (let i = 0; i < mask.length && valIdx < value.length; i++) {
      if (mask[i] === "9" || mask[i] === "A") {
        formatted += value[valIdx++];
      } else {
        formatted += mask[i];
        if (value[valIdx] === mask[i]) valIdx++;
      }
    }
    return formatted;
  };

  const unmaskValue = (value: string, mask?: string) => {
    if (!mask) return value;
    // Remove non-alphanumeric characters that are part of the mask
    const maskChars = mask.replace(/[9A]/g, "");
    let unmasked = value;
    for (const char of maskChars) {
      unmasked = unmasked.split(char).join("");
    }
    return unmasked;
  };

  return (
    <FieldGroup className="space-y-6">
      {schema.fields.map((field: BankField) => (
        <Field key={field.name} data-invalid={!!errors[field.name]}>
          <FieldLabel htmlFor={field.name}>{field.label}</FieldLabel>

          {field.type === "select" ? (
            <Select
              items={
                field.options?.map((opt) => ({ label: opt, value: opt })) || []
              }
              value={details[field.name] || ""}
              onValueChange={(val) => handleChange(field.name, val)}
            >
              <SelectTrigger id={field.name}>
                <SelectValue placeholder={field.placeholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {field.options?.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          ) : (
            <Input
              id={field.name}
              placeholder={field.placeholder}
              value={formatValue(details[field.name] || "", field.mask)}
              onChange={(e) => {
                const rawValue = unmaskValue(e.target.value, field.mask);
                handleChange(field.name, rawValue);
              }}
              aria-invalid={!!errors[field.name]}
            />
          )}

          {errors[field.name] && (
            <p className="text-sm text-destructive mt-1">
              {errors[field.name]}
            </p>
          )}
        </Field>
      ))}
    </FieldGroup>
  );
}
