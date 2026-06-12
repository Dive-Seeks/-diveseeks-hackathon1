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
import api from "@/lib/api";

export type CompanyLookupOption = {
  companyNumber: string;
  companyName: string;
  addressSnippet?: string;
};

type CompanyLookupResponse = {
  success?: boolean;
  data?: CompanyLookupOption[];
};

interface CompanyLookupProps {
  businessType: string;
  onCompanySelected: (company: CompanyLookupOption) => void;
  disabled?: boolean;
  debounceMs?: number;
}

const ELIGIBLE_BUSINESS_TYPES = new Set([
  "limited company",
  "ltd company",
  "partnership",
  "llp",
]);

const normalizeBusinessType = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

export function CompanyLookup({
  businessType,
  onCompanySelected,
  disabled = false,
  debounceMs = 500,
}: CompanyLookupProps) {
  const isVisible = ELIGIBLE_BUSINESS_TYPES.has(
    normalizeBusinessType(businessType),
  );
  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [results, setResults] = React.useState<CompanyLookupOption[]>([]);
  const [selectedCompanyNumber, setSelectedCompanyNumber] =
    React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!isVisible) {
      setQuery("");
      setDebouncedQuery("");
      setResults([]);
      setSelectedCompanyNumber("");
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
    if (!isVisible || debouncedQuery.length < 3) {
      setIsLoading(false);
      setError("");
      setResults([]);
      return;
    }

    let isActive = true;

    const searchCompanies = async () => {
      setIsLoading(true);
      setError("");
      try {
        const response = await api.get(
          `/setup-business/companies/search?q=${encodeURIComponent(debouncedQuery)}`,
        );
        const responseData = response.data?.data as
          | CompanyLookupResponse
          | undefined;

        if (!isActive) return;

        if (responseData?.success && Array.isArray(responseData.data)) {
          setResults(responseData.data);
          return;
        }

        setResults([]);
        setError("Unable to load company matches.");
      } catch {
        if (!isActive) return;
        setResults([]);
        setError("Unable to load company matches.");
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void searchCompanies();

    return () => {
      isActive = false;
    };
  }, [debouncedQuery, isVisible]);

  const filteredResults = React.useMemo(
    () =>
      results.filter((company) =>
        company.companyName.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [results, query],
  );

  if (!isVisible) {
    return null;
  }

  return (
    <Field>
      <FieldLabel htmlFor="companyLookup">Find Company Here</FieldLabel>
      <div className="flex flex-col gap-2">
        <InputGroup>
          <InputGroupInput
            id="companyLookup"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search official company records"
            disabled={disabled}
            aria-label="Find company here"
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
        ) : query.trim().length >= 3 ? (
          filteredResults.length > 0 ? (
            <div className="max-h-56 overflow-y-auto rounded-lg border border-border bg-background">
              {filteredResults.map((company) => {
                const isSelected =
                  selectedCompanyNumber === company.companyNumber;
                return (
                  <Button
                    key={company.companyNumber}
                    type="button"
                    variant="ghost"
                    className="h-auto w-full justify-start rounded-none px-3 py-2 text-left"
                    onClick={() => {
                      setSelectedCompanyNumber(company.companyNumber);
                      onCompanySelected(company);
                      setQuery("");
                      setDebouncedQuery("");
                      setResults([]);
                      setError("");
                    }}
                    aria-pressed={isSelected}
                  >
                    <span className="flex flex-col gap-1">
                      <span className="text-sm font-medium">
                        {company.companyName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {company.companyNumber}
                        {company.addressSnippet
                          ? ` • ${company.addressSnippet}`
                          : ""}
                      </span>
                    </span>
                  </Button>
                );
              })}
            </div>
          ) : !isLoading ? (
            <p className="rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
              No companies found for this query.
            </p>
          ) : null
        ) : (
          <p className="text-xs text-muted-foreground">
            Type at least 3 characters to search.
          </p>
        )}
      </div>
    </Field>
  );
}
