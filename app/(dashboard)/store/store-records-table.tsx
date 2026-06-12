"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  DownloadIcon,
  SearchIcon,
  ArrowUpDownIcon,
  CalendarIcon,
  EyeIcon,
  PencilIcon,
  Trash2Icon,
  Loader2Icon,
} from "lucide-react";
import { toast } from "sonner";

import api from "@/lib/api";
import { extractApiError } from "@/lib/api/errors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

type StoreStatus = "incomplete" | "submitted";
type SortOrder = "ASC" | "DESC";
type SortBy = "name" | "companyName" | "status" | "createdAt" | "updatedAt";

type StoreBusinessRecord = {
  id: string;
  name?: string;
  companyName?: string;
  status: string;
  companyEmail?: string;
  companyPhone?: string;
  createdAt?: string;
  updatedAt?: string;
  sites?: Array<{
    id?: string;
    name?: string;
  }>;
  stores?: Array<{
    id?: string;
    name?: string;
  }>;
};

type StoreBusinessDetails = StoreBusinessRecord & {
  businessType?: string;
  registrationNumber?: string;
  region?: string;
};

type SetupBusinessDetails = {
  id: string;
  name?: string;
  companyName?: string;
  businessType?: string;
  registrationNumber?: string;
  companyEmail?: string;
  companyPhone?: string;
  region?: string;
  status?: string;
  registeredAddress?: {
    street?: string;
    locality?: string;
    region?: string;
    postalCode?: string;
  } | null;
  directors?: Array<{
    firstName?: string;
    lastName?: string;
    dob?: string;
    email?: string;
    phone?: string;
    residentialAddress?: {
      street?: string;
      locality?: string;
      region?: string;
      postalCode?: string;
    } | null;
  }>;
  bankDetails?: {
    id?: string;
    maskedPreview?: Record<string, unknown>;
  } | null;
  sites?: Array<{
    id?: string;
    name?: string;
    currency?: string;
    is_24_7?: boolean;
    updatedAt?: string;
    storeAddress?: {
      street?: string;
      locality?: string;
      region?: string;
      postalCode?: string;
    } | null;
    operatingHours?: Array<{
      day?: string;
      open_time?: string;
      close_time?: string;
    }>;
    holidays?: Array<{
      name?: string;
      date?: string;
      is_closed?: boolean;
      open_time?: string | null;
      close_time?: string | null;
    }>;
  }>;
  stores?: Array<{
    id?: string;
    name?: string;
    currency?: string;
    is_24_7?: boolean;
    updatedAt?: string;
    storeAddress?: {
      street?: string;
      locality?: string;
      region?: string;
      postalCode?: string;
    } | null;
    operatingHours?: Array<{
      day?: string;
      open_time?: string;
      close_time?: string;
    }>;
    holidays?: Array<{
      name?: string;
      date?: string;
      is_closed?: boolean;
      open_time?: string | null;
      close_time?: string | null;
    }>;
  }>;
};

type BankDetailsResponse = {
  decryptedPayload?: Record<string, unknown>;
};

type SetupStepView = {
  key: string;
  title: string;
  complete: boolean;
  missingFields: string[];
};

type SetupSite = NonNullable<SetupBusinessDetails["sites"]>[number];

