import { Link } from "wouter";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/hooks/use-cart";

export function CartIcon({ className = "" }: { className?: string }) {
  const totalItems = useCart((s) => s.totalItems());
  return (
    <Link
      href="/cart"
      className={`relative inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/10 transition-colors ${className}`}
      aria-label="Cart"
      data-testid="link-cart"
    >
      <ShoppingCart className="w-5 h-5" />
      {totalItems > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-secondary text-[10px] font-bold flex items-center justify-center">
          {totalItems > 99 ? "99+" : totalItems}
        </span>
      )}
    </Link>
  );
}
