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
  Globe2,
  PackageSearch,
  ShieldCheck,
  Truck,
  TrendingDown,
  ArrowRight,
  Loader2,
  ClipboardList,
  Clock,
  Users,
  MessageSquarePlus,
} from "lucide-react";

const BENEFITS = [
  { icon: <Globe2 className="w-5 h-5" />, title: "Global Sourcing", desc: "Connect with verified suppliers from across the world" },
  { icon: <ShieldCheck className="w-5 h-5" />, title: "Verified Sellers", desc: "All quotes come from Nafex-verified business owners" },
  { icon: <TrendingDown className="w-5 h-5" />, title: "Competitive Pricing", desc: "Multiple quotes let you choose the best deal" },
  { icon: <Truck className="w-5 h-5" />, title: "End-to-End", desc: "Shipping costs and production time included in every quote" },
];

type FormState = {
  productName: string;
  quantity: string;
  budget: string;
  description: string;
};

export default function TradeConnect() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [form, setForm] = useState<FormState>({
    productName: "",
    quantity: "",
    budget: "",
    description: "",
  });
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const token = localStorage.getItem("nafex_token");

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
          description: form.description.trim(),
          images,
          requesterRole: "buyer",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Submission failed");
      }
      setSubmitted(true);
      setForm({ productName: "", quantity: "", budget: "", description: "" });
      setImages([]);
      toast({ title: "Import request submitted!", description: "Sellers will review and send you quotes." });
    } catch (e: unknown) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-foreground to-foreground/80 text-background py-16 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <Badge className="bg-primary text-primary-foreground mb-2">New Feature</Badge>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold leading-tight">
            Nafex Trade Connect
          </h1>
          <p className="text-background/70 text-lg max-w-2xl mx-auto">
            Post your import requirements and receive competitive quotes from verified
            Nafex sellers — fabric, accessories, bulk fashion, and more.
          </p>
          <div className="flex flex-wrap gap-3 justify-center pt-2">
            <Link href="/trade/board">
              <Button variant="outline" className="gap-2 bg-transparent text-background border-background/40 hover:bg-background/10">
                <PackageSearch className="w-4 h-4" />
                Browse All Requests
              </Button>
            </Link>
            {user && (
              <Link href="/trade/my-requests">
                <Button className="gap-2 bg-primary text-primary-foreground">
                  <ClipboardList className="w-4 h-4" />
                  My Requests
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12 space-y-12">
        {/* ── Benefits ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {BENEFITS.map((b) => (
            <div key={b.title} className="bg-muted/40 rounded-xl p-5 space-y-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                {b.icon}
              </div>
              <p className="font-semibold text-foreground text-sm">{b.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* ── Request Form ── */}
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-serif">
                <MessageSquarePlus className="w-5 h-5 text-primary" />
                Submit an Import Request
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
                    Verified sellers will review your request and send quotes. You'll be
                    notified when new quotes arrive.
                  </p>
                  <div className="flex gap-3 justify-center">
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
                      placeholder="e.g. Ankara fabric, custom sneakers, leather bags"
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Quantity (units)</Label>
                      <Input
                        type="number"
                        min="1"
                        value={form.quantity}
                        onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                        placeholder="e.g. 200"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Budget (GHS)</Label>
                      <Input
                        type="number"
                        min="1"
                        step="0.01"
                        value={form.budget}
                        onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
                        placeholder="e.g. 5000"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Description & Requirements</Label>
                    <Textarea
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Describe exactly what you need — material, colour, size, certifications, packaging, delivery timeline…"
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
                    label="Reference Images (optional)"
                  />
                  {!user && (
                    <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg p-3">
                      <Link href="/login" className="text-primary font-medium hover:underline">Sign in</Link>{" "}
                      to submit a request.
                    </p>
                  )}
                  <Button
                    type="submit"
                    className="w-full gap-2"
                    disabled={submitting || !user}
                  >
                    {submitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
                    ) : (
                      <>Submit Import Request <ArrowRight className="w-4 h-4" /></>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          {/* ── How it works ── */}
          <div className="space-y-6">
            <h2 className="font-serif text-xl font-bold text-foreground">How It Works</h2>
            <div className="space-y-4">
              {[
                { step: "1", title: "Post your request", desc: "Describe what you want to import — product, quantity, budget, and specs." },
                { step: "2", title: "Receive quotes", desc: "Verified Nafex sellers review your request and send competitive quotes within 24–48 hours." },
                { step: "3", title: "Compare & choose", desc: "Review unit price, MOQ, shipping cost, and production time side-by-side." },
                { step: "4", title: "Place your order", desc: "Message the seller directly and place your order securely through Nafex escrow." },
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
                <Users className="w-4 h-4 text-primary" /> Are you a seller?
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Browse open import requests and submit quotes to grow your business.
                You'll need a verified Nafex business profile.
              </p>
              <Link href="/trade/board">
                <Button size="sm" variant="outline" className="gap-1.5 w-full">
                  <PackageSearch className="w-3.5 h-3.5" />
                  Browse Open Requests
                </Button>
              </Link>
            </div>

            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span>Most requests receive their first quote within 24 hours.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
