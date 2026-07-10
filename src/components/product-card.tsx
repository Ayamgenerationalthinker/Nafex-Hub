import { useLocation } from "wouter";
import { Package, Heart } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToggleFavorite } from "@workspace/api-client-react";

export interface ProductCardProps {
  product: {
    id: number;
    name: string;
    price: string;
    discountPrice?: string | null;
    images?: string[];
    stock?: number | null;
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { mutate: toggleFav } = useToggleFavorite();

  const isOutOfStock = product.stock === 0;

  return (
    <div
      className="group relative rounded-xl border border-border/50 overflow-hidden cursor-pointer hover:border-primary/40 transition-colors bg-card h-full flex flex-col shadow-sm hover:shadow-md"
      onClick={() => setLocation(`/product/${product.id}`)}
    >
      <div className="aspect-square overflow-hidden bg-muted relative">
        {product.images?.[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-8 h-8 text-muted-foreground opacity-30" />
          </div>
        )}
        
        {/* Discount Badge */}
        {product.discountPrice && Number(product.discountPrice) < Number(product.price) && (
          <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-md z-10 shadow-sm">
            SALE
          </div>
        )}
      </div>
      
      <div className="p-3 flex flex-col flex-grow">
        <p className="text-sm font-medium text-foreground line-clamp-2 min-h-[40px]">{product.name}</p>
        
        <div className="mt-auto pt-2">
          {product.discountPrice && Number(product.discountPrice) < Number(product.price) ? (
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-sm font-bold text-red-600">GHS {Number(product.discountPrice).toFixed(2)}</span>
              <span className="text-xs text-muted-foreground line-through">GHS {Number(product.price).toFixed(2)}</span>
            </div>
          ) : (
            <p className="text-sm font-bold text-primary">GHS {Number(product.price).toFixed(2)}</p>
          )}

          {product.stock !== null && product.stock !== undefined && (
            <span
              className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-1.5 ${
                isOutOfStock ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"
              }`}
            >
              {isOutOfStock ? "Out of Stock" : "In Stock"}
            </span>
          )}
        </div>
      </div>
      
      {user && (
        <button
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors z-20 shadow-sm border border-border/50"
          onClick={(e) => {
            e.stopPropagation();
            toggleFav({ data: { productId: product.id } });
          }}
          title="Save to favorites"
        >
          <Heart className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500 transition-colors" />
        </button>
      )}
    </div>
  );
}
