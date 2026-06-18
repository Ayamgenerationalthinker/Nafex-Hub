import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Flame, Clock } from "lucide-react";

type ActiveFlashSale = {
  id: number;
  productId: number;
  title: string;
  description: string;
  discountPercent: number;
  endsAt: string;
  productName: string;
  productPrice: string;
  productImages: string[];
  businessName: string;
};

function useCountdown(target: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const remaining = Math.max(0, new Date(target).getTime() - now);
  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const mins = Math.floor((remaining % 3600000) / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  return { days, hours, mins, secs, expired: remaining <= 0 };
}

function CountdownBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center bg-white/15 backdrop-blur rounded-md px-2.5 py-1 min-w-[44px]">
      <span className="font-mono font-bold text-lg leading-none tabular-nums">{String(value).padStart(2, "0")}</span>
      <span className="text-[10px] uppercase tracking-wide opacity-80">{label}</span>
    </div>
  );
}

function FlashCard({ sale }: { sale: ActiveFlashSale }) {
  const c = useCountdown(sale.endsAt);
  const orig = parseFloat(sale.productPrice);
  const discounted = orig * (1 - sale.discountPercent / 100);

  if (c.expired) return null;

  return (
    <Link href={`/product/${sale.productId}`}>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-600 via-red-500 to-orange-500 text-white p-5 cursor-pointer hover:shadow-xl transition-shadow group" data-testid={`flash-sale-card-${sale.id}`}>
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center gap-4">
          {sale.productImages?.[0] && (
            <img src={sale.productImages[0]} alt={sale.productName} className="w-20 h-20 rounded-lg object-cover border-2 border-white/30 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Flame className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wide">Flash Sale · -{sale.discountPercent}%</span>
            </div>
            <h3 className="font-bold text-base truncate">{sale.title}</h3>
            <p className="text-sm opacity-90 truncate">{sale.productName} · {sale.businessName}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-bold text-lg">GHS {discounted.toFixed(2)}</span>
              <span className="text-xs line-through opacity-70">GHS {orig.toFixed(2)}</span>
            </div>
          </div>
        </div>
        <div className="relative flex items-center gap-1.5 mt-4">
          <Clock className="w-3.5 h-3.5 opacity-80" />
          <span className="text-xs opacity-80 mr-1">Ends in:</span>
          <div className="flex gap-1">
            {c.days > 0 && <CountdownBox value={c.days} label="d" />}
            <CountdownBox value={c.hours} label="h" />
            <CountdownBox value={c.mins} label="m" />
            <CountdownBox value={c.secs} label="s" />
          </div>
        </div>
      </div>
    </Link>
  );
}

export function FlashSalesStrip({ limit }: { limit?: number } = {}) {
  const [sales, setSales] = useState<ActiveFlashSale[] | null>(null);

  useEffect(() => {
    fetch("/api/flash-sales/active")
      .then(r => r.ok ? r.json() : [])
      .then(setSales)
      .catch(() => setSales([]));
  }, []);

  if (!sales || sales.length === 0) return null;
  const shown = limit ? sales.slice(0, limit) : sales;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {shown.map(s => <FlashCard key={s.id} sale={s} />)}
    </div>
  );
}
