import { useState } from "react";
import { Link } from "wouter";
import { 
  ShoppingBag, 
  Store, 
  ShieldCheck, 
  Zap, 
  Shield, 
  TrendingUp, 
  BarChart3, 
  Users, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = [
  "Fashion & Apparel",
  "Electronics & Tech",
  "Home & Living",
  "Beauty & Care",
  "Digital Products",
  "Services & Local Work",
  "Other",
];

export default function Waitlist() {
  const [tab, setTab] = useState<"buy" | "sell">("buy");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("");
  const [storeName, setStoreName] = useState("");
  const [storeLink, setStoreLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();
    if (!cleanEmail || !cleanName) return;

    // 1. Check local storage for duplicate submission
    const existingEmails: string[] = JSON.parse(localStorage.getItem("nafex_waitlist_emails") || "[]");
    if (existingEmails.includes(cleanEmail)) {
      toast({
        variant: "destructive",
        title: "⚠️ Duplicate Email",
        description: "This email address has already joined the waitlist!",
      });
      return;
    }

    setLoading(true);

    try {
      // 2. Submit to FormSubmit.co for direct email delivery to nafexgroupltd@gmail.com
      const formSubmitData = {
        name: cleanName,
        email: cleanEmail,
        role: tab === "buy" ? "Shopper / Client" : "Product Seller",
        category: category || "Not Specified",
        storeName: tab === "sell" ? storeName : "N/A",
        storeLink: tab === "sell" ? storeLink : "N/A",
        _subject: `🎉 New Waitlist Signup: ${cleanName} (${tab === "buy" ? "Shopper" : "Seller"})`,
        _captcha: "false",
        _autoresponse: `Welcome to the official Nafex Hub early access waitlist, ${cleanName}! 🎉\n\nThank you for joining us early. Your spot is officially reserved.\n\nWe are hard at work building Ghana's premier hybrid marketplace — featuring Escrow payment protection, verified sellers, and local trade connect.\n\nPlease watch out for launch announcements in your inbox so you can claim your early access perks on Day 1!\n\nWarm regards,\nThe Nafex Hub Team\nhttps://nafex-hub-launchpad.vercel.app/`,
      };

      const [formSubmitRes, apiRes] = await Promise.allSettled([
        fetch("https://formsubmit.co/ajax/nafexgroupltd@gmail.com", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json" 
          },
          body: JSON.stringify(formSubmitData),
        }),
        fetch("/api/newsletter/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: cleanEmail,
            name: cleanName,
            role: tab === "buy" ? "buyer" : "seller",
            category,
            storeName: tab === "sell" ? storeName : undefined,
            storeLink: tab === "sell" ? storeLink : undefined,
            source: "lovable_waitlist",
          }),
        })
      ]);

      // Check if API returned duplicate email error
      if (apiRes.status === "fulfilled" && !apiRes.value.ok) {
        const errData = await apiRes.value.json().catch(() => ({}));
        if (errData.error?.includes("already been submitted")) {
          toast({
            variant: "destructive",
            title: "⚠️ Duplicate Email",
            description: "This email address has already been submitted to the waitlist.",
          });
          existingEmails.push(cleanEmail);
          localStorage.setItem("nafex_waitlist_emails", JSON.stringify(existingEmails));
          setLoading(false);
          return;
        }
      }

      // Save email to local storage to block duplicate submissions from this browser
      existingEmails.push(cleanEmail);
      localStorage.setItem("nafex_waitlist_emails", JSON.stringify(existingEmails));

      setSubmitted(true);
      toast({
        title: tab === "buy" ? "🎉 Early Buyer Access Claimed!" : "🚀 Founding Seller Application Received!",
        description: "Your waitlist entry has been sent to nafexgroupltd@gmail.com.",
      });
    } catch (err) {
      existingEmails.push(cleanEmail);
      localStorage.setItem("nafex_waitlist_emails", JSON.stringify(existingEmails));
      setSubmitted(true);
      toast({
        title: "Welcome to the Waitlist!",
        description: "Your spot has been reserved.",
      });
    } finally {
      setLoading(false);
    }
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#FDFCFD] font-sans text-[#1A1A1E] flex flex-col justify-between">
      
      {/* ── STICKY TOP NAVBAR ── */}
      <header className="sticky top-0 z-50 w-full bg-white/85 backdrop-blur-md border-b border-purple-100/60 shadow-xs">
        <div className="container mx-auto flex h-20 items-center justify-between px-4 sm:px-8">
          {/* Big Visible Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Logo size="xl" variant="raw" showTagline={false} />
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#4B5563]">
            <button onClick={() => scrollToSection("for-buyers")} className="hover:text-[#6A1B9A] transition-colors">
              For Buyers
            </button>
            <button onClick={() => scrollToSection("for-sellers")} className="hover:text-[#6A1B9A] transition-colors">
              For Sellers
            </button>
            <button onClick={() => scrollToSection("why-nafex")} className="hover:text-[#6A1B9A] transition-colors">
              Why Nafex
            </button>
          </nav>

          {/* CTA Header Button */}
          <button
            onClick={() => scrollToSection("waitlist")}
            className="h-10 px-5 rounded-full bg-[#1F1F23] hover:bg-[#333338] text-white text-xs font-semibold tracking-wide transition-all shadow-sm flex items-center gap-1.5"
          >
            Join waitlist <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      <main className="flex-1">
        {/* ── HERO & WAITLIST CARD FORM SECTION ── */}
        <section id="waitlist" className="relative pt-16 pb-20 px-4 sm:px-8 bg-gradient-to-b from-purple-50/50 via-white to-white overflow-hidden">
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-r from-purple-200/40 via-purple-300/30 to-amber-200/20 blur-3xl rounded-full pointer-events-none" />

          <div className="container mx-auto max-w-4xl text-center space-y-6 relative z-10">
            
            {/* Top Pill Badge */}
            <div className="inline-flex items-center gap-2 bg-purple-100/80 border border-purple-200/80 rounded-full px-4 py-1.5 text-xs font-semibold text-[#6A1B9A]">
              <Sparkles className="w-3.5 h-3.5 text-[#6A1B9A]" />
              Opening Soon — Join the Exclusive Early Access
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.1] text-[#111827]">
              The Next Generation <br />
              Marketplace for <br />
              <span className="bg-gradient-to-r from-[#6A1B9A] via-[#8E24AA] to-[#D4A017] bg-clip-text text-transparent">
                Buyers & Sellers
              </span>
            </h1>

            {/* Subtext */}
            <p className="text-base sm:text-lg text-[#6B7280] max-w-2xl mx-auto leading-relaxed font-normal">
              Nafex Hub connects trusted sellers with savvy shoppers. Get early access, exclusive perks, and lower fees when we launch.
            </p>

            {/* ── INTERACTIVE WAITLIST CARD ── */}
            <div className="max-w-xl mx-auto pt-6">
              <div className="bg-white border border-purple-100 rounded-3xl p-6 sm:p-8 shadow-xl shadow-purple-900/5 text-left relative overflow-hidden">
                
                {/* Toggle Tabs */}
                <div className="grid grid-cols-2 p-1 bg-slate-100/80 rounded-2xl mb-6">
                  <button
                    type="button"
                    onClick={() => setTab("buy")}
                    className={`py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                      tab === "buy"
                        ? "bg-white text-[#111827] shadow-sm font-bold"
                        : "text-[#6B7280] hover:text-[#111827]"
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4 text-[#6A1B9A]" />
                    I Want to Buy
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab("sell")}
                    className={`py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                      tab === "sell"
                        ? "bg-white text-[#111827] shadow-sm font-bold"
                        : "text-[#6B7280] hover:text-[#111827]"
                    }`}
                  >
                    <Store className="w-4 h-4 text-[#D4A017]" />
                    I Want to Sell
                  </button>
                </div>

                {submitted ? (
                  <div className="text-center py-8 space-y-4">
                    <div className="w-16 h-16 rounded-full bg-purple-100 text-[#6A1B9A] flex items-center justify-center mx-auto shadow-inner">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-bold text-[#111827]">
                      {tab === "buy" ? "VIP Access Reserved!" : "Founding Seller Application Received!"}
                    </h3>
                    <p className="text-sm text-[#6B7280] max-w-md mx-auto leading-relaxed">
                      {tab === "buy"
                        ? "We've locked in your VIP 24h early access pass. Watch your inbox for launch announcements."
                        : "Your store profile has been placed in our founding seller queue for 0% commission status."}
                    </p>
                    <button
                      onClick={() => setSubmitted(false)}
                      className="text-xs text-[#6A1B9A] font-semibold underline pt-2"
                    >
                      Submit another email
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-[#374151]">Full name</label>
                        <Input
                          type="text"
                          placeholder="Jane Doe"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          required
                          className="h-11 bg-slate-50/60 border-slate-200 rounded-xl text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-[#374151]">Email address</label>
                        <Input
                          type="email"
                          placeholder="jane@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="h-11 bg-slate-50/60 border-slate-200 rounded-xl text-sm"
                        />
                      </div>
                    </div>

                    {tab === "sell" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-[#374151]">Store / Brand Name</label>
                          <Input
                            type="text"
                            placeholder="Acme Goods"
                            value={storeName}
                            onChange={(e) => setStoreName(e.target.value)}
                            required
                            className="h-11 bg-slate-50/60 border-slate-200 rounded-xl text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-[#374151]">Store Link (Optional)</label>
                          <Input
                            type="text"
                            placeholder="instagram.com/yourstore"
                            value={storeLink}
                            onChange={(e) => setStoreLink(e.target.value)}
                            className="h-11 bg-slate-50/60 border-slate-200 rounded-xl text-sm"
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#374151]">
                        {tab === "buy" ? "Favorite category" : "Primary Product Category"}
                      </label>
                      <div className="relative">
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full h-11 bg-slate-50/60 border border-slate-200 rounded-xl text-sm px-3 text-[#111827] appearance-none focus:outline-none focus:ring-2 focus:ring-[#6A1B9A]"
                        >
                          <option value="">Choose a category</option>
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Perk Box */}
                    <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-100 text-xs text-[#5B21B6] leading-relaxed">
                      {tab === "buy" ? (
                        <span>🎁 <strong>Buyer perk:</strong> Unlock exclusive early access and VIP browsing 24 hours before public launch.</span>
                      ) : (
                        <span>✨ <strong>Founding seller perk:</strong> Get 0% commission for your first 3 months and priority featured shop placement.</span>
                      )}
                    </div>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#6A1B9A] to-[#8E24AA] hover:from-[#5B1687] hover:to-[#7B1FA2] text-white font-bold text-sm shadow-lg shadow-purple-900/10 transition-all gap-2"
                    >
                      {loading
                        ? "Submitting..."
                        : tab === "buy"
                        ? "Claim Early Buyer Access →"
                        : "Apply as Founding Seller →"}
                    </Button>
                  </form>
                )}

                <p className="text-[11px] text-center text-[#9CA3AF] mt-4 font-medium">
                  No spam. We'll only email you with launch updates.
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* ── FOR BUYERS SECTION ── */}
        <section id="for-buyers" className="py-20 px-4 sm:px-8 bg-white border-t border-purple-50">
          <div className="container mx-auto max-w-5xl space-y-12">
            <div className="text-center space-y-3">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#111827]">
                Shop with confidence
              </h2>
              <p className="text-base text-[#6B7280] max-w-xl mx-auto">
                Every seller vetted. Every checkout fast. Every purchase protected.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-[#FAF8FC] rounded-3xl p-7 border border-purple-100/60 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-white text-[#6A1B9A] flex items-center justify-center shadow-xs">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#111827]">
                  Verified Sellers & Authentic Products
                </h3>
                <p className="text-xs sm:text-sm text-[#4B5563] leading-relaxed">
                  Every seller passes verification, so what you order is what you get — every time.
                </p>
              </div>

              <div className="bg-[#FAF8FC] rounded-3xl p-7 border border-purple-100/60 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-white text-[#6A1B9A] flex items-center justify-center shadow-xs">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#111827]">
                  Lightning-Fast Checkout
                </h3>
                <p className="text-xs sm:text-sm text-[#4B5563] leading-relaxed">
                  One-tap checkout with saved payments and addresses. Under 10 seconds, guaranteed.
                </p>
              </div>

              <div className="bg-[#FAF8FC] rounded-3xl p-7 border border-purple-100/60 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-white text-[#6A1B9A] flex items-center justify-center shadow-xs">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#111827]">
                  Buyer Protection Guarantee
                </h3>
                <p className="text-xs sm:text-sm text-[#4B5563] leading-relaxed">
                  Not as described? Refund handled by Nafex Hub — no fights, no fine print.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── FOR SELLERS SECTION ── */}
        <section id="for-sellers" className="py-20 px-4 sm:px-8 bg-[#FDFBFE]">
          <div className="container mx-auto max-w-5xl space-y-12">
            <div className="text-center space-y-3">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#111827]">
                Grow faster on Nafex
              </h2>
              <p className="text-base text-[#6B7280] max-w-xl mx-auto">
                Zero fluff. Real buyers. Tools that pay for themselves.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white rounded-3xl p-7 border border-purple-100/80 shadow-sm space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#6A1B9A] flex items-center justify-center">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#111827]">
                  Zero Upfront Listing Fees
                </h3>
                <p className="text-xs sm:text-sm text-[#4B5563] leading-relaxed">
                  Launch your storefront and list unlimited products — pay nothing until you sell.
                </p>
              </div>

              <div className="bg-white rounded-3xl p-7 border border-purple-100/80 shadow-sm space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#6A1B9A] flex items-center justify-center">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#111827]">
                  Powerful Analytics & Dashboard
                </h3>
                <p className="text-xs sm:text-sm text-[#4B5563] leading-relaxed">
                  Real-time revenue, traffic, and buyer insights. Know what's working, instantly.
                </p>
              </div>

              <div className="bg-white rounded-3xl p-7 border border-purple-100/80 shadow-sm space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#6A1B9A] flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#111827]">
                  Direct Access to Pre-Registered Buyers
                </h3>
                <p className="text-xs sm:text-sm text-[#4B5563] leading-relaxed">
                  Skip the cold start. Launch to thousands of shoppers already waiting on Day 1.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── WHY NAFEX SECTION ── */}
        <section id="why-nafex" className="py-20 px-4 sm:px-8 bg-white border-t border-purple-50">
          <div className="container mx-auto max-w-5xl space-y-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              
              <div className="space-y-6">
                <h2 className="text-3xl sm:text-4xl font-extrabold text-[#111827] leading-tight">
                  A marketplace built for both sides.
                </h2>
                <p className="text-base text-[#4B5563] leading-relaxed">
                  Most platforms tax sellers and confuse buyers. Nafex Hub is engineered for trust, speed, and fair economics — from the first listing to the tenth re-order.
                </p>
                <button
                  onClick={() => scrollToSection("waitlist")}
                  className="inline-flex items-center gap-2 text-sm font-bold text-[#6A1B9A] hover:underline"
                >
                  Reserve your spot <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#FAF8FC] p-6 rounded-2xl border border-purple-100/80 space-y-2">
                  <div className="text-3xl font-extrabold text-[#6A1B9A]">0%</div>
                  <div className="text-xs font-semibold text-[#111827]">Commission · 3 Months</div>
                  <p className="text-[11px] text-[#6B7280]">Founding seller privilege</p>
                </div>
                <div className="bg-[#FAF8FC] p-6 rounded-2xl border border-purple-100/80 space-y-2">
                  <div className="text-3xl font-extrabold text-[#D4A017]">VIP</div>
                  <div className="text-xs font-semibold text-[#111827]">Early Access Pass</div>
                  <p className="text-[11px] text-[#6B7280]">Exclusive waitlist perk</p>
                </div>
                <div className="bg-[#FAF8FC] p-6 rounded-2xl border border-purple-100/80 space-y-2">
                  <div className="text-3xl font-extrabold text-[#6A1B9A]">24h</div>
                  <div className="text-xs font-semibold text-[#111827]">VIP Early Access</div>
                  <p className="text-[11px] text-[#6B7280]">Shop before public launch</p>
                </div>
                <div className="bg-[#FAF8FC] p-6 rounded-2xl border border-purple-100/80 space-y-2">
                  <div className="text-3xl font-extrabold text-emerald-600">100%</div>
                  <div className="text-xs font-semibold text-[#111827]">Buyer Protection</div>
                  <p className="text-[11px] text-[#6B7280]">Escrow backed checkout</p>
                </div>
              </div>

            </div>
          </div>
        </section>

      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-purple-100 bg-white py-10 px-4 sm:px-8">
        <div className="container mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6B7280]">
          <div className="flex items-center gap-3">
            <Logo size="sm" variant="raw" showTagline={false} />
            <span>© {new Date().getFullYear()} Nafex Hub. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => scrollToSection("waitlist")} className="hover:text-[#6A1B9A] transition-colors">
              Privacy
            </button>
            <button onClick={() => scrollToSection("waitlist")} className="hover:text-[#6A1B9A] transition-colors">
              Terms
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
}
