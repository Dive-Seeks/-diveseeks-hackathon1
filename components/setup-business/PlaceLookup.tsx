"use client";

import * as React from "react";
import { Loader2Icon, SearchIcon } from "lucide-react";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Button } from "@/components/ui/button";
import { AxiosError } from "axios";
import api from "@/lib/api";

export type PlaceLookupOption = {
  placeId: string;
  description: string;
  provider?: string;
};

interface PlaceLookupProps {
  businessType: string;
  onPlaceSelected: (place: PlaceLookupOption) => void;
  disabled?: boolean;
  debounceMs?: number;
  forceVisible?: boolean;
  mode?: "business" | "address";
  label?: string;
  inputId?: string;
  inputAriaLabel?: string;
  placeholder?: string;
}

const ELIGIBLE_BUSINESS_TYPES = new Set(["sole trader", "sole proprietorship"]);
const MIN_QUERY_LENGTH = 3;
const UK_POSTCODE_REGEX = /\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/i;

const normalizeBusinessType = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

const normalizePostcode = (value: string) =>
  value.toUpperCase().replace(/\s+/g, "");

const extractNormalizedPostcode = (value: string) => {
  const match = value.match(UK_POSTCODE_REGEX);
  return match ? normalizePostcode(match[0]) : null;
};

const ADDRESS_KEYWORDS = new Set([
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
]);

const isLikelyBusinessResult = (
  description: string,
  isSoleTrader: boolean = false,
) => {
  if (isSoleTrader) {
    return true;
  }
  const segments = description
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (segments.length < 2) {
    return false;
  }
  const firstSegment = segments[0].toLowerCase();
  const firstSegmentWords = firstSegment.split(/\s+/).filter(Boolean);
  const lastWord = firstSegmentWords[firstSegmentWords.length - 1];
  if (ADDRESS_KEYWORDS.has(lastWord)) {
    return false;
  }
  if (/^\d+\s+[a-z]/i.test(firstSegment)) {
    return false;
  }
  if (extractNormalizedPostcode(firstSegment)) {
    return false;
  }
  return true;
};

const normalizeSegments = (description: string) =>
  description
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);

const getAddressSegmentIndex = (segments: string[]) =>
  segments.findIndex((segment) => {
    const normalized = segment.toLowerCase();
    const words = normalized.split(/\s+/).filter(Boolean);
    const lastWord = words[words.length - 1];
    if (ADDRESS_KEYWORDS.has(lastWord)) {
      return true;
    }
    return /^\d+[a-z]?\s+[a-z]/i.test(normalized);
  });

const formatAddressLabel = (description: string) => {
  const segments = normalizeSegments(description);
  if (segments.length === 0) {
    return description;
  }

  const withoutCountry =
    segments.length > 1 &&
    ["uk", "united kingdom"].includes(
      segments[segments.length - 1].toLowerCase(),
    )
      ? segments.slice(0, -1)
      : segments;

  const addressIndex = getAddressSegmentIndex(withoutCountry);
  const addressSegments =
    addressIndex >= 0 ? withoutCountry.slice(addressIndex) : withoutCountry;

  if (addressSegments.length === 0) {
    return description;
  }

  // Preserve the door number in the address segment
  return addressSegments.join(", ");
};

