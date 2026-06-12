"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import {
  Search,
  Download,
  Plus,
  MoreHorizontal,
  Smartphone,
  Laptop,
  Tablet,
  Headphones,
  Camera,
  Watch,
  Speaker,
  Monitor,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Copy,
  Trash2,
  Filter as FilterIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PRODUCTS,
  type Product,
  type ProductCategory,
  type ProductStatus,
} from "@/lib/product-data";
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
} from "@/components/ui/input-group";

const CATEGORY_ICONS: Record<ProductCategory, React.ReactNode> = {
  Smartphone: <Smartphone className="h-4 w-4 text-muted-foreground" />,
  Laptop: <Laptop className="h-4 w-4 text-muted-foreground" />,
  Tablet: <Tablet className="h-4 w-4 text-muted-foreground" />,
  Headphones: <Headphones className="h-4 w-4 text-muted-foreground" />,
  Camera: <Camera className="h-4 w-4 text-muted-foreground" />,
  Smartwatch: <Watch className="h-4 w-4 text-muted-foreground" />,
  Speaker: <Speaker className="h-4 w-4 text-muted-foreground" />,
  Monitor: <Monitor className="h-4 w-4 text-muted-foreground" />,
};

const STATUS_VARIANTS: Record<
  ProductStatus,
  { label: string; className: string }
> = {
  Publish: {
    label: "Publish",
    className: "bg-muted text-foreground border-border",
  },
  Inactive: {
    label: "Inactive",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  Draft: {
    label: "Draft",
    className: "bg-muted text-muted-foreground border-border",
  },
};

const CATEGORIES: ProductCategory[] = [
  "Smartphone",
  "Laptop",
  "Tablet",
  "Headphones",
  "Camera",
  "Smartwatch",
  "Speaker",
  "Monitor",
];

export function ProductManagementTable() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [rowsPerPage, setRowsPerPage] = useState("5");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [stockState, setStockState] = useState<Record<string, boolean>>(
    Object.fromEntries(PRODUCTS.map((p) => [p.id, p.inStock]))
  );

  const filtered = useMemo(() => {
    return PRODUCTS.filter((p) => {
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.brand.toLowerCase().includes(search.toLowerCase());
      const matchCategory =
        categoryFilter === "all" || p.category === categoryFilter;
      const matchStock =
        stockFilter === "all" ||
        (stockFilter === "in" && stockState[p.id]) ||
        (stockFilter === "out" && !stockState[p.id]);
      const matchStatus =
        statusFilter === "all" || p.status === statusFilter;
      return matchSearch && matchCategory && matchStock && matchStatus;
    });
  }, [search, categoryFilter, stockFilter, statusFilter, stockState]);

  const rowsPerPageNum = parseInt(rowsPerPage);
  const totalPages = Math.ceil(filtered.length / rowsPerPageNum);
  const paginated = filtered.slice(
    (currentPage - 1) * rowsPerPageNum,
    currentPage * rowsPerPageNum
  );
  const start = filtered.length === 0 ? 0 : (currentPage - 1) * rowsPerPageNum + 1;
  const end = Math.min(currentPage * rowsPerPageNum, filtered.length);

  const allPageSelected =
    paginated.length > 0 && paginated.every((p) => selectedRows.has(p.id));

  function toggleAll() {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        paginated.forEach((p) => next.delete(p.id));
      } else {
        paginated.forEach((p) => next.add(p.id));
      }
      return next;
    });
  }

  function toggleRow(id: string) {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handlePageChange(page: number) {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  }

  return (
    <div className="w-full space-y-6">
      {/* Filter Section */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <FilterIcon className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Filter</h2>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-5 py-5">
          {/* Category */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Select Category
            </label>
            <Select
              value={categoryFilter}
              onValueChange={(v) => {
                if (v !== null) setCategoryFilter(v);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All</SelectItem>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Stock */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Select Stock
            </label>
            <Select
              value={stockFilter}
              onValueChange={(v) => {
                if (v !== null) setStockFilter(v);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="in">In Stock</SelectItem>
                  <SelectItem value="out">Out of Stock</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Select Status
            </label>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                if (v !== null) setStatusFilter(v);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Publish">Publish</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Toolbar & Table Section */}
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
            <Select value={rowsPerPage} onValueChange={(v) => v !== null && setRowsPerPage(v)}>
              <SelectTrigger className="w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
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
                    checked={allPageSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead className="font-semibold text-foreground py-4">Product</TableHead>
                <TableHead className="font-semibold text-foreground py-4">Category</TableHead>
                <TableHead className="font-semibold text-foreground py-4">Stock</TableHead>
                <TableHead className="font-semibold text-foreground py-4 text-right">Amount</TableHead>
                <TableHead className="font-semibold text-foreground py-4 text-right">QTY</TableHead>
                <TableHead className="font-semibold text-foreground py-4">Status</TableHead>
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
                        checked={selectedRows.has(product.id)}
                        onCheckedChange={() => toggleRow(product.id)}
                        aria-label={`Select ${product.name}`}
                      />
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative size-10 overflow-hidden rounded-lg border border-border bg-muted flex items-center justify-center">
                          {/* Using a placeholder div for image as we don't have real assets */}
                          <div className="size-full bg-muted-foreground/10 flex items-center justify-center">
                             <span className="text-[10px] font-medium text-muted-foreground uppercase">{product.brand.substring(0, 2)}</span>
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
                      <div className="flex items-center gap-2">
                        {CATEGORY_ICONS[product.category]}
                        <span className="text-sm text-muted-foreground font-medium">
                          {product.category}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={stockState[product.id]}
                        onCheckedChange={(checked) =>
                          setStockState((prev) => ({ ...prev, [product.id]: checked }))
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right font-semibold text-foreground">
                      ${product.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground font-medium">
                      {product.qty}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={STATUS_VARIANTS[product.status].className}
                      >
                        {STATUS_VARIANTS[product.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={(props) => (
                          <Button {...props} variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        )} />
                        <DropdownMenuContent align="end" className="min-w-[140px]">
                          <DropdownMenuItem className="gap-2">
                            <Pencil className="size-3.5" />
                            <span>Edit</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2">
                            <Copy className="size-3.5" />
                            <span>Duplicate</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive">
                            <Trash2 className="size-3.5" />
                            <span>Delete</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    No products found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="px-5 py-4 border-t border-border bg-muted/5 flex items-center justify-between flex-wrap gap-4">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{start}</span> to{" "}
            <span className="font-medium text-foreground">{end}</span> of{" "}
            <span className="font-medium text-foreground">{filtered.length}</span> entries
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
