import { ProductSalesTable } from "@/components/management/product-sales-table";

export default function SalesSamplePage() {
  return (
    <div className="container mx-auto py-10 px-4 md:px-6">
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Product Sales</h1>
          <p className="text-muted-foreground mt-2">
            This is a sample page displaying the new product sales table component with sparklines and trend indicators.
          </p>
        </div>

        <ProductSalesTable />
      </div>
    </div>
  );
}
