import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImageUpload } from "@/components/image-upload";
import {
  Factory, Tag, Boxes, Ship, Globe2,
  ArrowRight, Loader2, ShieldCheck, ClipboardList,
} from "lucide-react";

const SERVICES = [
  {
    key: "manufacturing",
    icon: <Factory className="w-5 h-5" />,
    title: "Bulk Manufacturing",
    desc: "Source ready-to-sell stock from verified China factories — apparel, accessories, leather, electronics.",
  },
  {
    key: "private_label",
    icon: <Tag className="w-5 h-5" />,
    title: "Private Labeling",
    desc: "Add your brand, tags and packaging to existing factory products — low MOQs for new sellers.",
  },
  {
    key: "wholesale",
    icon: <Boxes className="w-5 h-5" />,
    title: "Wholesale Sourcing",
    desc: "Bulk inventory at wholesale prices, container or pallet quantities, multi-supplier consolidation.",
  },
  {
    key: "logistics",
    icon: <Ship className="w-5 h-5" />,
    title: "Logistics & Customs",
    desc: "End-to-end shipping from China to Tema/Takoradi — sea or air, with customs clearance assistance.",
  },
] as const;

type ServiceKey = typeof SERVICES[number]["key"];

type FormState = {
  productName: string;
  quantity: string;
  budget: string;
  description: string;
  targetPort: string;
};

export default function SellerBulkImport() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const token = localStorage.getItem("nafex_token");

  const [selectedService, setSelectedService] = useState<ServiceKey>("manufacturing");
  const [form, setForm] = useState<FormState>({
    productName: "",
    quantity: "",
    budget: "",
    description: "",
    targetPort: "",
  });
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { setLocation("/login"); return; }

    const qty = parseInt(form.quantity, 10);
    const bgt = parseFloat(form.budget);
    if (!form.productName.trim()) { toast({ title: "Enter a product name", variant: "destructive" }); return; }
    if (isNaN(qty) || qty <= 0) { toast({ title: "Enter a valid quantity", variant: "destructive" }); return; }
    if (isNaN(bgt) || bgt <= 0) { toast({ title: "Enter a valid budget", variant: "destructive" }); return; }
    if (form.description.trim().length < 10) { toast({ title: "Description must be at least 10 characters", variant: "destructive" }); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/trade/request", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          productName: form.productName.trim(),
          quantity: qty,
          budget: bgt,
          description:
            `[${SERVICES.find((s) => s.key === selectedService)?.title}]` +
            (form.targetPort.trim() ? ` Target port: ${form.targetPort.trim()}.` : "") +
            `\n\n${form.description.trim()}`,
          category: selectedService,
          images,
          requesterRole: "seller",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Submission failed");
      }
      setSubmitted(true);
      setForm({ productName: "", quantity: "", budget: "", description: "", targetPort: "" });
      setImages([]);
      toast({ title: "Sourcing request submitted!", description: "Our trade desk and verified suppliers will respond with quotes." });
    } catch (e: unknown) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-gradient-to-br from-foreground to-foreground/80 text-background py-12 md:py-16 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <Badge className="bg-primary text-primary-foreground mb-2">For Sellers</Badge>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold leading-tight">
            Source Inventory from China
          </h1>
          <p className="text-background/70 text-base md:text-lg max-w-2xl mx-auto">
            Grow your Nafex store with bulk manufacturing, private label and wholesale sourcing —
            fully managed shipping and customs clearance to Ghana.
          </p>
          <div className="flex flex-wrap gap-3 justify-center pt-2">
            <Link href="/trade/my-requests">
              <Button className="gap-2 bg-primary text-primary-foreground">
                <ClipboardList className="w-4 h-4" />
                My Sourcing Requests
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10 md:py-12 space-y-10">
        {/* Service picker */}
        <div>
          <h2 className="font-serif text-xl md:text-2xl font-bold text-foreground mb-4">
            Choose a Service
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {SERVICES.map((s) => {
              const active = selectedService === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSelectedService(s.key)}
                  className={`text-left rounded-xl p-4 border transition-all ${
                    active
                      ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${
                    active ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                  }`}>
                    {s.icon}
                  </div>
                  <p className="font-semibold text-foreground text-sm">{s.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* Form */}
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-serif text-lg md:text-xl">
                <Globe2 className="w-5 h-5 text-primary" />
                Submit Sourcing Request
              </CardTitle>
            </CardHeader>
            <CardContent>
              {submitted ? (
                <div className="text-center py-8 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                    <ShieldCheck className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-foreground text-lg">Request Submitted!</h3>
                  <p className="text-sm text-muted-foreground">
                    Verified suppliers will review and send sourcing quotes shortly.
                  </p>
                  <div className="flex gap-3 justify-center flex-wrap">
                    <Button onClick={() => setSubmitted(false)} variant="outline" size="sm">
                      New Request
                    </Button>
                    <Link href="/trade/my-requests">
                      <Button size="sm" className="gap-1.5">
                        View My Requests <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label>Product / Item Name</Label>
                    <Input
                      value={form.productName}
                      onChange={(e) => setForm((f) => ({ ...f, productName: e.target.value }))}
                      placeholder="e.g. Cotton t-shirts (private label), Bluetooth speakers"
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label>Quantity (units)</Label>
                      <Input
                        type="number" min="1"
                        value={form.quantity}
                        onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                        placeholder="e.g. 1000"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Budget (GHS)</Label>
                      <Input
                        type="number" min="1" step="0.01"
                        value={form.budget}
                        onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
                        placeholder="e.g. 40000"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Target Port (optional)</Label>
                    <Input
                      value={form.targetPort}
                      onChange={(e) => setForm((f) => ({ ...f, targetPort: e.target.value }))}
                      placeholder="e.g. Tema, Takoradi, Kotoka air"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Specifications</Label>
                    <Textarea
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Material, sizes, colours, branding/packaging, certifications, timeline…"
                      className="mt-1 resize-none"
                      rows={5}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {form.description.length}/2000 — more detail = better quotes
                    </p>
                  </div>
                  <ImageUpload
                    value={images}
                    onChange={setImages}
                    maxImages={5}
                    label="Product Reference Images (optional)"
                  />
                  {!user && (
                    <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg p-3">
                      <Link href="/login" className="text-primary font-medium hover:underline">Sign in</Link>{" "}
                      to submit a request.
                    </p>
                  )}
                  <Button type="submit" className="w-full gap-2" disabled={submitting || !user}>
                    {submitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
                    ) : (
                      <>Submit Sourcing Request <ArrowRight className="w-4 h-4" /></>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          {/* How it works */}
          <div className="space-y-6">
            <h2 className="font-serif text-xl font-bold text-foreground">How It Works</h2>
            <div className="space-y-4">
              {[
                { step: "1", title: "Pick a service", desc: "Manufacturing, private label, wholesale or logistics — choose what fits your store." },
                { step: "2", title: "Describe the product", desc: "Specs, quantity, budget, target port and reference images." },
                { step: "3", title: "Receive supplier quotes", desc: "Verified China factories and our trade desk send competitive quotes." },
                { step: "4", title: "Pay via escrow & ship", desc: "Funds held safely. Tracked from factory to your warehouse in Ghana." },
              ].map((item) => (
                <div key={item.step} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                    {item.step}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 space-y-3">
              <p className="font-semibold text-foreground text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" /> Escrow-Protected
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Pay via Paystack escrow. Funds are only released to the supplier once your shipment
                arrives and you confirm delivery.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
