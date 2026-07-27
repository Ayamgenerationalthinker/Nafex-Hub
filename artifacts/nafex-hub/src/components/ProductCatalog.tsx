// src/components/ProductCatalog.tsx
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";

type Product = {
  id: string;
  name: string;
  price: string;
  image: string;
  category: string;
};

const mockProducts: Product[] = [
  {
    id: "1",
    name: "Elegant Handbag",
    price: "GHS 450",
    image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500",
    category: "Fashion",
  },
  {
    id: "2",
    name: "Smartphone X200",
    price: "GHS 2,990",
    image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500",
    category: "Electronics",
  },
  {
    id: "3",
    name: "Leather Sneakers",
    price: "GHS 380",
    image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500",
    category: "Footwear",
  },
  {
    id: "4",
    name: "Eco-friendly Water Bottle",
    price: "GHS 120",
    image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500",
    category: "Home & Living",
  },
];

export default function ProductCatalog() {
  const [search, setSearch] = useState<string>("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return mockProducts;
    return mockProducts.filter((p) => p.name.toLowerCase().includes(term));
  }, [search]);

  return (
    <div className="container mx-auto py-8 px-4 font-poppins">
      <h1 className="text-3xl font-bold text-[#222222] mb-6">Product Catalog</h1>
      <div className="relative mb-8 max-w-md w-full">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7280] w-4 h-4" />
        <Input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 pr-4 h-11 rounded-full bg-[#F6F2FF] border border-purple-200 text-[#222222] placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#6A1B9A] focus:bg-white"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {filtered.map((product) => (
          <Card key={product.id} className="overflow-hidden rounded-2xl border border-purple-100/80 bg-white hover:shadow-md transition-all group flex flex-col">
            <CardHeader className="p-0 relative aspect-square bg-[#FFF8E6] overflow-hidden">
              <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              <span className="absolute top-3 right-3 bg-white/90 text-[#6A1B9A] text-[11px] font-semibold px-2.5 py-1 rounded-full border border-purple-100">
                {product.category}
              </span>
            </CardHeader>
            <CardContent className="p-4 flex flex-col flex-1">
              <CardTitle className="text-base font-bold text-[#222222] truncate">{product.name}</CardTitle>
              <p className="text-[#6A1B9A] font-extrabold text-lg mt-1">{product.price}</p>
              <div className="mt-auto pt-3">
                <Button className="w-full bg-[#6A1B9A] hover:bg-[#5B1687] text-white rounded-xl gap-2 font-semibold">
                  <ShoppingBag className="w-4 h-4" /> Add to Cart
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
