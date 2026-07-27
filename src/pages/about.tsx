import { Link } from "wouter";
import { Store, Shield, Truck, HeadphonesIcon, Globe2, Users, Star, TrendingUp, CheckCircle2 } from "lucide-react";

export default function About() {
  const stats = [
    { label: "Active Sellers", value: "500+", icon: <Store className="w-6 h-6" /> },
    { label: "Happy Customers", value: "10,000+", icon: <Users className="w-6 h-6" /> },
    { label: "Products Listed", value: "50,000+", icon: <Star className="w-6 h-6" /> },
    { label: "Regions Served", value: "16", icon: <Globe2 className="w-6 h-6" /> },
  ];

  const values = [
    {
      icon: <Shield className="w-7 h-7 text-[#6A1B9A]" />,
      title: "Trust & Security",
      desc: "Every transaction is protected by our escrow payment system. Your money is only released to the seller once you confirm receipt of your order."
    },
    {
      icon: <Truck className="w-7 h-7 text-[#6A1B9A]" />,
      title: "Fast Delivery",
      desc: "We partner with reliable logistics providers across Ghana to ensure your orders arrive quickly and safely, wherever you are."
    },
    {
      icon: <HeadphonesIcon className="w-7 h-7 text-[#6A1B9A]" />,
      title: "24/7 Support",
      desc: "Our dedicated customer support team is always ready to assist you with any questions, disputes, or concerns around the clock."
    },
    {
      icon: <TrendingUp className="w-7 h-7 text-[#6A1B9A]" />,
      title: "Seller Growth",
      desc: "We empower Ghanaian businesses with the tools, analytics, and market access they need to grow and thrive in the digital economy."
    },
  ];

  const team = [
    { name: "Kwame Asante", role: "CEO & Co-Founder", initials: "KA" },
    { name: "Abena Mensah", role: "CTO & Co-Founder", initials: "AM" },
    { name: "Kofi Boateng", role: "Head of Operations", initials: "KB" },
    { name: "Ama Owusu", role: "Head of Customer Success", initials: "AO" },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-poppins">
      {/* Hero */}
      <section className="bg-gradient-to-br from-[#6A1B9A] to-[#4A126B] text-white py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm font-medium text-purple-200 mb-2">
            <Globe2 className="w-4 h-4" /> Ghana's Premier Marketplace
          </div>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight">
            About <span className="text-[#D4A017]">Nafex Hub</span>
          </h1>
          <p className="text-lg text-purple-100 max-w-2xl mx-auto leading-relaxed">
            Connecting Ghanaian buyers and sellers in a trusted, secure, and seamless digital marketplace - from fashion to electronics, food to home goods and beyond.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link href="/explore">
              <button className="h-12 px-8 rounded-xl bg-[#D4A017] hover:bg-[#B88A12] text-white font-bold text-sm transition-all shadow-lg">
                Start Shopping
              </button>
            </Link>
            <Link href="/register">
              <button className="h-12 px-8 rounded-xl bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold text-sm transition-all">
                Sell on Nafex Hub
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-4 bg-white border-b border-purple-100/60">
        <div className="container mx-auto max-w-4xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((s) => (
              <div key={s.label} className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-[#F6F2FF] flex items-center justify-center mx-auto text-[#6A1B9A]">
                  {s.icon}
                </div>
                <div className="text-3xl font-bold text-[#222222]">{s.value}</div>
                <div className="text-sm text-[#6B7280] font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-3xl space-y-6 text-center">
          <h2 className="text-3xl font-bold text-[#222222]">Our Story</h2>
          <p className="text-[#4B5563] leading-relaxed">
            Nafex Hub was founded with a simple yet powerful vision: to give every Ghanaian access to quality products and give every Ghanaian business owner the ability to reach customers beyond their neighbourhood.
          </p>
          <p className="text-[#4B5563] leading-relaxed">
            We saw how talented entrepreneurs and craftspeople struggled to scale beyond their local markets, and how buyers struggled to find verified, quality goods with confidence. Nafex Hub bridges that gap - creating a trusted space where commerce thrives.
          </p>
          <p className="text-[#4B5563] leading-relaxed">
            Built with escrow payment protection, buyer-seller dispute resolution, and real-time logistics tracking, Nafex Hub is not just a marketplace - it's an ecosystem designed to make trade in Ghana safer, faster, and fairer for everyone.
          </p>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-16 px-4 bg-[#F6F2FF]">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12 space-y-2">
            <h2 className="text-3xl font-bold text-[#222222]">What We Stand For</h2>
            <p className="text-[#6B7280]">Our values guide everything we do at Nafex Hub</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {values.map((v) => (
              <div key={v.title} className="bg-white rounded-2xl p-6 border border-purple-100/60 shadow-sm space-y-3">
                <div className="w-12 h-12 rounded-xl bg-[#F6F2FF] flex items-center justify-center">{v.icon}</div>
                <h3 className="text-lg font-bold text-[#222222]">{v.title}</h3>
                <p className="text-sm text-[#4B5563] leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12 space-y-2">
            <h2 className="text-3xl font-bold text-[#222222]">Why Nafex Hub?</h2>
            <p className="text-[#6B7280]">The marketplace built for Ghana, trusted by thousands</p>
          </div>
          <div className="space-y-4">
            {[
              "Escrow-protected payments - your money is safe until you're satisfied",
              "Verified sellers - every business is reviewed before listing",
              "Real-time order tracking - know exactly where your order is",
              "Nafex Coins loyalty rewards - earn while you shop",
              "Trade Connect - for businesses looking to import & wholesale",
              "Dedicated dispute resolution - fair outcomes for everyone",
              "Multi-category marketplace - fashion, electronics, food, home & more",
            ].map((point) => (
              <div key={point} className="flex items-start gap-3 bg-white rounded-xl p-4 border border-purple-100/60 shadow-xs">
                <CheckCircle2 className="w-5 h-5 text-[#6A1B9A] mt-0.5 shrink-0" />
                <span className="text-sm text-[#4B5563] leading-relaxed">{point}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-16 px-4 bg-[#F6F2FF]">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12 space-y-2">
            <h2 className="text-3xl font-bold text-[#222222]">Meet the Team</h2>
            <p className="text-[#6B7280]">Passionate people building the future of commerce in Ghana</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {team.map((member) => (
              <div key={member.name} className="bg-white rounded-2xl p-6 text-center border border-purple-100/60 shadow-sm space-y-3">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#6A1B9A] to-[#D4A017] flex items-center justify-center mx-auto">
                  <span className="text-xl font-bold text-white">{member.initials}</span>
                </div>
                <div>
                  <div className="font-bold text-[#222222] text-sm">{member.name}</div>
                  <div className="text-xs text-[#6B7280] mt-0.5">{member.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-gradient-to-br from-[#6A1B9A] to-[#4A126B] text-white text-center">
        <div className="container mx-auto max-w-2xl space-y-6">
          <h2 className="text-3xl font-bold">Ready to get started?</h2>
          <p className="text-purple-100">
            Join thousands of shoppers and sellers already thriving on Nafex Hub.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/explore">
              <button className="h-12 px-8 rounded-xl bg-[#D4A017] hover:bg-[#B88A12] text-white font-bold text-sm transition-all shadow-lg">
                Explore Products
              </button>
            </Link>
            <Link href="/support">
              <button className="h-12 px-8 rounded-xl bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold text-sm transition-all">
                Contact Us
              </button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
