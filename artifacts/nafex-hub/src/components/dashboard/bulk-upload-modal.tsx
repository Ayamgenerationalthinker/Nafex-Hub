import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Upload } from "lucide-react";

type ProductRow = {
  name: string;
  price: string;
  description: string;
  stock: string;
};

function emptyRow(): ProductRow {
  return { name: "", price: "", description: "", stock: "" };
}

export function BulkUploadModal({
  businessId,
  open,
  onOpenChange,
  onSuccess,
}: {
  businessId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [rows, setRows] = useState<ProductRow[]>([emptyRow(), emptyRow(), emptyRow()]);
  const [uploading, setUploading] = useState(false);

  function updateRow(idx: number, field: keyof ProductRow, value: string) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }

  function addRow() {
    if (rows.length >= 50) return;
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(idx: number) {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  const filledRows = rows.filter((r) => r.name.trim() && r.price.trim());

  async function handleUpload() {
    if (filledRows.length === 0) {
      toast({ title: "Add at least one product with name and price.", variant: "destructive" });
      return;
    }

    const invalid = filledRows.find((r) => !/^\d+(\.\d{1,2})?$/.test(r.price));
    if (invalid) {
      toast({ title: "Invalid price format", description: `"${invalid.price}" is not a valid price.`, variant: "destructive" });
      return;
    }

    setUploading(true);
    const t = localStorage.getItem("nafex_token");
    try {
      const res = await fetch("/api/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({
          businessId,
          products: filledRows.map((r) => ({
            name: r.name.trim(),
            description: r.description.trim(),
            price: r.price.trim(),
            stock: r.stock ? parseInt(r.stock) : null,
            images: [],
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Upload failed", description: data.error ?? "Could not upload products.", variant: "destructive" });
        return;
      }

      toast({ title: `${data.length} product${data.length !== 1 ? "s" : ""} uploaded!` });
      setRows([emptyRow(), emptyRow(), emptyRow()]);
      onSuccess();
    } catch {
      toast({ title: "Network error. Please try again.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" /> Bulk Upload Products
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground -mt-2 mb-2">
          Fill in up to 50 products at once. Only Name and Price are required.
        </p>

        {/* Table header */}
        <div className="hidden sm:grid grid-cols-[2fr_1fr_2fr_1fr_auto] gap-2 px-1 mb-1">
          <Label className="text-xs text-muted-foreground">Product Name *</Label>
          <Label className="text-xs text-muted-foreground">Price (GHS) *</Label>
          <Label className="text-xs text-muted-foreground">Description</Label>
          <Label className="text-xs text-muted-foreground">Stock</Label>
          <span />
        </div>

        {/* Rows */}
        <div className="space-y-2">
          {rows.map((row, idx) => (
            <div key={idx} className="grid sm:grid-cols-[2fr_1fr_2fr_1fr_auto] grid-cols-1 gap-2 items-start p-2 rounded-lg border bg-muted/20">
              <div>
                <Label className="text-xs sm:hidden mb-1 block">Name *</Label>
                <Input
                  placeholder="e.g. Kente Fabric Dress"
                  value={row.name}
                  onChange={(e) => updateRow(idx, "name", e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs sm:hidden mb-1 block">Price (GHS) *</Label>
                <Input
                  placeholder="e.g. 250.00"
                  type="number"
                  min="0"
                  step="0.01"
                  value={row.price}
                  onChange={(e) => updateRow(idx, "price", e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs sm:hidden mb-1 block">Description</Label>
                <Input
                  placeholder="Short description"
                  value={row.description}
                  onChange={(e) => updateRow(idx, "description", e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs sm:hidden mb-1 block">Stock</Label>
                <Input
                  placeholder="e.g. 10"
                  type="number"
                  min="0"
                  value={row.stock}
                  onChange={(e) => updateRow(idx, "stock", e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => removeRow(idx)}
                disabled={rows.length <= 1}
                className="self-center p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 mt-5 sm:mt-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <Button variant="ghost" size="sm" onClick={addRow} disabled={rows.length >= 50} className="gap-1.5 self-start mt-1">
          <Plus className="w-4 h-4" /> Add Row
          {rows.length >= 50 && <span className="text-xs text-muted-foreground">(max 50)</span>}
        </Button>

        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={uploading || filledRows.length === 0} className="gap-2">
            {uploading ? (
              "Uploading..."
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload {filledRows.length > 0 ? `${filledRows.length} Product${filledRows.length !== 1 ? "s" : ""}` : "Products"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
