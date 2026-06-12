"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Download,
  Plus,
  Trash2,
  Eye,
  MoreHorizontal,
  MoveUp,
  MoveDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
} from "@/components/ui/select";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";

import { SALES_PRODUCTS, type ProductSales } from "@/lib/product-sales-data";
import { Sparkline } from "@/components/management/sparkline";

export function ProductSalesTable() {
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState("5");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filtered data
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return SALES_PRODUCTS;
    return SALES_PRODUCTS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q)
    );
  }, [search]);

  const pageSizeNum = parseInt(pageSize);
  const totalEntries = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSizeNum));

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSizeNum;
    return filtered.slice(start, start + pageSizeNum);
  }, [filtered, currentPage, pageSizeNum]);

  const startEntry = totalEntries === 0 ? 0 : (currentPage - 1) * pageSizeNum + 1;
  const endEntry = Math.min(currentPage * pageSizeNum, totalEntries);

  // Selection helpers
  const allOnPageSelected =
    paginated.length > 0 &&
    paginated.every((p) => selectedIds.has(p.id));

  function toggleAll() {
    const next = new Set(selectedIds);
    if (allOnPageSelected) {
      paginated.forEach((p) => next.delete(p.id));
    } else {
      paginated.forEach((p) => next.add(p.id));
    }
    setSelectedIds(next);
  }

  function toggleOne(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  function handlePageChange(page: number) {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  }

  return (
    <div className="w-full space-y-6">
      {/* Toolbar */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-4 border-b border-border bg-muted/10">
          <div className="w-full sm:w-auto sm:min-w-[300px]">
            <InputGroup>
              <InputGroupAddon align="inline-start">
                <Search className="size-4 text-muted-foreground" />
              </InputGroupAddon>
              <InputGroupInput
                placeholder="Search product"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </InputGroup>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Select value={pageSize} onValueChange={(v) => { if (v) setPageSize(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            <Button variant="outline" className="gap-2 h-9 px-3">
              <Download className="size-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>

            <Button className="gap-2 h-9 px-3 bg-foreground text-background hover:bg-foreground/90">
              <Plus className="size-4" />
              <span>Add Product</span>
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border">
                <TableHead className="w-[50px] px-5">
                  <Checkbox
                    checked={allOnPageSelected}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead className="font-semibold text-foreground py-4">Product</TableHead>
                <TableHead className="font-semibold text-foreground py-4">Graph</TableHead>
                <TableHead className="font-semibold text-foreground py-4">Price</TableHead>
                <TableHead className="font-semibold text-foreground py-4">Orders</TableHead>
                <TableHead className="font-semibold text-foreground py-4">Sales</TableHead>
                <TableHead className="font-semibold text-foreground py-4 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length > 0 ? (
                paginated.map((product) => (
                  <TableRow
                    key={product.id}
                    className="group hover:bg-muted/20 border-b border-border transition-colors"
                  >
                    <TableCell className="px-5">
                      <Checkbox
                        checked={selectedIds.has(product.id)}
                        onCheckedChange={() => toggleOne(product.id)}
                      />
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative size-10 overflow-hidden rounded-lg border border-border bg-muted flex items-center justify-center">
                          <div className="size-full bg-muted-foreground/10 flex items-center justify-center">
                            <span className="text-[10px] font-medium text-muted-foreground uppercase">
                              {product.brand.substring(0, 2)}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground line-clamp-1">
                            {product.name}
                          </span>
                          <span className="text-xs text-muted-foreground uppercase tracking-tight">
                            {product.brand}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Sparkline data={product.sparkline} trend={product.trend} />
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">
                      ${product.price}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
                        {product.trend === "up" ? (
                          <MoveUp className="size-3.5 text-foreground" />
                        ) : (
                          <MoveDown className="size-3.5 text-destructive" />
                        )}
                        <span>{product.orders}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          product.salesChange >= 0
                            ? "bg-muted/50 text-foreground border-transparent"
                            : "bg-muted/50 text-foreground border-transparent"
                        }
                      >
                        {product.salesChange > 0 ? "+" : ""}
                        {product.salesChange}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive">
                          <Trash2 className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground">
                          <Eye className="size-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger render={
                            <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          } />
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Edit</DropdownMenuItem>
                            <DropdownMenuItem>Duplicate</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    No results found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="px-5 py-4 border-t border-border bg-muted/5 flex items-center justify-between flex-wrap gap-4">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{startEntry}</span> to{" "}
            <span className="font-medium text-foreground">{endEntry}</span> of{" "}
            <span className="font-medium text-foreground">{totalEntries}</span> entries
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="size-4" />
            </Button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="icon"
                  className="size-8"
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </Button>
              ))}
            </div>

            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
