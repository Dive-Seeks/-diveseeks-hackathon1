"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"
import { useParams } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LayersIcon, PackageIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { AIChatWidget } from "@/components/ai-chat/ai-chat-widget"

export default function SiteMenuBuilderPage() {
  const params = useParams()
  const siteId = params.siteId as string

  // Fetch the active menu for this site
  const { data: menuData, isLoading } = useQuery({
    queryKey: ["site-menu", siteId],
    queryFn: async () => {
      // Endpoint from the new backend spec: GET /menus/active/:siteId
      const res = await api.get(`/menus/active/${siteId}`)
      return res.data.data
    },
    enabled: !!siteId
  })

  // Dummy state to represent the drag-and-drop builder structure
  const [activeCategory, setActiveCategory] = React.useState<string | null>(null)

  if (isLoading) {
    return <div className="p-8 space-y-4">
      <Skeleton className="h-8 w-64" />
      <div className="flex gap-4">
        <Skeleton className="h-96 w-1/3" />
        <Skeleton className="h-96 w-2/3" />
      </div>
    </div>
  }

  const menu = menuData || { name: "Default Menu", categories: [] }
  const categories = menu.categories || []
  
  // Find items for active category (mocking nested structure for now)
  const activeCategoryData = categories.find((c: any) => c.id === activeCategory)
  const items = activeCategoryData?.items || []

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Menu Builder</h1>
            <p className="text-muted-foreground">Managing menu: <strong className="text-foreground">{menu.name}</strong></p>
          </div>
          <Button>Save Menu Layout</Button>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Categories Sidebar (dnd-kit placeholder) */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <LayersIcon className="h-5 w-5" /> Categories
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex flex-col">
              {categories.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No categories found. Click to add.
                </div>
              ) : (
                categories.map((cat: any) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`text-left px-4 py-3 border-b hover:bg-muted/50 transition-colors ${activeCategory === cat.id ? 'bg-muted border-l-4 border-l-primary' : ''}`}
                  >
                    {cat.name}
                  </button>
                ))
              )}
            </div>
            <div className="p-4">
              <Button variant="outline" className="w-full">Add Category</Button>
            </div>
          </CardContent>
        </Card>

        {/* Items Grid */}
        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <PackageIcon className="h-5 w-5" /> 
              {activeCategoryData ? `Items in ${activeCategoryData.name}` : 'Select a Category'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!activeCategoryData ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Select a category from the sidebar to view its items.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {items.length === 0 ? (
                  <div className="col-span-full py-8 text-center text-muted-foreground">
                    No items in this category.
                  </div>
                ) : (
                  items.map((item: any) => (
                    <div key={item.id} className="flex flex-col gap-2 p-4 border rounded-lg hover:border-primary transition-colors cursor-pointer">
                      <div className="flex justify-between items-start">
                        <span className="font-medium">{item.displayName || item.product?.name}</span>
                        {!item.isAvailable && <Badge variant="destructive">Hidden</Badge>}
                      </div>
                      <span className="text-sm text-muted-foreground line-clamp-2">
                        {item.description || item.product?.description || "No description"}
                      </span>
                    </div>
                  ))
                )}
                <Button variant="outline" className="h-full min-h-[100px] flex flex-col gap-2 border-dashed">
                  <PackageIcon className="h-6 w-6 text-muted-foreground" />
                  <span className="text-muted-foreground">Add Item to Category</span>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>

    {/* AI Chat Widget */}
    <AIChatWidget 
      title="Abigail Menu Assistant" 
      greeting="Hi! I'm Abigail, your AI assistant. How can I help you with your menu today? Please start by telling me your store name."
    />
    </>
  )
}
