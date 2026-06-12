"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LiveDataTable } from "./live-data-table";
import { LiveStatCard } from "./live-stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package,
  ShoppingCart,
  UtensilsCrossed,
  Store,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  Globe,
  ExternalLink,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button, buttonVariants } from "@/components/ui/button";
import api from "@/lib/api";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Types
type Site = {
  id: string;
  name: string;
  region: string;
  postalCode: string;
  status: "online" | "offline";
  type: "ecommerce" | "restaurant" | "retail";
  webAppUrl?: string;
};

type EcommerceOrder = {
  id: string;
  customer: { name: string; avatar: string; email: string };
  status: "completed" | "processing" | "shipped" | "cancelled";
  total: number;
  date: string;
};

type RestaurantOrder = {
  id: string;
  table: string;
  items: string;
  status: "ready" | "preparing" | "served" | "pending";
  total: number;
  time: string;
};

type Product = {
  id: string;
  name: string;
  sku: string;
  stock: number;
  price: number;
  category: string;
  status: "in-stock" | "low-stock" | "out-of-stock";
};

type BusinessSite = {
  id: string;
  name: string;
  currency?: string;
  storeAddress?: {
    region?: string;
  };
};

type Business = {
  id: string;
  name?: string;
  businessType?: string;
  status?: string;
  registeredAddress?: {
    region?: string;
  };
  sites?: BusinessSite[];
};

type PaginatedBusinesses = {
  data: Business[];
  meta?: {
    totalPages?: number;
  };
};

// We will fetch real data from the API in the component

// Column Definitions
const ecommerceColumns: ColumnDef<EcommerceOrder>[] = [
  {
    accessorKey: "id",
    header: "Order ID",
    cell: ({ row }) => (
      <span className="font-mono font-medium text-foreground">
        {row.getValue("id")}
      </span>
    ),
  },
  {
    accessorKey: "customer",
    header: "Customer",
    cell: ({ row }) => {
      const customer = row.original.customer;
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={customer.avatar} />
            <AvatarFallback>{customer.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground">
              {customer.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {customer.email}
            </span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <Badge
          variant="outline"
          className={cn(
            "capitalize px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider",
            status === "completed" &&
              "bg-muted text-foreground border-border",
            status === "processing" &&
              "bg-muted text-muted-foreground border-border",
            status === "shipped" &&
              "bg-muted text-foreground border-border",
            status === "cancelled" &&
              "bg-destructive/10 text-destructive border-destructive/20",
          )}
        >
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "total",
    header: "Total",
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("total"));
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount);
      return <div className="font-semibold text-foreground">{formatted}</div>;
    },
  },
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.getValue("date")}
      </span>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(row.original.id)}
              >
                Copy Order ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>View Details</DropdownMenuItem>
              <DropdownMenuItem>Update Status</DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

const restaurantColumns: ColumnDef<RestaurantOrder>[] = [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => (
      <span className="font-mono text-foreground">{row.getValue("id")}</span>
    ),
  },
  {
    accessorKey: "table",
    header: "Table",
    cell: ({ row }) => (
      <Badge variant="secondary" className="font-bold">
        {row.getValue("table")}
      </Badge>
    ),
  },
  {
    accessorKey: "items",
    header: "Items",
    cell: ({ row }) => (
      <span className="text-sm line-clamp-1">{row.getValue("items")}</span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <Badge
          variant="outline"
          className={cn(
            "capitalize px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider",
            status === "ready" &&
              "bg-muted text-foreground border-border",
            status === "preparing" &&
              "bg-muted text-muted-foreground border-border",
            status === "served" &&
              "bg-muted text-foreground border-border",
            status === "pending" &&
              "bg-destructive/10 text-destructive border-destructive/20",
          )}
        >
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "total",
    header: "Total",
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("total"));
      return (
        <div className="font-semibold">
          {new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
          }).format(amount)}
        </div>
      );
    },
  },
  {
    accessorKey: "time",
    header: "Time",
  },
];

const productColumns: ColumnDef<Product>[] = [
  {
    accessorKey: "name",
    header: "Product",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.getValue("name")}</span>
        <span className="text-xs text-muted-foreground">
          {row.original.sku}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "stock",
    header: "Stock Level",
    cell: ({ row }) => {
      const stock = row.getValue("stock") as number;
      const status = row.original.status;
      return (
        <div className="flex flex-col gap-1 w-[150px]">
          <div className="flex items-center justify-between text-xs">
            <span
              className={cn(
                "font-medium",
                status === "out-of-stock" && "text-destructive",
                status === "low-stock" && "text-muted-foreground",
                status === "in-stock" && "text-foreground",
              )}
            >
              {stock} units
            </span>
            <span className="text-muted-foreground">
              {status === "in-stock" ? "Healthy" : status.replace("-", " ")}
            </span>
          </div>
          <Progress
            value={Math.min(stock, 100)}
            className={cn(
              "h-1.5",
              status === "out-of-stock" && "bg-destructive/20 [&>div]:bg-destructive",
              status === "low-stock" && "bg-muted [&>div]:bg-muted-foreground",
              status === "in-stock" &&
                "bg-muted [&>div]:bg-foreground",
            )}
          />
        </div>
      );
    },
  },
  {
    accessorKey: "price",
    header: "Price",
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("price"));
      return (
        <div className="font-semibold">
          {new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
          }).format(amount)}
        </div>
      );
    },
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => (
      <Badge variant="secondary">{row.getValue("category")}</Badge>
    ),
  },
];

