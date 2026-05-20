import { useState } from "react";
import { useLocation } from "wouter";
import { Mail, ShieldCheck, RefreshCw, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

export default function VerifyEmail() {
  const { user, token, updateUser } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

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
            <h1 className="text-2xl font-bold">Email already verified</h1>
            <p className="text-muted-foreground text-sm">Your email <strong>{user.email}</strong> is confirmed.</p>
            <Button onClick={() => navigate("/")} className="w-full">Go to homepage</Button>
          </CardContent>
        </Card>
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
      toast({ title: "Email verified!", description: "Thanks for confirming your email." });
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
      toast({
        title: data.delivered ? "Code sent" : "Code generated",
        description: data.delivered
          ? `A new 6-digit code was sent to ${user!.email}.`
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
              We sent a 6-digit code to <strong>{user.email}</strong>. Enter it below to confirm your account.
            </p>
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
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting || code.length !== 6} data-testid="btn-verify-email">
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying...</> : "Verify email"}
            </Button>
          </form>

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={resend}
              disabled={resending}
              className="inline-flex items-center gap-1.5 text-amber-700 hover:text-amber-800 disabled:opacity-50"
              data-testid="btn-resend-code"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`} />
              {resending ? "Sending..." : "Resend code"}
            </button>
            <button type="button" onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground">
              Skip for now
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
