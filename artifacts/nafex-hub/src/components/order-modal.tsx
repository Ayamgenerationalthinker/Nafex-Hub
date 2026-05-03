import { useState } from "react";
import { useCreateOrder, useTrackEvent } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ShoppingBag, Plus, Trash2 } from "lucide-react";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface OrderModalProps {
  businessId: number;
  businessName: string;
  onClose: () => void;
}

export default function OrderModal({ businessId, businessName, onClose }: OrderModalProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<OrderItem[]>([{ name: "", quantity: 1, price: 0 }]);
  const [notes, setNotes] = useState("");

  const { mutate: trackEvent } = useTrackEvent();
  const { mutate: createOrder, isPending } = useCreateOrder({
    mutation: {
      onSuccess: () => {
        trackEvent({ data: { businessId, type: "order" } });
        toast({ title: "Order placed successfully!", description: "The seller will be in touch soon." });
        onClose();
      },
      onError: () => {
        toast({ title: "Failed to place order", variant: "destructive" });
      },
    },
  });

  const addItem = () => setItems([...items, { name: "", quantity: 1, price: 0 }]);

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const updateItem = (idx: number, field: keyof OrderItem, value: string | number) => {
    setItems(items.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  };

  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity * 100, 0);

  const handleSubmit = () => {
    const token = localStorage.getItem("nafex_token");
    if (!token) {
      toast({ title: "Please log in to place an order", variant: "destructive" });
      return;
    }

    const validItems = items.filter((i) => i.name.trim());
    if (validItems.length === 0) {
      toast({ title: "Add at least one item", variant: "destructive" });
      return;
    }

    createOrder({
      data: {
        businessId,
        items: validItems.map((i) => ({ ...i, price: Math.round(i.price * 100) })),
        totalPrice: Math.round(totalPrice),
        notes: notes || undefined,
      },
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            Place Order
          </DialogTitle>
          <DialogDescription>Order from {businessName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Items */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">Items</p>
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  placeholder="Item name"
                  value={item.name}
                  onChange={(e) => updateItem(idx, "name", e.target.value)}
                  className="flex-1 text-sm"
                />
                <Input
                  type="number"
                  placeholder="Qty"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 1)}
                  className="w-16 text-sm"
                />
                <Input
                  type="number"
                  placeholder="GHS"
                  min={0}
                  step={0.01}
                  value={item.price || ""}
                  onChange={(e) => updateItem(idx, "price", parseFloat(e.target.value) || 0)}
                  className="w-24 text-sm"
                />
                {items.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => removeItem(idx)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addItem} className="gap-1.5 text-xs">
              <Plus className="w-3.5 h-3.5" />
              Add Item
            </Button>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-foreground">Notes (optional)</p>
            <Textarea
              placeholder="Delivery address, size preferences, special requests…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-sm resize-none"
              rows={2}
            />
          </div>

          {/* Total */}
          {totalPrice > 0 && (
            <div className="flex items-center justify-between py-3 border-t border-border">
              <span className="text-sm font-medium text-foreground">Total</span>
              <span className="font-bold text-foreground">GHS {(totalPrice / 100).toFixed(2)}</span>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isPending} className="flex-1">
              {isPending ? "Placing…" : "Place Order"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