type StoreListResponse = {
  data: StoreBusinessRecord[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
};

const headers: Array<{ key: SortBy; label: string }> = [
  { key: "name", label: "Business Name" },
  { key: "companyName", label: "Company Name" },
  { key: "status", label: "Status" },
  { key: "createdAt", label: "Created" },
  { key: "updatedAt", label: "Updated" },
];

export function StoreRecordsTable({
  status,
  title,
  description,
}: {
  status: StoreStatus;
  title: string;
  description: string;
}) {
  const router = useRouter();
  const [page, setPage] = React.useState(1);
  const [limit] = React.useState(10);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [sortBy, setSortBy] = React.useState<SortBy>("createdAt");
  const [sortOrder, setSortOrder] = React.useState<SortOrder>("DESC");
  const [viewOpen, setViewOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [selectedRecord, setSelectedRecord] =
    React.useState<StoreBusinessRecord | null>(null);
  const [detailRecord, setDetailRecord] =
    React.useState<StoreBusinessDetails | null>(null);
  const [setupDetails, setSetupDetails] =
    React.useState<SetupBusinessDetails | null>(null);
  const [bankPayload, setBankPayload] = React.useState<Record<
    string,
    unknown
  > | null>(null);
  const [setupSteps, setSetupSteps] = React.useState<SetupStepView[]>([]);
  const [isDetailLoading, setIsDetailLoading] = React.useState(false);
  const [detailError, setDetailError] = React.useState("");
  const [rowActionLoadingId, setRowActionLoadingId] = React.useState<
    string | null
  >(null);
  const [isDeletePending, setIsDeletePending] = React.useState(false);
  const isIncompletePage = status === "incomplete";

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 350);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const { data, isLoading, isError, error, refetch, isFetching } =
    useQuery<StoreListResponse>({
      queryKey: [
        "store-records",
        status,
        page,
        limit,
        search,
        dateFrom,
        dateTo,
        sortBy,
        sortOrder,
      ],
      queryFn: async () => {
        const response = await api.get(`/businesses/store/${status}`, {
          params: {
            page,
            limit,
            search: search || undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
            sortBy,
            sortOrder,
          },
        });
        // Axios response body is in response.data. 
        // Backend TransformInterceptor wraps body in { data, statusCode, ... }
        // So we want the inner 'data' which contains { data: businesses[], meta }
        return response.data.data as StoreListResponse;
      },
      staleTime: 30_000,
    });

  const records = data?.data ?? [];
  const meta = data?.meta;
  const totalPages = Math.max(meta?.totalPages ?? 1, 1);

  const toggleSort = (column: SortBy) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "ASC" ? "DESC" : "ASC"));
      return;
    }
    setSortBy(column);
    setSortOrder("ASC");
  };

  const onExport = async () => {
    try {
      const response = await api.get(`/businesses/store/${status}/export`, {
        params: {
          search: search || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          sortBy,
          sortOrder,
        },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(
        new Blob([response.data], { type: "text/csv" }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `stores-${status}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Export completed");
    } catch (exportError) {
      toast.error(
        extractApiError(exportError).message ||
          "Export failed. Please try again.",
      );
    }
  };

  const buildSetupStepView = React.useCallback(
    (details: SetupBusinessDetails): SetupStepView[] => {
      const legalMissing: string[] = [];
      if (!details.region?.trim()) legalMissing.push("Region");
      if (!details.name?.trim()) legalMissing.push("Business Name");
      if (!details.companyName?.trim()) legalMissing.push("Company Name");
      if (!details.businessType?.trim()) legalMissing.push("Business Type");
      if (!details.companyEmail?.trim()) legalMissing.push("Company Email");
      if (!details.companyPhone?.trim()) legalMissing.push("Company Phone");
      if (!details.registeredAddress?.street?.trim())
        legalMissing.push("Registered Address");

      const ownerMissing: string[] = [];
      const directors = details.directors ?? [];
      if (directors.length === 0) {
        ownerMissing.push("At least one owner/director");
      } else {
        directors.forEach((director, index) => {
          const prefix = `Director ${index + 1}`;
          if (!director.firstName?.trim())
            ownerMissing.push(`${prefix} First Name`);
          if (!director.lastName?.trim())
            ownerMissing.push(`${prefix} Last Name`);
          if (!director.dob?.trim())
            ownerMissing.push(`${prefix} Date of Birth`);
          if (!director.email?.trim()) ownerMissing.push(`${prefix} Email`);
          if (!director.phone?.trim()) ownerMissing.push(`${prefix} Phone`);
          if (!director.residentialAddress?.street?.trim())
            ownerMissing.push(`${prefix} Address`);
        });
      }

      const bankMissing: string[] = [];
      const hasBankData =
        !!details.bankDetails?.id ||
        (!!details.bankDetails?.maskedPreview &&
          Object.keys(details.bankDetails.maskedPreview).length > 0);
      if (!hasBankData) {
        bankMissing.push("Bank account details");
      }

      const siteMissing: string[] = [];
      const sites = details.sites ?? [];
      if (sites.length === 0) {
        siteMissing.push("Site details");
      } else {
        const hasSiteName = sites.some((site) => !!site.name?.trim());
        const hasCurrency = sites.some((site) => !!site.currency?.trim());
        const hasAddress = sites.some(
          (site) => !!site.storeAddress?.street?.trim(),
        );
        const hasHours = sites.some(
          (site) => site.is_24_7 || (site.operatingHours?.length ?? 0) > 0,
        );
        if (!hasSiteName) siteMissing.push("Site Name");
        if (!hasCurrency) siteMissing.push("Currency");
        if (!hasAddress) siteMissing.push("Site Address");
        if (!hasHours) siteMissing.push("Operating Hours");
      }

      return [
        {
          key: "legal-information",
          title: "1. Legal Information",
          complete: legalMissing.length === 0,
          missingFields: legalMissing,
        },
        {
          key: "owners",
          title: "2. Owners",
          complete: ownerMissing.length === 0,
          missingFields: ownerMissing,
        },
        {
          key: "bank",
          title: "3. Bank",
          complete: bankMissing.length === 0,
          missingFields: bankMissing,
        },
        {
          key: "site",
          title: "4. Site",
          complete: siteMissing.length === 0,
          missingFields: siteMissing,
        },
      ];
    },
    [],
  );

  const formatAddress = React.useCallback(
    (
      address?: {
        street?: string;
        locality?: string;
        region?: string;
        postalCode?: string;
      } | null,
    ) => {
      const values = [
        address?.street,
        address?.locality,
        address?.region,
        address?.postalCode,
      ]
        .map((item) => (item || "").trim())
        .filter(Boolean);
      return values.length > 0 ? values.join(", ") : "N/A";
    },
    [],
  );

  const formatOperatingHours = React.useCallback((site?: SetupSite) => {
    if (!site) return "N/A";
    if (site.is_24_7) return "24/7";
    if ((site.operatingHours?.length ?? 0) === 0) return "N/A";
    return (
      site.operatingHours
        ?.map(
          (slot: { day?: string; open_time?: string; close_time?: string }) =>
            `${slot.day || "Day"} ${slot.open_time || "N/A"}-${slot.close_time || "N/A"}`,
        )
        .join(", ") || "N/A"
    );
  }, []);

  const formatHolidayHours = React.useCallback(
    (holiday?: {
      is_closed?: boolean;
      open_time?: string | null;
      close_time?: string | null;
    }) => {
      if (!holiday) return "N/A";
      if (holiday.is_closed) return "Closed";
      if (holiday.open_time && holiday.close_time)
        return `${holiday.open_time}-${holiday.close_time}`;
      return "N/A";
    },
    [],
  );

  const isProbablyEncryptedValue = React.useCallback((value: unknown) => {
    if (typeof value !== "string") return false;
    const normalized = value.trim();
    if (normalized.length < 24) return false;
    if (!/^[A-Za-z0-9+/=]+$/.test(normalized)) return false;
    return normalized.endsWith("=") || normalized.endsWith("==");
  }, []);

  const getBankEntriesForDisplay = React.useCallback(() => {
    const payloadEntries = Object.entries(bankPayload || {});
    if (payloadEntries.length === 0) {
      const maskedEntries = Object.entries(
        setupDetails?.bankDetails?.maskedPreview || {},
      );
      return maskedEntries;
    }
    const encryptedCount = payloadEntries.filter(([, value]) =>
      isProbablyEncryptedValue(value),
    ).length;
    if (encryptedCount === payloadEntries.length) {
      const maskedEntries = Object.entries(
        setupDetails?.bankDetails?.maskedPreview || {},
      );
      if (maskedEntries.length > 0) {
        return maskedEntries;
      }
    }
    return payloadEntries;
  }, [
    bankPayload,
    isProbablyEncryptedValue,
    setupDetails?.bankDetails?.maskedPreview,
  ]);

  const getHolidayRanges = React.useCallback(
    (
      holidays?: Array<{
        name?: string;
        date?: string;
        is_closed?: boolean;
        open_time?: string | null;
        close_time?: string | null;
      }>,
    ) => {
      if (!holidays || holidays.length === 0) return [];
      const normalized = holidays
        .filter((holiday) => !!holiday.date)
        .map((holiday) => ({
          ...holiday,
          date: holiday.date as string,
          holidayName: holiday.name?.trim() || "Holiday",
          holidayHours: formatHolidayHours(holiday),
        }))
        .sort((left, right) => left.date.localeCompare(right.date));
      if (normalized.length === 0) return [];
      const ranges: Array<{
        name: string;
        fromDate: string;
        toDate: string;
        hours: string;
      }> = [];
      for (const holiday of normalized) {
        const previous = ranges[ranges.length - 1];
        if (
          previous &&
          previous.name === holiday.holidayName &&
          previous.hours === holiday.holidayHours &&
          new Date(holiday.date).getTime() ===
            new Date(previous.toDate).getTime() + 24 * 60 * 60 * 1000
        ) {
          previous.toDate = holiday.date;
        } else {
          ranges.push({
            name: holiday.holidayName,
            fromDate: holiday.date,
            toDate: holiday.date,
            hours: holiday.holidayHours,
          });
        }
      }
      return ranges;
    },
    [formatHolidayHours],
  );

  const fetchRecordDetails = React.useCallback(
    async (recordId: string) => {
      setDetailError("");
      setIsDetailLoading(true);
      setRowActionLoadingId(recordId);
      try {
        const [setupResponse, relationsResponse, bankResponse] =
          await Promise.all([
            api.get(`/setup-business/${recordId}`),
            api.get(`/businesses/${recordId}/relations`).catch(() => null),
            api
              .get(`/setup-business/${recordId}/bank-details`)
              .catch(() => null),
          ]);
        const setupData = (setupResponse.data?.data ??
          setupResponse.data) as SetupBusinessDetails;
        const relationData = (relationsResponse?.data?.data ??
          relationsResponse?.data ??
          null) as SetupBusinessDetails | null;
        const details: SetupBusinessDetails = {
          ...(setupData || {}),
          ...(relationData || {}),
          directors:
            (relationData?.directors?.length ?? 0) >=
            (setupData?.directors?.length ?? 0)
              ? relationData?.directors
              : setupData?.directors,
          sites:
            (relationData?.sites?.length ?? 0) >=
            (setupData?.sites?.length ?? 0)
              ? relationData?.sites
              : setupData?.sites,
          bankDetails: relationData?.bankDetails?.id
            ? relationData.bankDetails
            : setupData?.bankDetails,
          registeredAddress: relationData?.registeredAddress?.street
            ? relationData.registeredAddress
            : setupData?.registeredAddress,
        };
        const bankData = bankResponse?.data?.data as
          | BankDetailsResponse
          | undefined;
        setDetailRecord({
          id: details.id,
          name: details.name,
          companyName: details.companyName,
          businessType: details.businessType,
          registrationNumber: details.registrationNumber,
          companyEmail: details.companyEmail,
          companyPhone: details.companyPhone,
          region: details.region,
          status: details.status || "N/A",
        });
        setSetupDetails(details);
        setBankPayload(bankData?.decryptedPayload ?? null);
        setSetupSteps(buildSetupStepView(details));
      } catch (requestError) {
        const message =
          extractApiError(requestError).message ||
          "Unable to load record details.";
        setDetailError(message);
        toast.error(message);
      } finally {
        setIsDetailLoading(false);
        setRowActionLoadingId(null);
      }
    },
    [buildSetupStepView],
  );

  const onOpenView = (record: StoreBusinessRecord) => {
    setSelectedRecord(record);
    setSetupDetails(null);
    setBankPayload(null);
    setSetupSteps([]);
    setViewOpen(true);
    void fetchRecordDetails(record.id);
  };

  const onOpenEdit = (record: StoreBusinessRecord) => {
    router.push(`/setup-business?businessId=${record.id}`);
  };

  const onOpenDelete = (record: StoreBusinessRecord) => {
    setSelectedRecord(record);
    setDeleteOpen(true);
  };

  const onConfirmDelete = async () => {
    if (!selectedRecord) {
      return;
    }
    setIsDeletePending(true);
    try {
      await api.delete(`/store/incomplete/${selectedRecord.id}`);
      setDeleteOpen(false);
      setSelectedRecord(null);
      setDetailRecord(null);
      setSetupDetails(null);
      setBankPayload(null);
      toast.success("Record deleted successfully");
      if (records.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        await refetch();
      }
    } catch (requestError) {
      toast.error(
        extractApiError(requestError).message ||
          "Delete failed. Please try again.",
      );
    } finally {
      setIsDeletePending(false);
    }
  };

  const errorMessage =
    extractApiError(error).message || "Unable to load store records right now.";

  const getPrimarySiteName = (record: StoreBusinessRecord) => {
    // Try to get name from stores first (setup-business internal store)
    // Then fallback to sites (POS channel)
    const storeName = record.stores?.[0]?.name;
    const siteName = record.sites?.[0]?.name;
    const name = storeName || siteName;
    return name && name.trim().length > 0 ? name : "N/A";
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-72">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by name or company"
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <CalendarIcon className="text-muted-foreground" />
              <Input
                type="date"
                value={dateFrom}
                onChange={(event) => {
                  setPage(1);
                  setDateFrom(event.target.value);
                }}
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(event) => {
                  setPage(1);
                  setDateTo(event.target.value);
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              Refresh
            </Button>
            <Button onClick={onExport} disabled={isFetching}>
              <DownloadIcon data-icon="inline-start" />
              Export CSV
            </Button>
          </div>
        </div>

        {isError ? (
          <Alert variant="destructive" className="mt-4">
            <AlertTitle>Failed to load records</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        {!isError && !isLoading && records.length === 0 ? (
          <div className="mt-4">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SearchIcon />
                </EmptyMedia>
                <EmptyTitle>No records found</EmptyTitle>
                <EmptyDescription>
                  No {status} records match your current search and date
                  filters.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchInput("");
                    setSearch("");
                    setDateFrom("");
                    setDateTo("");
                    setPage(1);
                  }}
                >
                  Clear filters
                </Button>
              </EmptyContent>
            </Empty>
          </div>
        ) : null}

        {!isError && records.length > 0 ? (
          <div className="mt-4 flex flex-col gap-4">
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {headers.map((header) => (
                      <React.Fragment key={header.key}>
                        <TableHead>
                          <Button
                            variant="ghost"
                            className="px-0"
                            onClick={() => toggleSort(header.key)}
                          >
                            {header.label}
                            <ArrowUpDownIcon data-icon="inline-end" />
                          </Button>
                        </TableHead>
                        {status === "submitted" &&
                        header.key === "companyName" ? (
                          <TableHead>Site Name</TableHead>
                        ) : null}
                      </React.Fragment>
                    ))}
                    <TableHead>Company Email</TableHead>
                    <TableHead>Company Phone</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {record.name || "N/A"}
                      </TableCell>
                      <TableCell>{record.companyName || "N/A"}</TableCell>
                      {status === "submitted" ? (
                        <TableCell>{getPrimarySiteName(record)}</TableCell>
                      ) : null}
                      <TableCell>
                        <Badge variant="outline">
                          {record.status === "PENDING_REVIEW"
                            ? "Pending Review"
                            : record.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {record.createdAt
                          ? new Date(record.createdAt).toLocaleDateString()
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        {record.updatedAt
                          ? new Date(record.updatedAt).toLocaleDateString()
                          : "N/A"}
                      </TableCell>
                      <TableCell>{record.companyEmail || "N/A"}</TableCell>
                      <TableCell>{record.companyPhone || "N/A"}</TableCell>
                      <TableCell className="text-right">
                        {isIncompletePage ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onOpenView(record)}
                              disabled={rowActionLoadingId === record.id}
                              aria-label={`View ${record.name || "store"} details`}
                              title="View details"
                            >
                              {rowActionLoadingId === record.id ? (
                                <Loader2Icon
                                  data-icon="inline-start"
                                  className="animate-spin"
                                />
                              ) : (
                                <EyeIcon data-icon="inline-start" />
                              )}
                              View
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => onOpenEdit(record)}
                              disabled={rowActionLoadingId === record.id}
                              aria-label={`Edit ${record.name || "store"} record`}
                              title="Edit record"
                            >
                              <PencilIcon data-icon="inline-start" />
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => onOpenDelete(record)}
                              aria-label={`Delete ${record.name || "store"} record`}
                              title="Delete record"
                            >
                              <Trash2Icon data-icon="inline-start" />
                              Delete
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onOpenView(record)}
                            disabled={rowActionLoadingId === record.id}
                            aria-label={`View ${record.name || "store"} details`}
                            title="View details"
                          >
                            {rowActionLoadingId === record.id ? (
                              <Loader2Icon
                                data-icon="inline-start"
                                className="animate-spin"
                              />
                            ) : (
                              <EyeIcon data-icon="inline-start" />
                            )}
                            View
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {meta?.totalItems ?? 0} total records
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={page <= 1 || isFetching}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={page >= totalPages || isFetching}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Store Details</DialogTitle>
            <DialogDescription>
              Review the full details for this incomplete record.
            </DialogDescription>
          </DialogHeader>
          {isDetailLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2Icon className="animate-spin" />
              Loading details...
            </div>
          ) : detailError ? (
            <Alert variant="destructive">
              <AlertTitle>Failed to load details</AlertTitle>
              <AlertDescription>{detailError}</AlertDescription>
            </Alert>
          ) : (
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="flex flex-col gap-4 text-sm">
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <span className="font-medium">Business Name:</span>{" "}
                    {detailRecord?.name || "N/A"}
                  </div>
                  <div>
                    <span className="font-medium">Company Name:</span>{" "}
                    {detailRecord?.companyName || "N/A"}
                  </div>
                  <div>
                    <span className="font-medium">Business Type:</span>{" "}
                    {detailRecord?.businessType || "N/A"}
                  </div>
                  <div>
                    <span className="font-medium">Registration Number:</span>{" "}
                    {detailRecord?.registrationNumber || "N/A"}
                  </div>
                  <div>
                    <span className="font-medium">Company Email:</span>{" "}
                    {detailRecord?.companyEmail || "N/A"}
                  </div>
                  <div>
                    <span className="font-medium">Company Phone:</span>{" "}
                    {detailRecord?.companyPhone || "N/A"}
                  </div>
                  <div>
                    <span className="font-medium">Region:</span>{" "}
                    {detailRecord?.region || "N/A"}
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>{" "}
                    {detailRecord?.status || "N/A"}
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  {setupSteps.map((step) => (
                    <div key={step.key} className="rounded-md border p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="font-medium">{step.title}</p>
                        <Badge variant="outline">
                          {step.complete ? "Complete" : "Incomplete"}
                        </Badge>
                      </div>
                      {step.key === "legal-information" ? (
                        <div className="grid grid-cols-1 gap-1 text-muted-foreground">
                          <div>
                            Registered Address:{" "}
                            {formatAddress(setupDetails?.registeredAddress)}
                          </div>
                          <div>
                            Company Email: {setupDetails?.companyEmail || "N/A"}
                          </div>
                          <div>
                            Company Phone: {setupDetails?.companyPhone || "N/A"}
                          </div>
                        </div>
                      ) : null}
                      {step.key === "owners" ? (
                        <div className="flex flex-col gap-2">
                          {(setupDetails?.directors?.length ?? 0) > 0 ? (
                            setupDetails?.directors?.map((director, index) => (
                              <div
                                key={`${director.email || "director"}-${index}`}
                                className="rounded-sm border p-2 text-muted-foreground"
                              >
                                <div>
                                  Name:{" "}
                                  {[director.firstName, director.lastName]
                                    .filter(Boolean)
                                    .join(" ") || "N/A"}
                                </div>
                                <div>DOB: {director.dob || "N/A"}</div>
                                <div>Email: {director.email || "N/A"}</div>
                                <div>Phone: {director.phone || "N/A"}</div>
                                <div>
                                  Address:{" "}
                                  {formatAddress(director.residentialAddress)}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-muted-foreground">
                              No owner/director details available.
                            </div>
                          )}
                        </div>
                      ) : null}
                      {step.key === "bank" ? (
                        <div className="grid grid-cols-1 gap-1 text-muted-foreground">
                          {getBankEntriesForDisplay().length > 0 ? (
                            getBankEntriesForDisplay().map(([key, value]) => (
                              <div key={key}>
                                {key}: {String(value || "N/A")}
                              </div>
                            ))
                          ) : (
                            <div>Bank details are not available.</div>
                          )}
                        </div>
                      ) : null}
                      {step.key === "site" ? (
                        <div className="flex flex-col gap-2 text-muted-foreground">
                          {(setupDetails?.sites?.length ?? 0) > 0 || (setupDetails?.stores?.length ?? 0) > 0 ? (
                            (() => {
                              // Use stores for rich data (address, hours) if available, 
                              // otherwise fallback to sites for basic channel info.
                              const primaryStore = setupDetails?.stores?.[0];
                              
                              const displaySites = (setupDetails?.sites ?? []).map(site => {
                                // Find a matching store by name or just use the primary store as a reference for shared details
                                return {
                                  ...site,
                                  currency: site.currency || primaryStore?.currency,
                                  storeAddress: site.storeAddress || primaryStore?.storeAddress,
                                  operatingHours: site.operatingHours || primaryStore?.operatingHours,
                                  holidays: site.holidays || primaryStore?.holidays,
                                  is_24_7: site.is_24_7 ?? primaryStore?.is_24_7
                                };
                              });

                              return [...displaySites]
                                .sort((left, right) => {
                                  const leftTime = left.updatedAt
                                    ? new Date(left.updatedAt).getTime()
                                    : 0;
                                  const rightTime = right.updatedAt
                                    ? new Date(right.updatedAt).getTime()
                                    : 0;
                                  return rightTime - leftTime;
                                })
                                .map((site, siteIndex) => (
                                  <div
                                    key={`${site.id || site.name || "site"}-${siteIndex}`}
                                    className="rounded-sm border p-2"
                                  >
                                    <div className="font-medium text-foreground">
                                      Site {siteIndex + 1}
                                    </div>
                                    <div>Site Name: {site.name || "N/A"}</div>
                                    <div>Currency: {site.currency || "N/A"}</div>
                                    <div>
                                      Site Address:{" "}
                                      {formatAddress(site.storeAddress)}
                                    </div>
                                    <div>
                                      Operating Hours:{" "}
                                      {formatOperatingHours(site as any)}
                                    </div>
                                    <div>
                                      Holidays:{" "}
                                      {(site.holidays?.length ?? 0) > 0
                                        ? getHolidayRanges(site.holidays)
                                            .map((range) =>
                                              range.fromDate === range.toDate
                                                ? `${range.name} (${range.fromDate}) - ${range.hours}`
                                                : `${range.name} (${range.fromDate} to ${range.toDate}) - ${range.hours}`,
                                            )
                                            .join(", ")
                                        : "N/A"}
                                    </div>
                                  </div>
                                ));
                            })()
                          ) : (
                            <div>No site details available.</div>
                          )}
                        </div>
                      ) : null}
                      {step.missingFields.length > 0 ? (
                        <div className="mt-2 text-muted-foreground">
                          Missing: {step.missingFields.join(", ")}
                        </div>
                      ) : (
                        <div className="mt-2 text-muted-foreground">
                          All required fields are available.
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {!setupDetails ? (
                  <Alert>
                    <AlertTitle>No setup details found</AlertTitle>
                    <AlertDescription>
                      The selected record does not have extended setup data yet.
                    </AlertDescription>
                  </Alert>
                ) : null}
              </div>
            </ScrollArea>
          )}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Close
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this record?</AlertDialogTitle>
            <AlertDialogDescription>
              This action permanently removes the incomplete store record and
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletePending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmDelete}
              disabled={isDeletePending}
              variant="destructive"
            >
              {isDeletePending ? (
                <Loader2Icon
                  data-icon="inline-start"
                  className="animate-spin"
                />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
