import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Mail, ShieldCheck, RefreshCw, Loader2, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

const CODE_TTL_SECONDS = 60;

export default function VerifyEmail() {
  const { user, token, updateUser } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(CODE_TTL_SECONDS);
  const tickRef = useRef<number | null>(null);

  // Start / restart the countdown.
  useEffect(() => {
    if (tickRef.current) window.clearInterval(tickRef.current);
    tickRef.current = window.setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => { if (tickRef.current) window.clearInterval(tickRef.current); };
  }, []);

  if (!user) {
    navigate("/login");
    return null;
  }

  if (user.emailVerified) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-md">
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <ShieldCheck className="w-14 h-14 mx-auto text-green-600" />
            <h1 className="text-2xl font-bold">Email verified</h1>
            <p className="text-muted-foreground text-sm">
              Your email <strong>{user.email}</strong> is confirmed. You can now use everything on Nafex Hub.
            </p>
            <Button onClick={() => navigate("/")} className="w-full">Go to homepage</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const expired = secondsLeft === 0;

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
          ? `A fresh 6-digit code was sent to ${user!.email}. It expires in 1 minute.`
          : "Email isn't configured on the server yet — ask the admin to set EMAIL_USER / EMAIL_PASS.",
      });
    } catch (err) {
      toast({ title: "Resend failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <Card>
        <CardContent className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 flex items-center justify-center">
              <Mail className="w-7 h-7 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold">Verify your email</h1>
            <p className="text-sm text-muted-foreground">
              We sent a 6-digit code to <strong>{user.email}</strong>. Enter it below to activate your account.
            </p>
            <p className="text-xs text-muted-foreground">
              Verification is required before you can place orders, message sellers, or list a shop.
            </p>
          </div>

          <div className={`flex items-center justify-center gap-2 text-sm font-mono ${expired ? "text-red-600" : "text-amber-700"}`}>
            <Clock className="w-4 h-4" />
            {expired ? (
              <span>Code expired — request a new one</span>
            ) : (
              <span>Expires in {String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:{String(secondsLeft % 60).padStart(2, "0")}</span>
            )}
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Verification code</Label>
              <Input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="••••••"
                className="text-center text-2xl tracking-[0.5em] font-mono h-14"
                data-testid="input-verification-code"
                disabled={expired}
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting || code.length !== 6 || expired} data-testid="btn-verify-email">
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying...</> : "Verify email"}
            </Button>
          </form>

          <Button
            type="button"
            variant="outline"
            onClick={resend}
            disabled={resending}
            className="w-full gap-1.5"
            data-testid="btn-resend-code"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`} />
            {resending ? "Sending..." : expired ? "Send a new code" : "Resend code"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
