import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Link } from "wouter";

export function SocialAuthButtons({ action = "sign in" }: { action?: "sign in" | "sign up" }) {
  const { toast } = useToast();
  const { setAuth } = useAuth();
  const [, setLocation] = useLocation();
  const [loadingProvider, setLoadingProvider] = useState<"google" | "facebook" | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(action === "sign in"); // sign-in doesn't need T&C

  const handleSocialAuth = async (provider: "google" | "facebook") => {
    if (action === "sign up" && !termsAccepted) {
      toast({
        title: "Please accept the Terms & Conditions",
        description: "You must agree to our Terms & Conditions and Privacy Policy to create an account.",
        variant: "destructive",
      });
      return;
    }

    setLoadingProvider(provider);
    try {
      const mockUser = provider === "google" 
        ? { id: "google_user_123", name: "Google User", email: "user@gmail.com", role: "user" }
        : { id: "facebook_user_456", name: "Facebook User", email: "user@facebook.com", role: "user" };

      setTimeout(() => {
        const token = "mock_social_jwt_token_" + Date.now();
        setAuth(token, mockUser as any);
        toast({
          title: `Successfully ${action === "sign in" ? "signed in" : "signed up"} with ${provider === "google" ? "Google" : "Facebook"}`,
          description: `Welcome to Nafex Hub, ${mockUser.name}!`,
        });
        setLoadingProvider(null);
        setLocation("/");
      }, 800);
    } catch (err: any) {
      setLoadingProvider(null);
      toast({
        title: "Social authentication error",
        description: err?.message || "Failed to authenticate. Please try again.",
        variant: "destructive",
      });
    }
  };

  const buttonText = (providerName: string) => {
    if (action === "sign up") {
      return `Sign up with ${providerName}`;
    }
    return `Sign in with ${providerName}`;
  };

  return (
    <div className="space-y-3 w-full font-poppins">
      <div className="relative flex items-center justify-center my-4">
        <div className="border-t border-slate-200 w-full" />
        <span className="bg-card px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider shrink-0">
          Or continue with
        </span>
        <div className="border-t border-slate-200 w-full" />
      </div>

      {/* T&C checkbox - only shown on sign-up */}
      {action === "sign up" && (
        <label className="flex items-start gap-2.5 cursor-pointer group">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-slate-300 accent-[#6A1B9A] cursor-pointer shrink-0"
          />
          <span className="text-xs text-slate-600 leading-relaxed">
            I agree to Nafex Hub's{" "}
            <Link href="/terms" className="text-[#6A1B9A] font-semibold hover:underline">
              Terms & Conditions
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-[#6A1B9A] font-semibold hover:underline">
              Privacy Policy
            </Link>
          </span>
        </label>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Google Button */}
        <Button
          type="button"
          variant="outline"
          onClick={() => handleSocialAuth("google")}
          disabled={loadingProvider !== null || (action === "sign up" && !termsAccepted)}
          className="h-11 border-slate-200 bg-white hover:bg-slate-50/80 text-slate-700 font-semibold text-xs sm:text-sm rounded-xl gap-2.5 shadow-xs hover:shadow-sm transition-all disabled:opacity-50"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.27v3.15C3.25 21.3 7.31 24 12 24z" />
            <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.27C.46 8.2.0 10.05.0 12s.46 3.8 1.27 5.42l4.01-3.15z" />
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.94 1.19 15.23 0 12 0 7.31 0 3.25 2.7 1.27 6.58l4.01 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
          </svg>
          <span>{loadingProvider === "google" ? "Connecting..." : buttonText("Google")}</span>
        </Button>

        {/* Facebook Button */}
        <Button
          type="button"
          variant="outline"
          onClick={() => handleSocialAuth("facebook")}
          disabled={loadingProvider !== null || (action === "sign up" && !termsAccepted)}
          className="h-11 border-slate-200 bg-white hover:bg-slate-50/80 text-slate-700 font-semibold text-xs sm:text-sm rounded-xl gap-2.5 shadow-xs hover:shadow-sm transition-all disabled:opacity-50"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
            <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          <span>{loadingProvider === "facebook" ? "Connecting..." : buttonText("Facebook")}</span>
        </Button>
      </div>
    </div>
  );
}
