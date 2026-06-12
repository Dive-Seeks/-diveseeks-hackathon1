"use client";

import * as React from "react";
import { Plus, Search, Pencil, Trash2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { useBusinessContextStore } from "@/lib/business-context-store";

type Modifier = {
  id: string;
  name: string;
  required: boolean;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
};

export default function ModifiersPage() {
  const queryClient = useQueryClient();
  const { activeBusinessId } = useBusinessContextStore();
  const [searchQuery, setSearchQuery] = React.useState("");

  // Dialog states
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [editingModifier, setEditingModifier] = React.useState<Modifier | null>(
    null,
  );
  const [deletingModifier, setDeletingModifier] =
    React.useState<Modifier | null>(null);

  // Form states
  const [formData, setFormData] = React.useState({
    name: "",
    required: false,
    status: "active" as "active" | "inactive",
  });

  // Fetch queries
  const {
    data: modifiersData,
    isLoading,
    error,
  } = useQuery<Modifier[]>({
    queryKey: ["modifiers", activeBusinessId],
    queryFn: async () => {
      const response = await api.get(`/modifiers${activeBusinessId ? `?businessId=${activeBusinessId}` : ''}`);
      const payload = response.data.data;
      return Array.isArray(payload) ? payload : payload?.data || [];
    },
    enabled: !!activeBusinessId,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (newModifier: any) => {
      const response = await api.post("/modifiers", { ...newModifier, businessId: activeBusinessId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modifiers"] });
      toast.success("Modifier created successfully.");
      setIsFormOpen(false);
    },
    onError: () => toast.error("Failed to create modifier."),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.patch(`/modifiers/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modifiers"] });
      toast.success("Modifier updated successfully.");
      setIsFormOpen(false);
    },
    onError: () => toast.error("Failed to update modifier."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/modifiers/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modifiers"] });
      toast.success("Modifier deleted successfully.");
      setIsDeleteDialogOpen(false);
    },
    onError: () => toast.error("Failed to delete modifier."),
  });

  const modifiers: Modifier[] = modifiersData ?? [];

  const filteredModifiers = modifiers.filter((m) =>
    m.name?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleOpenForm = (modifier?: Modifier) => {
    if (modifier) {
      setEditingModifier(modifier);
      setFormData({
        name: modifier.name,
        required: modifier.required,
        status: modifier.status,
      });
    } else {
      setEditingModifier(null);
      setFormData({ name: "", required: false, status: "active" });
    }
    setIsFormOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) return;

    if (editingModifier) {
      updateMutation.mutate({ id: editingModifier.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = () => {
    if (deletingModifier) {
      deleteMutation.mutate(deletingModifier.id);
    }
  };

  return (
    <div className="space-y-4 md:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search modifiers..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button
          onClick={() => handleOpenForm()}
          className="bg-foreground text-background hover:bg-foreground/90 w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Modifier Group
        </Button>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="text-center">Required</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-6 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-8 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredModifiers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No modifiers found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredModifiers.map((modifier) => (
                  <TableRow key={modifier.id}>
                    <TableCell className="font-medium">
                      {modifier.name}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={
                          modifier.required
                            ? "border-border text-foreground font-semibold"
                            : ""
                        }
                      >
                        {modifier.required ? "Required" : "Optional"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          modifier.status === "active"
                            ? "bg-muted text-foreground border-border"
                            : "bg-muted text-muted-foreground border-muted-foreground/20"
                        }
                      >
                        {modifier.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" className="h-8 w-8 p-0" />
                          }
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleOpenForm(modifier)}
                          >
                            <Pencil className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              setDeletingModifier(modifier);
                              setIsDeleteDialogOpen(true);
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
            <DialogTitle>
              {editingModifier ? "Edit Modifier Group" : "Add Modifier Group"}
            </DialogTitle>
            <DialogDescription>
              {editingModifier
                ? "Update the details of this modifier group."
                : "Create a new modifier group to customize items."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g. Meat Temperature"
                required
                aria-required="true"
              />
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <input
                type="checkbox"
                id="required"
                checked={formData.required}
                onChange={(e) =>
                  setFormData({ ...formData, required: e.target.checked })
                }
                className="h-4 w-4 rounded border-border"
                aria-label="Required modifier"
              />
              <Label htmlFor="required" className="font-normal cursor-pointer">
                Customer must select an option
              </Label>
            </div>
            <div className="grid gap-2 pt-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as "active" | "inactive",
                  })
                }
                aria-label="Status"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-foreground text-background hover:bg-foreground/90"
              disabled={
                !formData.name.trim() ||
                createMutation.isPending ||
                updateMutation.isPending
              }
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {`This will permanently delete the modifier group "${deletingModifier?.name}". It will be removed from all items currently using it.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
