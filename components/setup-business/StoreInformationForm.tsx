"use client";

import * as React from "react";
import {
  StoreInformation,
  Address,
  Warehouse,
} from "@/lib/setup-business-store";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { AddressInput } from "@/components/setup-business/AddressInput";
import {
  PlaceLookup,
  type PlaceLookupOption,
} from "@/components/setup-business/PlaceLookup";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OperatingHours } from "./OperatingHours";
import { HolidayCalendar } from "./HolidayCalendar";
import { HolidayExceptions } from "./HolidayExceptions";
import { Textarea } from "@/components/ui/textarea";

interface StoreInformationFormProps {
  region: string;
  info: StoreInformation;
  onUpdate: (info: Partial<StoreInformation>) => void;
  errors?: Record<string, string>;
}

const businessTypes = [
  { label: "Select business type", value: null },
  { label: "Restaurant", value: "Restaurant" },
  { label: "Take-away", value: "Take-away" },
  { label: "Store", value: "Store" },
  { label: "E-commerce", value: "E-commerce" },
  { label: "Retail", value: "Retail" },
  { label: "Hospitality", value: "Hospitality" },
  { label: "Healthcare", value: "Healthcare" },
  { label: "Professional Services", value: "Professional Services" },
  { label: "Non-Profit", value: "Non-Profit" },
  { label: "Education", value: "Education" },
  { label: "Manufacturing", value: "Manufacturing" },
  { label: "Construction", value: "Construction" },
  { label: "Logistics", value: "Logistics" },
  { label: "Others", value: "Others" },
];

const allCurrencies = [
  { label: "Select currency", value: null },
  { label: "USD - US Dollar", value: "USD" },
  { label: "GBP - British Pound", value: "GBP" },
  { label: "EUR - Euro", value: "EUR" },
  { label: "PKR - Pakistani Rupee", value: "PKR" },
  { label: "INR - Indian Rupee", value: "INR" },
  { label: "NZD - New Zealand Dollar", value: "NZD" },
  { label: "AUD - Australian Dollar", value: "AUD" },
  { label: "CAD - Canadian Dollar", value: "CAD" },
  { label: "AED - UAE Dirham", value: "AED" },
  { label: "SAR - Saudi Riyal", value: "SAR" },
];

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

const parsestoreAddressFromPlace = (
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
  let normalizedRegion = fallbackRegion;
  const lastSegment = withoutCountry[withoutCountry.length - 1] || "";
  const cleanedLastSegment = lastSegment
    .replace(UK_POSTCODE_REGEX, "")
    .replace(/\s+/g, " ")
    .trim();

  if (normalizePostcode(lastSegment)) {
    if (cleanedLastSegment && !looksLikeStreetSegment(cleanedLastSegment)) {
      locality = cleanedLastSegment;
    } else {
      const localityFallback = withoutCountry[withoutCountry.length - 2] || "";
      locality = looksLikeStreetSegment(localityFallback)
        ? ""
        : localityFallback;
    }
  } else if (withoutCountry.length >= 3) {
    const localityCandidate = withoutCountry[withoutCountry.length - 2] || "";
    const regionCandidate = withoutCountry[withoutCountry.length - 1] || "";
    locality = looksLikeStreetSegment(localityCandidate)
      ? ""
      : localityCandidate;
    normalizedRegion = looksLikeStreetSegment(regionCandidate)
      ? fallbackRegion
      : regionCandidate;
  } else if (withoutCountry.length === 2) {
    const localityCandidate = withoutCountry[1] || "";
    locality = looksLikeStreetSegment(localityCandidate)
      ? ""
      : localityCandidate;
  }

  return {
    street,
    locality,
    region: normalizedRegion,
    postalCode: postcode,
  };
};

