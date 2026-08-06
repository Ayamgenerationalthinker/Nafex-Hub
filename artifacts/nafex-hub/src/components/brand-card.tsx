import { Link } from "wouter";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, TrendingUp, MessageCircle, Star, Crown } from "lucide-react";
import type { Business } from "@workspace/api-client-react";

type BrandCardProps = {
  business: Business & { avgRating?: number | null; reviewCount?: number };
  isTopSeller?: boolean;
  isTrending?: boolean;
  isFeaturedTop?: boolean;
};

export function BrandCard({ business, isTopSeller, isTrending, isFeaturedTop }: BrandCardProps) {
  const coverImage = business.images?.[0] || business.logo;
  const whatsappUrl = `https://wa.me/${business.phone.replace(/\D/g, "")}`;
  const avgRating = (business as { avgRating?: number | null }).avgRating;
  const reviewCount = (business as { reviewCount?: number }).reviewCount ?? 0;
  const ratingScore = avgRating ? Math.min(5, Math.max(0, avgRating)) : 0;
  const reviewConfidence = Math.min(1, reviewCount / 20);
  const verifiedBoost = business.isVerified ? 0.5 : 0;
  const qualityScore = Math.round(((ratingScore * 10) * (0.7 + 0.3 * reviewConfidence)) + (verifiedBoost * 10));
  const showQualityScore = business.isVerified || reviewCount > 0;

  const showFeaturedBadge = business.isFeatured && !isTopSeller && !isTrending;

  return (
    <Card
      className={`overflow-hidden group flex flex-col h-full transition-all duration-300 rounded-2xl border border-purple-100/80 bg-white hover:shadow-md hover:border-[#6A1B9A]/40 font-poppins ${isFeaturedTop ? "ring-2 ring-[#6A1B9A]/30 shadow-md" : ""}`}
      data-testid={`card-brand-${business.id}`}
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-[#FFF8E6] relative">
        {coverImage ? (
          <img
            src={coverImage}
            alt={business.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#F6F2FF]">
            <span className="font-poppins text-4xl font-bold text-[#6A1B9A]/40">{business.name.charAt(0)}</span>
          </div>
        )}
        {business.logo && (
          <div className="absolute bottom-4 left-4 w-12 h-12 rounded-full border-2 border-white overflow-hidden bg-white shadow-md">
            <img src={business.logo} alt={`${business.name} logo`} className="w-full h-full object-cover" loading="lazy" />
          </div>
        )}
        <div className="absolute top-4 right-4 flex flex-col items-end gap-1.5">
          <Badge variant="secondary" className="bg-white/90 text-[#6A1B9A] border border-purple-100 text-xs font-semibold">
            {business.category}
          </Badge>
          {isFeaturedTop && (
            <Badge className="bg-[#6A1B9A] hover:bg-[#5B1687] text-white text-xs font-bold flex items-center gap-1">
              <Crown className="w-3 h-3 text-[#D4A017]" /> Top Pick
            </Badge>
          )}
          {isTopSeller && !isFeaturedTop && (
            <Badge className="bg-[#D4A017] hover:bg-[#B88A12] text-white text-xs font-semibold flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Top Seller
            </Badge>
          )}
          {isTrending && !isTopSeller && !isFeaturedTop && (
            <Badge className="bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Trending
            </Badge>
          )}
          {showFeaturedBadge && !isFeaturedTop && (
            <Badge className="bg-[#6A1B9A] hover:bg-[#5B1687] text-white text-xs font-semibold flex items-center gap-1">
              ★ Featured
            </Badge>
          )}
        </div>
      </div>

      <CardHeader className="p-5 pb-2 flex-none">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-poppins text-lg font-bold text-[#222222] leading-tight line-clamp-1 group-hover:text-[#6A1B9A] transition-colors" data-testid={`text-brand-name-${business.id}`}>
            {business.name}
          </h3>
          {business.isVerified && (
            <img
              src="/nafex-verified-badge.png"
              alt="Nafex Verified"
              className="w-7 h-7 object-contain flex-shrink-0"
              title="Nafex Hub Verified Seller"
            />
          )}
        </div>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center text-[#6B7280] text-xs gap-1">
            <MapPin className="w-3.5 h-3.5 text-[#6A1B9A]" />
            <span className="line-clamp-1">{business.location}</span>
          </div>
          {avgRating != null && avgRating > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <Star className="w-3.5 h-3.5 fill-[#D4A017] text-[#D4A017]" />
              <span className="font-bold text-[#222222]">{Number(avgRating).toFixed(1)}</span>
              {reviewCount > 0 && (
                <span className="text-[#6B7280]">({reviewCount})</span>
              )}
            </div>
          )}
        </div>
        {showQualityScore && (
          <div className="mt-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#F6F2FF] text-[#6A1B9A] border border-purple-200">
              <Star className="w-3 h-3 text-[#D4A017] fill-[#D4A017]" />
              Trust Score {qualityScore}/100
            </span>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-5 pt-2 flex-grow">
        <p className="text-xs text-[#6B7280] line-clamp-2 leading-relaxed" data-testid={`text-brand-desc-${business.id}`}>
          {business.description}
        </p>
      </CardContent>

      <CardFooter className="p-5 pt-0 mt-auto flex-none flex flex-col gap-2">
        <Link
          href={`/brand/${business.id}`}
          className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold transition-all h-10 px-4 py-2 border-2 border-[#6A1B9A] text-[#6A1B9A] bg-transparent hover:bg-[#6A1B9A] hover:text-white"
          data-testid={`link-view-brand-${business.id}`}
        >
          View Profile
        </Link>
      </CardFooter>
    </Card>
  );
}
