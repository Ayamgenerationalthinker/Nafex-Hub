import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import { Mail, ShieldCheck, RefreshCw, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Clock } from "lucide-react";

const CODE_TTL_SECONDS = 180;

export default function VerifyEmail() {
  const { user, token, updateUser } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  
  const [secondsLeft, setSecondsLeft] = useState(CODE_TTL_SECONDS);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    if (tickRef.current) window.clearInterval(tickRef.current);
    tickRef.current = window.setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => { if (tickRef.current) window.clearInterval(tickRef.current); };
  }, []);

  const expired = secondsLeft === 0;

  if (!user) {
    navigate("/login");
    return null;
  }

  if (user.emailVerified) {
    return (
      <div className="w-full min-h-screen lg:grid lg:grid-cols-2 bg-background">
        {/* Same left side as registration/login */}
        <div className="hidden lg:flex flex-col justify-center bg-[#1A1A1A] text-white p-12 lg:p-24 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/30 to-transparent opacity-50" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary/20 blur-3xl rounded-full" />
          <div className="relative z-10 max-w-xl">
            <Link href="/" className="inline-flex w-16 h-16 rounded-2xl bg-primary items-center justify-center text-primary-foreground font-serif font-bold text-4xl shadow-2xl mb-12 hover:scale-105 transition-transform cursor-pointer">N</Link>
            <h1 className="text-5xl lg:text-6xl font-serif font-bold mb-6 leading-tight">
              You're all <span className="text-primary">set</span>.
            </h1>
            <p className="text-xl text-gray-300 font-medium max-w-md">
              Welcome to Ghana's premium marketplace. Start exploring or setting up your shop.
            </p>
          </div>
        </div>

        {/* Right side verified */}
        <div className="flex items-center justify-center p-6 sm:p-12 lg:p-24 relative">
          <div className="absolute top-8 left-6 lg:hidden">
            <Link href="/" className="inline-flex w-10 h-10 rounded-xl bg-primary items-center justify-center text-primary-foreground font-serif font-bold text-xl shadow-lg">N</Link>
          </div>
          <div className="w-full max-w-md space-y-8 text-center mt-12 lg:mt-0">
            <div className="flex justify-center">
              <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center shadow-sm">
                <ShieldCheck className="w-12 h-12 text-green-600" />
              </div>
            </div>
            <div className="space-y-3">
              <h2 className="font-serif text-4xl font-bold tracking-tight text-foreground">Email verified!</h2>
              <p className="text-muted-foreground font-medium text-lg">
                Your email <strong className="text-foreground">{user.email}</strong> is confirmed. You can now use everything on Nafex Hub.
              </p>
            </div>
            <Button onClick={() => navigate("/")} className="w-full h-14 text-lg font-bold shadow-lg mt-8">
              Go to Homepage <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      toast({ title: "Invalid code", description: "Enter the 6-digit code from your email.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Verification failed");
      updateUser({ emailVerified: true });
      toast({ title: "Email verified!", description: "Welcome to Nafex Hub." });
      navigate("/");
    } catch (err) {
      toast({ title: "Couldn't verify", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  async function resend() {
    setResending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not resend");
      setCode("");
      setSecondsLeft(CODE_TTL_SECONDS);
      toast({
        title: data.delivered ? "New code sent" : "Code generated",
        description: data.delivered
          ? `A fresh 6-digit code was sent to ${user!.email}. It expires in 3 minutes.`
          : "Email isn't configured on the server yet — ask the admin to set EMAIL_USER / EMAIL_PASS.",
      });
    } catch (err) {
      toast({ title: "Resend failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="w-full min-h-screen lg:grid lg:grid-cols-2 bg-background">
      {/* ── Left Side: Brand Imagery (Desktop Only) ── */}
      <div className="hidden lg:flex flex-col justify-center bg-[#1A1A1A] text-white p-12 lg:p-24 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/30 to-transparent opacity-50" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary/20 blur-3xl rounded-full" />
        
        <div className="relative z-10 max-w-xl">
          <Link href="/" className="inline-flex w-16 h-16 rounded-2xl bg-primary items-center justify-center text-primary-foreground font-serif font-bold text-4xl shadow-2xl mb-12 hover:scale-105 transition-transform cursor-pointer">
            N
          </Link>
          <h1 className="text-5xl lg:text-6xl font-serif font-bold mb-6 leading-tight">
            You're almost <span className="text-primary">there</span>.
          </h1>
          <p className="text-xl text-gray-300 font-medium max-w-md">
            Check your email for a verification code to activate your account and start shopping or selling.
          </p>
        </div>
      </div>

      {/* ── Right Side: Verification Form ── */}
      <div className="flex items-center justify-center p-6 sm:p-12 lg:p-24 relative overflow-y-auto">
        <div className="absolute top-8 left-6 lg:hidden">
          <Link href="/" className="inline-flex w-10 h-10 rounded-xl bg-primary items-center justify-center text-primary-foreground font-serif font-bold text-xl shadow-lg">
            N
          </Link>
        </div>

        <div className="w-full max-w-md space-y-8 mt-12 lg:mt-0">
          <div className="text-center space-y-3">
            <div className="w-20 h-20 mx-auto rounded-full bg-amber-50 flex items-center justify-center shadow-inner border border-amber-100">
              <Mail className="w-10 h-10 text-amber-600" />
            </div>
            <h2 className="font-serif text-3xl font-bold tracking-tight mt-4">Check your email</h2>
            <p className="text-muted-foreground font-medium">
              We sent a 6-digit code to <strong className="text-foreground">{user.email}</strong>.
            </p>
            <div className={`flex items-center justify-center gap-2 text-sm font-mono p-2 rounded-md ${expired ? "bg-red-50 text-red-600" : "bg-muted text-muted-foreground"}`}>
              <Clock className="w-4 h-4" />
              {expired ? (
                <span>Code expired — request a new one</span>
              ) : (
                <span>Code expires in {String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:{String(secondsLeft % 60).padStart(2, "0")}</span>
              )}
            </div>
          </div>

          <form onSubmit={submit} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="code" className="text-center block font-bold text-muted-foreground uppercase tracking-wider">Verification Code</Label>
              <Input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="text-center text-4xl tracking-[0.75em] font-mono h-16 bg-muted/50 border-gray-200 shadow-inner"
                data-testid="input-verification-code"
                disabled={expired}
              />
            </div>
            <Button type="submit" className="w-full h-14 text-lg font-semibold shadow-lg hover:shadow-xl transition-shadow" disabled={submitting || code.length !== 6 || expired} data-testid="btn-verify-email">
              {submitting ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Verifying...</> : "Verify Account"}
            </Button>
          </form>

          <div className="pt-6 border-t border-muted text-center">
            <p className="text-sm font-medium text-muted-foreground mb-4">Didn't receive the email?</p>
            <Button
              type="button"
              variant="outline"
              onClick={resend}
              disabled={resending || (!expired && secondsLeft > 120)} // Can only resend after 1 min (60s cooldown from 3 mins)
              className="w-full h-12 gap-2 border-gray-300 shadow-sm"
              data-testid="btn-resend-code"
            >
              {resending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
              ) : (!expired && secondsLeft > 120) ? (
                <>Resend available in {secondsLeft - 120}s</>
              ) : (
                <><RefreshCw className="w-4 h-4" /> Resend code</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