import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { socket } from "@/lib/socket";

export default function StoreLivePage() {
  const [page, setPage] = React.useState(1);
  const [openBusiness, setOpenBusiness] = React.useState<string[]>([]);
  const [activeType, setActiveType] = React.useState<string>("all");
  const queryClient = useQueryClient();

  // Fetch Businesses
  const {
    data: businessData,
    isLoading: businessesLoading,
    refetch: fetchBusinesses,
  } = useQuery<PaginatedBusinesses>({
    queryKey: ["businesses", page],
    queryFn: async () => {
      const response = await api.get(`/setup-business?page=${page}&limit=5`);
      return response.data.data;
    },
    staleTime: 30000,
    refetchInterval: 30000,
    enabled: !socket.connected,
  });

  // Fetch Sites
  const { data: sitesData, isLoading: sitesLoading } = useQuery<Site[]>({
    queryKey: ["sites"],
    queryFn: async () => {
      const response = await api.get("/sites");
      return response.data.data;
    },
    staleTime: 30000,
    refetchInterval: 30000,
    enabled: !socket.connected,
  });

  // Fetch Products (Mocking site selection for now)
  const selectedSiteId = sitesData?.[0]?.id;
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["products", selectedSiteId],
    queryFn: async () => {
      if (!selectedSiteId) return [];
      const response = await api.get(`/products?siteId=${selectedSiteId}`);
      return response.data.data;
    },
    enabled: !!selectedSiteId && !socket.connected,
    staleTime: 30000,
    refetchInterval: 30000,
  });

  const loading = businessesLoading || sitesLoading || productsLoading;
  const businesses: Business[] = businessData?.data ?? [];
  const totalPages = businessData?.meta?.totalPages ?? 1;

  const toggleBusiness = (id: string) => {
    setOpenBusiness((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  // Placeholder mock for site-specific data (as the backend might not have orders yet)
  const ecommerceOrdersMock: EcommerceOrder[] = [
    {
      id: "ORD001",
      customer: {
        name: "Alice Johnson",
        avatar: "/avatar-1.png",
        email: "alice@example.com",
      },
      status: "completed",
      total: 125.5,
      date: "2024-03-10",
    },
  ];
  const restaurantOrdersMock: RestaurantOrder[] = [
    {
      id: "RES001",
      table: "T-04",
      items: "Pizza Margherita, Coke",
      status: "ready",
      total: 28.5,
      time: "12:45 PM",
    },
  ];
  const productsMock: Product[] = [
    {
      id: "PROD001",
      name: "Wireless Headphones",
      sku: "W-HP-001",
      stock: 85,
      price: 129.99,
      category: "Electronics",
      status: "in-stock",
    },
  ];

  return (
    <div className="flex-1 space-y-4 md:space-y-8 p-4 md:p-8 pt-6 bg-background min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <div className="h-6 md:h-8 w-1 bg-foreground rounded-full" />
            Live Dashboard
          </h2>
          <p className="text-muted-foreground text-sm md:text-lg">
            Monitor your businesses and sites performance in real-time.
          </p>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <Button variant="outline" size="sm" onClick={() => fetchBusinesses()}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card text-card-foreground overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[300px]">
                  Business & Site Name
                </TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-10 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : businesses.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-10 text-muted-foreground"
                  >
                    No businesses found.
                  </TableCell>
                </TableRow>
              ) : (
                businesses.map((business) => (
                  <React.Fragment key={business.id}>
                    <TableRow
                      className="cursor-pointer hover:bg-muted/50 transition-colors bg-muted/20"
                      onClick={() => toggleBusiness(business.id)}
                    >
                      <TableCell className="font-bold py-3">
                        <div className="flex items-center gap-2">
                          {openBusiness.includes(business.id) ? (
                            <ChevronUp className="size-4" />
                          ) : (
                            <ChevronDown className="size-4" />
                          )}
                          {business.name || "Unnamed Business"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {business.registeredAddress?.region || "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{business.businessType}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            business.status === "ACTIVE"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {business.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>

                    {openBusiness.includes(business.id) &&
                      business.sites?.map((site: BusinessSite) => (
                        <TableRow
                          key={site.id}
                          className="animate-in fade-in slide-in-from-top-1"
                        >
                          <TableCell className="pl-10 text-sm">
                            <div className="flex items-center gap-2">
                              <Store className="size-4 text-muted-foreground" />
                              {site.name}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {site.storeAddress?.region}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {site.currency}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-muted text-foreground border-border"
                            >
                              SITE LIVE
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <a
                              href={`/store/live/${site.id}`}
                              className={cn(
                                buttonVariants({
                                  variant: "outline",
                                  size: "xs",
                                }),
                                "h-7 text-[10px]",
                              )}
                            >
                              Monitor
                            </a>
                          </TableCell>
                        </TableRow>
                      ))}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setPage((p) => Math.max(1, p - 1));
                }}
              />
            </PaginationItem>
            <PaginationItem>
              <span className="text-sm px-4">
                Page {page} of {totalPages}
              </span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setPage((p) => Math.min(totalPages, p + 1));
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
