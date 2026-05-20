import { Link, useLocation } from "wouter";
import { Mail } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function VerifyEmailBanner() {
  const { user } = useAuth();
  const [location] = useLocation();

  if (!user || user.emailVerified) return null;
  if (location.startsWith("/verify-email") || location.startsWith("/login") || location.startsWith("/register")) {
    return null;
  }

  return (
    <div className="bg-red-600 text-white">
      <div className="container mx-auto px-4 py-2.5 flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <Mail className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">
            <strong>Email not verified.</strong> You can't place orders, message sellers or list a shop until you verify <strong>{user.email}</strong>.
          </span>
        </div>
        <Link
          href="/verify-email"
          className="flex-shrink-0 bg-white text-red-700 hover:bg-red-50 font-semibold px-4 py-1.5 rounded-full text-xs uppercase tracking-wide"
        >
          Verify now
        </Link>
      </div>
    </div>
  );
}
