"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import api from "@/lib/api";

type BillingOverview = {
  id: string;
  tenantId: string;
  planName: string;
  billingEmail: string;
  currency: string;
  billingCycle: string;
  nextBillingDate: string | null;
  outstandingAmount: string;
  status: string;
};

type BillingInvoice = {
  id: string;
  invoiceNumber: string;
  amount: string;
  currency: string;
  status: "paid" | "pending" | "failed";
  issuedAt: string;
  dueAt: string | null;
  paidAt: string | null;
};

export default function BillingPage() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [overview, setOverview] = React.useState<BillingOverview | null>(null);
  const [invoices, setInvoices] = React.useState<BillingInvoice[]>([]);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [status, setStatus] = React.useState<
    "" | "paid" | "pending" | "failed"
  >("");

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [overviewResponse, invoicesResponse] = await Promise.all([
        api.get("/billing/overview"),
        api.get("/billing/invoices", {
          params: {
            page,
            limit: 10,
            status: status || undefined,
          },
        }),
      ]);
      setOverview(overviewResponse.data.data as BillingOverview);
      setInvoices((invoicesResponse.data.data || []) as BillingInvoice[]);
      setTotalPages(Number(invoicesResponse.data.meta?.totalPages || 1));
    } catch {
      toast.error("Failed to load billing data");
    } finally {
      setIsLoading(false);
    }
  }, [page, status]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Billing</h1>
        <p className="text-sm text-muted-foreground">
          Track plan details and invoice history
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Plan</CardDescription>
            <CardTitle className="text-xl font-semibold text-foreground">{overview?.planName || "-"}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="bg-muted text-muted-foreground border-border">{overview?.status || "unknown"}</Badge>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Outstanding</CardDescription>
            <CardTitle className="text-xl font-semibold text-foreground">
              {overview?.currency} {overview?.outstandingAmount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {overview?.billingCycle || "-"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Billing Email</CardDescription>
            <CardTitle className="text-xl font-semibold text-foreground break-all">
              {overview?.billingEmail || "-"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
              Next billing:{" "}
              {overview?.nextBillingDate
                ? new Date(overview.nextBillingDate).toLocaleDateString()
                : "N/A"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>Review invoice status and amounts</CardDescription>
          <div className="flex items-center gap-2">
            <Button
              variant={status === "" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setPage(1);
                setStatus("");
              }}
            >
              All
            </Button>
            <Button
              variant={status === "paid" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setPage(1);
                setStatus("paid");
              }}
            >
              Paid
            </Button>
            <Button
              variant={status === "pending" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setPage(1);
                setStatus("pending");
              }}
            >
              Pending
            </Button>
            <Button
              variant={status === "failed" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setPage(1);
                setStatus("failed");
              }}
            >
              Failed
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground"
                  >
                    No invoices found
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      {invoice.invoiceNumber}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{invoice.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(invoice.issuedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {invoice.currency} {invoice.amount}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
