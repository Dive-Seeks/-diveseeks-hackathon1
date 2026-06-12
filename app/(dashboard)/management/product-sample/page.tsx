import { ProductManagementTable } from "@/components/management/product-table";

export default function ProductSamplePage() {
  return (
    <div className="container mx-auto py-10 px-4 md:px-6">
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Product Management</h1>
          <p className="text-muted-foreground mt-2">
            This is a sample page displaying the new product management table component created from the screenshot.
          </p>
        </div>

        <ProductManagementTable />
      </div>
    </div>
  );
}
