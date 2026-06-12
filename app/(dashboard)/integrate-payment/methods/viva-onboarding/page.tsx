"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, ArrowRight, CreditCard, Info } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  ColumnDef,
} from "@tanstack/react-table";

type StoreBusinessRecord = {
  id: string;
  name?: string;
  companyName?: string;
  status: string;
  companyEmail?: string;
  companyPhone?: string;
  createdAt?: string;
  updatedAt?: string;
  vivaAccountId?: string;
  userId?: string;
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

// Extends the base record with our mocked Viva fields
type Store = StoreBusinessRecord & {
  vivaStatus: string;
  kycStatus: string;
  terminalOrder: string;
};

const VivaStatusBadge = ({ status }: { status: string }) => {
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

export default function VivaOnboardingPage() {
  const router = useRouter();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [localStoreOverrides, setLocalStoreOverrides] = useState<
    Record<string, { vivaStatus?: string; vivaAccountId?: string }>
  >({});

  // Data table state
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchInput] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom] = useState("");
  const [dateTo] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 350);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const { data } = useQuery<StoreListResponse>({
    queryKey: [
      "viva-onboarding-records",
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

  const handleSelect = useCallback(
    async (store: Store) => {
      try {
        setProcessingId(store.id);

        const payload = {
          email: store.companyEmail || "demo@divepos.com",
          companyName: store.companyName || store.name || "Demo Company",
          businessId: store.id,
        };

        const response = await api.post(
          "/viva/onboarding/create-account",
          payload,
        );
        const data = response.data;

        setLocalStoreOverrides((prev) => ({
          ...prev,
          [store.id]: {
            vivaStatus: "Waiting KYC",
            vivaAccountId: data.data?.accountId || "acct_8vbj1skdr",
          },
        }));

        if (data.demo) {
          toast.info("Viva Demo Onboarding", {
            description: "Opening Viva demo onboarding page...",
            duration: 5000,
          });
          console.log("DEMO ACCOUNT CREATED:", data.data);
          console.log("DEMO INSTRUCTIONS:", data.demo);

          setTimeout(() => {
            if (data.data?.onboardingUrl) {
              window.open(data.data.onboardingUrl, "_blank");
            }
          }, 1000);
        } else if (data.data?.onboardingUrl) {
          toast.success("Redirecting to Viva Onboarding...");
          window.location.href = data.data.onboardingUrl;
        }
      } catch (error) {
        toast.error("Failed to connect to Viva Wallet");
        console.error(error);
      } finally {
        setProcessingId(null);
      }
    },
    [router],
  );

  // Merge server data with local mocked statuses for Viva
  const stores = useMemo<Store[]>(() => {
    if (!data?.data) return [];
    return data.data.map((record) => ({
      ...record,
      vivaStatus:
        localStoreOverrides[record.id]?.vivaStatus ||
        (record.vivaAccountId ? "Waiting KYC" : "Pending"),
      vivaAccountId:
        localStoreOverrides[record.id]?.vivaAccountId || record.vivaAccountId,
      kycStatus: "Not Started",
      terminalOrder: "Pending",
    }));
  }, [data?.data, localStoreOverrides]);

  const columns = useMemo<ColumnDef<Store>[]>(
    () => [
      {
        accessorKey: "id",
        header: "Business/Store ID",
        cell: ({ row }) => (
          <span
            className="font-mono text-xs text-muted-foreground"
            title={row.original.id}
          >
            {row.original.id ? `${row.original.id.slice(0, 8)}...` : "N/A"}
          </span>
        ),
      },
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
        accessorKey: "vivaAccountId",
        header: "Viva Account ID",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.vivaAccountId || "Not linked"}
          </span>
        ),
      },
      {
        accessorKey: "userId",
        header: "Tenant ID",
        cell: ({ row }) => (
          <span
            className="font-mono text-xs text-muted-foreground"
            title={row.original.userId}
          >
            {row.original.userId
              ? `${row.original.userId.slice(0, 8)}...`
              : "N/A"}
          </span>
        ),
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
        accessorKey: "vivaStatus",
        header: "Viva Wallet",
        cell: ({ row }) => <VivaStatusBadge status={row.original.vivaStatus} />,
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
          const isPending = store.vivaStatus === "Pending";
          const isProcessing = processingId === store.id;

          return (
            <div className="text-right">
              <Button
                size="sm"
                variant={isPending ? "default" : "secondary"}
                onClick={() => handleSelect(store)}
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
    [processingId, handleSelect],
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
                Viva Onboarding
              </h1>
              <p className="text-base text-muted-foreground mt-1">
                Select a submitted store to begin the Viva Wallet connection and
                verification process.
              </p>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 px-5 py-4 text-sm text-foreground relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary/50" />
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <p className="text-foreground/90 leading-relaxed text-[14px]">
            Only stores with{" "}
            <span className="font-semibold text-foreground">ACTIVE</span> status
            are eligible for Viva Wallet integration. Click{" "}
            <span className="font-semibold text-foreground">Connect</span> on a
            store to begin the onboarding flow.
            <br />
            <span className="text-muted-foreground text-xs block mt-1">
              Note: In the Demo environment, you will be required to manually
              link the provided Account ID in the Viva Demo Portal.
            </span>
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
                  for Viva integration
                </CardDescription>
              </div>
              <Badge
                variant="secondary"
                className="font-medium bg-background border px-3 py-1 text-sm"
              >
                {stores.filter((s) => s.vivaStatus === "Connected").length}{" "}
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