export function StoreInformationForm({
  region,
  info,
  onUpdate,
  errors = {},
}: StoreInformationFormProps) {
  const handleAddressChange = (address: Address) => {
    onUpdate({ storeAddress: address });
  };

  const handlestoreAddressSelect = React.useCallback(
    (place: PlaceLookupOption) => {
      const parsedAddress = parsestoreAddressFromPlace(
        place.description,
        info.storeAddress?.region || region,
        info.storeAddress?.postalCode || "",
      );
      onUpdate({
        placeId: place.placeId,
        storeAddress: parsedAddress,
      });
    },
    [info.storeAddress?.postalCode, info.storeAddress?.region, onUpdate, region],
  );

  const handleWarehouseChange = (warehouse: Partial<Warehouse>) => {
    onUpdate({
      warehouse: {
        name: info.warehouse?.name ?? "",
        street: info.warehouse?.street ?? "",
        city: info.warehouse?.city ?? "",
        state: info.warehouse?.state ?? "",
        postalCode: info.warehouse?.postalCode ?? "",
        country: info.warehouse?.country ?? "",
        phone: info.warehouse?.phone ?? "",
        email: info.warehouse?.email ?? "",
        ...warehouse,
      },
    });
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle>Site Information</CardTitle>
        <CardDescription>
          Configure your site details, address, business type, and operating
          hours.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <FieldGroup className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Field data-invalid={!!errors.storeName}>
              <FieldLabel htmlFor="storeName">Site Name</FieldLabel>
              <Input
                id="storeName"
                value={info.storeName ?? ""}
                onChange={(e) => onUpdate({ storeName: e.target.value })}
                placeholder="Enter your site or branch name"
                aria-invalid={!!errors.storeName}
              />
              {errors.storeName && (
                <p className="text-sm text-destructive mt-1" role="alert">
                  {errors.storeName}
                </p>
              )}
            </Field>

            <Field data-invalid={!!errors.currency}>
              <FieldLabel htmlFor="currency">Base Currency</FieldLabel>
              <Select
                items={allCurrencies}
                value={info.currency}
                onValueChange={(value) => onUpdate({ currency: value ?? "" })}
              >
                <SelectTrigger id="currency" aria-invalid={!!errors.currency}>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {allCurrencies.map((curr) => (
                      <SelectItem key={curr.value} value={curr.value}>
                        {curr.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {errors.currency && (
                <p className="text-sm text-destructive mt-1" role="alert">
                  {errors.currency}
                </p>
              )}
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Field data-invalid={!!errors.businessType}>
              <FieldLabel htmlFor="businessType">Business Type</FieldLabel>
              <Select
                items={businessTypes}
                value={info.businessType}
                onValueChange={(value) =>
                  onUpdate({
                    businessType: value as StoreInformation["businessType"],
                  })
                }
              >
                <SelectTrigger
                  id="businessType"
                  aria-invalid={!!errors.businessType}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {businessTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {errors.businessType && (
                <p className="text-sm text-destructive mt-1" role="alert">
                  {errors.businessType}
                </p>
              )}
            </Field>

            {info.businessType === "Others" && (
              <Field
                data-invalid={!!errors.otherBusinessType}
                className="animate-in fade-in slide-in-from-top-1 duration-200"
              >
                <FieldLabel htmlFor="otherBusinessType">
                  Other Business Type
                </FieldLabel>
                <Input
                  id="otherBusinessType"
                  value={info.otherBusinessType ?? ""}
                  onChange={(e) =>
                    onUpdate({ otherBusinessType: e.target.value })
                  }
                  placeholder="e.g. Services"
                  aria-invalid={!!errors.otherBusinessType}
                  maxLength={50}
                />
                {errors.otherBusinessType && (
                  <p className="text-sm text-destructive mt-1" role="alert">
                    {errors.otherBusinessType}
                  </p>
                )}
              </Field>
            )}
          </div>

          {info.businessType === "E-commerce" && (
            <div className="bg-muted/30 border rounded-xl p-6 space-y-6 animate-in zoom-in-95 duration-300">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <span className="bg-primary/10 text-primary p-1 rounded">
                  📦
                </span>
                Warehouse Information
              </h3>

              <FieldGroup className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Field
                  data-invalid={!!errors.warehouseName}
                  className="md:col-span-2"
                >
                  <FieldLabel htmlFor="warehouseName">
                    Warehouse Name
                  </FieldLabel>
                  <Input
                    id="warehouseName"
                    value={info.warehouse?.name ?? ""}
                    onChange={(e) =>
                      handleWarehouseChange({ name: e.target.value })
                    }
                    placeholder="Main Fulfillment Center"
                    aria-invalid={!!errors.warehouseName}
                  />
                  {errors.warehouseName && (
                    <p className="text-sm text-destructive mt-1" role="alert">
                      {errors.warehouseName}
                    </p>
                  )}
                </Field>

                <Field
                  data-invalid={!!errors.warehouseStreet}
                  className="md:col-span-2"
                >
                  <FieldLabel htmlFor="warehouseStreet">
                    Full Street Address
                  </FieldLabel>
                  <Textarea
                    id="warehouseStreet"
                    value={info.warehouse?.street ?? ""}
                    onChange={(e) =>
                      handleWarehouseChange({ street: e.target.value })
                    }
                    placeholder="Enter full street address"
                    className="min-h-[80px]"
                    aria-invalid={!!errors.warehouseStreet}
                  />
                  {errors.warehouseStreet && (
                    <p className="text-sm text-destructive mt-1" role="alert">
                      {errors.warehouseStreet}
                    </p>
                  )}
                </Field>

                <Field data-invalid={!!errors.warehouseCity}>
                  <FieldLabel htmlFor="warehouseCity">City</FieldLabel>
                  <Input
                    id="warehouseCity"
                    value={info.warehouse?.city ?? ""}
                    onChange={(e) =>
                      handleWarehouseChange({ city: e.target.value })
                    }
                    placeholder="City"
                    aria-invalid={!!errors.warehouseCity}
                  />
                  {errors.warehouseCity && (
                    <p className="text-sm text-destructive mt-1" role="alert">
                      {errors.warehouseCity}
                    </p>
                  )}
                </Field>

                <Field data-invalid={!!errors.warehouseState}>
                  <FieldLabel htmlFor="warehouseState">
                    State/Province
                  </FieldLabel>
                  <Input
                    id="warehouseState"
                    value={info.warehouse?.state ?? ""}
                    onChange={(e) =>
                      handleWarehouseChange({ state: e.target.value })
                    }
                    placeholder="State/Province"
                    aria-invalid={!!errors.warehouseState}
                  />
                  {errors.warehouseState && (
                    <p className="text-sm text-destructive mt-1" role="alert">
                      {errors.warehouseState}
                    </p>
                  )}
                </Field>

                <Field data-invalid={!!errors.warehousePostalCode}>
                  <FieldLabel htmlFor="warehousePostalCode">
                    ZIP/Postal Code
                  </FieldLabel>
                  <Input
                    id="warehousePostalCode"
                    value={info.warehouse?.postalCode ?? ""}
                    onChange={(e) =>
                      handleWarehouseChange({ postalCode: e.target.value })
                    }
                    placeholder="Postal Code"
                    aria-invalid={!!errors.warehousePostalCode}
                  />
                  {errors.warehousePostalCode && (
                    <p className="text-sm text-destructive mt-1" role="alert">
                      {errors.warehousePostalCode}
                    </p>
                  )}
                </Field>

                <Field data-invalid={!!errors.warehouseCountry}>
                  <FieldLabel htmlFor="warehouseCountry">Country</FieldLabel>
                  <Input
                    id="warehouseCountry"
                    value={info.warehouse?.country ?? ""}
                    onChange={(e) =>
                      handleWarehouseChange({ country: e.target.value })
                    }
                    placeholder="Country"
                    aria-invalid={!!errors.warehouseCountry}
                  />
                  {errors.warehouseCountry && (
                    <p className="text-sm text-destructive mt-1" role="alert">
                      {errors.warehouseCountry}
                    </p>
                  )}
                </Field>

                <Field data-invalid={!!errors.warehousePhone}>
                  <FieldLabel htmlFor="warehousePhone">
                    Contact Phone (Optional)
                  </FieldLabel>
                  <Input
                    id="warehousePhone"
                    value={info.warehouse?.phone ?? ""}
                    onChange={(e) =>
                      handleWarehouseChange({ phone: e.target.value })
                    }
                    placeholder="Phone"
                    aria-invalid={!!errors.warehousePhone}
                  />
                  {errors.warehousePhone && (
                    <p className="text-sm text-destructive mt-1" role="alert">
                      {errors.warehousePhone}
                    </p>
                  )}
                </Field>

                <Field data-invalid={!!errors.warehouseEmail}>
                  <FieldLabel htmlFor="warehouseEmail">
                    Contact Email (Optional)
                  </FieldLabel>
                  <Input
                    id="warehouseEmail"
                    value={info.warehouse?.email ?? ""}
                    onChange={(e) =>
                      handleWarehouseChange({ email: e.target.value })
                    }
                    placeholder="Email"
                    aria-invalid={!!errors.warehouseEmail}
                  />
                  {errors.warehouseEmail && (
                    <p className="text-sm text-destructive mt-1" role="alert">
                      {errors.warehouseEmail}
                    </p>
                  )}
                </Field>
              </FieldGroup>
            </div>
          )}

          <PlaceLookup
            businessType="Sole Trader"
            forceVisible
            mode="address"
            label="Find Site Address"
            inputId="site-address-lookup"
            inputAriaLabel="Find site address"
            placeholder="Start typing address, e.g. “1 Fairhaven Street, Manchester”"
            onPlaceSelected={handlestoreAddressSelect}
          />

          <AddressInput
            region={region}
            value={info.storeAddress}
            onChange={handleAddressChange}
            errors={errors as Record<string, string | undefined>}
            label="Site Address"
          />

          <div className="border-t pt-8 space-y-10">
            <OperatingHours
              is24_7={info.is24_7}
              selectedDays={info.selectedDays}
              dailyTimeSlots={info.dailyTimeSlots}
              onUpdate={(data) => onUpdate(data)}
              errors={errors}
            />

            <HolidayCalendar
              holidays={info.holidays}
              onUpdate={(holidays) => onUpdate({ holidays })}
              errors={errors}
            />

            <HolidayExceptions
              exceptions={info.holidayExceptions || []}
              onUpdate={(exceptions) =>
                onUpdate({ holidayExceptions: exceptions })
              }
              errors={errors}
            />
          </div>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
