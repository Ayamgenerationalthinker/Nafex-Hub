import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Coins, Sparkles, ShoppingBag, Star, Gift, Tag, CheckCircle2, ArrowRight, Wallet, HelpCircle } from "lucide-react";

interface NafexCoinsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NafexCoinsModal({ open, onOpenChange }: NafexCoinsModalProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const userCoins = user ? (user as any).loyaltyPoints || 0 : 0;
  const cashValue = (userCoins * 0.20).toFixed(2);

  const handleShopNow = () => {
    onOpenChange(false);
    setLocation("/explore");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl border border-amber-500/20 shadow-2xl">
        {/* Banner Header */}
        <div className="bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-primary/10 p-6 border-b border-amber-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 translate-x-4 -translate-y-4 opacity-10 pointer-events-none">
            <Coins className="w-48 h-48 text-amber-500" />
          </div>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-inner">
              <Coins className="w-7 h-7" />
            </div>
            <div>
              <DialogTitle className="font-serif text-2xl font-bold text-foreground flex items-center gap-2">
                Nafex Coins <Sparkles className="w-5 h-5 text-amber-500" />
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Ghana's premier fashion marketplace loyalty rewards program
              </DialogDescription>
            </div>
          </div>

          {/* Current Balance Pill */}
          {user && (
            <div className="mt-4 bg-background/80 backdrop-blur border border-amber-500/30 rounded-xl p-3.5 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2.5">
                <Coins className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Your Balance</p>
                  <p className="text-lg font-bold text-foreground">{userCoins} Coins</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Discount Value</p>
                <p className="text-base font-bold text-amber-500">GHS {cashValue}</p>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 space-y-6">
          {/* Section 1: How it works */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-primary" /> 1. How Nafex Coins Work
            </h3>
            <div className="bg-muted/40 rounded-xl p-4 border border-border/60 text-sm space-y-2 text-foreground/90">
              <p>
                <strong>Nafex Coins</strong> are reward tokens automatically credited to your account whenever you interact with and shop on Nafex Hub.
              </p>
              <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Conversion Rate: 1 Nafex Coin = GHS 0.20 discount value at checkout!</span>
              </div>
            </div>
          </div>

          {/* Section 2: How to get / earn coins */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Gift className="w-4 h-4 text-amber-500" /> 2. How to Get (Earn) Nafex Coins
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl border border-border/60 bg-card space-y-1 hover:border-amber-500/40 transition-colors">
                <div className="flex items-center gap-2 text-primary font-bold text-sm">
                  <ShoppingBag className="w-4 h-4" /> Shop & Earn
                </div>
                <p className="text-xs text-muted-foreground">
                  Earn <strong>1 Coin for every GHS 20</strong> spent on completed orders across all fashion brands.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-border/60 bg-card space-y-1 hover:border-amber-500/40 transition-colors">
                <div className="flex items-center gap-2 text-amber-500 font-bold text-sm">
                  <Sparkles className="w-4 h-4" /> Welcome Bonus
                </div>
                <p className="text-xs text-muted-foreground">
                  Receive <strong>bonus coins</strong> instantly when you create an account and place your first order.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-border/60 bg-card space-y-1 hover:border-amber-500/40 transition-colors">
                <div className="flex items-center gap-2 text-amber-500 font-bold text-sm">
                  <Star className="w-4 h-4" /> Leave Product Reviews
                </div>
                <p className="text-xs text-muted-foreground">
                  Get <strong>5 bonus coins</strong> for leaving verified ratings and reviews on items you purchased.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-border/60 bg-card space-y-1 hover:border-amber-500/40 transition-colors">
                <div className="flex items-center gap-2 text-primary font-bold text-sm">
                  <Tag className="w-4 h-4" /> Promotions & Events
                </div>
                <p className="text-xs text-muted-foreground">
                  Participate in seasonal campaign events and flash sales to win extra multiplier coins!
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: How to spend coins */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-500" /> 3. What You Can Use Nafex Coins For
            </h3>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-card border border-border/60">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-foreground">Instant Checkout Discounts:</strong> Apply your accumulated coins directly on the Cart/Checkout page to deduct money off your order total.
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-card border border-border/60">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-foreground">Fashion Wears Exclusive:</strong> Coins can be redeemed for purchasing clothing, footwear, traditional wears, and fashion accessories.
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-card border border-border/60">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-foreground">Combine with Vouchers:</strong> Stack your coins on top of discount coupon codes to maximize your total savings on every order.
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 bg-muted/30 border-t border-border/50 sm:justify-between items-center gap-3">
          <p className="text-[11px] text-muted-foreground">
            Coins never expire while your account is active.
          </p>
          <Button onClick={handleShopNow} className="gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold shadow-md">
            Shop & Redeem Coins <ArrowRight className="w-4 h-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
