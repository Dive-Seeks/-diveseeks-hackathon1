"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ShoppingCart, User, Plus, Minus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useBusinessContextStore } from "@/lib/business-context-store";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export default function POSPage() {
  const [search, setSearch] = React.useState("");
  const { activeSiteId, activeStoreId } = useBusinessContextStore();

  // Fetch active menu for the current site (Channel)
  const { data: menuData, isLoading: isLoadingMenu } = useQuery({
    queryKey: ["site-menu", activeSiteId],
    queryFn: async () => {
      if (!activeSiteId) return null;
      const res = await api.get(`/menus/active/${activeSiteId}`);
      return res.data.data;
    },
    enabled: !!activeSiteId,
  });

  const menuItems = React.useMemo(() => {
    if (!menuData || !menuData.categories) return [];
    // Flatten all items from categories for the POS view
    return menuData.categories.flatMap((cat: any) => cat.items || []);
  }, [menuData]);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-4 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Point of Sale</h2>
          <p className="text-muted-foreground">
            Manage your in-store sales and transactions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="h-8 px-3">
            Store: {activeStoreId || 'None'}
          </Badge>
          <Badge
            variant="default"
            className="h-8 px-3 bg-foreground hover:bg-foreground/90"
          >
            Channel: {activeSiteId || 'None'}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 h-full overflow-hidden">
        {/* Products Section */}
        <div className="lg:col-span-2 flex flex-col gap-4 overflow-hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products or scan barcode..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {[
              "All",
              "Drinks",
              "Main Course",
              "Desserts",
              "Snacks",
              "Alcohol",
            ].map((cat) => (
              <Button
                key={cat}
                variant={cat === "All" ? "default" : "outline"}
                size="sm"
              >
                {cat}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 overflow-y-auto pr-2 md:grid-cols-3 lg:grid-cols-4">
            {isLoadingMenu ? (
              <div className="col-span-full py-8 text-center text-muted-foreground">
                Loading menu items...
              </div>
            ) : menuItems.length === 0 ? (
              <div className="col-span-full py-8 text-center text-muted-foreground">
                No items found in active menu.
              </div>
            ) : (
              menuItems.map((item: any, i: number) => (
                <Card
                  key={item.id || i}
                  className="cursor-pointer hover:border-primary transition-colors"
                >
                  <div className="aspect-square bg-muted rounded-t-lg flex items-center justify-center relative">
                    <Badge variant="secondary" className="absolute top-2 right-2">
                      £{item.price || item.product?.price || "0.00"}
                    </Badge>
                    <ShoppingCart className="h-8 w-8 text-muted-foreground opacity-20" />
                  </div>
                  <CardContent className="p-3">
                    <p className="font-medium text-sm truncate">
                      {item.displayName || item.product?.name || `Product ${i + 1}`}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{item.description || item.product?.description || "Category Name"}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Cart/Checkout Section */}
        <div className="flex flex-col gap-4 overflow-hidden border-l pl-6">
          <Card className="flex flex-col h-full shadow-none border-0">
            <CardHeader className="px-0 pt-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Current Order</CardTitle>
                <Button variant="ghost" size="icon">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Button variant="outline" size="sm" className="w-full">
                  <User className="mr-2 h-4 w-4" /> Guest Customer
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-0 flex-1 overflow-y-auto">
              <div className="space-y-4">
                {/* Placeholder Cart Items */}
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-4"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">Product {i}</p>
                      <p className="text-xs text-muted-foreground">£12.99</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" className="h-7 w-7">
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-sm font-medium">1</span>
                      <Button variant="outline" size="icon" className="h-7 w-7">
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <div className="space-y-4 pt-4 mt-auto">
              <Separator />
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>£25.98</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tax (20%)</span>
                  <span>£5.20</span>
                </div>
                <div className="flex items-center justify-between font-bold text-lg mt-2">
                  <span>Total</span>
                  <span className="text-primary">£31.18</span>
                </div>
              </div>
              <Button className="w-full h-12 text-lg" size="lg">
                Proceed to Payment
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
