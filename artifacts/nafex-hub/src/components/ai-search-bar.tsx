import { useState } from "react";
import { Link } from "wouter";
import { Sparkles, Loader2, X, ShoppingBag, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type AiProduct = {
  id: number;
  name: string;
  description: string;
  price: string;
  discountPrice: string | null;
  images: string[];
  businessId: number;
  businessName: string;
  businessLogo: string | null;
  businessVerified: boolean;
};

type AiResponse = {
  filters: {
    keywords: string[];
    category: string | null;
    minPrice: number | null;
    maxPrice: number | null;
    verifiedOnly: boolean;
    explanation: string;
  };
  products: AiProduct[];
  count: number;
};

export function AiSearchBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (query.trim().length < 2) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/search/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error ?? "Search failed");
      }
      const data = (await r.json()) as AiResponse;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gradient-to-br from-primary/10 via-card to-purple-500/5 border border-primary/20 rounded-2xl p-4 sm:p-5 space-y-3" data-testid="ai-search-bar">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">AI Search</h3>
        <span className="text-xs text-muted-foreground hidden sm:inline">Ask in plain English</span>
      </div>
      <form onSubmit={runSearch} className="flex gap-2">
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="e.g. red kente dress under GHS 500"
          className="flex-1 h-11"
          data-testid="input-ai-search"
        />
        <Button type="submit" disabled={loading || query.trim().length < 2} className="h-11 gap-2" data-testid="btn-ai-search">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Search
        </Button>
      </form>

      {(open && (result || error || loading)) && (
        <div className="bg-background/80 backdrop-blur border border-border rounded-xl p-4 space-y-3 relative">
          <button
            type="button"
            onClick={() => { setOpen(false); setResult(null); setError(null); }}
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
            data-testid="btn-close-ai-results"
          >
            <X className="w-4 h-4" />
          </button>

          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Understanding your search...
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          {result && !loading && (
            <>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-primary" /> {result.filters.explanation}
                </p>
                {(result.filters.keywords.length > 0 || result.filters.category || result.filters.maxPrice || result.filters.verifiedOnly) && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {result.filters.keywords.map(k => (
                      <span key={k} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{k}</span>
                    ))}
                    {result.filters.category && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{result.filters.category}</span>
                    )}
                    {result.filters.maxPrice != null && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full">≤ GHS {result.filters.maxPrice}</span>
                    )}
                    {result.filters.minPrice != null && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full">≥ GHS {result.filters.minPrice}</span>
                    )}
                    {result.filters.verifiedOnly && (
                      <span className="text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Verified only
                      </span>
                    )}
                  </div>
                )}
              </div>

              {result.products.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No matching products found.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[500px] overflow-y-auto pr-1">
                  {result.products.map(p => (
                    <Link key={p.id} href={`/product/${p.id}`}>
                      <div className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/40 transition-colors cursor-pointer" data-testid={`ai-result-${p.id}`}>
                        <div className="aspect-square bg-muted/40 overflow-hidden">
                          {p.images?.[0] ? (
                            <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ShoppingBag className="w-8 h-8 text-muted-foreground/30" />
                            </div>
                          )}
                        </div>
                        <div className="p-2 space-y-0.5">
                          <p className="text-xs font-medium line-clamp-2 leading-tight">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1 truncate">
                            {p.businessName}
                            {p.businessVerified && <ShieldCheck className="w-2.5 h-2.5 text-green-500 flex-shrink-0" />}
                          </p>
                          <p className="text-sm font-bold text-primary">GHS {parseFloat(p.discountPrice ?? p.price).toFixed(2)}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
