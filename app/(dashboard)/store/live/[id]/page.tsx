"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import api from "@/lib/api";
import { socket } from "@/lib/socket";
import { cn } from "@/lib/utils";
import { LiveDataTable } from "../live-data-table";
import { LiveStatCard } from "../live-stat-card";

// Types
type Sale = {
  id: string;
  siteId: string;
  total: number;
  items: any[];
  customer?: { name: string; email: string; avatar?: string };
  status: string;
  createdAt: string;
};

type Product = {
  id: string;
  name: string;
  sku: string;
  price: number;
  category: string;
};

type Inventory = {
  id: string;
  productId: string;
  siteId: string;
  quantity: number;
  product: Product;
};

export default function SiteLiveMonitorPage() {
  const { id: siteId } = useParams();
  const queryClient = useQueryClient();

  // Fetch Site Details
  const { data: siteData, isLoading: siteLoading } = useQuery({
    queryKey: ["sites", siteId],
    queryFn: async () => {
      const response = await api.get(`/sites/${siteId}`);
      return response.data.data;
    },
    enabled: !!siteId,
  });

  // Fetch Recent Sales
  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ["sales", siteId],
    queryFn: async () => {
      const response = await api.get(`/sales?siteId=${siteId}`);
      return response.data.data;
    },
    enabled: !!siteId && !socket.connected,
    staleTime: 30000,
    refetchInterval: 30000,
  });

  // Fetch Inventory/Products
  const { data: inventoryData, isLoading: inventoryLoading } = useQuery({
    queryKey: ["inventory", siteId],
    queryFn: async () => {
      const response = await api.get(`/inventory?siteId=${siteId}`);
      return response.data.data;
    },
    enabled: !!siteId && !socket.connected,
    staleTime: 30000,
    refetchInterval: 30000,
  });

  const sales = salesData || [];
  const inventory = inventoryData || [];

  // Stats calculation
  const totalSalesToday = sales.reduce(
    (acc: number, sale: Sale) => acc + Number(sale.total),
    0,
  );
  const totalOrders = sales.length;
  const lowStockCount = inventory.filter(
    (item: Inventory) => item.quantity < 10,
  ).length;

  // Column Definitions
  const saleColumns: ColumnDef<Sale>[] = [
    {
      accessorKey: "id",
      header: "Order ID",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.id.slice(0, 8)}
        </span>
      ),
    },
    {
      accessorKey: "customer",
      header: "Customer",
      cell: ({ row }) => {
        const customer = row.original.customer;
        if (!customer)
          return <span className="text-muted-foreground text-xs">Guest</span>;
        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={customer.avatar} />
              <AvatarFallback>{customer.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium">{customer.name}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "total",
      header: "Total",
      cell: ({ row }) => {
        return (
          <div className="font-bold text-sm">
            ${Number(row.original.total).toFixed(2)}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant="outline" className="text-[10px] capitalize">
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Time",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {new Date(row.original.createdAt).toLocaleTimeString()}
        </span>
      ),
    },
  ];

  const inventoryColumns: ColumnDef<Inventory>[] = [
    {
      accessorKey: "product.name",
      header: "Product",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium">
            {row.original.product?.name}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {row.original.product?.sku}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "quantity",
      header: "Stock",
      cell: ({ row }) => {
        const qty = row.original.quantity;
        return (
          <div className="flex flex-col gap-1 min-w-[100px]">
            <div className="flex justify-between text-[10px]">
              <span
                className={cn(
                  qty < 10 ? "text-destructive font-bold" : "text-muted-foreground",
                )}
              >
                {qty} units
              </span>
            </div>
            <Progress value={Math.min(qty, 100)} className="h-1" />
          </div>
        );
      },
    },
    {
      accessorKey: "product.price",
      header: "Price",
      cell: ({ row }) => (
        <span className="text-sm">
          ${Number(row.original.product?.price).toFixed(2)}
        </span>
      ),
    },
  ];

  if (siteLoading) {
    return (
      <div className="p-8">
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 bg-background">
      <div className="flex items-center gap-4">
        <Link href="/store/live">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="h-8 w-1 bg-foreground rounded-full" />
            {siteData?.name} Monitoring
          </h2>
          <p className="text-muted-foreground">
            Real-time feed for {siteData?.siteAddress?.city},{" "}
            {siteData?.siteAddress?.region}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <LiveStatCard
          title="Daily Sales"
          value={`$${totalSalesToday.toFixed(2)}`}
          description="+12% from yesterday"
        />
        <LiveStatCard
          title="Active Orders"
          value={totalOrders.toString()}
          description="Live monitoring active"
        />
        <LiveStatCard
          title="Low Stock Items"
          value={lowStockCount.toString()}
          description="Action required"
        />
        <LiveStatCard
          title="Staff Online"
          value="4"
          description="Current shift"
        />
      </div>

      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sales">Live Sales Feed</TabsTrigger>
          <TabsTrigger value="inventory">Inventory Alerts</TabsTrigger>
        </TabsList>
        <TabsContent value="sales" className="space-y-4">
          <div className="rounded-xl border bg-card">
            <LiveDataTable
              columns={saleColumns}
              data={sales}
              searchKey="id"
              loading={salesLoading}
            />
          </div>
        </TabsContent>
        <TabsContent value="inventory" className="space-y-4">
          <div className="rounded-xl border bg-card">
            <LiveDataTable
              columns={inventoryColumns}
              data={inventory}
              searchKey="product.name"
              loading={inventoryLoading}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
