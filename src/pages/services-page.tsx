import { useQuery } from "@tanstack/react-query";
import { MessageCircle, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

type Service = {
  id: number;
  title: string;
  description: string;
  image: string | null;
  isActive: boolean;
  createdAt: string;
};

const WA_MESSAGE = encodeURIComponent("Hello, I'm interested in your services on Nafex Hub");

function useServices() {
  return useQuery<Service[]>({
    queryKey: ["/api/services"],
    queryFn: async () => {
      const res = await fetch("/api/services");
      if (!res.ok) return [];
      return res.json();
    },
  });
}

function ServiceCard({ service }: { service: Service }) {
  const token = localStorage.getItem("nafex_token");
  let waNumber = "";
  try {
    if (token) {
      const settings: Record<string, string> = JSON.parse(
        localStorage.getItem("nafex_settings") || "{}"
      );
      waNumber = settings["whatsapp_contact"] ?? "";
    }
  } catch {
    waNumber = "";
  }
  const waUrl = waNumber
    ? `https://wa.me/${waNumber.replace(/\D/g, "")}?text=${WA_MESSAGE}`
    : `https://wa.me/?text=${WA_MESSAGE}`;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col hover:border-primary/40 hover:shadow-lg transition-all duration-300 group">
      {service.image ? (
        <div className="aspect-video w-full overflow-hidden bg-muted">
          <img
            src={service.image}
            alt={service.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="aspect-video w-full bg-gradient-to-br from-primary/10 via-primary/5 to-muted flex items-center justify-center">
          <Sparkles className="w-12 h-12 text-primary/40" />
        </div>
      )}
      <div className="p-6 flex flex-col flex-1">
        <h3 className="font-serif text-xl font-bold mb-2 group-hover:text-primary transition-colors">
          {service.title}
        </h3>
        <p className="text-muted-foreground text-sm leading-relaxed flex-1">
          {service.description}
        </p>
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium h-10 px-4 transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          Contact via WhatsApp
        </a>
      </div>
    </div>
  );
}

export default function ServicesPage() {
  const { data: services, isLoading } = useServices();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="bg-secondary text-secondary-foreground py-16 md:py-24 px-4">
        <div className="container mx-auto max-w-4xl text-center space-y-5">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            Creative Services
          </div>
          <h1 className="font-serif text-4xl md:text-5xl font-bold">Nafex Creative Services</h1>
          <p className="text-secondary-foreground/80 text-lg max-w-2xl mx-auto">
            Professional creative solutions tailored for the Ghanaian fashion industry. From branding to digital marketing, we have you covered.
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-16 md:py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-border overflow-hidden">
                  <Skeleton className="aspect-video w-full" />
                  <div className="p-6 space-y-3">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-10 w-full mt-2 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : !services?.length ? (
            <div className="text-center py-20 space-y-4">
              <Sparkles className="w-12 h-12 text-muted-foreground/30 mx-auto" />
              <h2 className="text-xl font-semibold text-muted-foreground">No services available yet</h2>
              <p className="text-muted-foreground text-sm">Check back soon — we're adding new creative services.</p>
              <Link href="/">
                <Button variant="outline" className="mt-2">Back to Home</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map(service => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
