import { Link } from "wouter";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, TrendingUp, MessageCircle, Star } from "lucide-react";
import type { Business } from "@workspace/api-client-react";

type BrandCardProps = {
  business: Business & { avgRating?: number | null; reviewCount?: number };
  isTopSeller?: boolean;
  isTrending?: boolean;
};

export function BrandCard({ business, isTopSeller, isTrending }: BrandCardProps) {
  const coverImage = business.images?.[0] || business.logo;
  const whatsappUrl = `https://wa.me/${business.phone.replace(/\D/g, "")}`;
  const avgRating = (business as { avgRating?: number | null }).avgRating;
  const reviewCount = (business as { reviewCount?: number }).reviewCount ?? 0;

  return (
    <Card className="overflow-hidden group flex flex-col h-full hover-elevate transition-all duration-300 border-border/50 hover:border-primary/30" data-testid={`card-brand-${business.id}`}>
      <div className="aspect-[4/3] w-full overflow-hidden bg-muted relative">
        {coverImage ? (
          <img
            src={coverImage}
            alt={business.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-secondary/10">
            <span className="font-serif text-4xl text-secondary/30">{business.name.charAt(0)}</span>
          </div>
        )}
        {business.logo && (
          <div className="absolute bottom-4 left-4 w-12 h-12 rounded-full border-2 border-background overflow-hidden bg-background shadow-md">
            <img src={business.logo} alt={`${business.name} logo`} className="w-full h-full object-cover" loading="lazy" />
          </div>
        )}
        <div className="absolute top-4 right-4 flex flex-col items-end gap-1.5">
          <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm hover:bg-background/90 text-xs font-medium">
            {business.category}
          </Badge>
          {isTopSeller && (
            <Badge className="bg-amber-500 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Top Seller
            </Badge>
          )}
          {isTrending && !isTopSeller && (
            <Badge className="bg-rose-500 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Trending
            </Badge>
          )}
          {business.isFeatured && !isTopSeller && !isTrending && (
            <Badge className="bg-primary hover:bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1">
              ★ Featured
            </Badge>
          )}
        </div>
      </div>

      <CardHeader className="p-5 pb-2 flex-none">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-serif text-xl font-bold leading-tight line-clamp-1 group-hover:text-primary transition-colors" data-testid={`text-brand-name-${business.id}`}>
            {business.name}
          </h3>
          {business.isVerified && (
            <img
              src="/nafex-verified-badge.png"
              alt="Nafex Verified"
              className="w-8 h-8 object-contain flex-shrink-0"
              title="Nafex Hub Verified Seller"
            />
          )}
        </div>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center text-muted-foreground text-sm gap-1">
            <MapPin className="w-3.5 h-3.5" />
            <span className="line-clamp-1">{business.location}</span>
          </div>
          {avgRating != null && avgRating > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="font-semibold text-foreground">{Number(avgRating).toFixed(1)}</span>
              {reviewCount > 0 && (
                <span className="text-muted-foreground">({reviewCount})</span>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-5 pt-2 flex-grow">
        <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-brand-desc-${business.id}`}>
          {business.description}
        </p>
      </CardContent>

      <CardFooter className="p-5 pt-0 mt-auto flex-none flex flex-col gap-2">
        <Link
          href={`/brand/${business.id}`}
          className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 group-hover:border-primary/50 group-hover:bg-primary/5"
          data-testid={`link-view-brand-${business.id}`}
        >
          View Profile
        </Link>
        {business.phone && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium h-10 px-4 py-2 bg-green-600 hover:bg-green-700 text-white transition-colors"
            data-testid={`link-whatsapp-${business.id}`}
          >
            <MessageCircle className="w-4 h-4" />
            Chat on WhatsApp
          </a>
        )}
      </CardFooter>
    </Card>
  );
}
