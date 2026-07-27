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
  ChevronDown,
  Lock,
  Share2
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

interface SubmissionInfo {
  name: string;
  email: string;
  role: "buy" | "sell";
  category?: string;
  storeName?: string;
  storeLink?: string;
  ticketId: string;
  timestamp: string;
}

export default function Waitlist() {
  const [submissionInfo, setSubmissionInfo] = useState<SubmissionInfo | null>(() => {
    try {
      const saved = localStorage.getItem("nafex_waitlist_submission_info");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  
  const [tab, setTab] = useState<"buy" | "sell">(submissionInfo?.role || "buy");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("");
  const [storeName, setStoreName] = useState("");
  const [storeLink, setStoreLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState<boolean>(!!submissionInfo);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitted) return;

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();
    if (!cleanEmail || !cleanName) return;

    const ticketId = "NX-VIP-" + Math.floor(100000 + Math.random() * 900000);
    const timestampStr = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });

    const newSubmission: SubmissionInfo = {
      name: cleanName,
      email: cleanEmail,
      role: tab,
      category: category || "General Marketplace",
      storeName: tab === "sell" ? storeName : undefined,
      storeLink: tab === "sell" ? storeLink : undefined,
      ticketId,
      timestamp: timestampStr
    };

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

    // Save email & submission info to local storage to lock state
    existingEmails.push(cleanEmail);
    localStorage.setItem("nafex_waitlist_emails", JSON.stringify(existingEmails));
    localStorage.setItem("nafex_waitlist_submission_info", JSON.stringify(newSubmission));

    const isBuyer = tab === "buy";
    const userRoleTitle = isBuyer ? "Early Access Shopper" : "Founding Seller / Merchant";

    const autoresponseMessage = `Welcome to the official Nafex Hub Early Access Waitlist, ${cleanName}! 🎉

Thank you for joining us early. Your spot is officially reserved as an ${userRoleTitle}.

Nafex Hub is Ghana's premier hybrid marketplace — connecting verified fashion brands, tech, lifestyle merchants, and trade clients with 100% Escrow payment protection!

Here is what your early access reservation includes:

${isBuyer ? `
🛍️ 24-HOUR VIP PRIORITY BROWSING
Get early access to discover top products and claim deals 24 hours before the public launch.

🛡️ 100% ESCROW PAYMENT PROTECTION
Shop with total confidence — your payment is safely held until your order is delivered and verified.

📦 VERIFIED LOCAL MERCHANT DISCOVERY
Discover vetted fashion, tech, home goods, and local products from trusted sellers across Ghana.
` : `
🚀 0% SALES COMMISSION FOR 3 MONTHS
Keep 100% of your store revenue for your first 3 full months after launch.

🌟 FOUNDING SELLER VERIFIED BADGE
Receive a permanent trusted merchant badge displayed on your storefront and product listings.

🔝 PRIORITY SEARCH PLACEMENT
Enjoy featured ranking in category search and discover pages to maximize your shop visibility.

📞 1-ON-1 MERCHANT ONBOARDING
Direct setup assistance from our team for catalog uploading and store customization.
`}

We are putting the final touches on our platform. Watch your inbox for your private preview invitation link!

Warm regards,
The Nafex Hub Team
Ghana's Premier Hybrid Marketplace
Contact: nafexgroupltd@gmail.com`;

    // Web3Forms Payload (Access Key: b35567f8-fef3-44de-85a2-007fa1ef74df)
    const web3Key = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY || "b35567f8-fef3-44de-85a2-007fa1ef74df";
    
    const web3Payload = {
      access_key: web3Key,
      subject: `🎉 New Waitlist Sign-up: ${cleanName} (${userRoleTitle})`,
      from_name: "Nafex Hub",
      name: cleanName,
      email: cleanEmail,
      replyto: cleanEmail,
      role: userRoleTitle,
      category: category || "Not Specified",
      store_name: !isBuyer ? (storeName || "N/A") : undefined,
      store_link: !isBuyer ? (storeLink || "N/A") : undefined,
      message: `New waitlist submission for Nafex Hub!\n\nName: ${cleanName}\nEmail: ${cleanEmail}\nRole: ${userRoleTitle}\nCategory: ${category || "Not Specified"}${!isBuyer ? `\nStore Name: ${storeName || "N/A"}\nStore Link: ${storeLink || "N/A"}` : ""}`,
      autoresponder: autoresponseMessage,
      _autoresponse: autoresponseMessage,
      autoresponder_subject: `🎉 Welcome to Nafex Hub Early Access, ${cleanName}!`,
      botcheck: false
    };

    // EmailJS Dispatch (if VITE_EMAILJS_SERVICE_ID configured)
    const emailjsServiceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const emailjsTemplateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
    const emailjsPublicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

    const emailjsPromise = (emailjsServiceId && emailjsTemplateId && emailjsPublicKey)
      ? fetch("https://api.emailjs.com/api/v1.0/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            service_id: emailjsServiceId,
            template_id: emailjsTemplateId,
            user_id: emailjsPublicKey,
            template_params: {
              user_name: cleanName,
              user_email: cleanEmail,
              reply_to: cleanEmail,
              user_role: userRoleTitle,
              user_category: category || "Not Specified",
              store_name: !isBuyer ? (storeName || "N/A") : "N/A",
              store_link: !isBuyer ? (storeLink || "N/A") : "N/A",
              autoresponder_message: autoresponseMessage,
            }
          })
        })
      : Promise.resolve(null);

    try {
      await Promise.allSettled([
        emailjsPromise,
        fetch("https://api.web3forms.com/submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify(web3Payload),
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
    } catch (err) {
      // Ignore network errors
    } finally {
      setLoading(false);
      setSubmissionInfo(newSubmission);
      setSubmitted(true);
      toast({
        title: tab === "buy" ? "🎉 Early Access Spot Reserved!" : "🚀 Founding Seller Application Received!",
        description: `Confirmation email routed to ${cleanEmail}.`,
      });
    }
  };

  const handleResetTesting = () => {
    localStorage.removeItem("nafex_waitlist_emails");
    localStorage.removeItem("nafex_waitlist_submission_info");
    setSubmissionInfo(null);
    setSubmitted(false);
    setFullName("");
    setEmail("");
    setStoreName("");
    setStoreLink("");
    setCategory("");
    toast({
      title: "Waitlist Reset for Testing",
      description: "Form unlocked! You can now re-submit with any email address.",
    });
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
                
                {/* Toggle Tabs (Locked when submitted) */}
                <div className="grid grid-cols-2 p-1 bg-slate-100/80 rounded-2xl mb-6 relative">
                  <button
                    type="button"
                    disabled={submitted}
                    onClick={() => !submitted && setTab("buy")}
                    className={`py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                      tab === "buy"
                        ? "bg-white text-[#111827] shadow-sm font-bold"
                        : "text-[#6B7280] hover:text-[#111827]"
                    } ${submitted ? "cursor-not-allowed opacity-90" : ""}`}
                  >
                    <ShoppingBag className="w-4 h-4 text-[#6A1B9A]" />
                    <span>I Want to Buy</span>
                    {submitted && tab === "buy" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 ml-1" />}
                    {submitted && tab !== "buy" && <Lock className="w-3.5 h-3.5 text-slate-400 ml-1" />}
                  </button>
                  <button
                    type="button"
                    disabled={submitted}
                    onClick={() => !submitted && setTab("sell")}
                    className={`py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                      tab === "sell"
                        ? "bg-white text-[#111827] shadow-sm font-bold"
                        : "text-[#6B7280] hover:text-[#111827]"
                    } ${submitted ? "cursor-not-allowed opacity-90" : ""}`}
                  >
                    <Store className="w-4 h-4 text-[#D4A017]" />
                    <span>I Want to Sell</span>
                    {submitted && tab === "sell" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 ml-1" />}
                    {submitted && tab !== "sell" && <Lock className="w-3.5 h-3.5 text-slate-400 ml-1" />}
                  </button>
                </div>

                {submitted ? (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    {/* Executive Success Header */}
                    <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900">
                            {submissionInfo?.role === "buy" ? "Early Access Spot Reserved" : "Founding Seller Application Received"}
                          </h3>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-semibold border border-emerald-200">
                            Confirmed
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Welcome aboard, <strong className="text-slate-900">{submissionInfo?.name || fullName}</strong>! A confirmation message has been routed to <span className="font-semibold text-slate-900">{submissionInfo?.email || email}</span>.
                        </p>
                      </div>
                    </div>

                    {/* Clean Details Summary Bar */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 text-[11px] block font-medium">Registered Role</span>
                        <strong className="text-slate-900 font-semibold block mt-0.5">
                          {submissionInfo?.role === "buy" ? "Early Shopper" : "Founding Seller"}
                        </strong>
                      </div>
                      {submissionInfo?.storeName && (
                        <div>
                          <span className="text-slate-400 text-[11px] block font-medium">Store Name</span>
                          <strong className="text-slate-900 font-semibold block mt-0.5 truncate">{submissionInfo.storeName}</strong>
                        </div>
                      )}
                      <div>
                        <span className="text-slate-400 text-[11px] block font-medium">Category</span>
                        <strong className="text-slate-900 font-semibold block mt-0.5 truncate">{submissionInfo?.category || category || "General"}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[11px] block font-medium">Date Reserved</span>
                        <strong className="text-slate-900 font-semibold block mt-0.5">{submissionInfo?.timestamp || "Jul 27, 2026"}</strong>
                      </div>
                    </div>

                    {/* Clean Benefits Grid */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        {submissionInfo?.role === "buy" ? "Your Early Access Benefits" : "Your Founding Seller Benefits"}
                      </h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {submissionInfo?.role === "buy" ? (
                          <>
                            <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#6A1B9A] flex items-center justify-center shrink-0 font-bold">
                                <Zap className="w-4 h-4" />
                              </div>
                              <div>
                                <strong className="font-semibold text-slate-900 block">24h Priority Early Access</strong>
                                <span className="text-slate-500 text-[11px]">Browse products and claim deals before official launch.</span>
                              </div>
                            </div>
                            <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#6A1B9A] flex items-center justify-center shrink-0 font-bold">
                                <ShieldCheck className="w-4 h-4" />
                              </div>
                              <div>
                                <strong className="font-semibold text-slate-900 block">100% Escrow Protection</strong>
                                <span className="text-slate-500 text-[11px]">Your payment is held safely until order is verified.</span>
                              </div>
                            </div>
                            <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-amber-50 text-[#D4A017] flex items-center justify-center shrink-0 font-bold">
                                <TrendingUp className="w-4 h-4" />
                              </div>
                              <div>
                                <strong className="font-semibold text-slate-900 block">Verified Brand Discovery</strong>
                                <span className="text-slate-500 text-[11px]">Direct access to Ghana's top verified sellers & brands.</span>
                              </div>
                            </div>
                            <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#6A1B9A] flex items-center justify-center shrink-0 font-bold">
                                <Users className="w-4 h-4" />
                              </div>
                              <div>
                                <strong className="font-semibold text-slate-900 block">VIP Buyer Badge</strong>
                                <span className="text-slate-500 text-[11px]">Exclusive community badge on reviews & trade requests.</span>
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-amber-50 text-[#D4A017] flex items-center justify-center shrink-0 font-bold">
                                <Zap className="w-4 h-4" />
                              </div>
                              <div>
                                <strong className="font-semibold text-slate-900 block">0% Sales Commission (3 Mos)</strong>
                                <span className="text-slate-500 text-[11px]">Keep 100% of your store revenue during launch.</span>
                              </div>
                            </div>
                            <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-amber-50 text-[#D4A017] flex items-center justify-center shrink-0 font-bold">
                                <ShieldCheck className="w-4 h-4" />
                              </div>
                              <div>
                                <strong className="font-semibold text-slate-900 block">Founding Seller Verified Badge</strong>
                                <span className="text-slate-500 text-[11px]">Permanent trusted merchant badge on your storefront.</span>
                              </div>
                            </div>
                            <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#6A1B9A] flex items-center justify-center shrink-0 font-bold">
                                <BarChart3 className="w-4 h-4" />
                              </div>
                              <div>
                                <strong className="font-semibold text-slate-900 block">Priority Search Placement</strong>
                                <span className="text-slate-500 text-[11px]">Featured ranking in category search and discover page.</span>
                              </div>
                            </div>
                            <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#6A1B9A] flex items-center justify-center shrink-0 font-bold">
                                <Users className="w-4 h-4" />
                              </div>
                              <div>
                                <strong className="font-semibold text-slate-900 block">1-on-1 Merchant Onboarding</strong>
                                <span className="text-slate-500 text-[11px]">Direct setup assistance for catalog uploading.</span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 text-slate-500 text-[11px]">
                        <span>Need help? Email <a href="mailto:nafexgroupltd@gmail.com" className="text-[#6A1B9A] font-semibold underline">nafexgroupltd@gmail.com</a></span>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={handleResetTesting}
                          className="text-purple-700 hover:text-purple-900 font-semibold underline text-[11px]"
                        >
                          Reset form to test again
                        </button>
                      </div>
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent("I just registered for early access on Nafex Hub — Ghana's premier marketplace! Join the waitlist here: https://nafex-hub-launchpad.vercel.app/")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold hover:bg-emerald-100 transition-colors shrink-0 text-xs shadow-xs"
                      >
                        <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                        Share on WhatsApp
                      </a>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-[#374151]">Full name</label>
                        <Input
                          type="text"
                          name="name"
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
                          name="email"
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
                            name="storeName"
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
                            name="storeLink"
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
                          name="category"
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
              <div className="group bg-[#FAF8FC] hover:bg-white rounded-3xl p-7 border border-purple-100/60 hover:border-purple-300/80 shadow-xs hover:shadow-xl hover:shadow-purple-900/10 hover:-translate-y-2 transition-all duration-300 space-y-4 cursor-default">
                <div className="w-12 h-12 rounded-2xl bg-white group-hover:bg-[#6A1B9A] text-[#6A1B9A] group-hover:text-white flex items-center justify-center shadow-xs group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#111827] group-hover:text-[#6A1B9A] transition-colors">
                  Verified Sellers & Authentic Products
                </h3>
                <p className="text-xs sm:text-sm text-[#4B5563] leading-relaxed">
                  Every seller passes verification, so what you order is what you get — every time.
                </p>
              </div>

              <div className="group bg-[#FAF8FC] hover:bg-white rounded-3xl p-7 border border-purple-100/60 hover:border-purple-300/80 shadow-xs hover:shadow-xl hover:shadow-purple-900/10 hover:-translate-y-2 transition-all duration-300 space-y-4 cursor-default">
                <div className="w-12 h-12 rounded-2xl bg-white group-hover:bg-[#6A1B9A] text-[#6A1B9A] group-hover:text-white flex items-center justify-center shadow-xs group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#111827] group-hover:text-[#6A1B9A] transition-colors">
                  Lightning-Fast Checkout
                </h3>
                <p className="text-xs sm:text-sm text-[#4B5563] leading-relaxed">
                  One-tap checkout with saved payments and addresses. Under 10 seconds, guaranteed.
                </p>
              </div>

              <div className="group bg-[#FAF8FC] hover:bg-white rounded-3xl p-7 border border-purple-100/60 hover:border-purple-300/80 shadow-xs hover:shadow-xl hover:shadow-purple-900/10 hover:-translate-y-2 transition-all duration-300 space-y-4 cursor-default">
                <div className="w-12 h-12 rounded-2xl bg-white group-hover:bg-[#6A1B9A] text-[#6A1B9A] group-hover:text-white flex items-center justify-center shadow-xs group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#111827] group-hover:text-[#6A1B9A] transition-colors">
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
              <div className="group bg-white hover:bg-[#FAF8FC] rounded-3xl p-7 border border-purple-100/80 hover:border-purple-300/80 shadow-sm hover:shadow-xl hover:shadow-purple-900/10 hover:-translate-y-2 transition-all duration-300 space-y-4 cursor-default">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 group-hover:bg-[#6A1B9A] text-[#6A1B9A] group-hover:text-white flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#111827] group-hover:text-[#6A1B9A] transition-colors">
                  Zero Upfront Listing Fees
                </h3>
                <p className="text-xs sm:text-sm text-[#4B5563] leading-relaxed">
                  Launch your storefront and list unlimited products — pay nothing until you sell.
                </p>
              </div>

              <div className="group bg-white hover:bg-[#FAF8FC] rounded-3xl p-7 border border-purple-100/80 hover:border-purple-300/80 shadow-sm hover:shadow-xl hover:shadow-purple-900/10 hover:-translate-y-2 transition-all duration-300 space-y-4 cursor-default">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 group-hover:bg-[#6A1B9A] text-[#6A1B9A] group-hover:text-white flex items-center justify-center group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#111827] group-hover:text-[#6A1B9A] transition-colors">
                  Powerful Analytics & Dashboard
                </h3>
                <p className="text-xs sm:text-sm text-[#4B5563] leading-relaxed">
                  Real-time revenue, traffic, and buyer insights. Know what's working, instantly.
                </p>
              </div>

              <div className="group bg-white hover:bg-[#FAF8FC] rounded-3xl p-7 border border-purple-100/80 hover:border-purple-300/80 shadow-sm hover:shadow-xl hover:shadow-purple-900/10 hover:-translate-y-2 transition-all duration-300 space-y-4 cursor-default">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 group-hover:bg-[#6A1B9A] text-[#6A1B9A] group-hover:text-white flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#111827] group-hover:text-[#6A1B9A] transition-colors">
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
                <div className="group bg-[#FAF8FC] hover:bg-white p-6 rounded-2xl border border-purple-100/80 hover:border-purple-300/80 hover:shadow-md hover:-translate-y-1 transition-all duration-300 space-y-2 cursor-default">
                  <div className="text-3xl font-extrabold text-[#6A1B9A] group-hover:scale-105 transition-transform origin-left">0%</div>
                  <div className="text-xs font-semibold text-[#111827]">Commission · 3 Months</div>
                  <p className="text-[11px] text-[#6B7280]">Founding seller privilege</p>
                </div>
                <div className="group bg-[#FAF8FC] hover:bg-white p-6 rounded-2xl border border-purple-100/80 hover:border-purple-300/80 hover:shadow-md hover:-translate-y-1 transition-all duration-300 space-y-2 cursor-default">
                  <div className="text-3xl font-extrabold text-[#D4A017] group-hover:scale-105 transition-transform origin-left">VIP</div>
                  <div className="text-xs font-semibold text-[#111827]">Early Access Pass</div>
                  <p className="text-[11px] text-[#6B7280]">Exclusive waitlist perk</p>
                </div>
                <div className="group bg-[#FAF8FC] hover:bg-white p-6 rounded-2xl border border-purple-100/80 hover:border-purple-300/80 hover:shadow-md hover:-translate-y-1 transition-all duration-300 space-y-2 cursor-default">
                  <div className="text-3xl font-extrabold text-[#6A1B9A] group-hover:scale-105 transition-transform origin-left">24h</div>
                  <div className="text-xs font-semibold text-[#111827]">VIP Early Access</div>
                  <p className="text-[11px] text-[#6B7280]">Shop before public launch</p>
                </div>
                <div className="group bg-[#FAF8FC] hover:bg-white p-6 rounded-2xl border border-purple-100/80 hover:border-purple-300/80 hover:shadow-md hover:-translate-y-1 transition-all duration-300 space-y-2 cursor-default">
                  <div className="text-3xl font-extrabold text-emerald-600 group-hover:scale-105 transition-transform origin-left">100%</div>
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
