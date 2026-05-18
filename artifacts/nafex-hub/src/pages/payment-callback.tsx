import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useVerifyPaystackPayment } from "@workspace/api-client-react";
import { CheckCircle2, XCircle, Loader2, ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";

type VerifyState = "verifying" | "success" | "failed" | "no_ref";

export default function PaymentCallback() {
  const [, setLocation] = useLocation();
  const [state, setState] = useState<VerifyState>("verifying");
  const [errorMsg, setErrorMsg] = useState("");
  const [orderInfo, setOrderInfo] = useState<{ id: number; amount: number } | null>(null);

  const { mutate: verify } = useVerifyPaystackPayment({
    mutation: {
      onSuccess: (data) => {
        const order = data.order as { id: number; totalPrice: number };
        setOrderInfo({ id: order.id, amount: order.totalPrice / 100 });
        setState("success");
      },
      onError: (err: unknown) => {
        const msg =
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          "Payment verification failed";
        setErrorMsg(msg);
        setState("failed");
      },
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference") ?? params.get("trxref");
    const orderId = params.get("orderId");

    if (!reference || !orderId) {
      setState("no_ref");
      return;
    }

    verify({ data: { reference, orderId: parseInt(orderId, 10) } });
  }, []);

  if (state === "verifying") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
          <h2 className="font-serif text-xl font-bold text-foreground">Verifying your payment…</h2>
          <p className="text-muted-foreground text-sm">Please wait, this will only take a moment.</p>
        </div>
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full border-green-200 shadow-lg">
          <CardContent className="py-10 text-center space-y-5">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-foreground">Payment Successful!</h1>
              {orderInfo && (
                <p className="text-muted-foreground mt-1">
                  <strong>GHS {orderInfo.amount.toFixed(2)}</strong> is now held securely in escrow for Order #{orderInfo.id}
                </p>
              )}
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-left space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-green-600 flex-shrink-0" />
                <p className="text-sm font-semibold text-green-800">Funds are in escrow</p>
              </div>
              <p className="text-xs text-green-700 leading-relaxed">
                Your payment is held securely by Nafex Hub and will only be released to the seller
                after you confirm delivery of your items.
              </p>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="flex items-center gap-2 justify-center">
                <span className="w-5 h-5 rounded-full bg-green-600 text-white text-xs flex items-center justify-center font-bold">1</span>
                Payment held ✓
              </p>
              <p className="flex items-center gap-2 justify-center text-muted-foreground/60">
                <span className="w-5 h-5 rounded-full border-2 border-muted text-xs flex items-center justify-center font-bold">2</span>
                Seller ships your order
              </p>
              <p className="flex items-center gap-2 justify-center text-muted-foreground/60">
                <span className="w-5 h-5 rounded-full border-2 border-muted text-xs flex items-center justify-center font-bold">3</span>
                You confirm delivery → funds released
              </p>
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <Link href="/orders">
                <Button className="gap-2">
                  View My Orders
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/explore">
                <Button variant="outline">Continue Shopping</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === "failed") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full border-red-200 shadow-lg">
          <CardContent className="py-10 text-center space-y-5">
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-foreground">Payment Failed</h1>
              <p className="text-muted-foreground mt-1 text-sm">{errorMsg}</p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => history.back()} variant="outline">Go Back</Button>
              <Link href="/orders">
                <Button>View My Orders</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // no_ref
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-4">
        <XCircle className="w-12 h-12 text-muted-foreground/30 mx-auto" />
        <p className="text-muted-foreground">No payment reference found.</p>
        <Link href="/orders">
          <Button variant="outline">View My Orders</Button>
        </Link>
      </div>
    </div>
  );
}
