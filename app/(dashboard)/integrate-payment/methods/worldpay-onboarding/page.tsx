"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Loader2,
  ArrowRight,
  CreditCard,
  Info,
  SearchIcon,
  DownloadIcon,
  ArrowUpDownIcon,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { extractApiError } from "@/lib/api/errors";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  ColumnDef,
} from "@tanstack/react-table";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

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
};

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

// Extends the base record with our mocked Worldpay fields
type Store = StoreBusinessRecord & {
  worldpayStatus: string;
  kycStatus: string;
  terminalOrder: string;
};

const WorldpayStatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case "Pending":
      return (
        <Badge
          variant="outline"
          className="bg-muted text-foreground border-border"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-foreground mr-2 animate-pulse" />
          Pending
        </Badge>
      );
    case "Waiting KYC":
      return (
        <Badge
          variant="outline"
          className="bg-muted text-foreground border-border"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-foreground mr-2 animate-pulse" />
          Waiting KYC
        </Badge>
      );
    case "Connected":
      return (
        <Badge
          variant="outline"
          className="bg-muted text-foreground border-border"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-foreground mr-2" />
          Connected
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const KycStatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case "Not Started":
      return (
        <Badge variant="outline" className="text-muted-foreground bg-muted/20">
          Not Started
        </Badge>
      );
    case "In Progress":
      return (
        <Badge
          variant="outline"
          className="bg-muted text-foreground border-border"
        >
          In Progress
        </Badge>
      );
    case "Approved":
      return (
        <Badge
          variant="outline"
          className="bg-muted text-foreground border-border"
        >
          Approved
        </Badge>
      );
    case "Rejected":
      return <Badge variant="destructive">Rejected</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export default function WorldpayOnboardingPage() {
  const router = useRouter();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [localStoreOverrides, setLocalStoreOverrides] = useState<
    Record<string, { worldpayStatus?: string }>
  >({});

  // Data table state
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 350);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const { data } = useQuery<StoreListResponse>({
    queryKey: [
      "worldpay-onboarding-records",
      "submitted",
      page,
      limit,
      search,
      dateFrom,
      dateTo,
    ],
    queryFn: async () => {
      const response = await api.get(`/businesses/store/submitted`, {
        params: {
          page,
          limit,
          search: search || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        },
      });
      return response.data.data as StoreListResponse;
    },
    staleTime: 30_000,
  });

  const meta = data?.meta;
  const totalPages = Math.max(meta?.totalPages ?? 1, 1);

  const onExport = async () => {
    try {
      const response = await api.get(`/businesses/store/submitted/export`, {
        params: {
          search: search || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(
        new Blob([response.data], { type: "text/csv" }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `worldpay-onboarding-stores.csv`;
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

  const handleSelect = async (storeId: string) => {
    setProcessingId(storeId);

    // Simulate API call to initiate Worldpay connection
    setTimeout(() => {
      setLocalStoreOverrides((prev) => ({
        ...prev,
        [storeId]: { ...prev[storeId], worldpayStatus: "Waiting KYC" },
      }));
      setProcessingId(null);

      // Redirect to KYC page after simulated processing
      router.push("/integrate-payment/kyc");
    }, 1500);
  };

  // Merge server data with local mocked statuses for Worldpay
  const stores = useMemo<Store[]>(() => {
    if (!data?.data) return [];
    return data.data.map((record) => ({
      ...record,
      worldpayStatus:
        localStoreOverrides[record.id]?.worldpayStatus || "Pending",
      kycStatus: "Not Started",
      terminalOrder: "Pending",
    }));
  }, [data?.data, localStoreOverrides]);

  const columns = useMemo<ColumnDef<Store>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Business Name",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name || "N/A"}</span>
        ),
      },
      {
        accessorKey: "companyName",
        header: "Company Name",
        cell: ({ row }) => <span>{row.original.companyName || "N/A"}</span>,
      },
      {
        id: "siteName",
        header: "Site Name",
        cell: ({ row }) => {
          const primarySite =
            row.original.sites?.find((s) => !!s.name) ||
            row.original.sites?.[0];
          return <span>{primarySite?.name || "N/A"}</span>;
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant="outline">{row.original.status}</Badge>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) => (
          <span>
            {row.original.createdAt
              ? new Date(row.original.createdAt).toLocaleDateString()
              : "N/A"}
          </span>
        ),
      },
      {
        accessorKey: "updatedAt",
        header: "Updated",
        cell: ({ row }) => (
          <span>
            {row.original.updatedAt
              ? new Date(row.original.updatedAt).toLocaleDateString()
              : "N/A"}
          </span>
        ),
      },
      {
        accessorKey: "companyEmail",
        header: "Company Email",
        cell: ({ row }) => <span>{row.original.companyEmail || "N/A"}</span>,
      },
      {
        accessorKey: "companyPhone",
        header: "Company Phone",
        cell: ({ row }) => <span>{row.original.companyPhone || "N/A"}</span>,
      },
      {
        accessorKey: "worldpayStatus",
        header: "Worldpay",
        cell: ({ row }) => (
          <WorldpayStatusBadge status={row.original.worldpayStatus} />
        ),
      },
      {
        accessorKey: "kycStatus",
        header: "KYC",
        cell: ({ row }) => <KycStatusBadge status={row.original.kycStatus} />,
      },
      {
        accessorKey: "terminalOrder",
        header: "Terminal",
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className="text-muted-foreground font-normal bg-muted/20"
          >
            {row.original.terminalOrder}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right sr-only">Action</div>,
        cell: ({ row }) => {
          const store = row.original;
          const isPending = store.worldpayStatus === "Pending";
          const isProcessing = processingId === store.id;

          return (
            <div className="text-right">
              <Button
                size="sm"
                variant={isPending ? "default" : "secondary"}
                onClick={() => handleSelect(store.id)}
                disabled={isProcessing || !isPending}
                className={`gap-2 min-w-[100px] transition-all ${!isPending ? "bg-muted/50 text-muted-foreground hover:bg-muted/80" : ""}`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Connecting
                  </>
                ) : isPending ? (
                  <>
                    Connect
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                ) : (
                  "Manage"
                )}
              </Button>
            </div>
          );
        },
      },
    ],
    [processingId],
  );

  const table = useReactTable({
    data: stores,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex-1 min-h-screen bg-background/50">
      <div className="max-w-7xl mx-auto space-y-8 p-4 md:p-8 pt-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
              <CreditCard className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Worldpay Onboarding
              </h1>
              <p className="text-base text-muted-foreground mt-1">
                Select a submitted store to begin the Worldpay connection and
                KYC verification process.
              </p>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 px-5 py-4 text-sm text-primary-foreground/80 dark:text-primary-foreground relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary/50" />
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <p className="text-foreground/90 leading-relaxed text-[14px]">
            Only stores with{" "}
            <span className="font-semibold text-foreground">ACTIVE</span> status
            are eligible for Worldpay integration. Click{" "}
            <span className="font-semibold text-foreground">Connect</span> on a
            store to begin the onboarding flow.
          </p>
        </div>

        {/* Table Card */}
        <Card className="border-border/40 overflow-hidden bg-card/50 backdrop-blur-sm transition-all duration-200">
          <CardHeader className="bg-muted/5 border-b border-border/40 pb-5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-semibold tracking-tight">
                  Submitted Stores
                </CardTitle>
                <CardDescription className="mt-1.5 text-base">
                  {stores.length} store{stores.length !== 1 ? "s" : ""} eligible
                  for Worldpay integration
                </CardDescription>
              </div>
              <Badge
                variant="secondary"
                className="font-medium bg-background border px-3 py-1 text-sm"
              >
                {stores.filter((s) => s.worldpayStatus === "Connected").length}{" "}
                Connected
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => {
                        return (
                          <TableHead key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext(),
                                )}
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && "selected"}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="h-32 text-center text-muted-foreground"
                      >
                        No stores found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
