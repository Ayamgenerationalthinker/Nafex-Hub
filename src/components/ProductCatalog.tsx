// src/components/ProductCatalog.tsx
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search } from "lucide-react";

// Mock product data
type Product = {
  id: string;
  name: string;
  price: string;
  image: string;
};

const mockProducts: Product[] = [
  {
    id: "1",
    name: "Elegant Handbag",
    price: "$45",
    image: "/images/products/handbag.jpg",
  },
  {
    id: "2",
    name: "Smartphone X200",
    price: "$299",
    image: "/images/products/smartphone.jpg",
  },
  {
    id: "3",
    name: "Leather Sneakers",
    price: "$79",
    image: "/images/products/sneakers.jpg",
  },
  {
    id: "4",
    name: "Eco-friendly Water Bottle",
    price: "$15",
    image: "/images/products/bottle.jpg",
  },
  // Add more items as needed
];

export default function ProductCatalog() {
  const [search, setSearch] = useState<string>("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return mockProducts;
    return mockProducts.filter((p) => p.name.toLowerCase().includes(term));
  }, [search]);

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Product Catalog</h1>
      <div className="relative mb-6 max-w-sm w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 w-4 h-4" />
        <Input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 pr-3 rounded-full bg-secondary-foreground/5 border border-secondary-foreground/10 focus:outline-none focus:ring-2 focus:ring-primary/70 focus:border-primary/70"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((product) => (
          <Card key={product.id} className="glass hover-elevate transition overflow-hidden">
            <CardHeader className="p-0">
              <img src={product.image} alt={product.name} className="w-full h-48 object-cover" />
            </CardHeader>
            <CardContent className="pt-4">
              <CardTitle className="text-lg font-medium truncate">{product.name}</CardTitle>
              <p className="text-primary mt-1">{product.price}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
