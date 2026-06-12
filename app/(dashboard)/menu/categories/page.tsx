"use client"

import * as React from "react"
import { 
  Plus, 
  Search,
  Pencil,
  Trash2,
  MoreHorizontal
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { useBusinessContextStore } from "@/lib/business-context-store"

type Category = {
  id: string
  name: string
  description: string
  status: "active" | "inactive"
  createdAt: string
  updatedAt: string
}

export default function CategoriesPage() {
  const queryClient = useQueryClient()
  const { activeBusinessId } = useBusinessContextStore()
  const [searchQuery, setSearchQuery] = React.useState("")
  
  // Dialog states
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const [editingCategory, setEditingCategory] = React.useState<Category | null>(null)
  const [deletingCategory, setDeletingCategory] = React.useState<Category | null>(null)

  // Form states
  const [formData, setFormData] = React.useState({ name: "", description: "", status: "active" as "active"|"inactive" })

  // Fetch queries
  const { data: categoriesData, isLoading, error } = useQuery<Category[]>({
    queryKey: ["categories", activeBusinessId],
    queryFn: async () => {
      const response = await api.get(`/categories${activeBusinessId ? `?businessId=${activeBusinessId}` : ''}`)
      const payload = response.data.data
      return Array.isArray(payload) ? payload : (payload?.data || [])
    },
    enabled: !!activeBusinessId
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (newCategory: any) => {
      const response = await api.post("/categories", { ...newCategory, businessId: activeBusinessId })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] })
      toast.success("Category created successfully.")
      setIsFormOpen(false)
    },
    onError: () => toast.error("Failed to create category.")
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      const response = await api.patch(`/categories/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] })
      toast.success("Category updated successfully.")
      setIsFormOpen(false)
    },
    onError: () => toast.error("Failed to update category.")
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/categories/${id}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] })
      toast.success("Category deleted successfully.")
      setIsDeleteDialogOpen(false)
    },
    onError: () => toast.error("Failed to delete category.")
  })

  const categories: Category[] = categoriesData ?? []

  const filteredCategories = categories.filter(c => 
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleOpenForm = (category?: Category) => {
    if (category) {
      setEditingCategory(category)
      setFormData({ name: category.name, description: category.description, status: category.status })
    } else {
      setEditingCategory(null)
      setFormData({ name: "", description: "", status: "active" })
    }
    setIsFormOpen(true)
  }

  const handleSave = () => {
    if (!formData.name.trim()) return // basic validation

    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleDelete = () => {
    if (deletingCategory) {
      deleteMutation.mutate(deletingCategory.id)
    }
  }

  return (
    <div className="space-y-4 md:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search categories..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button onClick={() => handleOpenForm()} className="bg-foreground text-background hover:bg-foreground/90 w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-5 w-8 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No categories found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCategories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {category.description}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={category.status === "active" 
                          ? "bg-muted text-foreground border-border"
                          : "bg-muted text-muted-foreground border-muted-foreground/20"}
                      >
                        {category.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" className="h-8 w-8 p-0" />}>
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenForm(category)}>
                            <Pencil className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              setDeletingCategory(category)
                              setIsDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Add Category"}</DialogTitle>
            <DialogDescription>
              {editingCategory ? "Update the details of this category." : "Create a new category for your menu items."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input 
                id="name" 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Burgers" 
                required
                aria-required="true"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input 
                id="description" 
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of items" 
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <select 
                id="status"
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as "active"|"inactive" })}
                aria-label="Status"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSave} 
              className="bg-foreground text-background hover:bg-foreground/90"
              disabled={!formData.name.trim() || createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {`This will permanently delete the category "${deletingCategory?.name}". Any items in this category will become uncategorized.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
