import { useState } from "react";
import { Link } from "wouter";
import { ChevronDown, ChevronUp, Headphones, MessageCircle, ShoppingBag, CreditCard, Truck, XCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

const FAQS = [
  {
    category: "Placing an Order",
    icon: <ShoppingBag className="w-5 h-5 text-primary" />,
    items: [
      {
        q: "How do I place an order on Nafex Hub?",
        a: "Browse to a brand's profile page, view their products, and click the 'Order' button. Fill in your order details, select the items you want, and submit. The seller will receive your order and confirm it.",
      },
      {
        q: "Can I order from multiple sellers at once?",
        a: "Orders are placed per seller. If you want items from multiple brands, you'll need to place a separate order with each brand.",
      },
      {
        q: "How do I know my order was received?",
        a: "You'll receive a notification when your order status changes. You can also check your Orders page at any time to see the current status.",
      },
    ],
  },
  {
    category: "Payments",
    icon: <CreditCard className="w-5 h-5 text-primary" />,
    items: [
      {
        q: "What payment methods are accepted?",
        a: "Payment arrangements are made directly between you and the seller. Common options include Mobile Money (MTN, Vodafone Cash, AirtelTigo Money), bank transfer, or cash on delivery — confirm with the seller before completing your order.",
      },
      {
        q: "Is my payment secure?",
        a: "We recommend using Mobile Money for safety, as it provides a transaction record. Always confirm payment details directly with the verified seller through our messaging system.",
      },
    ],
  },
  {
    category: "Tracking Your Order",
    icon: <Truck className="w-5 h-5 text-primary" />,
    items: [
      {
        q: "How do I track my order?",
        a: "Go to your Orders page to see the real-time status of all your orders. Statuses include: Pending → Confirmed → Packed → Out for Delivery → Delivered.",
      },
      {
        q: "What do the order statuses mean?",
        a: "Pending: your order was placed. Confirmed: the seller accepted it. Packed: your items are being prepared. Out for Delivery: on the way to you. Delivered: successfully received.",
      },
    ],
  },
  {
    category: "Cancellations",
    icon: <XCircle className="w-5 h-5 text-primary" />,
    items: [
      {
        q: "Can I cancel my order?",
        a: "You can request a cancellation by messaging the seller directly through your inbox. Cancellations are easier to arrange before the order is packed or shipped.",
      },
      {
        q: "What happens if a seller cancels my order?",
        a: "You'll receive a notification if a seller updates your order status to Cancelled. Contact the seller via inbox for clarification, or reach out to our support team for help.",
      },
    ],
  },
  {
    category: "Returns & Refunds",
    icon: <RotateCcw className="w-5 h-5 text-primary" />,
    items: [
      {
        q: "How do I return an item?",
        a: "Contact the seller through our messaging system to discuss a return. Each seller sets their own return policy — check the brand's profile or message them before purchasing if you need to know the policy.",
      },
      {
        q: "How long do refunds take?",
        a: "Refund timelines depend on the seller and the payment method used. Once a refund is agreed upon with the seller, Mobile Money refunds typically arrive within 24–48 hours.",
      },
    ],
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/30 transition-colors"
      >
        <span className="font-medium text-sm text-foreground pr-4">{q}</span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-4 pt-0 text-sm text-muted-foreground leading-relaxed border-t border-border/50 bg-muted/10">
          <p className="mt-3">{a}</p>
        </div>
      )}
    </div>
  );
}

export default function Help() {
  return (
    <div className="container mx-auto px-4 md:px-8 py-10 max-w-3xl">
      <div className="mb-10 text-center">
        <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-3">Help Center</h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          Everything you need to know about buying on Nafex Hub.
        </p>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-10">
        {[
          { icon: <ShoppingBag className="w-5 h-5" />, label: "My Orders", href: "/orders" },
          { icon: <MessageCircle className="w-5 h-5" />, label: "Message a Seller", href: "/inbox" },
          { icon: <Headphones className="w-5 h-5" />, label: "Live Support Chat", href: "/support" },
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <div className="flex flex-col items-center gap-2 p-5 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer text-center">
              <span className="text-primary">{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* FAQ sections */}
      <div className="space-y-8">
        {FAQS.map((section) => (
          <div key={section.category}>
            <div className="flex items-center gap-2 mb-4">
              {section.icon}
              <h2 className="font-semibold text-lg text-foreground">{section.category}</h2>
            </div>
            <div className="space-y-2">
              {section.items.map((item) => (
                <FAQItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-12 rounded-2xl bg-primary/8 border border-primary/20 p-8 text-center">
        <Headphones className="w-10 h-10 text-primary mx-auto mb-3" />
        <h3 className="font-semibold text-lg text-foreground mb-1">Still need help?</h3>
        <p className="text-sm text-muted-foreground mb-4">Our support team is available to assist you.</p>
        <Link href="/support">
          <Button className="gap-2">
            <MessageCircle className="w-4 h-4" />
            Start a Live Chat
          </Button>
        </Link>
      </div>
    </div>
  );
}
