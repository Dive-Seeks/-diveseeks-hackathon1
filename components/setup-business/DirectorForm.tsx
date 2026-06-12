"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { AddressInput } from "./AddressInput";
import { PlaceLookup, type PlaceLookupOption } from "./PlaceLookup";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2Icon } from "lucide-react";
import { type Address, type Director } from "@/lib/setup-business-store";
import { getPhoneInfo } from "@/lib/region-service";

interface DirectorFormProps {
  director: Director;
  onUpdate: (data: Partial<Director>) => void;
  onRemove?: () => void;
  region: string;
  errors?: Record<string, string>;
  isSoleTrader?: boolean;
}

const UK_POSTCODE_REGEX = /\b([A-Z]{1,2}\d[A-Z\d]?)\s?(\d[A-Z]{2})\b/i;
const STREET_KEYWORDS = new Set([
  "street",
  "st",
  "road",
  "rd",
  "avenue",
  "ave",
  "lane",
  "ln",
  "drive",
  "dr",
  "close",
  "court",
  "crescent",
  "terrace",
  "way",
  "boulevard",
  "blvd",
  "hill",
  "place",
  "pl",
]);

const normalizePostcode = (value: string) => {
  const match = value.match(UK_POSTCODE_REGEX);
  if (!match) {
    return "";
  }
  return `${match[1].toUpperCase()} ${match[2].toUpperCase()}`;
};

const looksLikeStreetSegment = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  if (/^\d+/.test(normalized)) {
    return true;
  }
  const words = normalized.split(/\s+/).filter(Boolean);
  const lastWord = words[words.length - 1];
  return STREET_KEYWORDS.has(lastWord);
};

const parseOwnerAddressFromPlace = (
  description: string,
  fallbackRegion: string,
  fallbackPostalCode: string,
): Address => {
  const parts = description
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const countryCodes = new Set(["uk", "united kingdom"]);
  const withoutCountry =
    parts.length > 1 && countryCodes.has(parts[parts.length - 1].toLowerCase())
      ? parts.slice(0, -1)
      : parts;

  const postcode = normalizePostcode(description) || fallbackPostalCode;
  const streetCandidate = withoutCountry.find(looksLikeStreetSegment);
  const street = streetCandidate || withoutCountry[0] || description;

  let locality = "";
  let region = ""; // Default to empty region instead of country

  // For UK addresses like "10 Downing St, London, SW1A 2AA, UK"
  // parts after the house/street are usually locality and county.
  const filteredParts = withoutCountry.filter(p => !normalizePostcode(p) && p !== street);
  
  if (filteredParts.length >= 2) {
    locality = filteredParts[0];
    region = filteredParts[1];
  } else if (filteredParts.length === 1) {
    locality = filteredParts[0];
    region = fallbackRegion !== "United Kingdom" ? fallbackRegion : "";
  } else {
    region = fallbackRegion !== "United Kingdom" ? fallbackRegion : "";
  }

  return {
    street,
    locality,
    region,
    postalCode: postcode,
  };
};

