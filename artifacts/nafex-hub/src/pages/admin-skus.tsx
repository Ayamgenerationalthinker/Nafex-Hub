import { useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminSkusPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: skusData, isLoading } = useQuery({
    queryKey: ["admin-skus"],
    queryFn: async () => {
      const token = localStorage.getItem("nafex_token") ?? "";
      const res = await fetch('/api/admin/skus', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch SKUs");
      return res.json() as Promise<{ variants: any[] }>;
    },
  });

  return (
    <AdminLayout title="SKU Management">
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">SKU Management</h1>
            <p className="text-muted-foreground mt-1">
              View and manage all automatically generated product SKUs
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">All SKUs</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search SKUs..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Variant Attributes</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {skusData?.variants?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                          No SKUs found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      skusData?.variants?.filter((v: any) => v.sku.toLowerCase().includes(searchTerm.toLowerCase())).map((variant: any) => (
                        <TableRow key={variant.id}>
                          <TableCell className="font-mono text-sm">{variant.sku}</TableCell>
                          <TableCell className="font-medium">{variant.productName}</TableCell>
                          <TableCell>{variant.category}</TableCell>
                          <TableCell>
                            {Object.entries(variant.attributes || {}).map(([k, v]) => (
                              <span key={k} className="inline-block bg-muted px-2 py-1 rounded text-xs mr-2">
                                {k}: {String(v)}
                              </span>
                            ))}
                          </TableCell>
                          <TableCell>{variant.stock}</TableCell>
                          <TableCell>GHS {variant.price || variant.productPrice}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