export function PlaceLookup({
  businessType,
  onPlaceSelected,
  disabled = false,
  debounceMs = 500,
  forceVisible = false,
  mode = "business",
  label = "Find Place Here",
  inputId = "placeLookup",
  inputAriaLabel = "Find place here",
  placeholder = "Start typing address or place, for example 1 Fairhaven Street",
}: PlaceLookupProps) {
  const isVisible =
    forceVisible ||
    ELIGIBLE_BUSINESS_TYPES.has(normalizeBusinessType(businessType));
  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [results, setResults] = React.useState<PlaceLookupOption[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!isVisible) {
      setQuery("");
      setDebouncedQuery("");
      setResults([]);
      setSelectedPlaceId("");
      setError("");
      setIsLoading(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [query, debounceMs, isVisible]);

  React.useEffect(() => {
    if (!isVisible || debouncedQuery.length < MIN_QUERY_LENGTH) {
      setIsLoading(false);
      setError("");
      setResults([]);
      return;
    }

    let isActive = true;

    const searchPlaces = async () => {
      setIsLoading(true);
      setError("");
      try {
        const response = await api.get(
          `/geo/autocomplete?query=${encodeURIComponent(debouncedQuery)}`,
        );
        const responseData = response.data?.data as
          | PlaceLookupOption[]
          | undefined;

        if (!isActive) return;

        if (Array.isArray(responseData)) {
          setResults(responseData);
          return;
        }

        setResults([]);
        setError("Unable to load place matches.");
      } catch (error: unknown) {
        if (!isActive) return;
        const axiosError = error as AxiosError<{ message?: string | string[] }>;
        if (axiosError.response?.status === 429) {
          setResults([]);
          setError(
            "Too many requests from address provider. Please try again.",
          );
          return;
        }
        setResults([]);
        setError("Unable to load place matches.");
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void searchPlaces();

    return () => {
      isActive = false;
    };
  }, [debouncedQuery, isVisible]);

  const filteredResults = React.useMemo(() => {
    const trimmedQuery = query.trim();
    const queryPostcode = extractNormalizedPostcode(trimmedQuery);

    const baseFiltered = results.filter((place) =>
      place.description.toLowerCase().includes(trimmedQuery.toLowerCase()),
    );

    if (mode !== "address") {
      if (!queryPostcode) {
        return baseFiltered;
      }

      return baseFiltered.filter((place) => {
        const placePostcode = extractNormalizedPostcode(place.description);
        if (!placePostcode || placePostcode !== queryPostcode) {
          return false;
        }
        const isSoleTrader = ELIGIBLE_BUSINESS_TYPES.has(
          normalizeBusinessType(businessType),
        );
        return isLikelyBusinessResult(place.description, isSoleTrader);
      });
    }

    if (!queryPostcode) {
      return baseFiltered;
    }

    return baseFiltered.filter((place) => {
      const placePostcode = extractNormalizedPostcode(place.description);
      return placePostcode === queryPostcode;
    });
  }, [results, query, mode, businessType]);

  if (!isVisible) {
    return null;
  }

  return (
    <Field>
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      <div className="flex flex-col gap-2">
        <InputGroup>
          <InputGroupInput
            id={inputId}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            aria-label={inputAriaLabel}
          />
          <InputGroupAddon align="inline-end">
            {isLoading ? (
              <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
            ) : (
              <SearchIcon className="size-4 text-muted-foreground" />
            )}
          </InputGroupAddon>
        </InputGroup>

        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : query.trim().length >= MIN_QUERY_LENGTH ? (
          filteredResults.length > 0 ? (
            <div className="max-h-56 overflow-y-auto rounded-lg border border-border bg-background">
              {filteredResults.map((place) => {
                const isSelected = selectedPlaceId === place.placeId;
                const displayLabel =
                  mode === "address"
                    ? formatAddressLabel(place.description)
                    : place.description;
                return (
                  <Button
                    key={place.placeId}
                    type="button"
                    variant="ghost"
                    className="h-auto w-full justify-start rounded-none px-3 py-2 text-left"
                    onClick={() => {
                      setSelectedPlaceId(place.placeId);
                      onPlaceSelected(place);
                      setQuery("");
                      setDebouncedQuery("");
                      setResults([]);
                      setError("");
                    }}
                    aria-pressed={isSelected}
                  >
                    <span className="flex flex-col gap-1">
                      <span className="text-sm font-medium">
                        {displayLabel}
                      </span>
                      {place.provider &&
                      place.provider.toLowerCase() !== "postcodes.io" ? (
                        <span className="text-xs text-muted-foreground">
                          {place.provider}
                        </span>
                      ) : null}
                    </span>
                  </Button>
                );
              })}
            </div>
          ) : !isLoading ? (
            <p className="rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
              {extractNormalizedPostcode(query)
                ? mode === "address"
                  ? "No addresses found for this query."
                  : "No businesses found for this postcode."
                : "No places found for this query."}
            </p>
          ) : null
        ) : (
          <p className="text-xs text-muted-foreground">
            Start typing address or place, for example 1 Fairhaven Street.
          </p>
        )}
      </div>
    </Field>
  );
}
