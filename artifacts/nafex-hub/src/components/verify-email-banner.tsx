import { Link } from "wouter";
import { Mail, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

const DISMISS_KEY = "nafex_verify_banner_dismissed_at";

export function VerifyEmailBanner() {
  const { user } = useAuth();
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const at = localStorage.getItem(DISMISS_KEY);
    if (at && Date.now() - Number(at) < 24 * 60 * 60 * 1000) setHidden(true);
  }, []);

  if (!user || user.emailVerified || hidden) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900">
      <div className="container mx-auto px-4 py-2 flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <Mail className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">
            Please verify your email <strong>{user.email}</strong> to secure your account.
          </span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <Link href="/verify-email" className="font-semibold underline hover:no-underline">
            Verify now
          </Link>
          <button
            onClick={() => {
              localStorage.setItem(DISMISS_KEY, String(Date.now()));
              setHidden(true);
            }}
            aria-label="Dismiss"
            className="p-1 rounded hover:bg-amber-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