export function DirectorForm({
  director,
  onUpdate,
  onRemove,
  region,
  errors,
  isSoleTrader,
}: DirectorFormProps) {
  const title = isSoleTrader ? "Owner Details" : "Director Details";
  const phoneInfo = React.useMemo(() => getPhoneInfo(region), [region]);
  const handleOwnerAddressSelect = React.useCallback(
    (place: PlaceLookupOption) => {
      const parsedAddress = parseOwnerAddressFromPlace(
        place.description,
        director.residentialAddress?.region || region,
        director.residentialAddress?.postalCode || "",
      );

      onUpdate({ residentialAddress: parsedAddress });
    },
    [
      director.residentialAddress?.postalCode,
      director.residentialAddress?.region,
      onUpdate,
      region,
    ],
  );

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        {onRemove && !isSoleTrader && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
            aria-label={`Remove ${title}`}
          >
            <Trash2Icon className="size-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <FieldGroup className="gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Field data-invalid={!!errors?.firstName}>
              <FieldLabel htmlFor={`firstName-${director.id}`}>
                First Name
              </FieldLabel>
              <Input
                id={`firstName-${director.id}`}
                value={director.firstName ?? ""}
                onChange={(e) => onUpdate({ firstName: e.target.value })}
                placeholder="First name"
                aria-invalid={!!errors?.firstName}
              />
              {errors?.firstName && (
                <p className="text-sm text-destructive mt-1">
                  {errors.firstName}
                </p>
              )}
            </Field>

            <Field data-invalid={!!errors?.lastName}>
              <FieldLabel htmlFor={`lastName-${director.id}`}>
                Last Name
              </FieldLabel>
              <Input
                id={`lastName-${director.id}`}
                value={director.lastName ?? ""}
                onChange={(e) => onUpdate({ lastName: e.target.value })}
                placeholder="Last name"
                aria-invalid={!!errors?.lastName}
              />
              {errors?.lastName && (
                <p className="text-sm text-destructive mt-1">
                  {errors.lastName}
                </p>
              )}
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Field data-invalid={!!errors?.dob}>
              <FieldLabel htmlFor={`dob-${director.id}`}>
                Date of Birth (DD/MM/YYYY)
              </FieldLabel>
              <Input
                id={`dob-${director.id}`}
                value={director.dob ?? ""}
                onChange={(e) => onUpdate({ dob: e.target.value })}
                placeholder="DD/MM/YYYY"
                aria-invalid={!!errors?.dob}
              />
              {errors?.dob && (
                <p className="text-sm text-destructive mt-1">{errors.dob}</p>
              )}
            </Field>
            <div /> {/* Spacer for the grid */}
          </div>

          <PlaceLookup
            businessType={isSoleTrader ? "Sole Trader" : "Limited Company"}
            forceVisible
            mode="address"
            label="Find Address by Postcode"
            inputId={`owner-address-lookup-${director.id}`}
            inputAriaLabel="Find owner address by postcode"
            placeholder="Search postcode for available door numbers"
            onPlaceSelected={handleOwnerAddressSelect}
          />

          <AddressInput
            region={region}
            value={director.residentialAddress}
            onChange={(val) => onUpdate({ residentialAddress: val })}
            errors={{
              street: errors?.street,
              locality: errors?.locality,
              region: errors?.region,
              postalCode: errors?.postalCode,
            }}
            label="Residential Address"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Field data-invalid={!!errors?.email}>
              <FieldLabel htmlFor={`email-${director.id}`}>Email</FieldLabel>
              <Input
                id={`email-${director.id}`}
                type="email"
                value={director.email ?? ""}
                onChange={(e) => onUpdate({ email: e.target.value })}
                placeholder="Email address"
                aria-invalid={!!errors?.email}
              />
              {errors?.email && (
                <p className="text-sm text-destructive mt-1">{errors.email}</p>
              )}
            </Field>

            <Field data-invalid={!!errors?.phone}>
              <FieldLabel htmlFor={`phone-${director.id}`}>Phone</FieldLabel>
              <div className="flex gap-2">
                <div className="flex items-center justify-center px-3 rounded-md border border-input bg-muted text-muted-foreground text-sm font-medium shrink-0 min-w-14">
                  {phoneInfo.prefix}
                </div>
                <Input
                  id={`phone-${director.id}`}
                  type="tel"
                  value={director.phone ?? ""}
                  onChange={(e) => onUpdate({ phone: e.target.value })}
                  placeholder={phoneInfo.placeholder}
                  aria-invalid={!!errors?.phone}
                  className="flex-1"
                />
              </div>
              {errors?.phone && (
                <p className="text-sm text-destructive mt-1">{errors.phone}</p>
              )}
            </Field>
          </div>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
