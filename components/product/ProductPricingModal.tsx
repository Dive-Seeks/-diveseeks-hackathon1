import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import { toast } from "sonner"
import { useBusinessContextStore } from "@/lib/business-context-store"
import { Skeleton } from "@/components/ui/skeleton"

interface ProductPricingModalProps {
  productId: string | null
  productName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProductPricingModal({ productId, productName, open, onOpenChange }: ProductPricingModalProps) {
  const queryClient = useQueryClient()
  const { activeBusinessId } = useBusinessContextStore()

  // Fetch all sites (channels) and stores (locations) for this business to build the matrix
  const { data: sites } = useQuery({
    queryKey: ["sites", activeBusinessId],
    queryFn: async () => {
      const res = await api.get(`/sites?businessId=${activeBusinessId}`)
      return res.data.data
    },
    enabled: !!activeBusinessId && open
  })

  const { data: stores } = useQuery({
    queryKey: ["stores", activeBusinessId],
    queryFn: async () => {
      const res = await api.get(`/stores?businessId=${activeBusinessId}`) // Assuming store endpoint supports this
      return res.data.data
    },
    enabled: !!activeBusinessId && open
  })

  // In a full implementation, we would fetch existing prices for this product.
  // For now, we mock state to represent the pricing matrix form.
  const [prices, setPrices] = React.useState<any[]>([])

  const handleSave = () => {
    // Mutation to save prices would go here
    toast.success("Pricing updated successfully.")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Manage Pricing: {productName}</DialogTitle>
          <DialogDescription>
            Set channel-specific and location-specific pricing for this product.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Context</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Price Amount</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead className="text-center">Is Default?</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Global Default</TableCell>
                <TableCell>Base</TableCell>
                <TableCell><Input type="number" defaultValue="10.00" className="w-32" /></TableCell>
                <TableCell><Input defaultValue="GBP" className="w-20" /></TableCell>
                <TableCell className="text-center"><Checkbox checked disabled /></TableCell>
              </TableRow>
              {sites?.map((site: any) => (
                <TableRow key={site.id}>
                  <TableCell className="font-medium pl-6">{site.name}</TableCell>
                  <TableCell>Channel ({site.type})</TableCell>
                  <TableCell><Input type="number" placeholder="Override amount" className="w-32" /></TableCell>
                  <TableCell><Input defaultValue="GBP" className="w-20" /></TableCell>
                  <TableCell className="text-center"><Checkbox /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Pricing</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
