import { Link } from "wouter";
import { ShieldCheck, Shield, Truck, Star, Globe2, MessageCircle, Headphones, HelpCircle, ClipboardList, MapPin, Mail, Clock } from "lucide-react";
import { VisaLogo, MastercardLogo, PaystackLogo, MobileMoneyLogo, BankTransferLogo } from "@/components/payment-icons";

export function Footer() {
  return (
    <footer className="border-t bg-secondary text-secondary-foreground z-10 relative">
      <div className="container mx-auto px-4 md:px-8 py-12">
        {/* Brand + tagline */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 pb-8 border-b border-secondary-foreground/10">
          <div className="space-y-3 max-w-md">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-serif font-bold">
                N
              </div>
              <span className="font-serif font-bold text-xl">Nafex <span className="text-primary">Hub</span></span>
            </div>
            <p className="text-sm text-secondary-foreground/70 leading-relaxed">
              From fashion and electronics to home essentials and lifestyle goods, Nafex Hub is a curated marketplace of verified Ghanaian businesses and creators — with escrow-protected payments, real-time logistics tracking, and direct sourcing through Nafex Trade Connect.
            </p>
            {/* Trust badges */}
            <div className="flex flex-wrap gap-2 pt-3">
              {[
                { icon: ShieldCheck, label: "Verified Sellers" },
                { icon: Shield, label: "Escrow Protection" },
                { icon: Truck, label: "Logistics Tracking" },
                { icon: Star, label: "Ratings & Reviews" },
                { icon: Globe2, label: "Nafex Trade Connect" },
              ].map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 text-[11px] text-gray-300 border border-gray-600 rounded-full px-3 py-1.5 shadow-sm"
                  data-testid={`badge-trust-${label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <Icon className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 py-10">
          {/* SUPPORT */}
          <div className="space-y-5">
            <h4 className="font-serif font-bold text-[15px] text-white uppercase tracking-wider">SUPPORT</h4>
            <ul className="space-y-3.5 text-sm">
              <li><Link href="/support" className="text-gray-300 hover:text-primary transition-colors flex items-center gap-2"><MessageCircle className="w-4 h-4" strokeWidth={1.5} /> Live Chat Support</Link></li>
              <li><Link href="/support" className="text-gray-300 hover:text-primary transition-colors flex items-center gap-2"><Headphones className="w-4 h-4" strokeWidth={1.5} /> Contact Support</Link></li>
              <li><Link href="/help" className="text-gray-300 hover:text-primary transition-colors flex items-center gap-2"><HelpCircle className="w-4 h-4" strokeWidth={1.5} /> Help Center</Link></li>
              <li><Link href="/orders" className="text-gray-300 hover:text-primary transition-colors flex items-center gap-2"><Truck className="w-4 h-4" strokeWidth={1.5} /> Track Order</Link></li>
              <li><Link href="/disputes" className="text-gray-300 hover:text-primary transition-colors flex items-center gap-2"><ClipboardList className="w-4 h-4" strokeWidth={1.5} /> Report Issue</Link></li>
              <li><Link href="/help" className="text-gray-300 hover:text-primary transition-colors flex items-center gap-2"><ShieldCheck className="w-4 h-4" strokeWidth={1.5} /> Buyer Protection</Link></li>
            </ul>
          </div>

          {/* ABOUT */}
          <div className="space-y-5">
            <h4 className="font-serif font-bold text-[15px] text-white uppercase tracking-wider">ABOUT</h4>
            <ul className="space-y-3.5 text-sm text-gray-300">
              <li className="font-bold text-white mb-4 block">Nafex Hub Ghana Ltd</li>
              <li className="flex items-center gap-2"><MapPin className="w-4 h-4" strokeWidth={1.5} /> Accra, Ghana</li>
              <li className="flex items-center gap-2"><Mail className="w-4 h-4" strokeWidth={1.5} /> support@nafexhub.com</li>
              <li className="flex items-center gap-2"><Clock className="w-4 h-4" strokeWidth={1.5} /> Mon-Sat · 8AM-8PM</li>
            </ul>
          </div>

          {/* MARKETPLACE */}
          <div className="space-y-5">
            <h4 className="font-serif font-bold text-[15px] text-white uppercase tracking-wider">MARKETPLACE</h4>
            <ul className="space-y-3.5 text-sm">
              <li><Link href="/explore" className="text-gray-300 hover:text-primary transition-colors block">Explore Brands</Link></li>
              <li><Link href="/discounts" className="text-gray-300 hover:text-primary transition-colors block">Deals & Flash Sales</Link></li>
              <li><Link href="/services" className="text-gray-300 hover:text-primary transition-colors block">Services</Link></li>
              <li><Link href="/trade" className="text-gray-300 hover:text-primary transition-colors block">Nafex Trade Connect</Link></li>
              <li><Link href="/list" className="text-gray-300 hover:text-primary transition-colors block">List Your Business</Link></li>
            </ul>
          </div>

          {/* PAYMENT METHODS */}
          <div className="space-y-5">
            <h4 className="font-serif font-bold text-[15px] text-white uppercase tracking-wider">PAYMENT METHODS</h4>
            <div className="grid grid-cols-2 gap-3 max-w-[280px]">
              <div className="h-[42px] bg-white rounded-md flex items-center justify-center px-2 shadow-sm" title="Paystack">
                <PaystackLogo className="h-4 w-auto" />
              </div>
              <div className="h-[42px] flex items-center justify-center shadow-sm" title="Mobile Money">
                <MobileMoneyLogo className="h-full w-full" />
              </div>
              <div className="h-[42px] bg-white rounded-md flex items-center justify-center px-2 shadow-sm" title="Visa">
                <VisaLogo className="h-4 w-auto" />
              </div>
              <div className="h-[42px] bg-white rounded-md flex items-center justify-center px-2 shadow-sm" title="Mastercard">
                <MastercardLogo className="h-5 w-auto" />
              </div>
              <div className="col-span-2 h-[42px] bg-white text-[#0f172a] rounded-md flex items-center justify-center gap-2 px-3 shadow-sm" title="Bank Transfer">
                <BankTransferLogo className="h-5 w-auto" />
                <span className="text-xs font-bold tracking-wide">BANK TRANSFER</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-secondary-foreground/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
          <p className="text-xs text-secondary-foreground/60">
            © {new Date().getFullYear()} Nafex Hub Ghana. All rights reserved.
          </p>
          <p className="text-xs text-secondary-foreground/60 italic">
            Empowering African commerce through secure digital trade.
          </p>
        </div>
      </div>
    </footer>
  );
}
