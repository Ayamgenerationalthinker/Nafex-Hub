import { useRoute, useLocation } from "wouter";
import { useGetBusiness, getGetBusinessQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, MapPin, Phone, ArrowLeft, MessageCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function BrandProfile() {
  const [match, params] = useRoute("/brand/:id");
  const [, setLocation] = useLocation();
  const id = params?.id ? parseInt(params.id, 10) : 0;

  const { data: business, isLoading, isError } = useGetBusiness(id, {
    query: { enabled: !!id, queryKey: getGetBusinessQueryKey(id) },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-5xl space-y-8">
        <Skeleton className="h-10 w-40" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-5 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !business) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-5xl text-center space-y-6">
        <h2 className="font-serif text-3xl font-bold">Brand Not Found</h2>
        <p className="text-muted-foreground">This brand doesn't exist or may have been removed.</p>
        <Button onClick={() => setLocation("/explore")} data-testid="btn-back-explore">
          Back to Explore
        </Button>
      </div>
    );
  }

  const whatsappUrl = `https://wa.me/${business.phone.replace(/\D/g, "")}`;

  return (
    <div className="min-h-screen bg-background">
      {/* Header Banner */}
      <div className="w-full h-64 md:h-80 bg-secondary/30 relative overflow-hidden">
        {business.images?.[0] ? (
          <img
            src={business.images[0]}
            alt={business.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/30">
            <span className="font-serif text-8xl text-primary/20">{business.name.charAt(0)}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        <div className="absolute top-4 left-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/explore")}
            className="bg-background/80 backdrop-blur-sm hover:bg-background"
            data-testid="btn-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-5xl -mt-16 relative z-10 pb-16">
        {/* Brand Identity */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
          <div className="flex items-end gap-5">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden border-4 border-background shadow-xl bg-card flex-shrink-0">
              {business.logo ? (
                <img src={business.logo} alt={business.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/10">
                  <span className="font-serif text-3xl font-bold text-primary">{business.name.charAt(0)}</span>
                </div>
              )}
            </div>
            <div className="pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1
                  className="font-serif text-2xl md:text-4xl font-bold text-foreground leading-tight"
                  data-testid="text-business-name"
                >
                  {business.name}
                </h1>
                {business.isVerified && (
                  <div className="flex items-center gap-1 text-primary" title="Verified Brand">
                    <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 fill-primary text-primary-foreground" />
                  </div>
                )}
              </div>
              <Badge variant="outline" className="mt-1 text-xs font-medium" data-testid="text-business-category">
                {business.category}
              </Badge>
            </div>
          </div>
          <Button
            size="lg"
            className="bg-green-600 hover:bg-green-700 text-white gap-2 shadow-lg"
            onClick={() => window.open(whatsappUrl, "_blank")}
            data-testid="btn-whatsapp"
          >
            <MessageCircle className="w-5 h-5" />
            Contact on WhatsApp
          </Button>
        </div>

        {/* Info Row */}
        <div className="flex flex-wrap gap-4 mb-10">
          <div className="flex items-center gap-2 text-muted-foreground text-sm bg-muted/50 rounded-full px-4 py-2">
            <MapPin className="w-4 h-4 text-primary" />
            <span data-testid="text-business-location">{business.location}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground text-sm bg-muted/50 rounded-full px-4 py-2">
            <Phone className="w-4 h-4 text-primary" />
            <span data-testid="text-business-phone">{business.phone}</span>
          </div>
          {business.isVerified && (
            <div className="flex items-center gap-2 text-primary text-sm bg-primary/10 rounded-full px-4 py-2 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              Verified Brand
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-10">
          {/* Collection Grid */}
          <div className="md:col-span-2 space-y-6">
            <h2 className="font-serif text-2xl font-bold text-foreground">Our Collection</h2>
            {business.images && business.images.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
                {business.images.map((img, i) => (
                  <div
                    key={i}
                    className="aspect-square overflow-hidden rounded-xl bg-muted group"
                    data-testid={`img-collection-${i}`}
                  >
                    <img
                      src={img}
                      alt={`${business.name} collection ${i + 1}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="aspect-video rounded-2xl bg-muted/30 border-2 border-dashed flex items-center justify-center text-muted-foreground">
                No collection images yet
              </div>
            )}
          </div>

          {/* About Section */}
          <div className="space-y-6">
            <div className="bg-card rounded-2xl border p-6 space-y-4">
              <h2 className="font-serif text-xl font-bold text-foreground">About</h2>
              <p className="text-muted-foreground leading-relaxed text-sm" data-testid="text-business-description">
                {business.description}
              </p>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 space-y-4">
              <h3 className="font-serif text-lg font-bold text-foreground">Get in Touch</h3>
              <p className="text-sm text-muted-foreground">
                Reach out directly to {business.name} for inquiries, orders, and collaborations.
              </p>
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white gap-2"
                onClick={() => window.open(whatsappUrl, "_blank")}
                data-testid="btn-whatsapp-sidebar"
              >
                <MessageCircle className="w-4 h-4" />
                Chat on WhatsApp
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
